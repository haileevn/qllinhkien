import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(1, 'Họ tên không được để trống').optional(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional().or(z.literal('')),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    if (!isAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa tài khoản' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (parsed.data.name) {
      updateData.name = parsed.data.name.trim();
    }

    // Role update safety checks
    if (parsed.data.role && parsed.data.role !== targetUser.role) {
      if (targetUser.role === 'ADMIN' && parsed.data.role !== 'ADMIN') {
        // Ensure at least one other ADMIN remains
        const adminCount = await prisma.user.count({
          where: { role: 'ADMIN' },
        });
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: 'Không thể hạ quyền tài khoản Quản trị viên duy nhất của hệ thống' },
            { status: 400 }
          );
        }
      }
      updateData.role = parsed.data.role;
    }

    // Password reset if provided
    if (parsed.data.password && parsed.data.password.trim().length >= 6) {
      updateData.passwordHash = await hashPassword(parsed.data.password.trim());
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi cập nhật người dùng' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    if (!isAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Chỉ Quản trị viên (Admin) mới có quyền xóa tài khoản' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent self-deletion
    if (session.userId === id) {
      return NextResponse.json(
        { error: 'Bạn không thể tự xóa tài khoản đang đăng nhập của chính mình' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Prevent deleting the last Admin
    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Không thể xóa tài khoản Quản trị viên duy nhất của hệ thống' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa tài khoản người dùng thành công' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi xóa người dùng' },
      { status: 500 }
    );
  }
}
