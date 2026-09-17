import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSlug } from '@/lib/vietnamese';
import { z } from 'zod';

const tagSchema = z.object({
  name: z.string().min(1, 'Tên tag không được để trống'),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const tags = await prisma.tag.findMany({
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách thẻ' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const parsed = tagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const name = parsed.data.name.trim().toLowerCase();
    const slug = createSlug(name);

    const tag = await prisma.tag.upsert({
      where: { name },
      update: { slug },
      create: { name, slug },
    });

    return NextResponse.json({ success: true, tag });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Lỗi tạo thẻ' }, { status: 500 });
  }
}
