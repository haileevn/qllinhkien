import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createSlug } from '@/lib/vietnamese';
import { z } from 'zod';

const projectItemInputSchema = z.object({
  itemId: z.string().min(1, 'Thiếu ID linh kiện'),
  requiredQuantity: z.number().min(0.001, 'Số lượng cần phải lớn hơn 0').default(1),
  notes: z.string().optional().nullable(),
});

const createProjectSchema = z.object({
  name: z.string().min(1, 'Tên dự án không được để trống'),
  description: z.string().optional().nullable(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'ARCHIVED']).default('PLANNING'),
  targetDate: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(projectItemInputSchema).optional().default([]),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const projects = await prisma.project.findMany({
      where,
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
                location: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Compute readiness metrics for each project
    const computedProjects = projects.map((proj) => {
      const totalItemsCount = proj.items.length;
      let readyItemsCount = 0;
      let missingItemsCount = 0;
      let totalBOMValue = 0;
      let isFullyDeducted = proj.items.length > 0;

      proj.items.forEach((pItem) => {
        const itemQty = pItem.item?.quantity ?? 0;
        const requiredQty = pItem.requiredQuantity;
        const price = pItem.item?.purchasePrice ?? 0;
        totalBOMValue += price * requiredQty;

        if (pItem.isDeducted) {
          readyItemsCount++;
        } else if (itemQty >= requiredQty) {
          readyItemsCount++;
          isFullyDeducted = false;
        } else {
          missingItemsCount++;
          isFullyDeducted = false;
        }
      });

      const readinessPercentage =
        totalItemsCount === 0 ? 100 : Math.round((readyItemsCount / totalItemsCount) * 100);

      return {
        ...proj,
        totalItemsCount,
        readyItemsCount,
        missingItemsCount,
        readinessPercentage,
        totalBOMValue,
        isFullyDeducted: proj.items.length > 0 && proj.items.every((i) => i.isDeducted),
      };
    });

    return NextResponse.json({ projects: computedProjects, total: computedProjects.length });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách dự án', message: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const data = parsed.data;

    // Generate unique slug
    let baseSlug = createSlug(data.name);
    let slug = baseSlug;
    let count = 1;
    while (await prisma.project.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    const project = await prisma.project.create({
      data: {
        name: data.name.trim(),
        slug,
        description: data.description?.trim() || null,
        status: data.status,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        budget: data.budget || null,
        notes: data.notes?.trim() || null,
        items: {
          create: (data.items || []).map((i) => ({
            itemId: i.itemId,
            requiredQuantity: i.requiredQuantity,
            notes: i.notes?.trim() || null,
          })),
        },
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Lỗi tạo dự án', message: error?.message }, { status: 500 });
  }
}
