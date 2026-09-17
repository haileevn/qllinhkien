import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSlug, removeVietnameseTones } from '@/lib/vietnamese';
import { getDescendantLocationIds, generateUniqueCode } from '@/lib/inventory';
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(1, 'Tên vật tư không được để trống'),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  locationId: z.string().min(1, 'Vui lòng chọn vị trí lưu trữ'),
  quantity: z.number().min(0, 'Số lượng phải lớn hơn hoặc bằng 0').default(0),
  unit: z.string().min(1, 'Đơn vị không được để trống').default('cái'),
  minimumQuantity: z.number().min(0).default(0),
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
  tags: z.array(z.string()).optional(), // Tag names or IDs
  isFavorite: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q')?.trim() || '';
    const categoryId = searchParams.get('categoryId');
    const locationId = searchParams.get('locationId');
    const condition = searchParams.get('condition');
    const status = searchParams.get('status'); // 'all', 'low_stock', 'out_of_stock', 'in_stock'
    const isFavorite = searchParams.get('isFavorite');
    const tag = searchParams.get('tag');
    const sort = searchParams.get('sort') || 'updated_desc';

    // Base filter conditions
    const where: any = {};

    if (condition) {
      where.condition = condition;
    }

    if (isFavorite === 'true') {
      where.isFavorite = true;
    }

    if (categoryId) {
      // Also get subcategories
      const subcats = await prisma.category.findMany({
        where: { parentId: categoryId },
        select: { id: true },
      });
      const catIds = [categoryId, ...subcats.map((s) => s.id)];
      where.categoryId = { in: catIds };
    }

    if (locationId) {
      const descendantIds = await getDescendantLocationIds(locationId);
      where.locationId = { in: descendantIds };
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            OR: [{ name: { equals: tag, mode: 'insensitive' } }, { slug: tag }, { id: tag }],
          },
        },
      };
    }

    // Sort mapping
    let orderBy: any = { updatedAt: 'desc' };
    if (sort === 'name_asc') orderBy = { name: 'asc' };
    if (sort === 'name_desc') orderBy = { name: 'desc' };
    if (sort === 'qty_asc') orderBy = { quantity: 'asc' };
    if (sort === 'qty_desc') orderBy = { quantity: 'desc' };
    if (sort === 'created_desc') orderBy = { createdAt: 'desc' };

    let items = await prisma.item.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, code: true } },
        tags: { include: { tag: true } },
        images: { orderBy: { order: 'asc' } },
      },
      orderBy,
    });

    // Client-side / in-memory status filter for accurate low stock condition
    if (status === 'low_stock') {
      items = items.filter((i) => i.quantity <= i.minimumQuantity && i.quantity > 0);
    } else if (status === 'out_of_stock') {
      items = items.filter((i) => i.quantity === 0);
    } else if (status === 'in_stock') {
      items = items.filter((i) => i.quantity > i.minimumQuantity);
    }

    // Vietnamese accent-tolerant search
    if (q) {
      const cleanQ = removeVietnameseTones(q);
      const qTokens = cleanQ.split(/\s+/).filter(Boolean);

      items = items.filter((item) => {
        const searchableFields = [
          item.name,
          item.sku || '',
          item.description || '',
          item.brand || '',
          item.model || '',
          item.category?.name || '',
          item.location?.name || '',
          item.container || '',
          item.exactPosition || '',
          item.barcode || '',
          item.notes || '',
          ...(item.tags?.map((t) => t.tag.name) || []),
        ].join(' ');

        const cleanField = removeVietnameseTones(searchableFields);
        return qTokens.every((token) => cleanField.includes(token));
      });
    }

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách vật tư' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const data = parsed.data;

    // Generate unique slug
    let baseSlug = createSlug(data.name);
    let slug = baseSlug;
    let count = 1;
    while (await prisma.item.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    // Generate unique dynamic QR code value if not provided
    let qrCodeValue = data.qrCodeValue?.trim();
    if (!qrCodeValue) {
      let attempts = 0;
      do {
        qrCodeValue = generateUniqueCode('ITM');
        const exists = await prisma.item.findFirst({ where: { qrCodeValue } });
        if (!exists) break;
        attempts++;
      } while (attempts < 5);
    }

    const item = await prisma.item.create({
      data: {
        name: data.name.trim(),
        slug,
        categoryId: data.categoryId,
        locationId: data.locationId,
        quantity: data.quantity,
        unit: data.unit.trim(),
        minimumQuantity: data.minimumQuantity,
        sku: data.sku?.trim() || null,
        subcategory: data.subcategory?.trim() || null,
        brand: data.brand?.trim() || null,
        model: data.model?.trim() || null,
        condition: data.condition || 'NEW',
        container: data.container?.trim() || null,
        exactPosition: data.exactPosition?.trim() || null,
        purchasePrice: data.purchasePrice || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        supplier: data.supplier?.trim() || null,
        notes: data.notes?.trim() || null,
        barcode: data.barcode?.trim() || null,
        qrCodeValue,
        purchaseUrl: data.purchaseUrl?.trim() || null,
        mainImage: data.mainImage || null,
        isFavorite: data.isFavorite ?? false,
      },
    });

    // Handle additional images
    if (data.additionalImages && data.additionalImages.length > 0) {
      for (let i = 0; i < data.additionalImages.length; i++) {
        const imgUrl = data.additionalImages[i];
        if (imgUrl) {
          await prisma.itemImage.create({
            data: {
              itemId: item.id,
              url: imgUrl,
              isPrimary: i === 0 && !data.mainImage,
              order: i,
            },
          });
        }
      }
    }

    // Handle tags
    if (data.tags && data.tags.length > 0) {
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
            data: {
              itemId: item.id,
              tagId: tagRecord.id,
            },
          });
        }
      }
    }

    // Create initial transaction if quantity > 0
    if (data.quantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: 'IN',
          quantity: data.quantity,
          previousQuantity: 0,
          newQuantity: data.quantity,
          destinationLocationId: data.locationId,
          note: 'Nhập kho ban đầu khi tạo vật tư',
          createdBy: user.username,
        },
      });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Lỗi tạo vật tư' }, { status: 500 });
  }
}
