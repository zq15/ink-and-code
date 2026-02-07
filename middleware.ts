import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 本地开发代理中间件
 * 当设置了 PRODUCTION_URL 和 PROXY_TOKEN 时，
 * 将所有 /api/* 请求代理到线上服务器并注入 Token 认证
 */
export async function middleware(request: NextRequest) {
  const productionUrl = process.env.PRODUCTION_URL;
  const proxyToken = process.env.PROXY_TOKEN;

  // 未配置则跳过
  if (!productionUrl || !proxyToken) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  // 只代理 /api/* 请求（排除 auth 相关路由，避免登录循环）
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // 构建线上 URL
  const targetUrl = `${productionUrl}${pathname}${search}`;

  try {
    // 复制原始请求头
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // 跳过 host 和 Next.js 内部头
      if (!['host', 'connection', 'transfer-encoding'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // 注入 Token 认证
    headers.set('Authorization', `Bearer ${proxyToken}`);

    // 转发请求到线上
    const body = ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : await request.arrayBuffer();

    const proxyRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });

    // 复制线上响应
    const responseHeaders = new Headers();
    proxyRes.headers.forEach((value, key) => {
      // 跳过传输编码相关头
      if (!['transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // 标记来源方便调试
    responseHeaders.set('x-proxied-to', productionUrl);

    return new NextResponse(proxyRes.body, {
      status: proxyRes.status,
      statusText: proxyRes.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[Proxy] Failed to proxy ${pathname}:`, err);
    return NextResponse.json(
      { code: 502, message: `代理到线上失败: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 502 },
    );
  }
}

export const config = {
  matcher: '/api/:path*',
};
