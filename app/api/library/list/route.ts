import { prisma } from '@/lib/prisma';
import { requireAuth, success, ApiError } from '@/lib/api-response';

/**
 * GET /api/library/list
 * 获取用户书架列表
 * 
 * 查询参数：
 *   search: 搜索书名/作者
 *   sort: 排序方式 (recent | added | title) 默认 recent
 *   page: 页码 默认 1
 *   limit: 每页数量 默认 20
 */
export async function GET(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'recent';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // 构建查询条件
    const where: Record<string, unknown> = { userId: userId! };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 构建排序
    let orderBy: Record<string, string>;
    switch (sort) {
      case 'title':
        orderBy = { title: 'asc' };
        break;
      case 'added':
        orderBy = { createdAt: 'desc' };
        break;
      case 'recent':
      default:
        // 按最近阅读排序需要关联查询，先用创建时间
        orderBy = { updatedAt: 'desc' };
        break;
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          progress: {
            select: {
              percentage: true,
              lastReadAt: true,
              totalReadTime: true,
            },
          },
        },
      }),
      prisma.book.count({ where }),
    ]);

    // 如果按最近阅读排序，手动排序
    if (sort === 'recent') {
      books.sort((a, b) => {
        const aTime = a.progress?.lastReadAt?.getTime() || a.createdAt.getTime();
        const bTime = b.progress?.lastReadAt?.getTime() || b.createdAt.getTime();
        return bTime - aTime;
      });
    }

    return success({
      list: books,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to list books:', error);
    return ApiError.internal('获取书架列表失败');
  }
}
