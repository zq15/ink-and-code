'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import ePub, { type Book, type Rendition } from 'epubjs';
import type { ReadingSettingsData } from '@/lib/hooks/use-library';

interface EpubReaderViewProps {
  url: string;
  bookId: string;
  initialLocation?: string;
  settings?: ReadingSettingsData | null;
  onProgressUpdate?: (percentage: number, location?: string) => void;
  onAddBookmark?: (location: string, title?: string) => void;
  onAddHighlight?: (text: string, location: string, color?: string) => void;
}

export default function EpubReaderView({
  bookId,
  initialLocation,
  settings,
  onProgressUpdate,
}: EpubReaderViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 翻页动画锁，防止动画过程中重复触发
  const animatingRef = useRef(false);

  // 带动画的翻页
  const animatePageTurn = useCallback((direction: 'prev' | 'next') => {
    const rendition = renditionRef.current;
    const wrapper = wrapperRef.current;
    if (!rendition || !wrapper || animatingRef.current) return;

    animatingRef.current = true;
    const distance = direction === 'next' ? -60 : 60;

    // 滑出动画
    wrapper.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
    wrapper.style.transform = `translateX(${distance}px)`;
    wrapper.style.opacity = '0.3';

    setTimeout(() => {
      // 切换页面
      if (direction === 'next') {
        rendition.next();
      } else {
        rendition.prev();
      }

      // 从反方向滑入
      wrapper.style.transition = 'none';
      wrapper.style.transform = `translateX(${-distance}px)`;
      wrapper.style.opacity = '0.3';

      // 强制 reflow 使 transition 重新生效
      void wrapper.offsetHeight;

      wrapper.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
      wrapper.style.transform = 'translateX(0)';
      wrapper.style.opacity = '1';

      setTimeout(() => {
        animatingRef.current = false;
        wrapper.style.transition = '';
        wrapper.style.transform = '';
        wrapper.style.opacity = '';
      }, 210);
    }, 200);
  }, []);

  // 加载 EPUB
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    let destroyed = false;
    let locationsTimer: ReturnType<typeof setTimeout>;

    async function loadEpub() {
      try {
        const res = await fetch(`/api/library/file?id=${bookId}`);
        if (!res.ok) throw new Error(`加载失败: ${res.status}`);
        const data = await res.arrayBuffer();

        if (destroyed) return;

        const book = ePub(data as unknown as string);
        bookRef.current = book;

        const rendition = book.renderTo(container, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated',
          allowScriptedContent: false,
        });

        renditionRef.current = rendition;

        rendition.on('relocated', (location: { start: { cfi: string; percentage: number } }) => {
          const pct = Math.round((location.start.percentage || 0) * 100);
          onProgressUpdate?.(pct, location.start.cfi);
        });

        rendition.on('rendered', () => {
          if (!destroyed) setIsReady(true);
        });

        if (initialLocation) {
          rendition.display(initialLocation);
        } else {
          rendition.display();
        }

        // 延迟生成位置信息，避免阻塞 UI
        locationsTimer = setTimeout(() => {
          if (destroyed) return;
          book.ready.then(() => book.locations.generate(2048)).then(() => {
            if (destroyed) return;
            const loc = rendition.currentLocation() as unknown as { start?: { cfi: string; percentage: number } };
            if (loc?.start) {
              const pct = Math.round((loc.start.percentage || 0) * 100);
              onProgressUpdate?.(pct, loc.start.cfi);
            }
          });
        }, 2000);

        // 键盘翻页
        const handleKeydown = (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft') animatePageTurn('prev');
          else if (e.key === 'ArrowRight') animatePageTurn('next');
        };
        document.addEventListener('keydown', handleKeydown);

        const cleanup = () => {
          document.removeEventListener('keydown', handleKeydown);
        };
        (container as HTMLDivElement & { _cleanup?: () => void })._cleanup = cleanup;
      } catch (err) {
        console.error('Failed to load EPUB:', err);
        if (!destroyed) setLoadError(err instanceof Error ? err.message : '加载失败');
      }
    }

    loadEpub();

    return () => {
      destroyed = true;
      clearTimeout(locationsTimer);
      (container as HTMLDivElement & { _cleanup?: () => void })?._cleanup?.();
      bookRef.current?.destroy();
      bookRef.current = null;
      renditionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // 监听容器尺寸变化，自动重排（侧边栏开关、窗口缩放等）
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !renditionRef.current) return;

    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      // 防抖：侧边栏动画结束后再重排，避免频繁触发
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const rect = container.getBoundingClientRect();
        renditionRef.current?.resize(rect.width, rect.height);
      }, 150);
    });
    ro.observe(container);
    return () => {
      clearTimeout(resizeTimer);
      ro.disconnect();
    };
  }, [isReady]);

  // 应用阅读设置
  useEffect(() => {
    if (!renditionRef.current || !settings) return;

    const fontFamily =
      settings.fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' :
      settings.fontFamily === 'sans-serif' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' :
      settings.fontFamily === 'mono' ? '"SF Mono", "Fira Code", monospace' :
      'inherit';

    renditionRef.current.themes.default({
      'body, p, div, span': {
        'font-size': `${settings.fontSize}px !important`,
        'line-height': `${settings.lineHeight} !important`,
        'font-family': `${fontFamily} !important`,
      },
    });
  }, [settings?.fontSize, settings?.lineHeight, settings?.fontFamily, settings]);

  // --- 触摸手势：跟手拖拽 + 释放动画 ---
  const touchRef = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);
  const dragOffsetRef = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (animatingRef.current) return;
    touchRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      t: Date.now(),
      moved: false,
    };
    dragOffsetRef.current = 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current || animatingRef.current) return;
    const dx = e.touches[0].clientX - touchRef.current.x;
    const dy = e.touches[0].clientY - touchRef.current.y;

    // 只有水平方向为主时才跟手
    if (!touchRef.current.moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      touchRef.current.moved = true;
    }

    if (touchRef.current.moved && wrapperRef.current) {
      // 阻尼效果：拖动越远阻力越大
      const dampened = dx * 0.4;
      dragOffsetRef.current = dampened;
      wrapperRef.current.style.transition = 'none';
      wrapperRef.current.style.transform = `translateX(${dampened}px)`;
      // 透明度跟随拖动
      const opacity = Math.max(0.5, 1 - Math.abs(dampened) / 300);
      wrapperRef.current.style.opacity = String(opacity);
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current || animatingRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dt = Date.now() - touchRef.current.t;
    const wasMoved = touchRef.current.moved;
    touchRef.current = null;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // 如果没有横向移动，检查是否是点击翻页
    if (!wasMoved) {
      const tapX = e.changedTouches[0].clientX;
      const screenWidth = window.innerWidth;
      if (tapX < screenWidth * 0.3) {
        animatePageTurn('prev');
      } else if (tapX > screenWidth * 0.7) {
        animatePageTurn('next');
      }
      return;
    }

    const velocity = Math.abs(dx) / Math.max(dt, 1);
    // 快速滑动(速度>0.5) 或 拖动距离够远(>60px) 触发翻页
    const shouldTurn = velocity > 0.5 || Math.abs(dx) > 60;

    if (shouldTurn && Math.abs(dx) > 20) {
      animatingRef.current = true;
      const direction = dx > 0 ? 'prev' : 'next';
      const targetX = dx > 0 ? 80 : -80;

      // 滑出
      wrapper.style.transition = 'transform 180ms ease-out, opacity 180ms ease-out';
      wrapper.style.transform = `translateX(${targetX}px)`;
      wrapper.style.opacity = '0';

      setTimeout(() => {
        if (direction === 'next') {
          renditionRef.current?.next();
        } else {
          renditionRef.current?.prev();
        }

        // 从反方向滑入
        wrapper.style.transition = 'none';
        wrapper.style.transform = `translateX(${-targetX}px)`;
        wrapper.style.opacity = '0';
        void wrapper.offsetHeight; // reflow

        wrapper.style.transition = 'transform 180ms ease-out, opacity 180ms ease-out';
        wrapper.style.transform = 'translateX(0)';
        wrapper.style.opacity = '1';

        setTimeout(() => {
          animatingRef.current = false;
          wrapper.style.transition = '';
          wrapper.style.transform = '';
          wrapper.style.opacity = '';
        }, 190);
      }, 180);
    } else {
      // 回弹：没达到翻页阈值，弹回原位
      wrapper.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out';
      wrapper.style.transform = 'translateX(0)';
      wrapper.style.opacity = '1';

      setTimeout(() => {
        wrapper.style.transition = '';
        wrapper.style.transform = '';
        wrapper.style.opacity = '';
      }, 210);
    }
  }, [animatePageTurn]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm opacity-60 mb-2">EPUB 加载失败</p>
          <p className="text-xs opacity-40">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 动画 wrapper：包裹 epub 内容，用于滑动动画 */}
      <div ref={wrapperRef} className="w-full h-full will-change-transform">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* 透明触摸层 */}
      {isReady && (
        <div
          className="absolute inset-0 z-10"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'pan-y' }}
        />
      )}

      {!isReady && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-inherit">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-current/10 border-t-current/60 rounded-full animate-spin" />
            <span className="text-xs opacity-50">正在解析 EPUB...</span>
          </div>
        </div>
      )}
    </div>
  );
}
