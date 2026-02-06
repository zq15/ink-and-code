/*
 * :file description: 文章目录组件 - 显示文章标题层级，支持点击跳转
 * :name: /ink-and-code/app/components/TableOfContents.tsx
 * :author: PTC
 * :copyright: (c) 2026, Tungee
 * :date created: 2026-02-06 12:00:00
 * :last editor: PTC
 * :date last edited: 2026-02-06 12:00:00
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { List, ChevronRight } from 'lucide-react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

// 获取标题级别对应的样式
function getHeadingStyles(level: number, minLevel: number) {
  const relativeLevel = level - minLevel;
  
  return {
    fontSize: relativeLevel === 0 ? 'text-[13px]' : relativeLevel === 1 ? 'text-xs' : 'text-[11px]',
    fontWeight: relativeLevel === 0 ? 'font-semibold' : relativeLevel === 1 ? 'font-medium' : 'font-normal',
    indent: relativeLevel * 14,
    dotSize: relativeLevel === 0 ? 'w-2 h-2' : relativeLevel === 1 ? 'w-1.5 h-1.5' : 'w-1 h-1',
    opacity: relativeLevel === 0 ? '' : relativeLevel === 1 ? 'opacity-90' : 'opacity-75',
  };
}

export default function TableOfContents({ content, className = '' }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // 从渲染后的 DOM 中提取标题，确保顺序和 ID 完全匹配
  useEffect(() => {
    if (!content) return;

    // 延迟执行，等待 TiptapRenderer 渲染完成
    const timer = setTimeout(() => {
      const articleElement = document.querySelector('.tiptap-content');
      if (!articleElement) return;

      const headingElements = articleElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const extractedHeadings: TocItem[] = [];

      headingElements.forEach((el, index) => {
        const text = el.textContent?.trim();
        if (text) {
          const id = `heading-${index}`;
          // 确保元素有正确的 ID
          el.id = id;
          
          extractedHeadings.push({
            id,
            text,
            level: parseInt(el.tagName.charAt(1), 10),
          });
        }
      });

      setHeadings(extractedHeadings);
    }, 300);

    return () => clearTimeout(timer);
  }, [content]);

  // 监听滚动，高亮当前可见的标题
  useEffect(() => {
    if (headings.length === 0) return;

    const scrollContainer = document.getElementById('article-scroll-container');
    if (!scrollContainer) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // 选择最靠近顶部的可见标题
          const topEntry = visibleEntries.reduce((prev, curr) => {
            return prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr;
          });
          setActiveId(topEntry.target.id);
        }
      },
      { 
        root: scrollContainer,
        rootMargin: '-20px 0px -70% 0px', 
        threshold: 0 
      }
    );

    // 观察所有标题元素
    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  // 点击跳转到指定标题
  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id);
    const scrollContainer = document.getElementById('article-scroll-container');
    
    if (element && scrollContainer) {
      // 计算元素相对于滚动容器的位置
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const relativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
      
      // 滚动到目标位置，留出顶部空间
      scrollContainer.scrollTo({
        top: relativeTop - 24,
        behavior: 'smooth'
      });
      setActiveId(id);
    }
  }, []);

  if (headings.length === 0) {
    return null;
  }

  // 找到最小的标题级别
  const minLevel = Math.min(...headings.map(h => h.level));

  return (
    <nav className={className}>
      <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
        <List className="w-3 h-3" />
        <span>目录</span>
      </div>
      
      <div className="relative">
        {/* 左侧连接线 */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-card-border/40" />
        
        <ul className="space-y-0.5">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;
            const styles = getHeadingStyles(heading.level, minLevel);
            const relativeLevel = heading.level - minLevel;
            
            return (
              <li 
                key={heading.id} 
                className="relative"
                style={{ paddingLeft: `${styles.indent + 20}px` }}
              >
                {/* 层级指示点 */}
                <div 
                  className={`
                    absolute left-0 top-1/2 -translate-y-1/2 rounded-full transition-all duration-200
                    ${styles.dotSize}
                    ${isActive 
                      ? 'bg-primary ring-2 ring-primary/20' 
                      : relativeLevel === 0 
                        ? 'bg-muted/50' 
                        : 'bg-card-border'
                    }
                  `}
                  style={{ marginLeft: `${styles.indent + 4}px` }}
                />
                
                <button
                  onClick={() => scrollToHeading(heading.id)}
                  className={`
                    group flex items-start gap-1.5 w-full text-left py-1.5 pr-2 rounded-md
                    transition-all duration-200 hover:bg-card/60 cursor-pointer
                    ${styles.fontSize} ${styles.fontWeight} ${styles.opacity}
                    ${isActive
                      ? 'text-primary'
                      : 'text-muted/80 hover:text-foreground'
                    }
                  `}
                >
                  {/* 一级标题显示箭头 */}
                  {relativeLevel === 0 && (
                    <ChevronRight 
                      className={`
                        w-3 h-3 mt-0.5 shrink-0 transition-transform duration-200
                        ${isActive ? 'text-primary rotate-90' : 'text-muted/30'}
                      `}
                    />
                  )}
                  <span className="line-clamp-2 leading-relaxed">{heading.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      
      {/* 显示目录统计 */}
      <div className="mt-4 pt-3 border-t border-card-border/30">
        <div className="text-[10px] text-muted/50 space-y-0.5">
          {(() => {
            const h1Count = headings.filter(h => h.level === minLevel).length;
            const h2Count = headings.filter(h => h.level === minLevel + 1).length;
            const h3Count = headings.filter(h => h.level === minLevel + 2).length;
            return (
              <>
                {h1Count > 0 && <div>{h1Count} 个主标题</div>}
                {h2Count > 0 && <div>{h2Count} 个二级标题</div>}
                {h3Count > 0 && <div>{h3Count} 个三级标题</div>}
              </>
            );
          })()}
        </div>
      </div>
    </nav>
  );
}
