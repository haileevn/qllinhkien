import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { z } from 'zod';

const quickDeductSchema = z.object({
  code: z.string().min(1, 'Mã quét không được để trống'),
  amount: z.number().positive('Số lượng xuất phải lớn hơn 0').default(1),
  note: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    if (!canEdit(user.role)) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể xuất kho lấy hàng.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = quickDeductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { code, amount, note, projectId } = parsed.data;
    const cleanCode = code.trim();

    // Find the item matching the scanned code (Barcode, QR code value, SKU, ID, or legacy format)
    let item = await prisma.item.findFirst({
      where: {
        OR: [
          { qrCodeValue: { equals: cleanCode, mode: 'insensitive' } },
          { barcode: { equals: cleanCode, mode: 'insensitive' } },
          { sku: { equals: cleanCode, mode: 'insensitive' } },
          { id: cleanCode },
        ],
      },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
        category: {
          select: { id: true, name: true },
        },
      },
    });

    // Check if code has prefix like "ITEM:xyz" or URL format
    if (!item && cleanCode.startsWith('ITEM:')) {
      const stripped = cleanCode.replace('ITEM:', '').trim();
      item = await prisma.item.findFirst({
        where: {
          OR: [
            { id: stripped },
            { sku: { equals: stripped, mode: 'insensitive' } },
            { qrCodeValue: { equals: cleanCode, mode: 'insensitive' } },
            { barcode: { equals: stripped, mode: 'insensitive' } },
          ],
        },
        include: {
          location: { select: { id: true, name: true, code: true } },
          category: { select: { id: true, name: true } },
        },
      });
    }

    // Check if URL was scanned e.g. https://.../items/[id]
    if (!item && (cleanCode.startsWith('http://') || cleanCode.startsWith('https://'))) {
      try {
        const urlObj = new URL(cleanCode);
        const match = urlObj.pathname.match(/\/items\/([^/]+)/);
        if (match && match[1]) {
          const itemId = match[1];
          item = await prisma.item.findFirst({
            where: {
              OR: [{ id: itemId }, { slug: itemId }],
            },
            include: {
              location: { select: { id: true, name: true, code: true } },
              category: { select: { id: true, name: true } },
            },
          });
        }
      } catch {}
    }

    if (!item) {
      return NextResponse.json(
        {
          error: `Không tìm thấy vật tư khớp với mã "${cleanCode}". Vui lòng kiểm tra lại mã vạch hoặc tem QR.`,
        },
        { status: 404 }
      );
    }

    const previousQuantity = item.quantity;

    if (previousQuantity <= 0) {
      return NextResponse.json(
        {
          error: `Vật tư "${item.name}" hiện đang hết hàng (Tồn kho: 0 ${item.unit}). Không thể xuất thêm.`,
          item: {
            id: item.id,
            name: item.name,
            sku: item.sku,
            quantity: 0,
            unit: item.unit,
            location: item.location,
          },
        },
        { status: 400 }
      );
    }

    if (amount > previousQuantity) {
      return NextResponse.json(
        {
          error: `Số lượng yêu cầu lấy (${amount} ${item.unit}) vượt quá tồn kho hiện có (${previousQuantity} ${item.unit}) của "${item.name}".`,
          item: {
            id: item.id,
            name: item.name,
            sku: item.sku,
            quantity: previousQuantity,
            unit: item.unit,
            location: item.location,
          },
        },
        { status: 400 }
      );
    }

    const newQuantity = previousQuantity - amount;
    const finalNote = note?.trim() || 'Quét mã lấy hàng nhanh';

    // Execute deduction in atomic transaction
    const [updatedItem, transaction] = await prisma.$transaction(async (tx) => {
      const itm = await tx.item.update({
        where: { id: item.id },
        data: { quantity: newQuantity },
        include: {
          location: { select: { id: true, name: true, code: true } },
          category: { select: { id: true, name: true } },
        },
      });

      const invTx = await tx.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: 'OUT',
          quantity: amount,
          previousQuantity,
          newQuantity,
          sourceLocationId: item.locationId,
          note: finalNote,
          createdBy: user.username,
        },
      });

      if (projectId) {
        const pItem = await tx.projectItem.findFirst({
          where: { projectId, itemId: item.id },
        });
        if (pItem) {
          const newFulfilled = pItem.fulfilledQuantity + amount;
          await tx.projectItem.update({
            where: { id: pItem.id },
            data: {
              fulfilledQuantity: newFulfilled,
              isDeducted: newFulfilled >= pItem.requiredQuantity,
            },
          });
        }
      }

      return [itm, invTx];
    });

    return NextResponse.json({
      success: true,
      message: `Đã xuất ${amount} ${updatedItem.unit} "${updatedItem.name}". Tồn kho còn lại: ${newQuantity} ${updatedItem.unit}`,
      item: {
        id: updatedItem.id,
        name: updatedItem.name,
        sku: updatedItem.sku,
        brand: updatedItem.brand,
        unit: updatedItem.unit,
        previousQuantity,
        newQuantity,
        location: updatedItem.location,
        container: updatedItem.container,
        exactPosition: updatedItem.exactPosition,
        mainImage: updatedItem.mainImage,
      },
      deductedAmount: amount,
      transactionId: transaction.id,
    });
  } catch (error: any) {
    console.error('Quick deduct error:', error);
    return NextResponse.json(
      { error: 'Lỗi xuất kho tự động: ' + (error?.message || 'Lỗi server') },
      { status: 500 }
    );
  }
}
