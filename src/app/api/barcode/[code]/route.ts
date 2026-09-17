import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { code } = await params;
    const decoded = decodeURIComponent(code).trim();

    // 1. Check if it is a dynamic Location QR: "H2T-LOC-XXXXXX" or "LOCATION:<id|code>"
    if (decoded.startsWith('H2T-LOC-') || decoded.startsWith('LOCATION:')) {
      const locCode = decoded.replace('LOCATION:', '').trim();
      const loc = await prisma.storageLocation.findFirst({
        where: {
          OR: [
            { code: { equals: decoded, mode: 'insensitive' } },
            { code: { equals: locCode, mode: 'insensitive' } },
            { id: locCode },
          ],
        },
      });
      if (loc) {
        return NextResponse.json({
          type: 'location',
          id: loc.id,
          name: loc.name,
          url: `/locations/${loc.id}`,
        });
      }
    }

    // 2. Direct exact check on Item.qrCodeValue (handles H2T-ITM-XXXXXX or any exact custom QR)
    const exactQrItem = await prisma.item.findFirst({
      where: {
        OR: [
          { qrCodeValue: { equals: decoded, mode: 'insensitive' } },
          { barcode: { equals: decoded, mode: 'insensitive' } },
          { sku: { equals: decoded, mode: 'insensitive' } },
          { id: decoded },
        ],
      },
      include: {
        category: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    if (exactQrItem) {
      return NextResponse.json({
        type: 'item',
        id: exactQrItem.id,
        name: exactQrItem.name,
        url: `/items/${exactQrItem.id}`,
      });
    }

    // 3. Check legacy "ITEM:<val>" pattern
    if (decoded.startsWith('ITEM:')) {
      const val = decoded.replace('ITEM:', '').trim();
      const item = await prisma.item.findFirst({
        where: {
          OR: [
            { id: val },
            { sku: { equals: val, mode: 'insensitive' } },
            { slug: { equals: val, mode: 'insensitive' } },
            { qrCodeValue: { equals: decoded, mode: 'insensitive' } },
            { barcode: { equals: val, mode: 'insensitive' } },
          ],
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
    }

    // 4. Fallback check for location by code or ID
    const loc = await prisma.storageLocation.findFirst({
      where: {
        OR: [
          { code: { equals: decoded, mode: 'insensitive' } },
          { id: decoded },
          { name: { equals: decoded, mode: 'insensitive' } },
        ],
      },
    });
    if (loc) {
      return NextResponse.json({
        type: 'location',
        id: loc.id,
        name: loc.name,
        url: `/locations/${loc.id}`,
      });
    }

    return NextResponse.json(
      { error: 'Không tìm thấy vật tư hoặc vị trí khớp với mã này' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return NextResponse.json({ error: 'Lỗi tra cứu mã vạch' }, { status: 500 });
  }
}

