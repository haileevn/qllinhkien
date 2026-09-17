import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { execSync } from 'child_process';

export async function GET(req: NextRequest) {
  try {
    console.log('🚀 Triggering manual/automatic database initialization...');

    // 1. Run prisma db push
    try {
      const output = execSync('npx prisma db push --skip-generate --accept-data-loss', {
        env: { ...process.env },
        stdio: 'pipe',
      });
      console.log('Prisma push output:', output.toString());
    } catch (e: any) {
      const err = e?.stderr?.toString() || e?.stdout?.toString() || e?.message;
      console.error('Prisma push error:', err);
      return NextResponse.json(
        {
          success: false,
          error: `Lỗi kết nối PostgreSQL: ${err}`,
          hint: 'Kiểm tra biến DATABASE_URL trên Coolify. Nếu dùng PostgreSQL của Coolify, hãy copy chuỗi "Internal Database URL".',
        },
        { status: 500 }
      );
    }

    // 2. Ensure Admin User
    const passwordHash = await hashPassword('admin123456');
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        name: 'Quản trị viên H2T',
        passwordHash,
        role: 'ADMIN',
      },
    });

    // 3. Ensure Units
    const defaultUnits = [
      { name: 'cái', isDefault: true, order: 1 },
      { name: 'bộ', isDefault: false, order: 2 },
      { name: 'hộp', isDefault: false, order: 3 },
      { name: 'cuộn', isDefault: false, order: 4 },
      { name: 'mét', isDefault: false, order: 5 },
      { name: 'gói', isDefault: false, order: 6 },
      { name: 'thanh', isDefault: false, order: 7 },
      { name: 'kg', isDefault: false, order: 8 },
    ];
    for (const u of defaultUnits) {
      await prisma.unit.upsert({
        where: { name: u.name },
        update: {},
        create: u,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: 'Khởi tạo cơ sở dữ liệu và tài khoản quản trị thành công!',
      admin: {
        username: admin.username,
        defaultPassword: 'admin123456',
      },
    });
  } catch (error: any) {
    console.error('Init DB error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Lỗi trong quá trình khởi tạo database',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
