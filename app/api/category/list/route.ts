import { prisma } from '@/lib/prisma';
import { success } from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * GET /api/category/list
 * 获取分类列表（扁平结构，前端构建树）
 */
export async function GET() {
  try {
    const categories = await (prisma as any).category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return success(
      categories.map((cat: any) => ({
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
      { code: 500, message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, data: null },
      { status: 500 }
    );
  }
}
