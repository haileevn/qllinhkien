import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { getGeminiApiKey, saveGeminiApiKey, testGeminiConnection } from '@/lib/gemini';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const key = await getGeminiApiKey();
    const isConfigured = !!(key && key.length > 5);
    const maskedKey = isConfigured
      ? `${key.slice(0, 4)}...${key.slice(-4)}`
      : null;

    return NextResponse.json({
      isConfigured,
      maskedKey,
      model: 'gemini-2.5-flash',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi kiểm tra cấu hình AI' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    if (!canEdit(user.role)) {
      return NextResponse.json({ error: 'Bạn không có quyền thay đổi cấu hình hệ thống' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { apiKey, testOnly } = body;

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập Google Gemini API Key hợp lệ' }, { status: 400 });
    }

    const cleanKey = apiKey.trim();

    // Test the API key with Google Gemini
    const testRes = await testGeminiConnection(cleanKey);
    if (!testRes.success) {
      return NextResponse.json(
        {
          error: `Xác thực API Key thất bại: ${testRes.error || 'Key không hợp lệ hoặc đã hết hạn'}`,
        },
        { status: 400 }
      );
    }

    if (testOnly) {
      return NextResponse.json({
        success: true,
        message: 'Kết nối Google Gemini API thành công!',
      });
    }

    // Save to Database
    await saveGeminiApiKey(cleanKey);

    return NextResponse.json({
      success: true,
      message: 'Đã lưu và kích hoạt Google Gemini API Key thành công!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi lưu cấu hình AI' }, { status: 500 });
  }
}
