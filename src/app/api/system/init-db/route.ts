import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db-bootstrap';

export async function GET(req: NextRequest) {
  try {
    console.log('🚀 Triggering manual database initialization via /api/system/init-db...');
    const result = await ensureDatabaseReady();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || result.message,
          hint: 'Vui lòng kiểm tra biến DATABASE_URL trên Coolify (đảm bảo host, user, password và tên database chính xác).',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Khởi tạo cơ sở dữ liệu và tài khoản quản trị thành công!',
      admin: {
        username: 'admin',
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

