'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReadingSettingsData } from '@/lib/hooks/use-library';
import { Loader2 } from 'lucide-react';

interface HtmlReaderViewProps {
  url: string;
  format: string; // txt, md, html, markdown
  initialScrollPercent?: number;
  settings?: ReadingSettingsData | null;
  onProgressUpdate?: (percentage: number, location?: string) => void;
}

export default function HtmlReaderView({
  url,
  format,
  initialScrollPercent,
  settings,
  onProgressUpdate,
}: HtmlReaderViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const restoredRef = useRef(false);

  // 加载文件内容
  useEffect(() => {
    async function loadContent() {
      try {
        setIsLoading(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error('加载失败');
        const text = await res.text();
        setContent(text);
      } catch (err) {
        console.error('Failed to load content:', err);
        setContent('加载失败，请检查文件是否可访问。');
      } finally {
        setIsLoading(false);
      }
    }
    loadContent();
  }, [url]);

  // 恢复滚动位置
  useEffect(() => {
    if (!isLoading && content && initialScrollPercent && !restoredRef.current && containerRef.current) {
      restoredRef.current = true;
      const el = containerRef.current;
      requestAnimationFrame(() => {
        const scrollTop = (initialScrollPercent / 100) * (el.scrollHeight - el.clientHeight);
        el.scrollTop = scrollTop;
      });
    }
  }, [isLoading, content, initialScrollPercent]);

  // 监听滚动更新进度
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;
    const pct = Math.round((el.scrollTop / maxScroll) * 100);
    onProgressUpdate?.(Math.min(100, pct));
  }, [onProgressUpdate]);

  const fontFamily =
    settings?.fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' :
    settings?.fontFamily === 'sans-serif' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' :
    settings?.fontFamily === 'mono' ? '"SF Mono", "Fira Code", monospace' :
    'inherit';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin opacity-50" />
          <span className="text-sm opacity-50">正在加载...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto px-4 sm:px-8 py-8 scrollbar-hide"
      onScroll={handleScroll}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: `${settings?.pageWidth || 800}px`,
          fontSize: `${settings?.fontSize || 16}px`,
          lineHeight: settings?.lineHeight || 1.8,
          fontFamily,
        }}
      >
        {format === 'html' || format === 'htm' ? (
          <div
            className="prose prose-sm sm:prose-base max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : format === 'md' || format === 'markdown' ? (
          <div className="prose prose-sm sm:prose-base max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          // TXT：保留换行
          <div className="whitespace-pre-wrap wrap-break-word leading-relaxed">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}
