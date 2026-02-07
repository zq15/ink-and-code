import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 将 ali-oss 及其依赖标记为服务端外部包
  serverExternalPackages: ['ali-oss'],
  // 增加 API body 大小限制，支持大文件上传（100MB）
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  // react-pdf / pdfjs-dist 需要禁用 canvas 模块（浏览器端不需要）
  turbopack: {
    resolveAlias: {
      canvas: { browser: '' },
    },
  },
};

export default nextConfig;
