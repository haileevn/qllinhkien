import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { removeVietnameseTones } from '@/lib/vietnamese';
import { getLocationBreadcrumbs, formatLocationPath } from '@/lib/inventory';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const q = req.nextUrl.searchParams.get('q')?.trim() || '';
    if (!q) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const cleanQ = removeVietnameseTones(q);
    const qTokens = cleanQ.split(/\s+/).filter(Boolean);

    // Fetch items with relations
    const items = await prisma.item.findMany({
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, code: true, parentId: true } },
        tags: { include: { tag: true } },
        images: { take: 1, orderBy: { order: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Fetch all locations to compute full breadcrumb path quickly
    const allLocations = await prisma.storageLocation.findMany({
      select: { id: true, name: true, code: true, parentId: true },
    });
    const locMap = new Map(allLocations.map((l) => [l.id, l]));

    function getBreadcrumbString(locId: string): string {
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
      return names.join(' → ');
    }

    // Filter items with token matching
    const matchingItems = items.filter((item) => {
      const locationPathStr = getBreadcrumbString(item.locationId);
      const searchBlob = [
        item.name,
        item.sku || '',
        item.description || '',
        item.brand || '',
        item.model || '',
        item.category?.name || '',
        item.location?.name || '',
        locationPathStr,
        item.container || '',
        item.exactPosition || '',
        item.barcode || '',
        item.notes || '',
        ...(item.tags?.map((t) => t.tag.name) || []),
      ].join(' ');

      const cleanBlob = removeVietnameseTones(searchBlob);
      return qTokens.every((tok) => cleanBlob.includes(tok));
    });

    // Format results with computed location path
    const results = matchingItems.map((item) => {
      const locationPath = getBreadcrumbString(item.locationId);
      let stockStatus = 'in_stock';
      let stockLabel = `Còn: ${item.quantity} ${item.unit}`;

      if (item.quantity === 0) {
        stockStatus = 'out_of_stock';
        stockLabel = 'Hết hàng';
      } else if (item.quantity <= item.minimumQuantity) {
        stockStatus = 'low_stock';
        stockLabel = `Sắp hết (${item.quantity} ${item.unit})`;
      }

      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        brand: item.brand,
        model: item.model,
        quantity: item.quantity,
        unit: item.unit,
        minimumQuantity: item.minimumQuantity,
        stockStatus,
        stockLabel,
        condition: item.condition,
        mainImage: item.mainImage || (item.images.length > 0 ? item.images[0].url : null),
        category: item.category,
        location: item.location,
        locationPath,
        container: item.container,
        exactPosition: item.exactPosition,
        tags: item.tags.map((t) => t.tag.name),
        barcode: item.barcode,
        isFavorite: item.isFavorite,
      };
    });

    return NextResponse.json({
      query: q,
      results,
      total: results.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Lỗi tìm kiếm' }, { status: 500 });
  }
}
