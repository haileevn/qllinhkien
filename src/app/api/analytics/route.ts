import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const [items, locations, categories, projects] = await Promise.all([
      prisma.item.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          quantity: true,
          minimumQuantity: true,
          unit: true,
          purchasePrice: true,
          purchaseUrl: true,
          supplier: true,
          mainImage: true,
          locationId: true,
          categoryId: true,
          location: { select: { id: true, name: true, code: true, parentId: true } },
          category: { select: { id: true, name: true } },
          images: { take: 1, orderBy: { order: 'asc' } },
        },
      }),
      prisma.storageLocation.findMany({
        select: { id: true, name: true, code: true, parentId: true },
      }),
      prisma.category.findMany({
        select: { id: true, name: true },
      }),
      prisma.project.findMany({
        include: {
          items: {
            include: {
              item: {
                select: { purchasePrice: true },
              },
            },
          },
        },
      }),
    ]);

    // Financial calculations
    let totalAssetValue = 0;
    let totalStockQuantity = 0;
    let pricedItemsCount = 0;
    let unpricedItemsCount = 0;
    let lowStockReorderTotalCost = 0;

    const locValueMap = new Map<string, { id: string; name: string; code: string | null; totalValue: number; itemsCount: number }>();
    locations.forEach((l) => locValueMap.set(l.id, { id: l.id, name: l.name, code: l.code, totalValue: 0, itemsCount: 0 }));

    const catValueMap = new Map<string, { id: string; name: string; totalValue: number; itemsCount: number }>();
    categories.forEach((c) => catValueMap.set(c.id, { id: c.id, name: c.name, totalValue: 0, itemsCount: 0 }));

    const itemsWithValue = items.map((item) => {
      const price = item.purchasePrice || 0;
      const totalItemValue = item.quantity * price;
      totalStockQuantity += item.quantity;

      if (price > 0) {
        totalAssetValue += totalItemValue;
        pricedItemsCount++;
      } else {
        unpricedItemsCount++;
      }

      // Group by location
      if (item.locationId && locValueMap.has(item.locationId)) {
        const lEntry = locValueMap.get(item.locationId)!;
        lEntry.totalValue += totalItemValue;
        lEntry.itemsCount += 1;
      }

      // Group by category
      if (item.categoryId && catValueMap.has(item.categoryId)) {
        const cEntry = catValueMap.get(item.categoryId)!;
        cEntry.totalValue += totalItemValue;
        cEntry.itemsCount += 1;
      }

      return {
        ...item,
        mainImage: item.mainImage || (item.images.length > 0 ? item.images[0].url : null),
        totalItemValue,
      };
    });

    // Top 10 valuable items
    const topValuableItems = [...itemsWithValue]
      .filter((i) => i.totalItemValue > 0)
      .sort((a, b) => b.totalItemValue - a.totalItemValue)
      .slice(0, 10);

    // Low stock items and reorder cost estimation
    const lowStockItems = itemsWithValue
      .filter((i) => i.quantity <= i.minimumQuantity)
      .map((i) => {
        // Target is at least minimumQuantity + 5, or minimumQuantity * 2
        const targetQty = Math.max(i.minimumQuantity * 2, i.minimumQuantity + 5, 5);
        const neededQty = Math.max(1, targetQty - i.quantity);
        const estCost = neededQty * (i.purchasePrice || 0);
        lowStockReorderTotalCost += estCost;

        return {
          id: i.id,
          name: i.name,
          sku: i.sku,
          quantity: i.quantity,
          minimumQuantity: i.minimumQuantity,
          unit: i.unit,
          purchasePrice: i.purchasePrice,
          purchaseUrl: i.purchaseUrl,
          supplier: i.supplier,
          neededQty,
          estCost,
        };
      })
      .sort((a, b) => b.estCost - a.estCost);

    // Location & Category breakdown sorted by value
    const valuationByLocation = Array.from(locValueMap.values())
      .filter((l) => l.itemsCount > 0)
      .sort((a, b) => b.totalValue - a.totalValue);

    const valuationByCategory = Array.from(catValueMap.values())
      .filter((c) => c.itemsCount > 0)
      .sort((a, b) => b.totalValue - a.totalValue);

    // Active Projects BOM Value
    let activeProjectsBOMValue = 0;
    projects.forEach((p) => {
      if (p.status === 'PLANNING' || p.status === 'IN_PROGRESS') {
        p.items.forEach((pItem) => {
          const price = pItem.item?.purchasePrice || 0;
          activeProjectsBOMValue += price * pItem.requiredQuantity;
        });
      }
    });

    return NextResponse.json({
      summary: {
        totalAssetValue,
        totalItemsCount: items.length,
        totalStockQuantity,
        pricedItemsCount,
        unpricedItemsCount,
        lowStockCount: lowStockItems.length,
        lowStockReorderTotalCost,
        activeProjectsBOMValue,
        activeProjectsCount: projects.filter((p) => p.status === 'PLANNING' || p.status === 'IN_PROGRESS').length,
      },
      valuationByLocation,
      valuationByCategory,
      topValuableItems,
      lowStockItems,
    });
  } catch (error: any) {
    console.error('Error in analytics API:', error);
    return NextResponse.json({ error: 'Lỗi tính toán báo cáo tài sản', message: error?.message }, { status: 500 });
  }
}
