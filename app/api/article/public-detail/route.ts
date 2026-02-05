/*
 * :file description: 公开文章详情 API
 * :name: /ink-and-code/app/api/article/public-detail/route.ts
 * :author: PTC
 * :copyright: (c) 2026, Tungee
 * :date created: 2026-02-05 14:00:00
 * :last editor: PTC
 * :date last edited: 2026-02-05 14:00:00
 */
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import crypto from 'crypto';

// 开发者 Token（用于未登录时展示默认文章）
const DEVELOPER_TOKEN = process.env.DEVELOPER_TOKEN || 'ink_0174bf5e61a79f72d4a80ff4ce9d7b2dc266ea7eabbb5497';

/**
 * GET /api/article/public-detail?id=xxx
 * 获取开发者的公开文章详情（无需登录）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiError.badRequest('缺少参数: id');
    }

    // 通过 token 获取开发者用户 ID
    const tokenHash = crypto.createHash('sha256').update(DEVELOPER_TOKEN).digest('hex');
    const apiToken = await prisma.apiToken.findUnique({
      where: { token: tokenHash },
      select: { userId: true },
    });

    if (!apiToken) {
      return ApiError.notFound('开发者账号未配置');
    }

    const userId = apiToken.userId;

    // 查询已发布的公开文章
    const article = await prisma.post.findFirst({
      where: {
        id,
        userId,
        published: true,
        bannedAt: null,
        deletedByAdmin: false,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    if (!article) {
      return ApiError.notFound('文章不存在');
    }

    return success({
      id: article.id,
      slug: article.slug,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      tags: article.tags,
      coverImage: article.coverImage,
      published: article.published,
      categoryId: article.categoryId,
      category: article.category,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch public article:', error);
    return ApiError.internal();
  }
}
