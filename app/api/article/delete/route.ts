import { prisma } from '@/lib/prisma';
import {
  success,
  ApiError,
  requireAuth,
  validateRequired,
} from '@/lib/api-response';

/**
 * POST /api/article/delete
 * 删除文章（需要登录，只能删除自己的文章）
 */
export async function POST(request: Request) {
  try {
    // 验证登录状态
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const data = await request.json();

    // 验证必填字段
    const validationError = validateRequired(data, ['id']);
    if (validationError) return validationError;

    // 检查文章是否存在且属于当前用户
    const existingArticle = await prisma.post.findFirst({
      where: {
        id: data.id,
        userId: userId!,
      },
    });

    if (!existingArticle) {
      return ApiError.notFound('文章不存在或无权限删除');
    }

    await prisma.post.delete({
      where: { id: data.id },
    });

    return success(null, '文章删除成功');
  } catch (error) {
    console.error('Failed to delete article:', error);
    return ApiError.internal();
  }
}
