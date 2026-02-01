import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Github, Globe, Linkedin, Twitter, Calendar, ArrowRight } from 'lucide-react';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, headline: true },
  });

  if (!user) {
    return { title: '用户不存在' };
  }

  return {
    title: `${user.name || username} - Ink&Code`,
    description: user.headline || `${user.name || username} 的个人主页`,
  };
}

export default async function UserPublicPage({ params }: Props) {
  const { username } = await params;

  // 获取用户信息和文章
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      siteConfig: true,
      posts: {
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          tags: true,
          createdAt: true,
          coverImage: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const siteConfig = user.siteConfig;

  return (
    <div className="min-h-screen">
      <div className="bg-glow" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 border-b border-card-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            {/* 头像 */}
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || username}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl ring-4 ring-card-border shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-primary/10 flex items-center justify-center ring-4 ring-card-border">
                <span className="text-4xl sm:text-5xl font-bold text-primary">
                  {(user.name || username).charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                {siteConfig?.siteName || user.name || username || '我的博客'}
              </h1>
              <p className="text-lg text-muted mb-4 serif italic">
                {siteConfig?.siteTagline || user.headline || '记录生活，分享技术'}
              </p>
              <p className="text-muted leading-relaxed mb-6 max-w-2xl">
                {user.bio || '这个人很懒，还没有写简介...'}
              </p>

              {/* 社交链接 */}
              <div className="flex items-center justify-center sm:justify-start gap-3">
                {siteConfig?.githubUrl && (
                  <a
                    href={siteConfig.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-muted hover:text-foreground hover:border-card-border/80 transition-colors"
                  >
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {siteConfig?.twitterUrl && (
                  <a
                    href={siteConfig.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-muted hover:text-foreground hover:border-card-border/80 transition-colors"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {siteConfig?.linkedinUrl && (
                  <a
                    href={siteConfig.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-muted hover:text-foreground hover:border-card-border/80 transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {siteConfig?.websiteUrl && (
                  <a
                    href={siteConfig.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-muted hover:text-foreground hover:border-card-border/80 transition-colors"
                  >
                    <Globe className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-foreground">文章</h2>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {user.posts.length}
              </span>
            </div>
          </div>

          {user.posts.length > 0 ? (
            <div className="space-y-6">
              {user.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/u/${username}/${post.slug}`}
                  className="group block p-6 rounded-2xl border border-card-border bg-card/30 hover:bg-card/60 hover:border-card-border/80 transition-all duration-300"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {post.coverImage && (
                      <div className="sm:w-48 h-32 rounded-xl overflow-hidden bg-card-border/20 shrink-0">
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-muted line-clamp-2 mb-3">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(post.createdAt).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        {post.tags.length > 0 && (
                          <div className="flex items-center gap-2">
                            {post.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full bg-card-border/50 text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <ArrowRight className="w-5 h-5 text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-card border border-card-border flex items-center justify-center">
                <span className="text-3xl">✍️</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">暂无文章</h3>
              <p className="text-muted">该用户还没有发布任何文章</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-card-border">
        <div className="max-w-4xl mx-auto text-center">
          <Link href="/" className="text-muted hover:text-foreground transition-colors text-sm">
            Powered by <span className="font-semibold">Ink&Code</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
