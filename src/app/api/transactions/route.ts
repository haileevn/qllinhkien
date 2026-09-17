import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const itemId = searchParams.get('itemId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const where: any = {};
    if (type) where.type = type;
    if (itemId) where.itemId = itemId;

    const [transactions, total, inStats, outStats] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        include: {
          item: {
            select: {
              id: true,
              name: true,
              unit: true,
              sku: true,
              category: { select: { name: true } },
            },
          },
          sourceLocation: { select: { id: true, name: true, code: true } },
          destinationLocation: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.inventoryTransaction.count({ where }),
      prisma.inventoryTransaction.aggregate({
        where: { type: 'IN' },
        _sum: { quantity: true },
        _count: true,
      }),
      prisma.inventoryTransaction.aggregate({
        where: { type: 'OUT' },
        _sum: { quantity: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalInCount: inStats._count,
        totalInQty: inStats._sum.quantity || 0,
        totalOutCount: outStats._count,
        totalOutQty: outStats._sum.quantity || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Lỗi tải lịch sử giao dịch' }, { status: 500 });
  }
}
