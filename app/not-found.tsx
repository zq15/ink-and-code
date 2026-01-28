import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-amber-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">页面未找到</h2>
        <p className="text-zinc-400 mb-8">
          抱歉，你访问的页面不存在或已被移除。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-black font-semibold rounded-full hover:bg-amber-300 transition-colors"
        >
          <span>←</span>
          返回首页
        </Link>
      </div>
    </div>
  );
}
