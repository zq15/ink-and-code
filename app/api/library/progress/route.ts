import { prisma } from '@/lib/prisma';
import { requireAuth, success, ApiError } from '@/lib/api-response';

/**
 * GET /api/library/progress?bookId=xxx
 * 获取阅读进度
 */
export async function GET(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return ApiError.badRequest('缺少 bookId');
    }

    const progress = await prisma.readingProgress.findUnique({
      where: {
        userId_bookId: { userId: userId!, bookId },
      },
    });

    return success(progress);
  } catch (error) {
    console.error('Failed to get progress:', error);
    return ApiError.internal('获取进度失败');
  }
}

/**
 * POST /api/library/progress
 * 保存阅读进度（upsert）
 * 
 * Body: {
 *   bookId: string;
 *   currentLocation?: string;
 *   percentage?: number;
 *   readTimeDelta?: number; // 本次阅读新增秒数
 * }
 */
export async function POST(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const data = await request.json();
    const { bookId, currentLocation, percentage, readTimeDelta } = data;

    if (!bookId) {
      return ApiError.badRequest('缺少 bookId');
    }

    // 验证书籍所有权
    const book = await prisma.book.findFirst({
      where: { id: bookId, userId: userId! },
    });
    if (!book) {
      return ApiError.notFound('书籍不存在');
    }

    const progress = await prisma.readingProgress.upsert({
      where: {
        userId_bookId: { userId: userId!, bookId },
      },
      create: {
        userId: userId!,
        bookId,
        currentLocation: currentLocation || null,
        percentage: percentage || 0,
        lastReadAt: new Date(),
        totalReadTime: readTimeDelta || 0,
      },
      update: {
        ...(currentLocation !== undefined && { currentLocation }),
        ...(percentage !== undefined && { percentage }),
        lastReadAt: new Date(),
        ...(readTimeDelta && {
          totalReadTime: { increment: readTimeDelta },
        }),
      },
    });

    return success(progress);
  } catch (error) {
    console.error('Failed to save progress:', error);
    return ApiError.internal('保存进度失败');
  }
}
