import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import { verifyAdminAuth, isUserDeveloper } from '@/lib/admin-auth';

/**
 * POST /api/admin/post/ban
 * 禁用/解禁文章（对外不可见，作者可见）
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return ApiError.forbidden('无权限访问');
  }

  try {
    const body = await request.json();
    const { postId, banned, reason } = body;

    if (!postId) {
      return ApiError.badRequest('缺少文章 ID');
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: { select: { id: true, isAdmin: true } } },
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

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        bannedAt: banned ? new Date() : null,
        banReason: banned ? (reason || '内容违规') : null,
      },
      select: {
        id: true,
        title: true,
        bannedAt: true,
        banReason: true,
      },
    });

    return success({
      ...updatedPost,
      bannedAt: updatedPost.bannedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Failed to ban/unban post:', error);
    return ApiError.internal();
  }
}
