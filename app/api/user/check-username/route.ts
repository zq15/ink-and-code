import { prisma } from '@/lib/prisma';
import { success, ApiError, requireAuth } from '@/lib/api-response';

/**
 * GET /api/user/check-username?username=xxx
 * 检查用户名是否可用
 */
export async function GET(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return ApiError.badRequest('缺少用户名参数');
    }

    // 验证格式
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return success({
        available: false,
        reason: '用户名只能包含字母、数字、下划线和短横线，长度 3-30',
      });
    }

    // 检查是否已被占用（排除自己）
    const existing = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId! },
      },
    });

    return success({
      available: !existing,
      reason: existing ? '该用户名已被占用' : null,
    });
  } catch (error) {
    console.error('Failed to check username:', error);
    return ApiError.internal();
  }
}
