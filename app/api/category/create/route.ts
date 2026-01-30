import { prisma } from '@/lib/prisma';
import {
  created,
  ApiError,
  validateApiKey,
  validateRequired,
} from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * POST /api/category/create
 * 创建分类
 */
export async function POST(request: Request) {
  try {
    const authError = validateApiKey(request);
    if (authError) return authError;

    const data = await request.json();

    const validationError = validateRequired(data, ['name']);
    if (validationError) return validationError;

    // 生成 slug（如果未提供）
    const slug = data.slug || `cat-${Date.now()}`;

    // 检查 slug 是否已存在
    const existing = await (prisma as any).category.findUnique({
      where: { slug },
    });

    if (existing) {
      return ApiError.conflict('Category with this slug already exists');
    }

    // 获取最大排序值
    const maxSort = await (prisma as any).category.aggregate({
      where: { parentId: data.parentId || null },
      _max: { sortOrder: true },
    });

    const category = await (prisma as any).category.create({
      data: {
        name: data.name,
        slug,
        icon: data.icon || null,
        color: data.color || null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        parentId: data.parentId || null,
      },
    });

    return created({
      ...category,
      postCount: 0,
    }, 'Category created successfully');
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json(
      { code: 500, message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, data: null },
      { status: 500 }
    );
  }
}
