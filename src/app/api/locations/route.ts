import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateUniqueCode } from '@/lib/inventory';
import { canEdit } from '@/lib/permissions';
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
        items: {
          select: { quantity: true, purchasePrice: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    interface LocationNode {
      id: string;
      name: string;
      code: string | null;
      description: string | null;
      image: string | null;
      parentId: string | null;
      createdAt: Date;
      updatedAt: Date;
      _count: { items: number; children: number };
      directValue: number;
      directQuantity: number;
      totalValue: number;
      totalItemsCount: number;
      totalQuantity: number;
      childrenList?: LocationNode[];
    }

    // Compute direct metrics for each location
    const locationsWithDirectMetrics: LocationNode[] = locations.map((loc) => {
      const directValue = loc.items.reduce(
        (sum: number, it) => sum + (it.quantity || 0) * (it.purchasePrice || 0),
        0
      );
      const directQuantity = loc.items.reduce(
        (sum: number, it) => sum + (it.quantity || 0),
        0
      );
      return {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        description: loc.description,
        image: loc.image,
        parentId: loc.parentId,
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt,
        _count: loc._count,
        directValue,
        directQuantity,
        totalValue: directValue,
        totalItemsCount: loc._count.items,
        totalQuantity: directQuantity,
        childrenList: [],
      };
    });

    const locMap = new Map<string, LocationNode>();
    locationsWithDirectMetrics.forEach((l) => locMap.set(l.id, l));

    const rootNodes: LocationNode[] = [];

    locMap.forEach((node) => {
      if (node.parentId && locMap.has(node.parentId)) {
        locMap.get(node.parentId)!.childrenList!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Sort root nodes alphabetically
    rootNodes.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));

    // Recursively sum descendant values and counts and sort children
    function aggregateSubtree(node: LocationNode, parentPath: string[], depth: number): {
      totalValue: number;
      totalItemsCount: number;
      totalQuantity: number;
    } {
      let sumVal = node.directValue;
      let sumCount = node._count.items;
      let sumQty = node.directQuantity;

      if (node.childrenList && node.childrenList.length > 0) {
        node.childrenList.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
        for (const child of node.childrenList) {
          const childStats = aggregateSubtree(child, [...parentPath, node.name], depth + 1);
          sumVal += childStats.totalValue;
          sumCount += childStats.totalItemsCount;
          sumQty += childStats.totalQuantity;
        }
      }

      node.totalValue = sumVal;
      node.totalItemsCount = sumCount;
      node.totalQuantity = sumQty;

      return { totalValue: sumVal, totalItemsCount: sumCount, totalQuantity: sumQty };
    }

    rootNodes.forEach((root) => aggregateSubtree(root, [], 0));

    // Flatten in DFS hierarchical tree order
    interface FlattenedLocation extends Omit<LocationNode, 'childrenList'> {
      path: string;
      depth: number;
    }
    const hierarchicalFlatList: FlattenedLocation[] = [];

    function flattenDFS(node: LocationNode, parentPath: string[], depth: number) {
      const currentPath = [...parentPath, node.name];
      const { childrenList, ...rest } = node;
      hierarchicalFlatList.push({
        ...rest,
        path: currentPath.join(' → '),
        depth,
      });

      if (childrenList && childrenList.length > 0) {
        for (const child of childrenList) {
          flattenDFS(child, currentPath, depth + 1);
        }
      }
    }

    rootNodes.forEach((root) => flattenDFS(root, [], 0));

    if (format === 'flat') {
      return NextResponse.json({
        locations: hierarchicalFlatList,
      });
    }

    return NextResponse.json({
      tree: rootNodes,
      locations: hierarchicalFlatList,
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách vị trí' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    if (!canEdit(user.role)) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể tạo vị trí mới' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    let code = parsed.data.code?.trim() || null;
    if (!code) {
      code = generateUniqueCode('LOC');
    }

    const location = await prisma.storageLocation.create({
      data: {
        name: parsed.data.name.trim(),
        code,
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

