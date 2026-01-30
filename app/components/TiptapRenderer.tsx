'use client';

import { generateHTML } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useMemo } from 'react';

const lowlight = createLowlight(common);

interface TiptapRendererProps {
  content: string; // JSON string or plain text/markdown
}

export default function TiptapRenderer({ content }: TiptapRendererProps) {
  const html = useMemo(() => {
    if (!content) return '';

    try {
      // 尝试解析为 JSON（Tiptap 格式）
      const json = JSON.parse(content);
      return generateHTML(json, [
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
    } catch {
      // 如果不是 JSON，当作纯文本/Markdown 处理
      // 简单处理：将换行转为段落
      return content
        .split('\n\n')
        .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
        .join('');
    }
  }, [content]);

  return (
    <div
      className="tiptap-content prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
