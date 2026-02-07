import React, { useMemo } from 'react';

interface BookPageProps {
  /** 全局页码（0-based） */
  pageIndex: number;
  /** 当前正在查看的页码（用于懒渲染判断） */
  currentPage: number;
  /** 所属章节的 HTML 内容 */
  chapterHtml: string;
  /** EPUB 提取的 CSS 样式 */
  epubStyles: string;
  /** 页面在章节内的偏移（0-based） */
  pageInChapter: number;
  /** 内容区域宽度（不含 padding） */
  pageWidth: number;
  /** 内容区域高度（不含 padding 和页码） */
  pageHeight: number;
  /** 显示的页码（1-based） */
  pageNumber: number;
  /** 总页数 */
  totalPages: number;
  /** 排版设置 */
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  /** 主题 */
  theme: string;
}

/**
 * 翻页书的单页组件
 * 使用 CSS 多列布局 + translateX 定位到正确的内容列
 * 必须使用 forwardRef（react-pageflip 要求）
 */
const BookPage = React.forwardRef<HTMLDivElement, BookPageProps>(
  (
    {
      pageIndex,
      currentPage,
      chapterHtml,
      epubStyles,
      pageInChapter,
      pageWidth,
      pageHeight,
      pageNumber,
      totalPages,
      fontSize,
      lineHeight,
      fontFamily,
      theme,
    },
    ref,
  ) => {
    // 懒渲染：只渲染当前页附近 ±4 页的内容
    const isNearCurrent = Math.abs(pageIndex - currentPage) <= 4;

    // 主题色
    const themeColors = useMemo(() => {
      switch (theme) {
        case 'dark':
          return {
            bg: '#2a2520',
            text: '#c8c0b8',
            pageNumColor: 'rgba(200,192,184,0.4)',
            borderColor: 'rgba(255,255,255,0.04)',
          };
        case 'sepia':
          return {
            bg: '#f4ecd8',
            text: '#5b4636',
            pageNumColor: 'rgba(91,70,54,0.35)',
            borderColor: 'rgba(0,0,0,0.06)',
          };
        default:
          return {
            bg: '#f8f5f0',
            text: '#333',
            pageNumColor: 'rgba(0,0,0,0.3)',
            borderColor: 'rgba(0,0,0,0.06)',
          };
      }
    }, [theme]);

    const fontFamilyCss =
      fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' :
      fontFamily === 'sans-serif' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' :
      fontFamily === 'mono' ? '"SF Mono", "Fira Code", monospace' :
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

    const padding = 40;

    return (
      <div
        ref={ref}
        className="book-page"
        style={{
          width: pageWidth + padding * 2,
          height: pageHeight + padding * 2 + 30,
          backgroundColor: themeColors.bg,
          color: themeColors.text,
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* 页面内容区域 */}
        {isNearCurrent && chapterHtml ? (
          <div
            style={{
              position: 'absolute',
              top: padding,
              left: padding,
              width: pageWidth,
              height: pageHeight,
              overflow: 'hidden',
              contain: 'strict',
            }}
          >
            {/* EPUB 样式 */}
            <style dangerouslySetInnerHTML={{ __html: `
              .epub-page-content * {
                max-width: 100% !important;
                box-sizing: border-box !important;
              }
              .epub-page-content img {
                max-width: 100% !important;
                height: auto !important;
                object-fit: contain !important;
              }
              .epub-page-content a {
                color: inherit !important;
                text-decoration: underline;
              }
              .epub-page-content h1, .epub-page-content h2, .epub-page-content h3 {
                margin-top: 0.5em;
                margin-bottom: 0.3em;
              }
              .epub-page-content p {
                margin: 0.5em 0;
              }
              ${epubStyles}
            ` }} />

            {/* 章节内容 - CSS 多列布局 */}
            <div
              className="epub-page-content"
              style={{
                columnWidth: `${pageWidth}px`,
                columnGap: 0,
                columnFill: 'auto' as const,
                height: `${pageHeight}px`,
                overflow: 'hidden',
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                fontFamily: fontFamilyCss,
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                transform: `translateX(-${pageInChapter * pageWidth}px)`,
              }}
              dangerouslySetInnerHTML={{ __html: chapterHtml }}
            />
          </div>
        ) : (
          /* 占位页面（远离当前页时不渲染内容） */
          <div
            style={{
              position: 'absolute',
              top: padding,
              left: padding,
              width: pageWidth,
              height: pageHeight,
            }}
          />
        )}

        {/* 页码 */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '11px',
            fontFamily: 'Georgia, "Times New Roman", serif',
            color: themeColors.pageNumColor,
            letterSpacing: '0.5px',
            userSelect: 'none',
          }}
        >
          {pageNumber} / {totalPages}
        </div>
      </div>
    );
  },
);

BookPage.displayName = 'BookPage';

export default BookPage;
