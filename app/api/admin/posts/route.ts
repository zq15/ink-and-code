import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import { verifyDeveloper } from '@/lib/admin-auth';

/**
 * GET /api/admin/posts
 * 获取所有文章列表（开发者后台）
 */
export async function GET(request: NextRequest) {
  if (!(await verifyDeveloper(request))) {
    return ApiError.forbidden('无权限访问');
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search') || '';
    const userId = searchParams.get('userId') || '';
    const status = searchParams.get('status') || ''; // all, published, draft, banned, deleted
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (status === 'published') {
      where.published = true;
      where.bannedAt = null;
      where.deletedByAdmin = false;
    } else if (status === 'draft') {
      where.published = false;
    } else if (status === 'banned') {
      where.bannedAt = { not: null };
    } else if (status === 'deleted') {
      where.deletedByAdmin = true;
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          tags: true,
          published: true,
          bannedAt: true,
          banReason: true,
          deletedByAdmin: true,
          adminDeletedAt: true,
          adminNote: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              image: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return success({
      list: posts.map((post) => ({
        ...post,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        bannedAt: post.bannedAt?.toISOString() || null,
        adminDeletedAt: post.adminDeletedAt?.toISOString() || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return ApiError.internal();
  }
}
