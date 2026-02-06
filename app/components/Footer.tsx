'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // 在 blog 页面不显示 footer
  if (pathname.startsWith('/blog')) {
    return null;
  }

  return (
    <footer className="border-t border-card-border bg-background">
      <div className="max-w-7xl 2xl:max-w-[1600px] min-[1920px]:max-w-[2000px] min-[2200px]:max-w-[2200px] mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="serif text-xl font-bold">
            Ink<span className="text-primary">&</span>Code
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
            <p className="text-xs tracking-widest uppercase text-muted">
              用代码书写思想 · 用技术表达创意
            </p>
            <div className="flex items-center gap-6 text-xs tracking-widest uppercase text-muted">
              <a href="https://github.com" className="hover:text-foreground transition-colors">
                GitHub
              </a>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
