import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename) {
      return NextResponse.json({ error: 'Không tìm thấy tệp' }, { status: 404 });
    }

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadsDir, safeFilename);

    try {
      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(safeFilename).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return NextResponse.json({ error: 'Hình ảnh không tồn tại' }, { status: 404 });
      }
      throw err;
    }
  } catch (error: any) {
    console.error('Serve upload error:', error);
    return NextResponse.json({ error: 'Lỗi tải ảnh' }, { status: 500 });
  }
}
