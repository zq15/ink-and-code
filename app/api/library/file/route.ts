import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ApiError } from '@/lib/api-response';

/**
 * GET /api/library/file?id=xxx
 * 代理获取书籍文件内容（避免 CORS 问题）
 */
export async function GET(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiError.badRequest('缺少书籍 ID');
    }

    const book = await prisma.book.findFirst({
      where: { id, userId: userId! },
      select: {
        originalUrl: true,
        readableUrl: true,
        format: true,
      },
    });

    if (!book) {
      return ApiError.notFound('书籍不存在');
    }

    // 优先使用转换后的 URL
    const fileUrl = book.readableUrl || book.originalUrl;

    // 从 OSS 获取文件
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return ApiError.internal(`文件获取失败: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to proxy file:', error);
    return ApiError.internal('文件获取失败');
  }
}
