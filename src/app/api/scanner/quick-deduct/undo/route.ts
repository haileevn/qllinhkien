import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { z } from 'zod';

const undoSchema = z.object({
  transactionId: z.string().min(1, 'Mã giao dịch không được để trống'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    if (!canEdit(user.role)) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể hoàn tác xuất kho.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = undoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { transactionId } = parsed.data;

    const tx = await prisma.inventoryTransaction.findUnique({
      where: { id: transactionId },
      include: { item: true },
    });

    if (!tx) {
      return NextResponse.json({ error: 'Không tìm thấy giao dịch xuất kho để hoàn tác' }, { status: 404 });
    }

    if (tx.type !== 'OUT') {
      return NextResponse.json(
        { error: 'Chỉ có thể hoàn tác cho các giao dịch xuất kho (OUT)' },
        { status: 400 }
      );
    }

    const item = tx.item;
    const restoredQty = item.quantity + tx.quantity;

    // Restore stock and create compensation transaction
    const [updatedItem] = await prisma.$transaction([
      prisma.item.update({
        where: { id: item.id },
        data: { quantity: restoredQty },
      }),
      prisma.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: 'IN',
          quantity: tx.quantity,
          previousQuantity: item.quantity,
          newQuantity: restoredQty,
          destinationLocationId: item.locationId,
          note: `[Hoàn tác xuất kho] Phục hồi ${tx.quantity} ${item.unit} từ lượt quét nhầm`,
          createdBy: user.username,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Đã hoàn tác xuất kho cho "${item.name}". Tồn kho hiện tại: ${restoredQty} ${item.unit}`,
      item: {
        id: updatedItem.id,
        name: updatedItem.name,
        quantity: restoredQty,
        unit: updatedItem.unit,
      },
      restoredAmount: tx.quantity,
    });
  } catch (error: any) {
    console.error('Undo quick deduct error:', error);
    return NextResponse.json(
      { error: 'Lỗi hoàn tác xuất kho: ' + (error?.message || 'Lỗi server') },
      { status: 500 }
    );
  }
}
