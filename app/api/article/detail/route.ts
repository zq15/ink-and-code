import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';

/**
 * GET /api/article/detail?id=xxx
 * 获取单篇文章详情
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiError.badRequest('Missing required parameter: id');
    }

    const article = await prisma.post.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!article) {
      return ApiError.notFound('Article not found');
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
