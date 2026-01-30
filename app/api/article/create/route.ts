import { prisma } from '@/lib/prisma';
import {
  created,
  ApiError,
  validateApiKey,
  validateRequired,
} from '@/lib/api-response';
import { NextResponse } from 'next/server';

/**
 * POST /api/article/create
 * 创建新文章
 */
export async function POST(request: Request) {
  try {
    // 验证 API Key
    const authError = validateApiKey(request);
    if (authError) return authError;

    const data = await request.json();
    console.log('Creating article with data:', JSON.stringify(data, null, 2));

    // 验证必填字段（content 可选，允许创建空白文章）
    const validationError = validateRequired(data, ['title', 'slug']);
    if (validationError) {
      console.log('Validation error:', validationError);
      return validationError;
    }

    // 检查 slug 是否已存在
    const existingArticle = await prisma.post.findUnique({
      where: { slug: data.slug },
    });

    if (existingArticle) {
      return ApiError.conflict('An article with this slug already exists');
    }

    const article = await prisma.post.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content || '',
        excerpt: data.excerpt || '',
        coverImage: data.coverImage || null,
        tags: data.tags || [],
        published: data.published ?? false,
        categoryId: data.categoryId || null,
      },
      include: {
        category: true,
      },
    });

    return created(article, 'Article created successfully');
  } catch (error) {
    console.error('Failed to create article:', error);
    return NextResponse.json(
      { code: 500, message: `Create failed: ${error instanceof Error ? error.message : 'Unknown error'}`, data: null },
      { status: 500 }
    );
  }
}
