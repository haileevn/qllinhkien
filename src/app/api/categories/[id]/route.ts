import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSlug } from '@/lib/vietnamese';
import { canEdit } from '@/lib/permissions';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống'),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            _count: { select: { items: true } },
          },
        },
        items: {
          include: {
            location: true,
            tags: { include: { tag: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Không tìm thấy danh mục' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Lỗi tải chi tiết danh mục' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    if (!canEdit(user.role)) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể chỉnh sửa danh mục' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    if (parsed.data.parentId === id) {
      return NextResponse.json({ error: 'Danh mục không thể làm cha của chính nó' }, { status: 400 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        icon: parsed.data.icon || null,
        parentId: parsed.data.parentId || null,
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật danh mục' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    if (!canEdit(user.role)) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn chỉ có quyền xem (Viewer), không thể xóa danh mục' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const itemsCount = await prisma.item.count({
      where: { categoryId: id },
    });

    if (itemsCount > 0) {
      return NextResponse.json(
        { error: `Không thể xóa vì danh mục đang chứa ${itemsCount} vật tư.` },
        { status: 400 }
      );
    }

    const childrenCount = await prisma.category.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      return NextResponse.json(
        { error: `Không thể xóa vì danh mục đang chứa ${childrenCount} danh mục con. Vui lòng di chuyển hoặc xóa danh mục con trước.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Lỗi xóa danh mục' }, { status: 500 });
  }
}
