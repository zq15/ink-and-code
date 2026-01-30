import { prisma } from '@/lib/prisma';
import {
  success,
  ApiError,
  validateApiKey,
  validateRequired,
} from '@/lib/api-response';

/**
 * POST /api/article/delete
 * 删除文章
 */
export async function POST(request: Request) {
  try {
    // 验证 API Key
    const authError = validateApiKey(request);
    if (authError) return authError;

    const data = await request.json();

    // 验证必填字段
    const validationError = validateRequired(data, ['id']);
    if (validationError) return validationError;

    // 检查文章是否存在
    const existingArticle = await prisma.post.findUnique({
      where: { id: data.id },
    });

    if (!existingArticle) {
      return ApiError.notFound('Article not found');
    }

    await prisma.post.delete({
      where: { id: data.id },
    });

    return success(null, 'Article deleted successfully');
  } catch (error) {
    console.error('Failed to delete article:', error);
    return ApiError.internal();
  }
}
