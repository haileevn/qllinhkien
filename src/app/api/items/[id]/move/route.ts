import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { z } from 'zod';

const moveSchema = z.object({
  destinationLocationId: z.string().min(1, 'Vui lòng chọn vị trí mới'),
  container: z.string().optional().nullable(),
  exactPosition: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    if (!canEdit(user.role)) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể di chuyển vị trí vật tư' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = moveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { destinationLocationId, container, exactPosition, note } = parsed.data;

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: 'Không tìm thấy vật tư' }, { status: 404 });
    }

    const sourceLocationId = item.locationId;

    const [updatedItem, transaction] = await prisma.$transaction([
      prisma.item.update({
        where: { id },
        data: {
          locationId: destinationLocationId,
          container: container !== undefined ? container : item.container,
          exactPosition: exactPosition !== undefined ? exactPosition : item.exactPosition,
        },
      }),
      prisma.inventoryTransaction.create({
        data: {
          itemId: id,
          type: 'MOVE',
          quantity: item.quantity,
          previousQuantity: item.quantity,
          newQuantity: item.quantity,
          sourceLocationId,
          destinationLocationId,
          note: note?.trim() || 'Chuyển vị trí lưu trữ',
          createdBy: user.username,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      item: updatedItem,
      transaction,
    });
  } catch (error) {
    console.error('Error moving item location:', error);
    return NextResponse.json({ error: 'Lỗi chuyển vị trí vật tư' }, { status: 500 });
  }
}
