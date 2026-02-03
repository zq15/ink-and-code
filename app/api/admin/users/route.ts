import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import { verifyDeveloper } from '@/lib/admin-auth';
import crypto from 'crypto';

/**
 * GET /api/admin/users
 * 获取所有用户列表（开发者后台）
 */
export async function GET(request: NextRequest) {
  if (!(await verifyDeveloper(request))) {
    return ApiError.forbidden('无权限访问');
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // 获取开发者 token hash
    const developerToken = process.env.DEVELOPER_TOKEN;
    const developerTokenHash = developerToken 
      ? crypto.createHash('sha256').update(developerToken).digest('hex')
      : null;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          bio: true,
          headline: true,
          bannedAt: true,
          banReason: true,
          profileHidden: true,
          isTestAccount: true,
          testLoginCode: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
          apiTokens: developerTokenHash ? {
            where: { token: developerTokenHash },
            select: { id: true },
          } : undefined,
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return success({
      list: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        image: user.image,
        bio: user.bio,
        headline: user.headline,
        bannedAt: user.bannedAt?.toISOString() || null,
        banReason: user.banReason,
        profileHidden: user.profileHidden,
        isTestAccount: user.isTestAccount,
        testLoginCode: user.testLoginCode,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        postCount: user._count.posts,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        isDeveloper: user.apiTokens && user.apiTokens.length > 0,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return ApiError.internal();
  }
}
