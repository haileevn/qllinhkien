import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;

    const toUpload: File[] = [];
    if (singleFile) toUpload.push(singleFile);
    if (files && files.length > 0) {
      for (const f of files) {
        if (f && !toUpload.includes(f)) toUpload.push(f);
      }
    }

    if (toUpload.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy tệp tải lên' }, { status: 400 });
    }

    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp'];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const storage = getStorageProvider();
    const results = [];

    for (const file of toUpload) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Tệp "${file.name}" vượt quá dung lượng tối đa cho phép (10MB)` },
          { status: 400 }
        );
      }

      const mime = file.type?.toLowerCase() || '';
      if (mime && !ALLOWED_MIME_TYPES.includes(mime)) {
        return NextResponse.json(
          { error: `Định dạng tệp "${file.name}" không hợp lệ. Chỉ chấp nhận ảnh (JPG, PNG, WEBP, GIF, SVG).` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const res = await storage.uploadFile(buffer, file.name || 'image.jpg', file.type || 'image/jpeg');
      results.push({
        url: res.url,
        path: res.path,
        name: file.name,
        size: file.size,
      });
    }

    return NextResponse.json({
      success: true,
      files: results,
      file: results[0], // for single file compatibility
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Lỗi trong quá trình tải ảnh lên' }, { status: 500 });
  }
}
