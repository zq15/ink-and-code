import { getAllPosts } from '@/lib/posts';
import BlogCard from '@/app/components/BlogCard';

export const metadata = {
  title: '文章 | Ink & Code',
  description: '所有博客文章',
};

export default function BlogPage() {
  const posts = getAllPosts();

  // 按年份分组
  const postsByYear = posts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(post);
    return acc;
  }, {} as Record<number, typeof posts>);

  const years = Object.keys(postsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="min-h-screen pt-40 pb-20 px-6">
      <div className="bg-glow" />
      <div className="max-w-7xl mx-auto">
        <header className="mb-24 border-b border-card-border pb-16">
          <div className="space-y-6">
            <h1 className="serif text-6xl md:text-8xl font-bold text-foreground tracking-tight">所有文章</h1>
            <p className="text-muted text-lg md:text-2xl max-w-4xl leading-relaxed serif italic">
              共 {posts.length} 篇文章。记录技术探索的足迹，分享项目实践的感悟。
            </p>
          </div>
        </header>

        <div className="space-y-40">
          {years.map((year) => (
            <section key={year} className="relative">
              <div className="flex items-center gap-10 mb-20">
                <h2 className="serif text-5xl md:text-7xl font-bold text-primary">{year}</h2>
                <div className="h-px flex-1 bg-card-border" />
                <span className="text-[10px] tracking-[0.5em] text-muted uppercase font-bold">ANNUAL ARCHIVE</span>
              </div>

              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {postsByYear[Number(year)].map((post) => (
                  <BlogCard key={post.slug} post={post} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
