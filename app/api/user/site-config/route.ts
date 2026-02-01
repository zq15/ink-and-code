import { prisma } from '@/lib/prisma';
import { success, ApiError, requireAuth } from '@/lib/api-response';

/**
 * GET /api/user/site-config
 * 获取当前用户的站点配置
 */
export async function GET() {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const siteConfig = await prisma.siteConfig.findUnique({
      where: { userId: userId! },
    });

    // 如果没有配置，返回默认值
    return success(siteConfig || {
      siteName: null,
      siteTagline: null,
      primaryColor: null,
      githubUrl: null,
      twitterUrl: null,
      linkedinUrl: null,
      websiteUrl: null,
    });
  } catch (error) {
    console.error('Failed to fetch site config:', error);
    return ApiError.internal();
  }
}

/**
 * POST /api/user/site-config
 * 更新当前用户的站点配置
 */
export async function POST(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const data = await request.json();

    const siteConfig = await prisma.siteConfig.upsert({
      where: { userId: userId! },
      create: {
        userId: userId!,
        siteName: data.siteName || null,
        siteTagline: data.siteTagline || null,
        primaryColor: data.primaryColor || null,
        githubUrl: data.githubUrl || null,
        twitterUrl: data.twitterUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        websiteUrl: data.websiteUrl || null,
      },
      update: {
        ...(data.siteName !== undefined && { siteName: data.siteName || null }),
        ...(data.siteTagline !== undefined && { siteTagline: data.siteTagline || null }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor || null }),
        ...(data.githubUrl !== undefined && { githubUrl: data.githubUrl || null }),
        ...(data.twitterUrl !== undefined && { twitterUrl: data.twitterUrl || null }),
        ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl || null }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl || null }),
      },
    });

    return success(siteConfig, '站点配置更新成功');
  } catch (error) {
    console.error('Failed to update site config:', error);
    return ApiError.internal();
  }
}
