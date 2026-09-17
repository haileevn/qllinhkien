import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSlug } from '@/lib/vietnamese';
import { z } from 'zod';

const projectItemInputSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().min(1, 'Thiếu ID linh kiện'),
  requiredQuantity: z.number().min(0.001, 'Số lượng cần phải lớn hơn 0').default(1),
  notes: z.string().optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Tên dự án không được để trống'),
  description: z.string().optional().nullable(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'ARCHIVED']),
  targetDate: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(projectItemInputSchema).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                quantity: true,
                unit: true,
                mainImage: true,
                purchasePrice: true,
                purchaseUrl: true,
                location: { select: { id: true, name: true, code: true } },
                category: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    // Compute detailed item-level readiness and summary
    let totalItemsCount = project.items.length;
    let readyItemsCount = 0;
    let missingItemsCount = 0;
    let totalBOMValue = 0;

    const itemsWithStatus = project.items.map((pItem) => {
      const currentStock = pItem.item?.quantity ?? 0;
      const required = pItem.requiredQuantity;
      const isEnough = pItem.isDeducted || currentStock >= required;
      const shortage = pItem.isDeducted ? 0 : Math.max(0, required - currentStock);
      const price = pItem.item?.purchasePrice ?? 0;
      const itemTotalValue = price * required;
      totalBOMValue += itemTotalValue;

      if (isEnough) {
        readyItemsCount++;
      } else {
        missingItemsCount++;
      }

      return {
        ...pItem,
        currentStock,
        isEnough,
        shortage,
        itemTotalValue,
      };
    });

    const readinessPercentage =
      totalItemsCount === 0 ? 100 : Math.round((readyItemsCount / totalItemsCount) * 100);

    const isFullyDeducted = project.items.length > 0 && project.items.every((i) => i.isDeducted);

    return NextResponse.json({
      project: {
        ...project,
        items: itemsWithStatus,
        totalItemsCount,
        readyItemsCount,
        missingItemsCount,
        readinessPercentage,
        totalBOMValue,
        isFullyDeducted,
      },
    });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Lỗi tải dự án', message: error?.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    // Update basic fields
    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        status: data.status,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        budget: data.budget || null,
        notes: data.notes?.trim() || null,
      },
    });

    // If items provided, sync ProjectItems (delete removed, upsert existing/new)
    if (data.items) {
      const incomingItemIds = data.items.map((i) => i.itemId);

      // Delete items not in incoming list (unless already deducted)
      await prisma.projectItem.deleteMany({
        where: {
          projectId: existing.id,
          itemId: { notIn: incomingItemIds },
        },
      });

      // Upsert each item
      for (const item of data.items) {
        await prisma.projectItem.upsert({
          where: {
            projectId_itemId: {
              projectId: existing.id,
              itemId: item.itemId,
            },
          },
          update: {
            requiredQuantity: item.requiredQuantity,
            notes: item.notes?.trim() || null,
          },
          create: {
            projectId: existing.id,
            itemId: item.itemId,
            requiredQuantity: item.requiredQuantity,
            notes: item.notes?.trim() || null,
          },
        });
      }
    }

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật dự án', message: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa dự án' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Lỗi xóa dự án', message: error?.message }, { status: 500 });
  }
}
