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

    // Filter items that have not been deducted yet
    const pendingItems = project.items.filter((i) => !i.isDeducted);

    if (pendingItems.length === 0) {
      return NextResponse.json({ error: 'Tất cả linh kiện trong dự án đã được xuất kho trước đó rồi.' }, { status: 400 });
    }

    // Check if any item has insufficient stock
    const insufficientItems = pendingItems.filter((i) => (i.item?.quantity ?? 0) < i.requiredQuantity);
    if (insufficientItems.length > 0) {
      const names = insufficientItems.map((i) => `${i.item.name} (cần: ${i.requiredQuantity}, còn: ${i.item.quantity})`).join(', ');
      return NextResponse.json(
        {
          error: `Không đủ tồn kho để xuất toàn bộ: ${names}. Vui lòng nhập thêm hàng trước khi xuất kho.`,
        },
        { status: 400 }
      );
    }

    // Process deduction in a Prisma transaction
    await prisma.$transaction(async (tx) => {
      for (const pItem of pendingItems) {
        const prevQty = pItem.item.quantity;
        const newQty = prevQty - pItem.requiredQuantity;

        // 1. Update item stock
        await tx.item.update({
          where: { id: pItem.itemId },
          data: { quantity: newQty },
        });

        // 2. Mark ProjectItem as deducted
        await tx.projectItem.update({
          where: { id: pItem.id },
          data: {
            isDeducted: true,
            fulfilledQuantity: pItem.requiredQuantity,
          },
        });

        // 3. Create InventoryTransaction OUT
        await tx.inventoryTransaction.create({
          data: {
            itemId: pItem.itemId,
            type: 'OUT',
            quantity: pItem.requiredQuantity,
            previousQuantity: prevQty,
            newQuantity: newQty,
            sourceLocationId: pItem.item.locationId,
            note: `Xuất linh kiện phục vụ dự án "${project.name}"`,
            createdBy: user.username,
          },
        });
      }

      // Update project status to IN_PROGRESS if it was PLANNING
      if (project.status === 'PLANNING') {
        await tx.project.update({
          where: { id: project.id },
          data: { status: 'IN_PROGRESS' },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Đã xuất kho thành công ${pendingItems.length} loại linh kiện cho dự án "${project.name}".`,
    });
  } catch (error: any) {
    console.error('Error deducting project BOM:', error);
    return NextResponse.json({ error: 'Lỗi xuất kho dự án', message: error?.message }, { status: 500 });
  }
}
