import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSlug } from '@/lib/vietnamese';
import { z } from 'zod';

const updateTagSchema = z.object({
  name: z.string().min(1, 'Tên thẻ không được để trống'),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = updateTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const name = parsed.data.name.trim().toLowerCase();
    const slug = createSlug(name);

    const updated = await prisma.tag.update({
      where: { id },
      data: { name, slug },
    });

    return NextResponse.json({ success: true, tag: updated });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật thẻ' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Lỗi xóa thẻ' }, { status: 500 });
  }
}
