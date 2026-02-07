import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ApiError } from '@/lib/api-response';

/**
 * POST /api/library/upload/confirm
 * 浏览器直传 OSS 后，确认上传并创建 Book 记录
 */
export async function POST(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { objectName, filename, fileUrl, format, fileSize, title, author } = body as {
      objectName: string;
      filename: string;
      fileUrl: string;
      format: string;
      fileSize: number;
      title?: string;
      author?: string;
    };

    // 参数验证
    if (!objectName || !fileUrl || !format || !fileSize) {
      return ApiError.badRequest('缺少必要参数');
    }

    // 验证格式
    const validFormats = ['epub', 'pdf', 'txt', 'md', 'html'];
    if (!validFormats.includes(format)) {
      return ApiError.badRequest(`不支持的直传格式: ${format}，仅支持 ${validFormats.join('、')}`);
    }

    // 从文件名提取标题
    const bookTitle = title || filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

    // 创建 Book 记录
    const book = await prisma.book.create({
      data: {
        title: bookTitle,
        author: author || null,
        format,
        originalUrl: fileUrl,
        readableUrl: null,
        fileSize,
        userId: userId!,
      },
    });

    return NextResponse.json({
      code: 200,
      message: '上传成功',
      data: book,
    });
  } catch (error) {
    console.error('Failed to confirm upload:', error);
    if (error instanceof Error) {
      return ApiError.internal(`确认上传失败: ${error.message}`);
    }
    return ApiError.internal('确认上传失败');
  }
}
