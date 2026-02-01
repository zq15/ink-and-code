import { prisma } from '@/lib/prisma';
import {
  created,
  ApiError,
  requireAuth,
  validateRequired,
} from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * POST /api/category/create
 * 创建分类（需要登录）
 */
export async function POST(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const data = await request.json();

    const validationError = validateRequired(data, ['name']);
    if (validationError) return validationError;

    // 生成 slug（如果未提供）
    const slug = data.slug || `cat-${Date.now()}`;

    // 检查当前用户下 slug 是否已存在
    const existing = await prisma.category.findFirst({
      where: { userId: userId!, slug },
    });

    if (existing) {
      return ApiError.conflict('您已有一个相同 slug 的分类');
    }

    // 获取最大排序值
    const maxSort = await prisma.category.aggregate({
      where: { userId: userId!, parentId: data.parentId || null },
      _max: { sortOrder: true },
    });

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        icon: data.icon || null,
        color: data.color || null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        parentId: data.parentId || null,
        userId: userId!,
      },
    });

    return created({
      ...category,
      postCount: 0,
    }, '分类创建成功');
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json(
      { code: 500, message: `创建失败: ${error instanceof Error ? error.message : '未知错误'}`, data: null },
      { status: 500 }
    );
  }
}
