import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { removeVietnameseTones } from '@/lib/vietnamese';
import Papa from 'papaparse';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const itemId = searchParams.get('itemId');
    const q = searchParams.get('q')?.trim() || '';
    const format = searchParams.get('format');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const where: any = {};
    if (type) where.type = type;
    if (itemId) where.itemId = itemId;

    // If CSV export requested
    if (format === 'csv') {
      const allTx = await prisma.inventoryTransaction.findMany({
        where,
        include: {
          item: {
            select: {
              name: true,
              sku: true,
              unit: true,
              category: { select: { name: true } },
            },
          },
          sourceLocation: { select: { name: true } },
          destinationLocation: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const csvRows = allTx.map((tx) => ({
        'Thời gian': new Date(tx.createdAt).toLocaleString('vi-VN'),
        'Loại giao dịch': tx.type,
        'Tên vật tư': tx.item?.name || 'Vật tư đã xoá',
        'Mã SKU': tx.item?.sku || '',
        'Danh mục': tx.item?.category?.name || '',
        'Số lượng': tx.quantity,
        'Đơn vị': tx.item?.unit || '',
        'Tồn trước': tx.previousQuantity ?? '',
        'Tồn sau': tx.newQuantity ?? '',
        'Kho xuất': tx.sourceLocation?.name || '',
        'Kho nhập': tx.destinationLocation?.name || '',
        'Ghi chú / Lý do': tx.note || '',
        'Người thực hiện': tx.createdBy || '',
      }));

      const csvContent = Papa.unparse(csvRows);
      const filename = `h2t-transactions-export-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    let allTransactions = await prisma.inventoryTransaction.findMany({
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
      take: q ? undefined : limit,
      skip: q ? undefined : (page - 1) * limit,
    });

    // If search keyword provided, filter with unaccented matching
    if (q) {
      const cleanQ = removeVietnameseTones(q);
      const qTokens = cleanQ.split(/\s+/).filter(Boolean);

      allTransactions = allTransactions.filter((tx) => {
        const searchBlob = [
          tx.item?.name || '',
          tx.item?.sku || '',
          tx.note || '',
          tx.createdBy || '',
          tx.type,
          tx.sourceLocation?.name || '',
          tx.destinationLocation?.name || '',
        ].join(' ');

        const cleanBlob = removeVietnameseTones(searchBlob);
        return qTokens.every((tok) => cleanBlob.includes(tok));
      });
    }

    const totalCount = q ? allTransactions.length : await prisma.inventoryTransaction.count({ where });
    const paginated = q ? allTransactions.slice((page - 1) * limit, page * limit) : allTransactions;

    const [inStats, outStats] = await Promise.all([
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
      transactions: paginated,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
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
