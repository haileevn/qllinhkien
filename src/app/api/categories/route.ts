import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSlug } from '@/lib/vietnamese';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống'),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'tree';

    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { items: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (format === 'flat') {
      return NextResponse.json({ categories });
    }

    type CategoryNode = (typeof categories)[0] & { childrenList?: CategoryNode[] };
    const catMap = new Map<string, CategoryNode>();
    categories.forEach((c) => catMap.set(c.id, { ...c, childrenList: [] }));

    const rootNodes: CategoryNode[] = [];
    catMap.forEach((node) => {
      if (node.parentId && catMap.has(node.parentId)) {
        catMap.get(node.parentId)!.childrenList!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return NextResponse.json({ tree: rootNodes, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Lỗi tải danh mục' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    let slug = createSlug(parsed.data.name);
    const existingSlug = await prisma.category.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const category = await prisma.category.create({
      data: {
        name: parsed.data.name.trim(),
        slug,
        description: parsed.data.description?.trim() || null,
        icon: parsed.data.icon || null,
        parentId: parsed.data.parentId || null,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Lỗi tạo danh mục' }, { status: 500 });
  }
}
