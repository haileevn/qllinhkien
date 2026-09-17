import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const unitSchema = z.object({
  name: z.string().min(1, 'Tên đơn vị không được để trống'),
  symbol: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  order: z.number().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const units = await prisma.unit.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ units });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách đơn vị' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const parsed = unitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const unit = await prisma.unit.upsert({
      where: { name: parsed.data.name.trim() },
      update: {
        symbol: parsed.data.symbol?.trim() || null,
        isDefault: parsed.data.isDefault ?? false,
        order: parsed.data.order ?? 0,
      },
      create: {
        name: parsed.data.name.trim(),
        symbol: parsed.data.symbol?.trim() || null,
        isDefault: parsed.data.isDefault ?? false,
        order: parsed.data.order ?? 0,
      },
    });

    return NextResponse.json({ success: true, unit });
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Lỗi tạo đơn vị tính' }, { status: 500 });
  }
}
