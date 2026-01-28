import Link from 'next/link';

export const metadata = {
  title: '关于 | Ink & Code',
  description: '关于这个博客和作者',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-40 pb-32 px-6 relative">
      <div className="bg-glow" />
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-24 items-start">
          {/* Content Left */}
          <div className="space-y-20">
            <header className="space-y-6">
              <h1 className="serif text-7xl md:text-9xl font-bold text-foreground tracking-tighter leading-none animate-reveal">
                关于我
              </h1>
              <div className="flex items-center gap-8 animate-fade-up delay-1 opacity-0 [animation-fill-mode:forwards]">
                <div className="h-px w-24 bg-primary/30" />
                <p className="text-primary text-[11px] tracking-[0.6em] uppercase font-bold">THE AUTHOR & VISION</p>
              </div>
            </header>

            <div className="space-y-12 animate-fade-up delay-2 opacity-0 [animation-fill-mode:forwards]">
              <p className="serif text-3xl md:text-5xl text-foreground leading-[1.3] italic border-l-8 border-primary/20 pl-12 py-4 text-balance">
                我是 PTC，<br />
                一名在代码与艺术边界徘徊的数字工匠。
              </p>
              
              <div className="prose max-w-none text-muted text-xl leading-relaxed space-y-8 font-serif">
                <p>
                  我热爱构建那些不仅功能强大，而且在视觉和交互上都具有感染力的数字产品。对我而言，代码是我的笔墨，而屏幕则是我的宣纸。
                </p>
                <p>
                  这个博客 <span className="text-foreground font-bold italic underline decoration-primary/30 underline-offset-8">Ink & Code</span> 的诞生，源于我想要连接"传统人文思考"与"现代技术工程"的愿景。我深信，优秀的软件应当是逻辑与美学的结晶。
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                {['Next.js', 'React', 'TypeScript', 'Node.js', 'Python', 'UI Architecture'].map(tech => (
                  <span key={tech} className="px-10 py-4 rounded-full border border-card-border text-[11px] tracking-[0.3em] uppercase text-muted font-bold bg-card hover:text-primary hover:border-primary/30 transition-all duration-500 cursor-default">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Social & Contact Right */}
          <aside className="lg:pt-48 space-y-16 animate-fade-up delay-3 opacity-0 [animation-fill-mode:forwards]">
            <section className="p-16 rounded-[3rem] bg-card border border-card-border space-y-12 shadow-lg">
              <h2 className="serif text-4xl font-bold text-foreground">联系我</h2>
              <div className="grid grid-cols-1 gap-10">
                {[
                  { label: 'GITHUB', href: 'https://github.com', value: '@ptc-dev' },
                  { label: 'TWITTER', href: 'https://twitter.com', value: '@ptc_craft' },
                  { label: 'EMAIL', href: 'mailto:hello@example.com', value: 'hello@inkandcode.com' },
                ].map((item) => (
                  <a 
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block space-y-2"
                  >
                    <p className="text-[10px] tracking-[0.5em] text-muted group-hover:text-primary transition-colors">{item.label}</p>
                    <p className="text-2xl text-foreground group-hover:translate-x-2 transition-transform duration-500">{item.value}</p>
                  </a>
                ))}
              </div>
            </section>

            <div className="px-16 space-y-8">
              <h2 className="serif text-3xl font-bold text-foreground">开始阅读</h2>
              <Link
                href="/blog"
                className="group inline-flex items-center gap-6 text-xl text-primary font-serif italic"
              >
                探索文章库
                <span className="group-hover:translate-x-4 transition-transform duration-500 text-3xl">→</span>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
