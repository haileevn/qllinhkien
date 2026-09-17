import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const [
      totalItemTypes,
      totalLocations,
      totalCategories,
      allItems,
      allLocations,
      recentlyAddedRaw,
      favoriteItemsRaw,
      recentTransactions,
    ] = await Promise.all([
      prisma.item.count().catch(() => 0),
      prisma.storageLocation.count().catch(() => 0),
      prisma.category.count().catch(() => 0),
      prisma.item.findMany({
        select: {
          id: true,
          quantity: true,
          minimumQuantity: true,
          locationId: true,
        },
      }).catch(() => []),
      prisma.storageLocation.findMany({
        include: {
          _count: {
            select: { items: true, children: true },
          },
        },
        orderBy: { name: 'asc' },
      }).catch(() => []),
      prisma.item.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, code: true, parentId: true } },
          tags: { include: { tag: true } },
          images: { orderBy: { order: 'asc' } },
        },
      }).catch(() => []),
      prisma.item.findMany({
        where: { isFavorite: true },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          location: { select: { id: true, name: true, code: true, parentId: true } },
          tags: { include: { tag: true } },
          images: { orderBy: { order: 'asc' } },
        },
      }).catch(() => []),
      prisma.inventoryTransaction.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              unit: true,
              mainImage: true,
            },
          },
          sourceLocation: { select: { id: true, name: true, code: true } },
          destinationLocation: { select: { id: true, name: true, code: true } },
        },
      }).catch(() => []),
    ]);

    // Build location lookup map for breadcrumbs
    const locMap = new Map((allLocations || []).map((l) => [l.id, l]));

    function getBreadcrumbString(locId: string | null | undefined): string {
      if (!locId) return 'Chưa phân vị trí';
      const names: string[] = [];
      let cur: string | null = locId;
      const visited = new Set<string>();
      while (cur && !visited.has(cur)) {
        visited.add(cur);
        const loc = locMap.get(cur);
        if (!loc) break;
        names.unshift(loc.name);
        cur = loc.parentId;
      }
      return names.length > 0 ? names.join(' → ') : 'Chưa phân vị trí';
    }

    // Calculate item & quantity metrics per location
    const locationItemMap = new Map<string, { count: number; totalQty: number }>();
    (allItems || []).forEach((i) => {
      if (!i.locationId) return;
      const current = locationItemMap.get(i.locationId) || { count: 0, totalQty: 0 };
      current.count += 1;
      current.totalQty += Number(i.quantity) || 0;
      locationItemMap.set(i.locationId, current);
    });

    // Compute descendant location IDs for recursive counts (with cycle protection)
    function getDescendantIds(locId: string): string[] {
      const ids = [locId];
      const queue = [locId];
      const visited = new Set<string>([locId]);
      while (queue.length > 0) {
        const currentParent = queue.shift()!;
        const children = (allLocations || []).filter((l) => l.parentId === currentParent);
        for (const c of children) {
          if (!visited.has(c.id)) {
            visited.add(c.id);
            ids.push(c.id);
            queue.push(c.id);
          }
        }
      }
      return ids;
    }

    // Build locations overview (all top-level locations, or top locations by item count)
    const locationsOverview = (allLocations || [])
      .filter((loc) => !loc.parentId || allLocations.length <= 8)
      .map((loc) => {
        const descendantIds = getDescendantIds(loc.id);
        let recursiveItemTypes = 0;
        let recursiveTotalQty = 0;

        descendantIds.forEach((dId) => {
          const stats = locationItemMap.get(dId);
          if (stats) {
            recursiveItemTypes += stats.count;
            recursiveTotalQty += stats.totalQty;
          }
        });

        return {
          id: loc.id,
          name: loc.name,
          code: loc.code,
          description: loc.description,
          directItemCount: loc._count?.items ?? 0,
          childrenCount: loc._count?.children ?? 0,
          totalDescendantItemTypes: recursiveItemTypes,
          totalQuantity: recursiveTotalQty,
          breadcrumb: getBreadcrumbString(loc.id),
        };
      });

    // Global Stats
    let totalQuantity = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    (allItems || []).forEach((i) => {
      const qty = Number(i.quantity) || 0;
      const minQty = Number(i.minimumQuantity) || 0;
      totalQuantity += qty;
      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= minQty) {
        lowStockCount++;
      }
    });

    // Format recentlyAdded items with mainImage fallback & breadcrumbs
    const recentlyAdded = (recentlyAddedRaw || []).map((item) => ({
      ...item,
      mainImage: item.mainImage || (item.images && item.images.length > 0 ? item.images[0].url : null),
      locationPath: getBreadcrumbString(item.locationId),
    }));

    // Format favorite items
    const favorites = (favoriteItemsRaw || []).map((item) => ({
      ...item,
      mainImage: item.mainImage || (item.images && item.images.length > 0 ? item.images[0].url : null),
      locationPath: getBreadcrumbString(item.locationId),
    }));

    return NextResponse.json({
      stats: {
        totalItemTypes,
        totalQuantity,
        lowStockCount,
        outOfStockCount,
        totalLocations,
        totalCategories,
      },
      locationsOverview,
      recentlyAdded,
      favorites,
      recentTransactions: recentTransactions || [],
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      {
        error: 'Lỗi tải thống kê',
        message: error?.message || String(error),
        code: error?.code,
      },
      { status: 500 }
    );
  }
}

