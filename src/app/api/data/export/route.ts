import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Papa from 'papaparse';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const format = req.nextUrl.searchParams.get('format') || 'json';

    if (format === 'csv') {
      const items = await prisma.item.findMany({
        include: {
          category: { select: { name: true } },
          location: { select: { name: true, code: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { name: 'asc' },
      });

      const csvRows = items.map((i) => ({
        'Mã SKU': i.sku || '',
        'Tên vật tư': i.name,
        'Danh mục': i.category.name,
        'Phân loại phụ': i.subcategory || '',
        'Thương hiệu': i.brand || '',
        'Model': i.model || '',
        'Số lượng': i.quantity,
        'Đơn vị': i.unit,
        'Tối thiểu': i.minimumQuantity,
        'Tình trạng': i.condition,
        'Vị trí lưu trữ': i.location.name,
        'Tủ / Kệ': i.container || '',
        'Ngăn / Hộp / Vị trí chi tiết': i.exactPosition || '',
        'Giá mua': i.purchasePrice || '',
        'Ngày mua': i.purchaseDate ? i.purchaseDate.toISOString().split('T')[0] : '',
        'Nhà cung cấp': i.supplier || '',
        'Mã vạch': i.barcode || '',
        'Thẻ (Tags)': i.tags.map((t) => t.tag.name).join(', '),
        'Ghi chú': i.notes || '',
      }));

      const csvContent = Papa.unparse(csvRows);
      const filename = `h2t-inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Full JSON Backup (complete relational snapshot)
    const [categories, locations, units, tags, items, transactions] = await Promise.all([
      prisma.category.findMany(),
      prisma.storageLocation.findMany(),
      prisma.unit.findMany(),
      prisma.tag.findMany(),
      prisma.item.findMany({
        include: {
          tags: true,
          images: true,
        },
      }),
      prisma.inventoryTransaction.findMany(),
    ]);

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: user.username,
      data: {
        categories,
        locations,
        units,
        tags,
        items,
        transactions,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const filename = `h2t-inventory-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Lỗi xuất dữ liệu' }, { status: 500 });
  }
}
