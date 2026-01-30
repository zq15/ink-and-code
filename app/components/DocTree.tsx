'use client';

import { useState, useRef, useEffect, createContext, useContext, useMemo } from 'react';
import {
  useCategoryList,
  useArticleList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateArticle,
  buildCategoryTree,
  type CategoryTreeNode,
  type ArticleListItem,
} from '@/lib/hooks';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Trash2,
  FolderPlus,
  FilePlus,
  Search,
  Layout,
} from 'lucide-react';
import { useConfirm } from '@/app/components/ConfirmDialog';

// Context for tree state
interface TreeContextValue {
  selectedId: string | null;
  selectedType: 'category' | 'article' | null;
  editingId: string | null;
  editValue: string;
  expandedIds: Set<string>;
  articlesByCategory: Record<string, ArticleListItem[]>;
  onSelect: (id: string, type: 'category' | 'article') => void;
  onStartEdit: (id: string, name: string) => void;
  onEndEdit: (save: boolean) => void;
  onEditChange: (value: string) => void;
  onToggleExpand: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onDeleteArticle: (id: string) => void;
  onAddCategory: (parentId: string | null) => void;
  onAddArticle: (categoryId: string | null) => void;
}

const TreeContext = createContext<TreeContextValue | null>(null);

// 文章节点
interface ArticleNodeProps {
  article: ArticleListItem;
  depth: number;
}

