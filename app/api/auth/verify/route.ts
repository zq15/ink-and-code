import { success, ApiError, validateApiKey } from '@/lib/api-response';

/**
 * POST /api/auth/verify
 * 验证 API Key 是否正确
 */
export async function POST(request: Request) {
  try {
    // 验证 API Key
    const authError = validateApiKey(request);
    if (authError) return authError;

    return success({ valid: true }, '验证成功');
  } catch (error) {
    console.error('Failed to verify API key:', error);
    return ApiError.internal();
  }
}
