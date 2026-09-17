import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        items: {
          include: { item: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    // Filter items that were deducted
    const deductedItems = project.items.filter((i) => i.isDeducted);

    if (deductedItems.length === 0) {
      return NextResponse.json({ error: 'Dự án này chưa có linh kiện nào được xuất kho để hoàn trả.' }, { status: 400 });
    }

    // Process return in a Prisma transaction
    await prisma.$transaction(async (tx) => {
      for (const pItem of deductedItems) {
        const prevQty = pItem.item.quantity;
        const returnQty = pItem.fulfilledQuantity || pItem.requiredQuantity;
        const newQty = prevQty + returnQty;

        // 1. Update item stock
        await tx.item.update({
          where: { id: pItem.itemId },
          data: { quantity: newQty },
        });

        // 2. Mark ProjectItem as not deducted
        await tx.projectItem.update({
          where: { id: pItem.id },
          data: {
            isDeducted: false,
            fulfilledQuantity: 0,
          },
        });

        // 3. Create InventoryTransaction IN
        await tx.inventoryTransaction.create({
          data: {
            itemId: pItem.itemId,
            type: 'IN',
            quantity: returnQty,
            previousQuantity: prevQty,
            newQuantity: newQty,
            destinationLocationId: pItem.item.locationId,
            note: `Hoàn trả linh kiện từ dự án "${project.name}" về lại kho`,
            createdBy: user.username,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Đã hoàn trả thành công ${deductedItems.length} loại linh kiện của dự án "${project.name}" về lại kho.`,
    });
  } catch (error: any) {
    console.error('Error returning project BOM:', error);
    return NextResponse.json({ error: 'Lỗi hoàn trả linh kiện dự án', message: error?.message }, { status: 500 });
  }
}
