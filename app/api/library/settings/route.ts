import { prisma } from '@/lib/prisma';
import { getCurrentUserId, success, ApiError } from '@/lib/api-response';

/**
 * GET /api/library/settings
 * 获取阅读偏好设置
 * 未登录用户返回默认设置
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    // 未登录时返回默认设置
    if (!userId) {
      return success({
        fontSize: 16,
        lineHeight: 1.8,
        fontFamily: 'system',
        theme: 'light',
        pageWidth: 800,
      });
    }

    let settings = await prisma.readingSettings.findUnique({
      where: { userId },
    });

    // 如果没有设置过，返回默认值
    if (!settings) {
      settings = await prisma.readingSettings.create({
        data: { userId },
      });
    }

    return success(settings);
  } catch (error) {
    console.error('Failed to get reading settings:', error);
    return ApiError.internal('获取设置失败');
  }
}

/**
 * POST /api/library/settings
 * 保存阅读偏好设置
 * 
 * Body: {
 *   fontSize?: number;
 *   fontFamily?: string;
 *   lineHeight?: number;
 *   theme?: string;
 *   pageWidth?: number;
 * }
 */
export async function POST(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const data = await request.json();

    const settings = await prisma.readingSettings.upsert({
      where: { userId: userId! },
      create: {
        userId: userId!,
        fontSize: data.fontSize ?? 16,
        fontFamily: data.fontFamily ?? 'system',
        lineHeight: data.lineHeight ?? 1.8,
        theme: data.theme ?? 'light',
        pageWidth: data.pageWidth ?? 800,
      },
      update: {
        ...(data.fontSize !== undefined && { fontSize: data.fontSize }),
        ...(data.fontFamily !== undefined && { fontFamily: data.fontFamily }),
        ...(data.lineHeight !== undefined && { lineHeight: data.lineHeight }),
        ...(data.theme !== undefined && { theme: data.theme }),
        ...(data.pageWidth !== undefined && { pageWidth: data.pageWidth }),
      },
    });

    return success(settings, '设置已保存');
  } catch (error) {
    console.error('Failed to save reading settings:', error);
    return ApiError.internal('保存设置失败');
  }
}
