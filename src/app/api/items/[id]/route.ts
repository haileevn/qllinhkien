import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getLocationBreadcrumbs } from '@/lib/inventory';
import { createSlug } from '@/lib/vietnamese';
import { canEdit } from '@/lib/permissions';
import { z } from 'zod';

const updateItemSchema = z.object({
  name: z.string().min(1, 'Tên vật tư không được để trống'),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  locationId: z.string().min(1, 'Vui lòng chọn vị trí lưu trữ'),
  unit: z.string().min(1, 'Đơn vị không được để trống'),
  minimumQuantity: z.number().min(0),
  sku: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  condition: z.string().default('NEW'),
  container: z.string().optional().nullable(),
  exactPosition: z.string().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  qrCodeValue: z.string().optional().nullable(),
  purchaseUrl: z.string().optional().nullable(),
  mainImage: z.string().optional().nullable(),
  additionalImages: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;

    const item = await prisma.item.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        category: {
          include: { parent: true },
        },
        location: {
          include: { parent: true },
        },
        tags: {
          include: { tag: true },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        transactions: {
          include: {
            sourceLocation: { select: { id: true, name: true, code: true } },
            destinationLocation: { select: { id: true, name: true, code: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Không tìm thấy vật tư' }, { status: 404 });
    }

    const breadcrumbs = await getLocationBreadcrumbs(item.locationId).catch(() => []);

    return NextResponse.json({
      item,
      breadcrumbs: breadcrumbs || [],
    });
  } catch (error: any) {
    console.error('Error fetching item details:', error);
    return NextResponse.json(
      { error: 'Lỗi tải thông tin vật tư', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    if (!canEdit(user.role)) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa vật tư' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy vật tư' }, { status: 404 });
    }

    // Update slug if name changed
    let slug = existing.slug;
    if (data.name.trim() !== existing.name) {
      let baseSlug = createSlug(data.name);
      slug = baseSlug;
      let count = 1;
      while (
        await prisma.item.findFirst({
          where: { slug, NOT: { id } },
        })
      ) {
        slug = `${baseSlug}-${count++}`;
      }
    }

    const updated = await prisma.item.update({
      where: { id },
      data: {
        name: data.name.trim(),
        slug,
        categoryId: data.categoryId,
        locationId: data.locationId,
        unit: data.unit.trim(),
        minimumQuantity: data.minimumQuantity,
        sku: data.sku?.trim() || null,
        subcategory: data.subcategory?.trim() || null,
        brand: data.brand?.trim() || null,
        model: data.model?.trim() || null,
        condition: data.condition || 'NEW',
        container: data.container?.trim() || null,
        exactPosition: data.exactPosition?.trim() || null,
        purchasePrice: data.purchasePrice !== undefined ? data.purchasePrice : existing.purchasePrice,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        supplier: data.supplier?.trim() || null,
        notes: data.notes?.trim() || null,
        barcode: data.barcode?.trim() || null,
        qrCodeValue: data.qrCodeValue?.trim() || existing.qrCodeValue,
        purchaseUrl: data.purchaseUrl?.trim() || null,
        mainImage: data.mainImage !== undefined ? data.mainImage : existing.mainImage,
        isFavorite: data.isFavorite !== undefined ? data.isFavorite : existing.isFavorite,
      },
    });

    // Update tags if provided
    if (data.tags !== undefined) {
      await prisma.itemTag.deleteMany({ where: { itemId: id } });
      for (const t of data.tags) {
        const tagName = t.trim().toLowerCase();
        if (tagName) {
          const tagSlug = createSlug(tagName);
          const tagRecord = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName, slug: tagSlug },
          });
          await prisma.itemTag.create({
            data: { itemId: id, tagId: tagRecord.id },
          });
        }
      }
    }

    // Update images if provided
    if (data.additionalImages !== undefined) {
      await prisma.itemImage.deleteMany({ where: { itemId: id } });
      for (let i = 0; i < data.additionalImages.length; i++) {
        const url = data.additionalImages[i];
        if (url) {
          await prisma.itemImage.create({
            data: {
              itemId: id,
              url,
              order: i,
              isPrimary: i === 0 && !data.mainImage,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật thông tin vật tư' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    if (!canEdit(user.role)) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể xóa vật tư' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.item.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Lỗi xóa vật tư' }, { status: 500 });
  }
}