function ArticleNode({ article, depth }: ArticleNodeProps) {
  const ctx = useContext(TreeContext)!;
  const isSelected = ctx.selectedId === article.id && ctx.selectedType === 'article';
  const paddingLeft = 16 + depth * 16;

  return (
    <div
      className={`group flex items-center gap-2.5 py-1.5 pr-2.5 mx-1 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-primary/10 text-primary font-medium shadow-[inset_0_0_0_1px_rgba(var(--primary),0.1)]' 
          : 'hover:bg-card-border/40 text-muted/80 hover:text-foreground'
      }`}
      style={{ paddingLeft }}
      onClick={() => ctx.onSelect(article.id, 'article')}
    >
      <FileText className={`w-3.5 h-3.5 shrink-0 transition-transform ${isSelected ? 'scale-110' : 'opacity-40 group-hover:opacity-70'}`} />
      <span className="flex-1 text-[13px] truncate tracking-tight">{article.title || '无标题'}</span>
      {!article.published && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold uppercase tracking-wider">
          草稿
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          ctx.onDeleteArticle(article.id);
        }}
        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// 分类节点
interface CategoryNodeProps {
  node: CategoryTreeNode;
}

function CategoryNode({ node }: CategoryNodeProps) {
  const ctx = useContext(TreeContext)!;
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = ctx.editingId === node.id;
  const isSelected = ctx.selectedId === node.id && ctx.selectedType === 'category';
  const isExpanded = ctx.expandedIds.has(node.id);
  const articles = ctx.articlesByCategory[node.id] || [];
  const hasChildren = node.children.length > 0 || articles.length > 0;
  const paddingLeft = 12 + node.depth * 16;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') ctx.onEndEdit(true);
    else if (e.key === 'Escape') ctx.onEndEdit(false);
  };

  return (
    <div className="space-y-0.5">
      <div
        className={`group flex items-center gap-2 py-2 pr-2.5 mx-1 rounded-xl cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'bg-primary/5 text-primary font-semibold' 
            : 'hover:bg-card-border/30 text-muted/90 hover:text-foreground'
        }`}
        style={{ paddingLeft }}
        onClick={() => {
          ctx.onToggleExpand(node.id);
          ctx.onSelect(node.id, 'category');
        }}
      >
        {/* 展开/折叠控制 */}
        <div className="w-4 h-4 flex items-center justify-center shrink-0">
          {hasChildren && (
            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
              <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-100" />
            </div>
          )}
        </div>

        {/* 文件夹图标 */}
        <div className={`transition-all duration-300 ${isExpanded ? 'scale-110' : 'opacity-60 group-hover:opacity-100'}`}>
          {node.icon ? (
            <span className="text-base leading-none">{node.icon}</span>
          ) : isExpanded ? (
            <FolderOpen className="w-4 h-4 text-primary/80" />
          ) : (
            <Folder className="w-4 h-4 opacity-40" />
          )}
        </div>

        {/* 名称编辑或显示 */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={ctx.editValue}
            onChange={(e) => ctx.onEditChange(e.target.value)}
            onBlur={() => ctx.onEndEdit(true)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-0.5 bg-background border border-primary/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 min-w-0"
          />
        ) : (
          <span
            className="flex-1 text-[13px] truncate tracking-tight"
            onDoubleClick={(e) => {
              e.stopPropagation();
              ctx.onStartEdit(node.id, node.name);
            }}
          >
            {node.name}
          </span>
        )}

        {/* 文章数量或操作按钮 */}
        <div className="flex items-center">
          {!isEditing && articles.length > 0 && !isSelected && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-card-border/30 text-muted/60 font-bold group-hover:hidden">
              {articles.length}
            </span>
          )}
          
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                ctx.onAddArticle(node.id);
              }}
              className="p-1 hover:bg-primary/10 hover:text-primary rounded-md transition-colors"
              title="新建文章"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                ctx.onAddCategory(node.id);
              }}
              className="p-1 hover:bg-primary/10 hover:text-primary rounded-md transition-colors"
              title="新建子分类"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                ctx.onDeleteCategory(node.id);
              }}
              className="p-1 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors"
              title="删除文件夹"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 递归子内容 */}
      {isExpanded && (
        <div className="animate-in slide-in-from-left-2 fade-in duration-300">
          {node.children.map((child) => (
            <CategoryNode key={child.id} node={child} />
          ))}
          {articles.map((article) => (
            <ArticleNode key={article.id} article={article} depth={node.depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface DocTreeProps {
  selectedId: string | null;
  selectedType: 'category' | 'article' | null;
  onSelect: (id: string | null, type: 'category' | 'article' | null) => void;
  onAddArticle: (categoryId: string | null) => void;
  onDeleteArticle: (id: string) => void;
}

export default function DocTree({
  selectedId,
  selectedType,
  onSelect,
  onAddArticle: _onAddArticle, // 保留接口兼容性，但内部使用 handleCreateArticle
  onDeleteArticle,
}: DocTreeProps) {
  void _onAddArticle; // 避免 unused 警告
  const confirm = useConfirm();
  const { data: categories, mutate: refreshCategories } = useCategoryList();
  const { data: articlesData, mutate: refreshArticles } = useArticleList({ limit: 1000, showAll: true });
  const { trigger: createCategory } = useCreateCategory();
  const { trigger: updateCategory } = useUpdateCategory();
  const { trigger: deleteCategory } = useDeleteCategory();
  const { trigger: createArticle } = useCreateArticle();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const tree = categories ? buildCategoryTree(categories) : [];
  const articles = useMemo(() => articlesData?.list || [], [articlesData?.list]);

  // 按分类分组文章
  const articlesByCategory = useMemo(() => {
    const map: Record<string, ArticleListItem[]> = { uncategorized: [] };
    articles.forEach((article) => {
      const catId = article.categoryId || 'uncategorized';
      if (!map[catId]) map[catId] = [];
      map[catId].push(article);
    });
    return map;
  }, [articles]);

  // 搜索过滤
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt?.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [articles, searchQuery]);

  // 展开包含选中项的分类
  useEffect(() => {
    if (selectedId && selectedType === 'article') {
      const article = articles.find((a) => a.id === selectedId);
      if (article?.categoryId) {
        queueMicrotask(() => {
          setExpandedIds((prev) => new Set([...prev, article.categoryId!]));
        });
      }
    }
  }, [selectedId, selectedType, articles]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const handleEndEdit = async (save: boolean) => {
    if (save && editingId && editValue.trim()) {
      try {
        await updateCategory({ id: editingId, name: editValue.trim() });
        refreshCategories();
      } catch (error) {
        console.error('Failed to rename:', error);
      }
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleAddCategory = async (parentId: string | null) => {
    try {
      const result = await createCategory({ name: '新建文件夹', parentId });
      if (parentId) {
        setExpandedIds((prev) => new Set([...prev, parentId]));
      }
      await refreshCategories();
      if (result) {
        const newId = (result as { id: string }).id;
        if (newId) {
          setTimeout(() => {
            setEditingId(newId);
            setEditValue('新建文件夹');
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const confirmed = await confirm({
      title: '删除文件夹',
      description: '确定要删除这个文件夹吗？其中的所有子文件夹和文章都将被永久删除，此操作无法撤销。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteCategory({ id });
      refreshCategories();
      if (selectedId === id && selectedType === 'category') {
        onSelect(null, null);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  // 直接在 DocTree 中创建文章
  const handleCreateArticle = async (categoryId: string | null) => {
    try {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await createArticle({
        title: '无标题文档',
        slug: `post-${uniqueId}`,
        content: '',
        published: false,
        categoryId: categoryId,
      });

      console.log('Article created:', result);

      // 刷新文章列表
      await refreshArticles();

      // 选中新创建的文章
      if (result) {
        const newId = (result as { id: string }).id;
        onSelect(newId, 'article');
        // 如果有分类，展开该分类
        if (categoryId) {
          setExpandedIds((prev) => new Set([...prev, categoryId]));
        }
      }
    } catch (error) {
      console.error('Failed to create article:', error);
    }
  };

  const contextValue: TreeContextValue = {
    selectedId,
    selectedType,
    editingId,
    editValue,
    expandedIds,
    articlesByCategory,
    onSelect: (id, type) => onSelect(id, type),
    onStartEdit: handleStartEdit,
    onEndEdit: handleEndEdit,
    onEditChange: setEditValue,
    onToggleExpand: handleToggleExpand,
    onDeleteCategory: handleDeleteCategory,
    onDeleteArticle,
    onAddCategory: handleAddCategory,
    onAddArticle: handleCreateArticle,
  };

  return (
    <TreeContext.Provider value={contextValue}>
      <div className="h-full flex flex-col bg-card/10 backdrop-blur-md">
        {/* 搜索栏 */}
        <div className="p-4 space-y-4 border-b border-card-border/40">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/50 group-focus-within:text-primary/70 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文档或标签..."
              className="w-full pl-9 pr-3 py-2 bg-background/50 border border-card-border/80 rounded-xl text-[13px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all placeholder:text-muted/30"
            />
          </div>

          {/* 顶层快捷操作 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateArticle(null)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/5 border border-primary/10 hover:bg-primary/10 text-primary rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>新建文章</span>
            </button>
            <button
              onClick={() => handleAddCategory(null)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-card-border/20 border border-card-border/40 hover:bg-card-border/40 text-muted-foreground rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>新建文件夹</span>
            </button>
          </div>
        </div>

        {/* 滚动树区域 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredArticles ? (
            <div className="space-y-0.5 animate-in fade-in duration-300">
              <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/50" />
                <span>找到 {filteredArticles.length} 个结果</span>
              </div>
              {filteredArticles.map((article) => (
                <ArticleNode key={article.id} article={article} depth={0} />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {/* 分类树 */}
              {tree.map((node) => (
                <CategoryNode key={node.id} node={node} />
              ))}

              {/* 未分类文章 */}
              {articlesByCategory.uncategorized?.length > 0 && (
                <div className="mt-6 pt-4 border-t border-card-border/40">
                  <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40 flex items-center justify-between">
                    <span>未分类文档</span>
                    <span>{articlesByCategory.uncategorized.length}</span>
                  </div>
                  <div className="mt-1">
                    {articlesByCategory.uncategorized.map((article) => (
                      <ArticleNode key={article.id} article={article} depth={0} />
                    ))}
                  </div>
                </div>
              )}

              {/* 空白状态 */}
              {tree.length === 0 && articles.length === 0 && (
                <div className="px-6 py-12 text-center space-y-4">
                  <div className="w-12 h-12 bg-card-border/20 rounded-2xl flex items-center justify-center mx-auto">
                    <Layout className="w-6 h-6 text-muted/20" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted/60">空空如也</p>
                    <p className="text-[11px] text-muted/40 uppercase tracking-widest">开始创建你的第一篇文档</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TreeContext.Provider>
  );
}
