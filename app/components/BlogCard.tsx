import Link from 'next/link';
import type { PostMeta } from '@/lib/posts';

interface BlogCardProps {
  post: PostMeta;
}

export default function BlogCard({ post }: BlogCardProps) {
  const formattedDate = new Date(post.date).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link 
      href={`/blog/${post.id}`}
      className="group block relative p-6 md:p-8 rounded-3xl border border-card-border bg-card hover:border-primary/30 transition-all duration-700 h-full overflow-hidden shadow-sm hover:shadow-lg"
    >
      <article className="flex flex-col h-full space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <time className="text-[9px] font-mono text-muted tracking-[0.4em] uppercase">
            {formattedDate}
          </time>
          <div className="flex gap-2">
            {post.tags.slice(0, 1).map((tag) => (
              <span key={tag} className="text-[8px] tracking-[0.2em] uppercase text-primary border border-primary/20 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
        
        <div className="space-y-3 flex-1">
          <h3 className="serif text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors duration-500 leading-tight">
            {post.title}
          </h3>
          
          <p className="text-muted leading-relaxed line-clamp-2 text-sm md:text-base font-serif italic">
            {post.excerpt}
          </p>
        </div>

        <div className="pt-4 flex items-center justify-between text-[9px] tracking-[0.4em] font-bold text-muted group-hover:text-primary transition-all duration-500 border-t border-card-border">
          <span>READ MORE</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover:translate-x-1 transition-transform">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
      </article>
    </Link>
  );
}
