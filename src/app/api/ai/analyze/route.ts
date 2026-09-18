import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeComponentWithAI } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để sử dụng tính năng AI' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, imageUrl, imageBase64, mimeType, existingNotes, customApiKey } = body;

    if (!title && !imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp tiêu đề hoặc ảnh linh kiện để AI phân tích' },
        { status: 400 }
      );
    }

    // Fetch system categories to help AI categorize correctly
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const result = await analyzeComponentWithAI(
      {
        title: title?.trim() || undefined,
        imageUrl: imageUrl?.trim() || undefined,
        imageBase64: imageBase64 || undefined,
        mimeType: mimeType || undefined,
        existingNotes: existingNotes?.trim() || undefined,
        categories: categories,
      },
      customApiKey?.trim() || undefined
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('AI analyze API error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Lỗi trong quá trình phân tích AI',
      },
      { status: 500 }
    );
  }
}
