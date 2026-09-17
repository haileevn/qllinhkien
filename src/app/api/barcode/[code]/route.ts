import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { code } = await params;
    const decoded = decodeURIComponent(code).trim();

    // 1. Check if it is an exact location QR: e.g. "LOCATION:<id>" or just ID
    if (decoded.startsWith('LOCATION:')) {
      const locId = decoded.replace('LOCATION:', '').trim();
      const loc = await prisma.storageLocation.findFirst({
        where: { OR: [{ id: locId }, { code: locId }] },
      });
      if (loc) {
        return NextResponse.json({ type: 'location', id: loc.id, url: `/locations/${loc.id}` });
      }
    }

    // 2. Check if it is an item QR: e.g. "ITEM:<id|sku|slug>"
    let itemQuery: any = {
      OR: [{ barcode: decoded }, { sku: decoded }, { qrCodeValue: decoded }, { slug: decoded }],
    };

    if (decoded.startsWith('ITEM:')) {
      const val = decoded.replace('ITEM:', '').trim();
      itemQuery = {
        OR: [
          { id: val },
          { sku: val },
          { slug: val },
          { qrCodeValue: decoded },
          { barcode: val },
        ],
      };
    }

    const item = await prisma.item.findFirst({
      where: itemQuery,
      include: {
        category: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    if (item) {
      return NextResponse.json({
        type: 'item',
        id: item.id,
        name: item.name,
        url: `/items/${item.id}`,
      });
    }

    // 3. Fallback check for location by code or ID
    const loc = await prisma.storageLocation.findFirst({
      where: { OR: [{ id: decoded }, { code: decoded }] },
    });
    if (loc) {
      return NextResponse.json({ type: 'location', id: loc.id, url: `/locations/${loc.id}` });
    }

    return NextResponse.json({ error: 'Không tìm thấy vật tư hoặc vị trí khớp với mã này' }, { status: 404 });
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return NextResponse.json({ error: 'Lỗi tra cứu mã vạch' }, { status: 500 });
  }
}
