import { prisma } from '@/lib/prisma';
import { requireAuth, success, ApiError } from '@/lib/api-response';

/**
 * GET /api/library/detail?id=xxx
 * 获取书籍详情（含进度、书签、划线笔记）
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
      include: {
        progress: true,
        bookmarks: {
          orderBy: { createdAt: 'desc' },
        },
        highlights: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!book) {
      return ApiError.notFound('书籍不存在');
    }

    return success(book);
  } catch (error) {
    console.error('Failed to get book detail:', error);
    return ApiError.internal('获取书籍详情失败');
  }
}
