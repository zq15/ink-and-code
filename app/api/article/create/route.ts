import { prisma } from '@/lib/prisma';
import {
  created,
  ApiError,
  requireAuth,
  validateRequired,
} from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * POST /api/article/create
 * 创建新文章（需要登录）
 */
export async function POST(request: Request) {
  try {
    // 验证登录状态
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const data = await request.json();

    // 验证必填字段（content 可选，允许创建空白文章）
    const validationError = validateRequired(data, ['title', 'slug']);
    if (validationError) {
      return validationError;
    }

    // 检查当前用户下 slug 是否已存在
    const existingArticle = await prisma.post.findFirst({
      where: {
        userId: userId!,
        slug: data.slug,
      },
    });

    if (existingArticle) {
      return ApiError.conflict('您已有一篇相同 slug 的文章');
    }

    const article = await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content || '',
        excerpt: data.excerpt || '',
        coverImage: data.coverImage || null,
        tags: data.tags || [],
        published: data.published ?? false,
        categoryId: data.categoryId || null,
        userId: userId!,  // 关联当前用户
      },
      include: {
        category: true,
      },
    });

    return created(article, '文章创建成功');
  } catch (error) {
    console.error('Failed to create article:', error);
    return NextResponse.json(
      { code: 500, message: `创建失败: ${error instanceof Error ? error.message : '未知错误'}`, data: null },
      { status: 500 }
    );
  }
}
