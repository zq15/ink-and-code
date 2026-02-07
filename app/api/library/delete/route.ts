import { prisma } from '@/lib/prisma';
import { requireAuth, success, ApiError } from '@/lib/api-response';

/**
 * POST /api/library/delete
 * 删除书籍
 * 
 * Body: { id: string }
 */
export async function POST(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const { id } = await request.json();

    if (!id) {
      return ApiError.badRequest('缺少书籍 ID');
    }

    // 验证所有权
    const book = await prisma.book.findFirst({
      where: { id, userId: userId! },
    });

    if (!book) {
      return ApiError.notFound('书籍不存在');
    }

    // 删除书籍（级联删除进度、书签、划线笔记）
    await prisma.book.delete({
      where: { id },
    });

    return success({ id }, '删除成功');
  } catch (error) {
    console.error('Failed to delete book:', error);
    return ApiError.internal('删除失败');
  }
}
