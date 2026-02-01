import { prisma } from '@/lib/prisma';
import {
  success,
  ApiError,
  requireAuth,
  validateRequired,
} from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * 递归获取所有子分类 ID
 */
async function getAllChildCategoryIds(parentId: string, userId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId, userId },
    select: { id: true },
  });

  const childIds: string[] = children.map((c) => c.id);
  
  // 递归获取孙子分类
  for (const child of children) {
    const grandChildIds = await getAllChildCategoryIds(child.id, userId);
    childIds.push(...grandChildIds);
  }

  return childIds;
}

/**
 * POST /api/category/delete
 * 删除分类（需要登录，只能删除自己的分类）
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
      return ApiError.notFound('分类不存在或无权限删除');
    }

    // 获取所有子分类 ID（包括嵌套的）
    const childCategoryIds = await getAllChildCategoryIds(data.id, userId!);
    const allCategoryIds = [data.id, ...childCategoryIds];

    // 使用事务确保原子性
    await prisma.$transaction(async (tx) => {
      // 1. 删除所有相关文章
      await tx.post.deleteMany({
        where: { categoryId: { in: allCategoryIds }, userId: userId! },
      });

      // 2. 删除所有子分类（从最深层开始，避免外键约束）
      for (const categoryId of childCategoryIds.reverse()) {
        await tx.category.delete({
          where: { id: categoryId },
        });
      }

      // 3. 最后删除目标分类
      await tx.category.delete({
        where: { id: data.id },
      });
    });

    return success(null, '分类及其内容已删除');
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json(
      { code: 500, message: `删除失败: ${error instanceof Error ? error.message : '未知错误'}`, data: null },
      { status: 500 }
    );
  }
}
