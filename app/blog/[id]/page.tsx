import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostByIdAsync, getAllPostsAsync } from '@/lib/posts';
import TiptapRenderer from '@/app/components/TiptapRenderer';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPostsAsync();
  return posts.map((post) => ({ id: post.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const post = await getPostByIdAsync(id);
  
  if (!post) {
    return { title: '文章未找到 | Ink & Code' };
  }

  return {
    title: `${post.title} | Ink & Code`,
    description: post.excerpt,
  };
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getPostByIdAsync(id);

  if (!post) {
    notFound();
  }

  const formattedDate = new Date(post.date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen pt-40 pb-32 px-6">
      <div className="bg-glow" />
      <article className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_minmax(auto,75ch)_1fr] gap-12">
          {/* Left: Navigation */}
          <aside className="hidden lg:block">
            <div className="sticky top-32">
              <Link 
                href="/blog"
                className="text-xs tracking-[0.2em] uppercase text-muted hover:text-primary transition-colors inline-flex items-center gap-2 group font-bold"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                BACK
              </Link>
            </div>
          </aside>

          {/* Center: Content */}
          <div>
            <header className="mb-20">
              <div className="flex items-center gap-4 mb-8 text-xs tracking-[0.2em] uppercase font-bold text-muted">
                <time>{formattedDate}</time>
                <span className="w-1 h-1 rounded-full bg-card-border" />
                <div className="flex gap-4">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-primary">#{tag}</span>
                  ))}
                </div>
              </div>
              
              <h1 className="serif text-4xl md:text-6xl font-bold text-foreground leading-[1.1] mb-10">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="text-xl md:text-2xl text-muted leading-relaxed serif italic border-l-2 border-primary/20 pl-8 py-2">
                  {post.excerpt}
                </p>
              )}
            </header>

            <TiptapRenderer content={post.content} />

            <footer className="mt-32 pt-16 border-t border-card-border">
              <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                <div className="text-lg text-muted serif italic">
                  感谢你的阅读。
                </div>
                <Link 
                  href="/blog"
                  className="text-xs tracking-[0.2em] uppercase border border-card-border px-10 py-4 rounded-full hover:bg-card hover:border-primary/30 transition-all duration-300 font-bold"
                >
                  返回文章列表
                </Link>
              </div>
            </footer>
          </div>

          {/* Right: Empty for balance */}
          <aside className="hidden lg:block" />
        </div>
      </article>
    </div>
  );
}
