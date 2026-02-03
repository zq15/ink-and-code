import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Calendar, ArrowLeft, Tag, User } from 'lucide-react';
import TiptapRenderer from '@/app/components/TiptapRenderer';

interface Props {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { username, slug } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) {
    return { title: '用户不存在' };
  }

  const post = await prisma.post.findFirst({
    where: {
      userId: user.id,
      slug,
      published: true,
    },
    select: { title: true, excerpt: true },
  });

  if (!post) {
    return { title: '文章不存在' };
  }

  return {
    title: `${post.title} - Ink&Code`,
    description: post.excerpt || post.title,
  };
}

export default async function UserArticlePage({ params }: Props) {
  const { username, slug } = await params;

  // 获取用户
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      image: true,
      username: true,
      bannedAt: true,
      profileHidden: true,
      siteConfig: {
        select: { siteName: true },
      },
    },
  });

  if (!user) {
    notFound();
  }

  // 检查用户是否被禁用
  if (user.bannedAt || user.profileHidden) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-glow" />
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-card border border-card-border flex items-center justify-center">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">内容不可用</h1>
          <p className="text-muted mb-6">该用户的内容暂时无法访问</p>
          <a 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            返回首页
          </a>
        </div>
      </div>
    );
  }

  // 获取文章
  const post = await prisma.post.findFirst({
    where: {
      userId: user.id,
      slug,
      published: true,
    },
  });

  if (!post) {
    notFound();
  }

  // 检查文章是否被禁用或删除
  if (post.bannedAt || post.deletedByAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-glow" />
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-card border border-card-border flex items-center justify-center">
            <span className="text-3xl">📄</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {post.deletedByAdmin ? '文章已被删除' : '文章暂不可见'}
          </h1>
          <p className="text-muted mb-6">
            {post.deletedByAdmin 
              ? (post.adminNote || '该文章因违反社区规定已被删除')
              : (post.banReason || '该文章因内容问题暂时不可见')}
          </p>
          <a 
            href={`/u/${username}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            返回作者主页
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="bg-glow" />

      {/* Header */}
      <header className="pt-24 pb-8 px-4 sm:px-6 border-b border-card-border">
        <div className="max-w-3xl mx-auto">
          {/* 返回链接 */}
          <Link
            href={`/u/${username}`}
            className="inline-flex items-center gap-2 text-muted hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">返回 {user.siteConfig?.siteName || user.name || username} 的主页</span>
          </Link>

          {/* 文章标题 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-6">
            {post.title}
          </h1>

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted">
            {/* 作者 */}
            <Link
              href={`/u/${username}`}
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || username}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
              )}
              <span>{user.name || username}</span>
            </Link>

            <span className="text-card-border hidden sm:inline">·</span>

            {/* 日期 */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(post.createdAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* 标签 - 单独一行 */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Tag className="w-4 h-4 text-muted shrink-0" />
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-card-border/50 text-xs text-muted whitespace-nowrap"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 摘要 */}
          {post.excerpt && (
            <p className="mt-6 text-lg text-muted serif italic border-l-4 border-primary/20 pl-4">
              {post.excerpt}
            </p>
          )}
        </div>
      </header>

      {/* Content */}
      <article className="py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="prose-container">
            <TiptapRenderer content={post.content} />
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 border-t border-card-border">
        <div className="max-w-3xl mx-auto">
          {/* 作者卡片 */}
          <div className="p-6 rounded-2xl border border-card-border bg-card/30 mb-8">
            <Link
              href={`/u/${username}`}
              className="flex items-center gap-4 group"
            >
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || username}
                  className="w-14 h-14 rounded-2xl ring-2 ring-card-border"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center ring-2 ring-card-border">
                  <span className="text-xl font-bold text-primary">
                    {(user.name || username).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                  {user.name || username}
                </h3>
                <p className="text-sm text-muted">查看更多文章 →</p>
              </div>
            </Link>
          </div>

          {/* Powered by */}
          <div className="text-center">
            <Link href="/" className="text-muted hover:text-foreground transition-colors text-sm">
              Powered by <span className="font-semibold">Ink&Code</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
