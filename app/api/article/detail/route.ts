import { prisma } from '@/lib/prisma';
import { success, ApiError, requireAuth } from '@/lib/api-response';

/**
 * GET /api/article/detail?id=xxx
 * 获取单篇文章详情（需要登录，只能查看自己的文章）
 */
export async function GET(request: Request) {
  try {
    // 验证登录状态
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiError.badRequest('缺少参数: id');
    }

    // 只查询当前用户的文章
    const article = await prisma.post.findFirst({
      where: {
        id,
        userId: userId!,
      },
      include: {
        category: true,
      },
    });

    if (!article) {
      return ApiError.notFound('文章不存在');
    }

    return success({
      ...article,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return ApiError.internal();
  }
}
