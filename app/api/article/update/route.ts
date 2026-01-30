import { prisma } from '@/lib/prisma';
import {
  success,
  ApiError,
  validateApiKey,
  validateRequired,
} from '@/lib/api-response';

/**
 * POST /api/article/update
 * 更新文章
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

    // 如果要更新 slug，检查新 slug 是否已被使用
    if (data.slug && data.slug !== existingArticle.slug) {
      const slugExists = await prisma.post.findUnique({
        where: { slug: data.slug },
      });
      if (slugExists) {
        return ApiError.conflict('An article with this slug already exists');
      }
    }

    const updatedArticle = await prisma.post.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.published !== undefined && { published: data.published }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
      },
      include: {
        category: true,
      },
    });

    return success(updatedArticle, 'Article updated successfully');
  } catch (error) {
    console.error('Failed to update article:', error);
    return ApiError.internal();
  }
}
