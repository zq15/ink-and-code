'use client';

import { useState, useRef, useEffect, createContext, useContext } from 'react';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { mutate } from 'swr';
import {
  useCategoryList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  buildCategoryTree,
  flattenCategoryTree,
  type CategoryTreeNode,
} from '@/lib/hooks';
import { useConfirm } from '@/app/components/ConfirmDialog';
import { Plus, Trash2, GripVertical, ChevronRight, ChevronDown, FolderPlus } from 'lucide-react';

// Context for tree state
interface TreeContextValue {
  editingId: string | null;
  editValue: string;
  expandedIds: Set<string>;
  selectedId: string | null;
  onStartEdit: (id: string, name: string) => void;
  onEndEdit: (save: boolean) => void;
  onEditChange: (value: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string | null) => void;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string | null) => void;
}

const TreeContext = createContext<TreeContextValue | null>(null);

interface CategoryItemProps {
  node: CategoryTreeNode;
}

function CategoryItem({ node }: CategoryItemProps) {
  const ctx = useContext(TreeContext)!;
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = ctx.editingId === node.id;
  const isSelected = ctx.selectedId === node.id;
  const isExpanded = ctx.expandedIds.has(node.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      ctx.onEndEdit(true);
    } else if (e.key === 'Escape') {
      ctx.onEndEdit(false);
    }
  };

  const hasChildren = node.children.length > 0;
  const paddingLeft = 8 + node.depth * 16;

  return (
    <div ref={setNodeRef} style={style} className={`${isDragging ? 'opacity-50' : ''}`}>
      <div
        className={`group flex items-center gap-1 py-1.5 pr-2 rounded-lg transition-colors cursor-pointer ${
          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-card-border/50'
        }`}
        style={{ paddingLeft }}
        onClick={() => ctx.onSelect(node.id)}
      >
        {/* 拖拽手柄 */}
        <button
          className="p-0.5 opacity-0 group-hover:opacity-50 hover:opacity-100! cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3 h-3" />
        </button>

        {/* 展开/折叠 */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              ctx.onToggleExpand(node.id);
            }}
            className="p-0.5 hover:bg-card-border rounded"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* 图标 */}
        {node.icon && <span className="text-sm">{node.icon}</span>}

        {/* 名称 */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={ctx.editValue}
            onChange={(e) => ctx.onEditChange(e.target.value)}
            onBlur={() => ctx.onEndEdit(true)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-1.5 py-0.5 bg-background border border-primary/50 rounded text-sm focus:outline-none min-w-0"
          />
        ) : (
          <span
            className="flex-1 text-sm truncate"
            onDoubleClick={(e) => {
              e.stopPropagation();
              ctx.onStartEdit(node.id, node.name);
            }}
          >
            {node.name}
          </span>
        )}

        {/* 文章数量 */}
        <span className="text-xs text-muted">{node.postCount > 0 ? node.postCount : ''}</span>

        {/* 操作按钮 */}
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              ctx.onAddChild(node.id);
            }}
            className="p-1 hover:bg-card-border rounded"
            title="添加子分类"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              ctx.onDelete(node.id);
            }}
            className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded"
            title="删除"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 子分类 */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <CategoryItem key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CategoryTreeProps {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export default function CategoryTree({ selectedCategoryId, onSelectCategory }: CategoryTreeProps) {
  const confirm = useConfirm();
  const { data: categories, mutate: refreshCategories } = useCategoryList();
  const { trigger: createCategory } = useCreateCategory();
  const { trigger: updateCategory } = useUpdateCategory();
  const { trigger: deleteCategory } = useDeleteCategory();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const tree = categories ? buildCategoryTree(categories) : [];
  const flatList = flattenCategoryTree(tree);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeNode = flatList.find((n) => n.id === active.id);
    const overNode = flatList.find((n) => n.id === over.id);
    if (!activeNode || !overNode) return;

    try {
      await updateCategory({
        id: activeNode.id,
        name: activeNode.name,
        parentId: overNode.parentId,
        sortOrder: overNode.sortOrder,
      });
      refreshCategories();
    } catch (error) {
      console.error('Failed to reorder:', error);
    }
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

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '删除分类',
      description: '确定要删除这个分类吗？其中的所有子分类和文章都将被永久删除，此操作无法撤销。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteCategory({ id });
      refreshCategories();
      if (selectedCategoryId === id) onSelectCategory(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleAddChild = async (parentId: string | null) => {
    try {
      const result = await createCategory({ name: '新分类', parentId });
      if (parentId) {
        setExpandedIds((prev) => new Set([...prev, parentId]));
      }
      // 刷新列表
      await refreshCategories();
      // 找到新创建的分类并进入编辑模式
      if (result) {
        const newId = (result as { id: string }).id;
        if (newId) {
          setTimeout(() => {
            setEditingId(newId);
            setEditValue('新分类');
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeNode = activeId ? flatList.find((n) => n.id === activeId) : null;

  const contextValue: TreeContextValue = {
    editingId,
    editValue,
    expandedIds,
    selectedId: selectedCategoryId,
    onStartEdit: handleStartEdit,
    onEndEdit: handleEndEdit,
    onEditChange: setEditValue,
    onDelete: handleDelete,
    onAddChild: handleAddChild,
    onToggleExpand: handleToggleExpand,
    onSelect: onSelectCategory,
  };

  return (
    <TreeContext.Provider value={contextValue}>
      <div className="space-y-0.5">
        {/* 全部文章 */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            !selectedCategoryId ? 'bg-primary/10 text-primary' : 'hover:bg-card-border/50'
          }`}
        >
          <span className="flex-1 text-left">全部文章</span>
        </button>

        {/* 分类树 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={flatList.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            {tree.map((node) => (
              <CategoryItem key={node.id} node={node} />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeNode && (
              <div className="bg-card border border-primary/50 rounded-lg px-3 py-1.5 shadow-lg text-sm">
                {activeNode.icon && <span className="mr-2">{activeNode.icon}</span>}
                {activeNode.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* 新建分类按钮 */}
        <button
          onClick={() => handleAddChild(null)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-card-border/50 hover:text-foreground transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          <span>新建分类</span>
        </button>

        {/* 未分类 */}
        <button
          onClick={() => onSelectCategory('uncategorized')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedCategoryId === 'uncategorized' ? 'bg-primary/10 text-primary' : 'hover:bg-card-border/50 text-muted'
          }`}
        >
          <span className="flex-1 text-left">未分类</span>
        </button>
      </div>
    </TreeContext.Provider>
  );
}
