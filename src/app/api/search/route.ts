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
      select: { id: true, name: true, code: true, description: true, parentId: true },
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

    // Also search projects with BOM items
    const allProjects = await prisma.project.findMany({
      include: {
        items: {
          include: {
            item: {
              select: { id: true, name: true, sku: true, quantity: true, unit: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const matchingProjects = allProjects.filter((proj) => {
      const bomItemNames = proj.items.map((i) => i.item?.name || '').join(' ');
      const searchBlob = [
        proj.name,
        proj.description || '',
        proj.notes || '',
        proj.status,
        bomItemNames,
      ].join(' ');

      const cleanBlob = removeVietnameseTones(searchBlob);
      return qTokens.every((tok) => cleanBlob.includes(tok));
    }).map((proj) => {
      const totalRequired = proj.items.length;
      const fulfilledCount = proj.items.filter((i) => (i.item?.quantity ?? 0) >= i.requiredQuantity).length;
      const isReady = totalRequired > 0 && fulfilledCount === totalRequired;

      return {
        id: proj.id,
        name: proj.name,
        slug: proj.slug,
        description: proj.description,
        status: proj.status,
        targetDate: proj.targetDate,
        budget: proj.budget,
        itemCount: totalRequired,
        fulfilledCount,
        isReady,
        updatedAt: proj.updatedAt,
      };
    });

    // Also search locations
    const matchingLocations = allLocations.filter((loc) => {
      const pathStr = getBreadcrumbString(loc.id);
      const searchBlob = [loc.name, loc.code || '', loc.description || '', pathStr].join(' ');
      const cleanBlob = removeVietnameseTones(searchBlob);
      return qTokens.every((tok) => cleanBlob.includes(tok));
    }).map((loc) => ({
      id: loc.id,
      name: loc.name,
      code: loc.code,
      description: loc.description,
      path: getBreadcrumbString(loc.id),
    }));

    return NextResponse.json({
      query: q,
      results,
      projects: matchingProjects,
      locations: matchingLocations,
      stats: {
        itemsCount: results.length,
        projectsCount: matchingProjects.length,
        locationsCount: matchingLocations.length,
        total: results.length + matchingProjects.length + matchingLocations.length,
      },
      total: results.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Lỗi tìm kiếm' }, { status: 500 });
  }
}
