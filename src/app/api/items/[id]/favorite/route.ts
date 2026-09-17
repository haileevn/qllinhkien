import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: 'Không tìm thấy vật tư' }, { status: 404 });
    }

    const updated = await prisma.item.update({
      where: { id },
      data: { isFavorite: !item.isFavorite },
      select: { id: true, isFavorite: true },
    });

    return NextResponse.json({ success: true, isFavorite: updated.isFavorite });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật yêu thích' }, { status: 500 });
  }
}
