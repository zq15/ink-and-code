import { prisma } from '@/lib/prisma';
import { success, requireAuth } from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * GET /api/category/list
 * 获取当前用户的分类列表（需要登录）
 */
export async function GET() {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const categories = await prisma.category.findMany({
      where: { userId: userId! },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return success(
      categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        sortOrder: cat.sortOrder,
        parentId: cat.parentId,
        postCount: cat._count?.posts || 0,
        createdAt: cat.createdAt?.toISOString?.() || null,
        updatedAt: cat.updatedAt?.toISOString?.() || null,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { code: 500, message: `获取分类失败: ${error instanceof Error ? error.message : '未知错误'}`, data: null },
      { status: 500 }
    );
  }
}
