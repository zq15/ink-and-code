'use client';

import { generateHTML } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const lowlight = createLowlight(common);

interface TiptapRendererProps {
  content: string; // JSON string or Markdown
}

export default function TiptapRenderer({ content }: TiptapRendererProps) {
  const [mounted, setMounted] = useState(false);
  const [result, setResult] = useState<{ isJson: boolean; html: string }>({ isJson: false, html: '' });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!content) {
      setResult({ isJson: false, html: '' });
      return;
    }

    try {
      // 尝试解析为 JSON（Tiptap 格式）
      let json = JSON.parse(content);
      
      // 处理双重编码的情况（字符串形式的 JSON）
      if (typeof json === 'string') {
        json = JSON.parse(json);
      }
      
      // 验证是否是有效的 Tiptap 文档结构
      if (!json || typeof json !== 'object' || json.type !== 'doc') {
        setResult({ isJson: false, html: '' });
        return;
      }
      
      const generatedHtml = generateHTML(json, [
        StarterKit.configure({
          codeBlock: false,
        }),
        Link.configure({
          HTMLAttributes: {
            class: 'text-primary underline hover:no-underline',
          },
        }),
        Image.configure({
          HTMLAttributes: {
            class: 'max-w-full rounded-lg my-4',
          },
        }),
        CodeBlockLowlight.configure({
          lowlight,
        }),
      ]);
      setResult({ isJson: true, html: generatedHtml });
    } catch (e) {
      console.error('TiptapRenderer parse error:', e);
      // 不是 JSON，返回原始内容用于 Markdown 渲染
      setResult({ isJson: false, html: '' });
    }
  }, [content]);

  // 服务端渲染时显示加载占位符，避免 hydration 不匹配
  if (!mounted) {
    return (
      <div className="tiptap-content overflow-hidden animate-pulse">
        <div className="h-4 bg-muted/20 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-muted/20 rounded w-full mb-3"></div>
        <div className="h-4 bg-muted/20 rounded w-5/6 mb-3"></div>
      </div>
    );
  }

  // 如果是 JSON 格式，使用 HTML 渲染
  if (result.isJson) {
    return (
      <div
        className="tiptap-content overflow-hidden"
        dangerouslySetInnerHTML={{ __html: result.html }}
      />
    );
  }

  // 如果是 Markdown 格式，使用 ReactMarkdown 渲染
  return (
    <div className="tiptap-content overflow-hidden">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
