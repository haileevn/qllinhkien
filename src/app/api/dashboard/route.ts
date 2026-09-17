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
      recentlyAdded,
      favoriteItems,
      recentTransactions,
    ] = await Promise.all([
      prisma.item.count(),
      prisma.storageLocation.count(),
      prisma.category.count(),
      prisma.item.findMany({
        select: {
          id: true,
          quantity: true,
          minimumQuantity: true,
        },
      }),
      prisma.item.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { name: true } },
          location: { select: { name: true, code: true } },
          tags: { include: { tag: true } },
        },
      }),
      prisma.item.findMany({
        where: { isFavorite: true },
        take: 8,
        orderBy: { updatedAt: 'desc' },
        include: {
          category: { select: { name: true } },
          location: { select: { name: true, code: true } },
          tags: { include: { tag: true } },
        },
      }),
      prisma.inventoryTransaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { id: true, name: true, unit: true } },
        },
      }),
    ]);

    let totalQuantity = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    allItems.forEach((i) => {
      totalQuantity += i.quantity;
      if (i.quantity === 0) {
        outOfStockCount++;
      } else if (i.quantity <= i.minimumQuantity) {
        lowStockCount++;
      }
    });

    return NextResponse.json({
      stats: {
        totalItemTypes,
        totalQuantity,
        lowStockCount,
        outOfStockCount,
        totalLocations,
        totalCategories,
      },
      recentlyAdded,
      favorites: favoriteItems,
      recentTransactions,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Lỗi tải thống kê' }, { status: 500 });
  }
}
