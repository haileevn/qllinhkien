import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const adjustSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  amount: z.number(), // For IN (+amount), OUT (-amount), or ADJUSTMENT (new exact total or relative diff)
  note: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { type, amount, note } = parsed.data;

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: 'Không tìm thấy vật tư' }, { status: 404 });
    }

    const previousQuantity = item.quantity;
    let newQuantity = previousQuantity;
    let delta = amount;

    if (type === 'IN') {
      if (amount <= 0) return NextResponse.json({ error: 'Số lượng nhập phải lớn hơn 0' }, { status: 400 });
      newQuantity = previousQuantity + amount;
      delta = amount;
    } else if (type === 'OUT') {
      if (amount <= 0) return NextResponse.json({ error: 'Số lượng xuất phải lớn hơn 0' }, { status: 400 });
      if (amount > previousQuantity) {
        return NextResponse.json(
          { error: `Số lượng xuất (${amount}) vượt quá số lượng hiện có (${previousQuantity})` },
          { status: 400 }
        );
      }
      newQuantity = previousQuantity - amount;
      delta = amount;
    } else if (type === 'ADJUSTMENT') {
      if (amount < 0) return NextResponse.json({ error: 'Số lượng mới không được âm' }, { status: 400 });
      newQuantity = amount;
      delta = Math.abs(newQuantity - previousQuantity);
    }

    const [updatedItem, transaction] = await prisma.$transaction([
      prisma.item.update({
        where: { id },
        data: { quantity: newQuantity },
      }),
      prisma.inventoryTransaction.create({
        data: {
          itemId: id,
          type,
          quantity: delta,
          previousQuantity,
          newQuantity,
          destinationLocationId: item.locationId,
          note: note?.trim() || (type === 'IN' ? 'Nhập thêm' : type === 'OUT' ? 'Đã sử dụng' : 'Điều chỉnh kho'),
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
    console.error('Error adjusting quantity:', error);
    return NextResponse.json({ error: 'Lỗi điều chỉnh số lượng' }, { status: 500 });
  }
}
