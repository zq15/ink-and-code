/**
 * 将 Markdown 转换为 TipTap JSON 格式
 */

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

interface TiptapDoc {
  type: 'doc';
  content: TiptapNode[];
}

/**
 * 将 Markdown 文本转换为 TipTap JSON
 */
export function markdownToTiptap(markdown: string): string {
  const doc: TiptapDoc = {
    type: 'doc',
    content: [],
  };

  if (!markdown || markdown.trim() === '') {
    return JSON.stringify(doc);
  }

  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 代码块
    if (line.startsWith('```')) {
      const language = line.slice(3).trim() || 'plaintext';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      doc.content.push({
        type: 'codeBlock',
        attrs: { language },
        content: codeLines.length > 0 ? [{ type: 'text', text: codeLines.join('\n') }] : [],
      });
      i++;
      continue;
    }

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      doc.content.push({
        type: 'heading',
        attrs: { level },
        content: parseInlineContent(text),
      });
      i++;
      continue;
    }

    // 分割线
    if (/^[-*_]{3,}$/.test(line.trim())) {
      doc.content.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    // 引用块
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() === '' && i + 1 < lines.length && lines[i + 1].startsWith('>')))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      doc.content.push({
        type: 'blockquote',
        content: [{
          type: 'paragraph',
          content: parseInlineContent(quoteLines.join('\n')),
        }],
      });
      continue;
    }

    // 无序列表
    if (/^[-*+]\s/.test(line)) {
      const listItems: TiptapNode[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*+]\s/, '');
        listItems.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineContent(itemText),
          }],
        });
        i++;
      }
      doc.content.push({
        type: 'bulletList',
        content: listItems,
      });
      continue;
    }

    // 有序列表
    if (/^\d+\.\s/.test(line)) {
      const listItems: TiptapNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s/, '');
        listItems.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineContent(itemText),
          }],
        });
        i++;
      }
      doc.content.push({
        type: 'orderedList',
        content: listItems,
      });
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 普通段落
    const paragraphLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
      paragraphLines.push(lines[i]);
      i++;
    }
    
    const paragraphText = paragraphLines.join('\n');
    if (paragraphText.trim()) {
      doc.content.push({
        type: 'paragraph',
        content: parseInlineContent(paragraphText),
      });
    }
  }

  // 如果内容为空，添加一个空段落
  if (doc.content.length === 0) {
    doc.content.push({ type: 'paragraph' });
  }

  return JSON.stringify(doc);
}

/**
 * 检查是否是块级元素的开始
 */
function isBlockStart(line: string): boolean {
  return (
    line.startsWith('#') ||
    line.startsWith('>') ||
    line.startsWith('```') ||
    /^[-*+]\s/.test(line) ||
    /^\d+\.\s/.test(line) ||
    /^[-*_]{3,}$/.test(line.trim())
  );
}

/**
 * 解析行内内容（粗体、斜体、代码、链接等）
 */
function parseInlineContent(text: string): TiptapNode[] {
  if (!text || text.trim() === '') {
    return [];
  }

  const nodes: TiptapNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // 粗体 **text** 或 __text__
    let match = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (match) {
      nodes.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'bold' }],
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // 斜体 *text* 或 _text_
    match = remaining.match(/^(\*|_)([^*_]+?)\1/);
    if (match) {
      nodes.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'italic' }],
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // 行内代码 `code`
    match = remaining.match(/^`([^`]+)`/);
    if (match) {
      nodes.push({
        type: 'text',
        text: match[1],
        marks: [{ type: 'code' }],
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // 链接 [text](url)
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      nodes.push({
        type: 'text',
        text: match[1],
        marks: [{ type: 'link', attrs: { href: match[2] } }],
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // 普通文本（直到下一个特殊字符）
    match = remaining.match(/^[^*_`\[\n]+/);
    if (match) {
      nodes.push({
        type: 'text',
        text: match[0],
      });
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // 单个特殊字符作为普通文本
    nodes.push({
      type: 'text',
      text: remaining[0],
    });
    remaining = remaining.slice(1);
  }

  return nodes;
}
