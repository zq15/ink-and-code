import { prisma } from '@/lib/prisma';
import {
  success,
  ApiError,
  validateApiKey,
  validateRequired,
} from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * 递归获取所有子分类 ID
 */
async function getAllChildCategoryIds(parentId: string): Promise<string[]> {
  const children = await (prisma as any).category.findMany({
    where: { parentId },
    select: { id: true },
  });

  const childIds: string[] = children.map((c: { id: string }) => c.id);
  
  // 递归获取孙子分类
  for (const child of children) {
    const grandChildIds = await getAllChildCategoryIds(child.id);
    childIds.push(...grandChildIds);
  }

  return childIds;
}

/**
 * POST /api/category/delete
 * 删除分类（级联删除所有子分类和子文档）
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

    // 获取所有子分类 ID（包括嵌套的）
    const childCategoryIds = await getAllChildCategoryIds(data.id);
    const allCategoryIds = [data.id, ...childCategoryIds];

    // 使用事务确保原子性
    await (prisma as any).$transaction(async (tx: any) => {
      // 1. 删除所有相关文章
      await tx.post.deleteMany({
        where: { categoryId: { in: allCategoryIds } },
      });

      // 2. 删除所有子分类（从最深层开始，避免外键约束）
      // 由于 onDelete: SetNull，我们需要先删除子分类再删除父分类
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

    return success(null, 'Category and all contents deleted successfully');
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json(
      { code: 500, message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, data: null },
      { status: 500 }
    );
  }
}
