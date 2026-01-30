import { prisma } from '@/lib/prisma';
import {
  success,
  ApiError,
  validateApiKey,
  validateRequired,
} from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * POST /api/category/update
 * 更新分类（支持重命名、移动、排序）
 */
export async function POST(request: Request) {
  try {
    const authError = validateApiKey(request);
    if (authError) return authError;

    const data = await request.json();

    const validationError = validateRequired(data, ['id']);
    if (validationError) return validationError;

    const existing = await (prisma as any).category.findUnique({
      where: { id: data.id },
    });

    if (!existing) {
      return ApiError.notFound('Category not found');
    }

    // 如果更新 slug，检查是否冲突
    if (data.slug && data.slug !== existing.slug) {
      const conflict = await (prisma as any).category.findFirst({
        where: {
          slug: data.slug,
          id: { not: data.id },
        },
      });

      if (conflict) {
        return ApiError.conflict('Category with this slug already exists');
      }
    }

    // 防止循环引用（不能设置自己或子分类为父分类）
    if (data.parentId !== undefined && data.parentId) {
      if (data.parentId === data.id) {
        return ApiError.badRequest('Cannot set category as its own parent');
      }
      // 检查是否会造成循环
      let currentParentId: string | null = data.parentId;
      while (currentParentId) {
        if (currentParentId === data.id) {
          return ApiError.badRequest('Circular reference detected');
        }
        const parent = await (prisma as any).category.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        currentParentId = parent?.parentId || null;
      }
    }

    const updated = await (prisma as any).category.update({
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
    }, 'Category updated successfully');
  } catch (error) {
    console.error('Failed to update category:', error);
    return NextResponse.json(
      { code: 500, message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, data: null },
      { status: 500 }
    );
  }
}
