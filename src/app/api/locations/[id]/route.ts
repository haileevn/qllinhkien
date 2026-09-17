import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getLocationBreadcrumbs, getDescendantLocationIds } from '@/lib/inventory';
import { canEdit } from '@/lib/permissions';
import { z } from 'zod';

const updateLocationSchema = z.object({
  name: z.string().min(1, 'Tên vị trí không được để trống'),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã định danh vị trí' }, { status: 400 });
    }

    const location = await prisma.storageLocation.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        parent: {
          select: { id: true, name: true, code: true },
        },
        children: {
          include: {
            _count: { select: { items: true, children: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'Không tìm thấy vị trí lưu trữ' }, { status: 404 });
    }

    const breadcrumbs = await getLocationBreadcrumbs(location.id).catch(() => []);
    const descendantIds = await getDescendantLocationIds(location.id).catch(() => [location.id]);

    // Get all items in this location and its sub-locations
    const items = await prisma.item.findMany({
      where: {
        locationId: { in: descendantIds },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        location: { select: { id: true, name: true, code: true } },
        tags: { include: { tag: true } },
        images: { select: { id: true, url: true, isPrimary: true } },
      },
      orderBy: { name: 'asc' },
    }).catch(() => []);

    return NextResponse.json({
      location,
      breadcrumbs: breadcrumbs || [],
      items: items || [],
      totalItems: items?.length || 0,
      descendantLocationCount: Math.max(0, (descendantIds?.length || 1) - 1),
    });
  } catch (error: any) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      {
        error: 'Lỗi tải chi tiết vị trí',
        message: error?.message || String(error),
        code: error?.code,
      },
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
        { error: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa vị trí lưu trữ' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã định danh vị trí' }, { status: 400 });
    }

    const existing = await prisma.storageLocation.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy vị trí lưu trữ' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    // Prevent making self as parent or creating cycle
    if (parsed.data.parentId === existing.id) {
      return NextResponse.json({ error: 'Vị trí không thể làm cha của chính nó' }, { status: 400 });
    }

    if (parsed.data.parentId) {
      const descendants = await getDescendantLocationIds(existing.id).catch(() => [existing.id]);
      if (descendants.includes(parsed.data.parentId)) {
        return NextResponse.json({ error: 'Không thể chọn vị trí con làm vị trí cha' }, { status: 400 });
      }
    }

    const updated = await prisma.storageLocation.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name.trim(),
        code: parsed.data.code?.trim() || null,
        description: parsed.data.description?.trim() || null,
        image: parsed.data.image || null,
        parentId: parsed.data.parentId || null,
      },
    });

    return NextResponse.json({ success: true, location: updated });
  } catch (error: any) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Lỗi cập nhật vị trí', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    if (!canEdit(user.role)) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể xóa vị trí lưu trữ' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã định danh vị trí' }, { status: 400 });
    }

    const existing = await prisma.storageLocation.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy vị trí lưu trữ' }, { status: 404 });
    }

    // Check if there are items stored directly or in children
    const descendantIds = await getDescendantLocationIds(existing.id).catch(() => [existing.id]);
    const itemsCount = await prisma.item.count({
      where: { locationId: { in: descendantIds } },
    }).catch(() => 0);

    if (itemsCount > 0) {
      return NextResponse.json(
        { error: `Không thể xóa vì vị trí này (hoặc các vị trí con) đang chứa ${itemsCount} vật tư. Vui lòng chuyển vật tư sang vị trí khác trước.` },
        { status: 400 }
      );
    }

    await prisma.storageLocation.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: 'Lỗi xóa vị trí lưu trữ', message: error?.message || String(error) },
      { status: 500 }
    );
  }
}
