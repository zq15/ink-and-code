'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ePub, { type Book } from 'epubjs';

export interface ChapterData {
  html: string;
  id: string;
}

export interface EpubContentResult {
  chapters: ChapterData[];
  styles: string;
  metadata: { title: string; author: string };
  isLoading: boolean;
  error: string | null;
}

/**
 * 解析 EPUB 文件，提取各章节 HTML 及样式
 * 仅用于解析，不做渲染
 */
export function useEpubContent(bookId: string): EpubContentResult {
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [styles, setStyles] = useState('');
  const [metadata, setMetadata] = useState({ title: '', author: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bookRef = useRef<Book | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  const cleanup = useCallback(() => {
    // 释放 blob URLs
    blobUrlsRef.current.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    });
    blobUrlsRef.current = [];
    bookRef.current?.destroy();
    bookRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function parse() {
      setIsLoading(true);
      setError(null);

      try {
        // 1. 获取 EPUB 二进制数据
        const res = await fetch(`/api/library/file?id=${bookId}`);
        if (!res.ok) throw new Error(`加载失败: ${res.status}`);
        const data = await res.arrayBuffer();
        if (cancelled) return;

        // 2. 用 epubjs 解析
        const book = ePub(data as unknown as string);
        bookRef.current = book;
        await book.ready;
        if (cancelled) return;

        // 3. 提取 metadata
        const meta = book.packaging?.metadata;
        const bookMeta = {
          title: meta?.title || '',
          author: meta?.creator || '',
        };

        // 4. 替换资源 URL 为 blob URLs（图片、字体等）
        await book.resources.replacements();
        if (cancelled) return;

        // 5. 提取各章节 HTML
        const spineItems: { index: number; href: string }[] = [];
        book.spine.each((section: { index: number; href: string }) => {
          spineItems.push({ index: section.index, href: section.href });
        });

        const extractedChapters: ChapterData[] = [];
        const cssSet = new Set<string>();

        for (const item of spineItems) {
          if (cancelled) return;
          const section = book.spine.get(item.href);
          if (!section) continue;

          try {
            // section.load 返回一个 Document
            const doc = await section.load(book.load.bind(book));
            if (cancelled) return;

            if (doc) {
              // 提取 CSS（内联 <style> 标签）
              const styleEls = doc.querySelectorAll('style');
              styleEls.forEach((el: Element) => {
                if (el.textContent) cssSet.add(el.textContent);
              });

              // 提取 <link rel="stylesheet"> 的 CSS
              const linkEls = doc.querySelectorAll('link[rel="stylesheet"]');
              for (const link of Array.from(linkEls)) {
                const href = link.getAttribute('href');
                if (href) {
                  // 尝试从 book resources 获取 CSS 内容
                  try {
                    const cssUrl = book.resources.get(href);
                    if (cssUrl) {
                      const cssRes = await fetch(cssUrl);
                      if (cssRes.ok) {
                        const cssText = await cssRes.text();
                        cssSet.add(cssText);
                      }
                    }
                  } catch { /* 忽略 CSS 加载失败 */ }
                }
              }

              // 处理 body 内容
              const body = doc.body || doc.documentElement;
              if (body) {
                // 替换 img src 为 blob URL
                const images = body.querySelectorAll('img');
                images.forEach((img: Element) => {
                  const src = img.getAttribute('src');
                  if (src) {
                    const blobUrl = book.resources.get(src);
                    if (blobUrl) {
                      img.setAttribute('src', blobUrl);
                      blobUrlsRef.current.push(blobUrl);
                    }
                  }
                });

                // 替换 image xlink:href (SVG)
                const svgImages = body.querySelectorAll('image');
                svgImages.forEach((img: Element) => {
                  const href = img.getAttribute('xlink:href') || img.getAttribute('href');
                  if (href) {
                    const blobUrl = book.resources.get(href);
                    if (blobUrl) {
                      img.setAttribute('xlink:href', blobUrl);
                      img.setAttribute('href', blobUrl);
                      blobUrlsRef.current.push(blobUrl);
                    }
                  }
                });

                extractedChapters.push({
                  html: body.innerHTML,
                  id: item.href,
                });
              }
            }
          } catch (err) {
            console.warn(`Failed to load section ${item.href}:`, err);
            // 跳过加载失败的章节
          }
        }

        if (cancelled) return;

        // 6. 合并所有 CSS
        const combinedCss = Array.from(cssSet).join('\n');

        setChapters(extractedChapters);
        setStyles(combinedCss);
        setMetadata(bookMeta);
        setIsLoading(false);
      } catch (err) {
        console.error('EPUB parsing failed:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '解析 EPUB 失败');
          setIsLoading(false);
        }
      }
    }

    parse();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [bookId, cleanup]);

  return { chapters, styles, metadata, isLoading, error };
}
