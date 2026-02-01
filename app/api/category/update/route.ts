import { prisma } from '@/lib/prisma';
import {
  success,
  ApiError,
  requireAuth,
  validateRequired,
} from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * POST /api/category/update
 * 更新分类（需要登录，只能更新自己的分类）
 */
export async function POST(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const data = await request.json();

    const validationError = validateRequired(data, ['id']);
    if (validationError) return validationError;

    const existing = await prisma.category.findFirst({
      where: { id: data.id, userId: userId! },
    });

    if (!existing) {
      return ApiError.notFound('分类不存在或无权限修改');
    }

    // 如果更新 slug，检查是否冲突
    if (data.slug && data.slug !== existing.slug) {
      const conflict = await prisma.category.findFirst({
        where: {
          userId: userId!,
          slug: data.slug,
          id: { not: data.id },
        },
      });

      if (conflict) {
        return ApiError.conflict('您已有一个相同 slug 的分类');
      }
    }

    // 防止循环引用（不能设置自己或子分类为父分类）
    if (data.parentId !== undefined && data.parentId) {
      if (data.parentId === data.id) {
        return ApiError.badRequest('不能将分类设为自己的父分类');
      }
      // 检查是否会造成循环
      let currentParentId: string | null = data.parentId;
      while (currentParentId) {
        if (currentParentId === data.id) {
          return ApiError.badRequest('检测到循环引用');
        }
        const parent = await prisma.category.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        currentParentId = parent?.parentId || null;
      }
    }

    const updated = await prisma.category.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.parentId !== undefined && { parentId: data.parentId || null }),
      },
    });

    return success({
      ...updated,
      postCount: 0,
    }, '分类更新成功');
  } catch (error) {
    console.error('Failed to update category:', error);
    return NextResponse.json(
      { code: 500, message: `更新失败: ${error instanceof Error ? error.message : '未知错误'}`, data: null },
      { status: 500 }
    );
  }
}
