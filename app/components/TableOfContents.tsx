/*
 * :file description: 文章目录组件 - 显示文章标题层级，支持点击跳转，大标题可折叠子标题
 * :name: /ink-and-code/app/components/TableOfContents.tsx
 * :author: PTC
 * :copyright: (c) 2026, Tungee
 * :date created: 2026-02-06 12:00:00
 * :last editor: PTC
 * :date last edited: 2026-02-06 12:00:00
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { List, ChevronRight } from 'lucide-react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
  onHeadingsChange?: (count: number) => void;
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

export default function TableOfContents({ content, className = '', onHeadingsChange }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  // 记录哪些大标题被折叠了（存储大标题的 id）
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

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
      onHeadingsChange?.(extractedHeadings.length);
    }, 300);

    return () => clearTimeout(timer);
  }, [content, onHeadingsChange]);

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
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const relativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
      
      scrollContainer.scrollTo({
        top: relativeTop - 24,
        behavior: 'smooth'
      });
      setActiveId(id);
    }
  }, []);

  // 切换大标题的折叠状态
  const toggleSection = useCallback((headingId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(headingId)) {
        next.delete(headingId);
      } else {
        next.add(headingId);
      }
      return next;
    });
  }, []);

  // 计算每个标题的可见性：子标题在其父级大标题折叠时隐藏
  const { minLevel, visibilityMap, hasChildren } = useMemo(() => {
    if (headings.length === 0) {
      return { minLevel: 1, visibilityMap: new Map<string, boolean>(), hasChildren: new Set<string>() };
    }

    const min = Math.min(...headings.map(h => h.level));
    const visibility = new Map<string, boolean>();
    const childrenSet = new Set<string>();

    // 先标记哪些大标题有子标题
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].level === min) {
        // 检查后面是否有子标题
        if (i + 1 < headings.length && headings[i + 1].level > min) {
          childrenSet.add(headings[i].id);
        }
      }
    }

    // 计算可见性
    let currentParentId: string | null = null;
    for (const heading of headings) {
      if (heading.level === min) {
        // 大标题始终可见
        visibility.set(heading.id, true);
        currentParentId = heading.id;
      } else {
        // 子标题：如果父级大标题被折叠则隐藏
        const isHidden = currentParentId !== null && collapsedSections.has(currentParentId);
        visibility.set(heading.id, !isHidden);
      }
    }

    return { minLevel: min, visibilityMap: visibility, hasChildren: childrenSet };
  }, [headings, collapsedSections]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className={className}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          <List className="w-3 h-3" />
          <span>目录</span>
        </div>
        <span className="text-[10px] text-muted/40">{headings.length} 项</span>
      </div>
      
      <div className="relative">
        {/* 左侧连接线 */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-card-border/40" />
        
        <ul className="space-y-0.5">
          {headings.map((heading) => {
            const isActive = activeId === heading.id;
            const styles = getHeadingStyles(heading.level, minLevel);
            const relativeLevel = heading.level - minLevel;
            const isVisible = visibilityMap.get(heading.id) ?? true;
            const isTopLevel = heading.level === minLevel;
            const isSectionCollapsed = collapsedSections.has(heading.id);
            const sectionHasChildren = hasChildren.has(heading.id);
            
            return (
              <li 
                key={heading.id} 
                className={`relative transition-all duration-200 ${
                  isVisible 
                    ? 'max-h-20 opacity-100' 
                    : 'max-h-0 opacity-0 overflow-hidden'
                }`}
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
                
                <div className="flex items-center">
                  {/* 大标题的折叠按钮 */}
                  {isTopLevel && sectionHasChildren ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(heading.id);
                      }}
                      className="shrink-0 mr-0.5 cursor-pointer"
                    >
                      <ChevronRight 
                        className={`
                          w-3 h-3 transition-transform duration-200
                          ${isSectionCollapsed 
                            ? 'text-muted/50' 
                            : isActive 
                              ? 'text-primary rotate-90' 
                              : 'text-muted/30 rotate-90'
                          }
                        `}
                      />
                    </button>
                  ) : isTopLevel ? (
                    <ChevronRight 
                      className={`
                        w-3 h-3 mr-0.5 shrink-0 transition-transform duration-200
                        ${isActive ? 'text-primary rotate-90' : 'text-muted/30 rotate-90'}
                      `}
                    />
                  ) : null}
                  
                  <button
                    onClick={() => scrollToHeading(heading.id)}
                    className={`
                      flex-1 text-left py-1.5 pr-2 rounded-md
                      transition-all duration-200 hover:bg-card/60 cursor-pointer
                      ${styles.fontSize} ${styles.fontWeight} ${styles.opacity}
                      ${isActive
                        ? 'text-primary'
                        : 'text-muted/80 hover:text-foreground'
                      }
                    `}
                  >
                    <span className="line-clamp-2 leading-relaxed">{heading.text}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
