/*
 * :file description: 
 * :name: /ink-and-code/app/components/TiptapEditor.tsx
 * :author: PTC
 * :copyright: (c) 2026, Tungee
 * :date created: 2026-01-30 14:12:35
 * :last editor: PTC
 * :date last edited: 2026-01-30 21:06:49
 */
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useCallback, useEffect } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  CodeSquare,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Undo,
  Redo,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const lowlight = createLowlight(common);

interface TiptapEditorProps {
  content: string;
  onChange: (json: string) => void;
  placeholder?: string;
  headerContent?: React.ReactNode;
}

// 工具栏按钮
function ToolbarToggle({
  pressed,
  onPressedChange,
  disabled,
  tooltip,
  children,
}: {
  pressed?: boolean;
  onPressedChange: () => void;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          size="sm"
          pressed={pressed}
          onPressedChange={onPressedChange}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={5}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export default function TiptapEditor({
  content,
  onChange,
  placeholder = '开始写作...',
  headerContent,
}: TiptapEditorProps) {
  const parseContent = (str: string) => {
    if (!str || str === '') return undefined;
    try {
      return JSON.parse(str);
    } catch {
      return undefined;
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
      }),
    ],
    content: parseContent(content),
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none prose prose-lg dark:prose-invert max-w-none leading-relaxed',
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter') {
          const { state } = view;
          const { $from } = state.selection;
          const textBefore = $from.parent.textContent;
          const match = textBefore.match(/^```(\w*)$/);
          if (match) {
            const language = match[1] || 'javascript';
            view.dispatch(
              state.tr
                .delete($from.start(), $from.pos)
                .setBlockType(
                  $from.start(),
                  $from.start(),
                  state.schema.nodes.codeBlock,
                  { language }
                )
            );
            return true;
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON());
      if (currentContent !== content) {
        const parsed = parseContent(content);
        if (parsed) {
          editor.commands.setContent(parsed);
        }
      }
    }
  }, [editor, content]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('输入链接 URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('输入图片 URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className="h-[400px] bg-background border border-border rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="group/editor flex flex-col min-h-[600px]">
      {/* 悬浮工具栏 */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 p-2 bg-background/80 backdrop-blur-xl border border-card-border/60 shadow-sm transition-all duration-300 opacity-40 hover:opacity-100 group-focus-within/editor:opacity-100 group-focus-within/editor:shadow-md">
        {/* 文本格式 */}
        <div className="flex items-center gap-0.5 px-1">
          <ToolbarToggle
            pressed={editor.isActive('bold')}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            tooltip="粗体 (⌘B)"
          >
            <Bold className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            pressed={editor.isActive('italic')}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            tooltip="斜体 (⌘I)"
          >
            <Italic className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            pressed={editor.isActive('strike')}
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            tooltip="删除线"
          >
            <Strikethrough className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            pressed={editor.isActive('code')}
            onPressedChange={() => editor.chain().focus().toggleCode().run()}
            tooltip="行内代码"
          >
            <Code className="size-3.5" />
          </ToolbarToggle>
        </div>

        <div className="w-px h-4 bg-card-border/60 mx-1" />

        {/* 标题 */}
        <div className="flex items-center gap-0.5 px-1">
          <ToolbarToggle
            pressed={editor.isActive('heading', { level: 1 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            tooltip="一级标题"
          >
            <Heading1 className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            pressed={editor.isActive('heading', { level: 2 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            tooltip="二级标题"
          >
            <Heading2 className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            pressed={editor.isActive('heading', { level: 3 })}
            onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            tooltip="三级标题"
          >
            <Heading3 className="size-3.5" />
          </ToolbarToggle>
        </div>

        <div className="w-px h-4 bg-card-border/60 mx-1" />

        {/* 列表和内容块 */}
        <div className="flex items-center gap-0.5 px-1">
          <ToolbarToggle
            pressed={editor.isActive('bulletList')}
            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            tooltip="无序列表"
          >
            <List className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            pressed={editor.isActive('orderedList')}
            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            tooltip="有序列表"
          >
            <ListOrdered className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            pressed={editor.isActive('blockquote')}
            onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
            tooltip="引用"
          >
            <Quote className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            pressed={editor.isActive('codeBlock')}
            onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
            tooltip="代码块"
          >
            <CodeSquare className="size-3.5" />
          </ToolbarToggle>
        </div>

        <div className="w-px h-4 bg-card-border/60 mx-1" />

        {/* 媒体和链接 */}
        <div className="flex items-center gap-0.5 px-1">
          <ToolbarToggle
            pressed={editor.isActive('link')}
            onPressedChange={setLink}
            tooltip="插入链接"
          >
            <LinkIcon className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle onPressedChange={addImage} tooltip="插入图片">
            <ImageIcon className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
            tooltip="分割线"
          >
            <Minus className="size-3.5" />
          </ToolbarToggle>
        </div>

        <div className="flex-1" />

        {/* 历史记录 */}
        <div className="flex items-center gap-0.5 px-1">
          <ToolbarToggle
            onPressedChange={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="撤销 (⌘Z)"
          >
            <Undo className="size-3.5" />
          </ToolbarToggle>
          <ToolbarToggle
            onPressedChange={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="重做 (⇧⌘Z)"
          >
            <Redo className="size-3.5" />
          </ToolbarToggle>
        </div>
      </div>

      {/* 内容区域（带 padding） */}
      <div className="flex-1 px-10 py-8">
        {/* 头部内容区（标题、摘要等） */}
        {headerContent && (
          <div className="mb-4">
            {headerContent}
          </div>
        )}

        {/* 编辑区容器 */}
        <div className="flex-1">
          <EditorContent editor={editor} className="tiptap-editor-content" />
        </div>
      </div>
    </div>
  );
}
