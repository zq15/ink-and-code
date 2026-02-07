'use client';

import {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useEpubContent } from '@/lib/hooks/use-epub-content';
import {
  useBookPagination,
  getChapterForPage,
} from '@/lib/hooks/use-book-pagination';
import type { ReadingSettingsData } from '@/lib/hooks/use-library';
import BookPage from './BookPage';
import './epub-reader.css';

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
  // ---- 容器尺寸 ----
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- EPUB 内容解析 ----
  const { chapters, styles: epubStyles, isLoading, error } = useEpubContent(bookId);

  // ---- 响应式：判断是否为移动端（单页模式） ----
  const isMobile = containerSize.w > 0 && containerSize.w < 768;

  // ---- 计算单页尺寸 ----
  const pageDimensions = useMemo(() => {
    if (containerSize.w === 0 || containerSize.h === 0) {
      return { pageW: 400, pageH: 560 };
    }

    const availH = containerSize.h - 32; // 上下留白

    if (isMobile) {
      // 移动端：单页填满宽度
      const pageW = Math.min(containerSize.w - 24, 600);
      const pageH = Math.min(availH, pageW * 1.45);
      return { pageW, pageH };
    }

    // 桌面：双页展开，每页占可用宽度的一半
    const maxBookWidth = containerSize.w - 48; // 左右留白
    const singlePageW = Math.min(Math.floor(maxBookWidth / 2), 520);
    const singlePageH = Math.min(availH, singlePageW * 1.4);

    return {
      pageW: singlePageW,
      pageH: singlePageH,
    };
  }, [containerSize, isMobile]);

  // ---- 内容区域尺寸（去除 padding 和页码空间） ----
  const contentWidth = Math.max(200, pageDimensions.pageW - 80); // 40px padding × 2
  const contentHeight = Math.max(200, pageDimensions.pageH - 80 - 30); // padding + page number

  // ---- 分页 ----
  const pagination = useBookPagination(
    chapters,
    epubStyles,
    settings,
    contentWidth,
    contentHeight,
  );

  // ---- 当前页 ----
  // 计算初始页码（只在首次分页完成时使用）
  const initialPage = useMemo(() => {
    if (!initialLocation || !initialLocation.startsWith('page:')) return 0;
    const parsed = parseInt(initialLocation.replace('page:', ''), 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [initialLocation]);

  const startPage = useMemo(() => {
    if (!pagination.isReady) return 0;
    return Math.min(initialPage, Math.max(0, pagination.totalPages - 1));
  }, [pagination.isReady, pagination.totalPages, initialPage]);

  const [currentPage, setCurrentPage] = useState(startPage);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flipBookRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const prevTotalRef = useRef(0);

  // 首次分页完成后翻到保存的位置
  useEffect(() => {
    if (!pagination.isReady) return;

    if (!initializedRef.current) {
      // 首次初始化
      initializedRef.current = true;
      prevTotalRef.current = pagination.totalPages;

      if (startPage > 0) {
        setTimeout(() => {
          flipBookRef.current?.pageFlip()?.turnToPage(startPage);
        }, 200);
      }
    } else if (prevTotalRef.current > 0 && pagination.totalPages !== prevTotalRef.current) {
      // 设置变化导致重新分页：按比例调整当前页码
      const ratio = currentPage / Math.max(1, prevTotalRef.current - 1);
      const newPage = Math.min(
        Math.round(ratio * (pagination.totalPages - 1)),
        pagination.totalPages - 1,
      );
      prevTotalRef.current = pagination.totalPages;

      setTimeout(() => {
        flipBookRef.current?.pageFlip()?.turnToPage(Math.max(0, newPage));
      }, 100);
    }
  }, [pagination.isReady, pagination.totalPages, startPage, currentPage]);

  // ---- 翻页事件 ----
  const handleFlip = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const page = e.data as number;
      setCurrentPage(page);

      if (pagination.totalPages > 0) {
        const pct = Math.round((page / Math.max(1, pagination.totalPages - 1)) * 100);
        onProgressUpdate?.(pct, `page:${page}`);
      }
    },
    [pagination.totalPages, onProgressUpdate],
  );

  // ---- 键盘翻页 ----
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const pageFlip = flipBookRef.current?.pageFlip();
      if (!pageFlip) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        pageFlip.flipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        pageFlip.flipPrev();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  // ---- 主题 ----
  const theme = settings?.theme || 'light';
  const themeClass =
    theme === 'dark' ? 'book-theme-dark' :
    theme === 'sepia' ? 'book-theme-sepia' : '';

  // ---- 排版设置 ----
  const fontSize = settings?.fontSize ?? 16;
  const lineHeightVal = settings?.lineHeight ?? 1.8;
  const fontFamily = settings?.fontFamily ?? 'system';

  // ---- 是否就绪 ----
  const ready = !isLoading && !error && pagination.isReady && containerSize.w > 0;

  // ---- 构建页面数据 ----
  const pages = useMemo(() => {
    if (!ready) return [];
    return Array.from({ length: pagination.totalPages }, (_, i) => {
      const info = getChapterForPage(i, pagination.chapterPageRanges);
      return {
        pageIndex: i,
        chapterIndex: info?.chapterIndex ?? 0,
        pageInChapter: info?.pageInChapter ?? 0,
      };
    });
  }, [ready, pagination.totalPages, pagination.chapterPageRanges]);

  return (
    <div ref={containerRef} className={`book-container ${themeClass}`}>
      {/* 错误状态 */}
      {error && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm opacity-60 mb-2">EPUB 加载失败</p>
            <p className="text-xs opacity-40">{error}</p>
          </div>
        </div>
      )}

      {/* 加载/排版中 */}
      {!error && !ready && (
        <div className="book-loading">
          <div className="book-loading-spinner" />
          <span className="text-xs opacity-50">
            {isLoading ? '正在解析 EPUB...' : '正在排版...'}
          </span>
        </div>
      )}

      {/* 书本 */}
      {ready && pagination.totalPages > 0 && (
        <div className="book-frame" style={{ position: 'relative' }}>
          {/* 书本阴影 */}
          <div className="book-shadow" />

          {/* 左侧页边堆叠 */}
          <div className="page-stack-left" />

          {/* 右侧页边堆叠 */}
          <div className="page-stack-right" />

          {/* 翻页书 */}
          <HTMLFlipBook
            ref={flipBookRef}
            className="book-flipbook"
            width={pageDimensions.pageW}
            height={pageDimensions.pageH}
            size="fixed"
            minWidth={300}
            maxWidth={600}
            minHeight={400}
            maxHeight={900}
            showCover={false}
            mobileScrollSupport={false}
            useMouseEvents={true}
            usePortrait={isMobile}
            flippingTime={600}
            drawShadow={true}
            maxShadowOpacity={0.35}
            showPageCorners={true}
            disableFlipByClick={false}
            clickEventForward={true}
            swipeDistance={30}
            startPage={currentPage}
            startZIndex={2}
            autoSize={false}
            onFlip={handleFlip}
            style={{}}
          >
            {pages.map((p) => (
              <BookPage
                key={p.pageIndex}
                pageIndex={p.pageIndex}
                currentPage={currentPage}
                chapterHtml={chapters[p.chapterIndex]?.html || ''}
                epubStyles={epubStyles}
                pageInChapter={p.pageInChapter}
                pageWidth={contentWidth}
                pageHeight={contentHeight}
                pageNumber={p.pageIndex + 1}
                totalPages={pagination.totalPages}
                fontSize={fontSize}
                lineHeight={lineHeightVal}
                fontFamily={fontFamily}
                theme={theme}
              />
            ))}
          </HTMLFlipBook>

          {/* 书脊阴影（桌面双页模式） */}
          {!isMobile && (
            <div className="book-spine" />
          )}
        </div>
      )}
    </div>
  );
}
