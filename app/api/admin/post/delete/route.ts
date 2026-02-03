import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import { verifyAdminAuth, isUserDeveloper } from '@/lib/admin-auth';

/**
 * POST /api/admin/post/delete
 * 管理员删除文章（软删除，用户看到违规提示）
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return ApiError.forbidden('无权限访问');
  }

  try {
    const body = await request.json();
    const { postId, reason, restore } = body;

    if (!postId) {
      return ApiError.badRequest('缺少文章 ID');
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return ApiError.notFound('文章不存在');
    }

    // 检查文章作者是否是开发者
    const authorIsDeveloper = await isUserDeveloper(post.userId);
    
    // 管理者不能操作开发者的文章
    if (authResult.isAdmin && !authResult.isDeveloper && authorIsDeveloper) {
      return ApiError.badRequest('管理者不能操作开发者的文章');
    }

    if (restore) {
      // 恢复文章
      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: {
          deletedByAdmin: false,
          adminDeletedAt: null,
          adminNote: null,
        },
        select: {
          id: true,
          title: true,
          deletedByAdmin: true,
        },
      });
      return success(updatedPost);
    } else {
      // 删除文章
      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: {
          deletedByAdmin: true,
          adminDeletedAt: new Date(),
          adminNote: reason || '该文章因违反社区规定已被删除',
        },
        select: {
          id: true,
          title: true,
          deletedByAdmin: true,
          adminDeletedAt: true,
          adminNote: true,
        },
      });

      return success({
        ...updatedPost,
        adminDeletedAt: updatedPost.adminDeletedAt?.toISOString() || null,
      });
    }
  } catch (error) {
    console.error('Failed to delete/restore post:', error);
    return ApiError.internal();
  }
}
