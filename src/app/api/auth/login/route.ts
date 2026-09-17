import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword, createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const cleanUsername = username.trim().toLowerCase();

    // Check if any users exist in database
    const userCount = await prisma.user.count().catch(() => -1);

    // If tables are missing or count failed, return clear DB error
    if (userCount === -1) {
      return NextResponse.json(
        {
          error:
            'Chưa khởi tạo bảng trong cơ sở dữ liệu. Vui lòng chạy lệnh "npx prisma db push" hoặc kiểm tra lại DATABASE_URL.',
        },
        { status: 500 }
      );
    }

    // Auto-create default admin if database is completely empty
    if (userCount === 0) {
      const defaultHash = await hashPassword('admin123456');
      await prisma.user.create({
        data: {
          username: 'admin',
          passwordHash: defaultHash,
          name: 'Quản trị viên H2T',
          role: 'ADMIN',
        },
      });

      // Also create default units if empty
      const unitCount = await prisma.unit.count().catch(() => 0);
      if (unitCount === 0) {
        const defaultUnits = ['cái', 'bộ', 'hộp', 'cuộn', 'mét', 'gói', 'thanh', 'kg'];
        for (const u of defaultUnits) {
          await prisma.unit.create({ data: { name: u, isDefault: true } }).catch(() => {});
        }
      }
    }

    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Đã xảy ra lỗi máy chủ kết nối cơ sở dữ liệu' },
      { status: 500 }
    );
  }
}
