'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Upload, Search, X, Trash2, Clock, Library,
  Grid3X3, List, SortAsc, FileText, Loader2
} from 'lucide-react';
import { useBookList, useUploadBook, useDeleteBook } from '@/lib/hooks/use-library';

const FORMAT_COLORS: Record<string, string> = {
  epub: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
  pdf: 'bg-red-500/15 text-red-600 border-red-500/20',
  txt: 'bg-gray-500/15 text-gray-600 border-gray-500/20',
  md: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
  html: 'bg-orange-500/15 text-orange-600 border-orange-500/20',
  docx: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/20',
  mobi: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
  azw3: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
};

const FORMAT_ICONS: Record<string, string> = {
  epub: 'E',
  pdf: 'P',
  txt: 'T',
  md: 'M',
  html: 'H',
  docx: 'D',
  mobi: 'K',
  azw3: 'K',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatReadTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function LibraryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<string>('recent');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { books, isLoading, mutate } = useBookList(search, sort);
  const { upload, isUploading, progress, uploadPhase } = useUploadBook();
  const { deleteBook } = useDeleteBook();

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // 并发上传，限制同时 3 个
    const concurrency = 3;
    const errors: string[] = [];

    for (let i = 0; i < fileArray.length; i += concurrency) {
      const batch = fileArray.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map((file) => upload(file))
      );
      results.forEach((r, idx) => {
        if (r.status === 'rejected') {
          const name = batch[idx].name;
          const msg = r.reason instanceof Error ? r.reason.message : '上传失败';
          errors.push(`${name}: ${msg}`);
          console.error(`Upload failed (${name}):`, r.reason);
        }
      });
    }

    if (errors.length > 0) {
      alert(`以下文件上传失败：\n${errors.join('\n')}`);
    }

    mutate();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [upload, mutate]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这本书吗？阅读进度、书签和笔记都将被清除。')) return;
    setDeletingId(id);
    try {
      await deleteBook({ id });
      mutate();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  }, [deleteBook, mutate]);

  const handleOpenBook = (id: string) => {
    router.push(`/library/read/${id}`);
  };

  // 计算阅读统计
  const totalBooks = books.length;
  const readingBooks = books.filter(b => b.progress && b.progress.percentage > 0 && b.progress.percentage < 100).length;
  const finishedBooks = books.filter(b => b.progress && b.progress.percentage >= 100).length;
  const totalReadTime = books.reduce((sum, b) => sum + (b.progress?.totalReadTime || 0), 0);

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 bg-background/50">
      <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold serif tracking-tight">我的书架</h1>
              <div className="flex items-center gap-3 text-[10px] text-muted/50 mt-1 font-bold uppercase tracking-wider">
                <span>{totalBooks} 本书</span>
                {readingBooks > 0 && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-muted/30" />
                    <span>{readingBooks} 在读</span>
                  </>
                )}
                {finishedBooks > 0 && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-muted/30" />
                    <span>{finishedBooks} 读完</span>
                  </>
                )}
                {totalReadTime > 0 && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-muted/30" />
                    <span>累计 {formatReadTime(totalReadTime)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".epub,.pdf,.txt,.md,.markdown,.html,.htm,.docx,.mobi,.azw3,.azw"
              multiple
              onChange={(e) => handleUpload(e.target.files)}
            />
            {isUploading ? (
              <div className="flex items-center gap-3 px-5 py-2.5 bg-card/80 border border-card-border/60 rounded-xl min-w-[220px]">
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-foreground/80">
                      {uploadPhase === 'processing' ? '服务端处理中...' : '上传中'}
                    </span>
                    <span className="text-[10px] font-bold text-primary tabular-nums">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-card-border/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ease-out ${
                        uploadPhase === 'processing'
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Upload className="w-4 h-4" />
                <span>上传</span>
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
            <input
              type="text"
              placeholder="搜索书名或作者..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-card/50 border border-card-border/60 rounded-xl text-sm placeholder:text-muted/40 focus:outline-none focus:border-primary/40 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/40 hover:text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-card/50 border border-card-border/60 rounded-xl overflow-hidden">
              <button
                onClick={() => setSort('recent')}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  sort === 'recent' ? 'bg-primary/10 text-primary' : 'text-muted/60 hover:text-muted'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSort('title')}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  sort === 'title' ? 'bg-primary/10 text-primary' : 'text-muted/60 hover:text-muted'
                }`}
              >
                <SortAsc className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSort('added')}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  sort === 'added' ? 'bg-primary/10 text-primary' : 'text-muted/60 hover:text-muted'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center bg-card/50 border border-card-border/60 rounded-xl overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-2 transition-colors ${
                  view === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted/60 hover:text-muted'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 transition-colors ${
                  view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted/60 hover:text-muted'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Book Grid / List */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-3/4 bg-card-border/30 rounded-xl mb-3" />
                <div className="h-4 bg-card-border/30 rounded w-3/4 mb-2" />
                <div className="h-3 bg-card-border/20 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 border border-primary/10 rotate-3">
              <BookOpen className="w-8 h-8 text-primary opacity-30 -rotate-3" />
            </div>
            <h3 className="text-xl font-bold serif text-foreground/80 mb-2">书架空空</h3>
            <p className="text-sm text-muted/60 mb-6 max-w-sm">
              {search ? '没有找到匹配的书籍，试试其他关键词' : '上传你的第一本电子书开始阅读之旅'}
            </p>
            {!search && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Upload className="w-4 h-4" />
                <span>上传电子书</span>
              </button>
            )}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                onClick={() => handleOpenBook(book.id)}
                className="group cursor-pointer"
              >
                {/* 书封面 */}
                <div className="relative aspect-3/4 bg-linear-to-br from-card to-card-border/30 border border-card-border/60 rounded-xl overflow-hidden mb-3 shadow-md group-hover:shadow-xl group-hover:border-primary/30 transition-all duration-300 group-hover:-translate-y-1">
                  {book.cover ? (
                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-lg font-bold mb-3 border ${FORMAT_COLORS[book.format] || 'bg-card-border/30 text-muted'}`}>
                        {FORMAT_ICONS[book.format] || '?'}
                      </span>
                      <span className="text-xs font-medium text-foreground/80 line-clamp-3 leading-relaxed serif">
                        {book.title}
                      </span>
                      {book.author && (
                        <span className="text-[10px] text-muted/50 mt-1.5 line-clamp-1">
                          {book.author}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 进度条 */}
                  {book.progress && book.progress.percentage > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-card-border/30">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${book.progress.percentage}%` }}
                      />
                    </div>
                  )}

                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => handleDelete(book.id, e)}
                    disabled={deletingId === book.id}
                    className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 hover:text-red-500 border border-card-border/60"
                  >
                    {deletingId === book.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* 书信息 */}
                <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                  {book.title}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-muted/50">
                  <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${FORMAT_COLORS[book.format] || 'bg-card-border/30'}`}>
                    {book.format}
                  </span>
                  <span>{formatFileSize(book.fileSize)}</span>
                  {book.progress && book.progress.totalReadTime > 0 && (
                    <span>{formatReadTime(book.progress.totalReadTime)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {books.map((book) => (
              <div
                key={book.id}
                onClick={() => handleOpenBook(book.id)}
                className="group flex items-center gap-4 p-4 bg-card/40 border border-card-border/50 rounded-xl hover:border-primary/30 hover:bg-card/60 transition-all cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border shrink-0 ${FORMAT_COLORS[book.format] || 'bg-card-border/30 text-muted'}`}>
                  {FORMAT_ICONS[book.format] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] text-muted/50 mt-0.5">
                    {book.author && <span>{book.author}</span>}
                    <span>{formatFileSize(book.fileSize)}</span>
                    <span className="uppercase font-bold">{book.format}</span>
                  </div>
                </div>

                {/* 进度 */}
                {book.progress && book.progress.percentage > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1.5 bg-card-border/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${book.progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-muted/50">
                      {Math.round(book.progress.percentage)}%
                    </span>
                  </div>
                )}

                <button
                  onClick={(e) => handleDelete(book.id, e)}
                  disabled={deletingId === book.id}
                  className="p-2 text-muted/30 hover:text-red-500 transition-colors shrink-0"
                >
                  {deletingId === book.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
