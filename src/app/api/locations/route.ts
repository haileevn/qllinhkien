import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const locationSchema = z.object({
  name: z.string().min(1, 'Tên vị trí không được để trống'),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'tree'; // 'tree' or 'flat'

    const locations = await prisma.storageLocation.findMany({
      include: {
        _count: {
          select: { items: true, children: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (format === 'flat') {
      return NextResponse.json({ locations });
    }

    // Build hierarchical tree
    type LocationNode = (typeof locations)[0] & { childrenList?: LocationNode[]; totalItemsCount?: number };
    const locMap = new Map<string, LocationNode>();
    locations.forEach((l) => locMap.set(l.id, { ...l, childrenList: [] }));

    const rootNodes: LocationNode[] = [];

    locMap.forEach((node) => {
      if (node.parentId && locMap.has(node.parentId)) {
        locMap.get(node.parentId)!.childrenList!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return NextResponse.json({ tree: rootNodes, locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách vị trí' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const location = await prisma.storageLocation.create({
      data: {
        name: parsed.data.name.trim(),
        code: parsed.data.code?.trim() || null,
        description: parsed.data.description?.trim() || null,
        image: parsed.data.image || null,
        parentId: parsed.data.parentId || null,
      },
    });

    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Lỗi tạo vị trí lưu trữ' }, { status: 500 });
  }
}
