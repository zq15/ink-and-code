'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, User } from 'lucide-react';
import Link from 'next/link';

interface UserItem {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  headline: string | null;
  followedAt: string;
}

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  title: string;
}

export default function UserListModal({
  isOpen,
  onClose,
  userId,
  type,
  title,
}: UserListModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/follow/${type}?userId=${userId}&page=${pageNum}&limit=20`);
      const data = await res.json();
      
      if (data.code === 200) {
        const newUsers = data.data.list;
        setUsers(prev => reset ? newUsers : [...prev, ...newUsers]);
        setTotal(data.data.pagination.total);
        setHasMore(pageNum < data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, type, loading]);

  // 打开时加载数据
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setUsers([]);
      setHasMore(true);
      fetchUsers(1, true);
    }
  }, [isOpen, userId, type]);

  // 加载更多
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUsers(nextPage);
    }
  };

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative w-full max-w-md bg-background border border-card-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <h2 className="text-lg font-bold text-foreground">
            {title}
            <span className="ml-2 text-sm font-normal text-muted">({total})</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-card-border/50 text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 用户列表 */}
        <div className="max-h-[60vh] overflow-y-auto">
          {users.length === 0 && !loading ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-card-border/30 flex items-center justify-center">
                <User className="w-8 h-8 text-muted/30" />
              </div>
              <p className="text-muted">暂无{type === 'followers' ? '粉丝' : '关注'}</p>
            </div>
          ) : (
            <div className="divide-y divide-card-border/50">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={user.username ? `/u/${user.username}` : '#'}
                  onClick={onClose}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-card/50 transition-colors"
                >
                  {/* 头像 */}
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || user.username || '用户'}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-card-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center ring-2 ring-card-border">
                      <span className="text-lg font-bold text-primary">
                        {(user.name || user.username || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {user.name || user.username || '匿名用户'}
                    </h3>
                    {user.username && (
                      <p className="text-sm text-muted truncate">@{user.username}</p>
                    )}
                    {user.headline && (
                      <p className="text-sm text-muted/70 truncate mt-0.5">{user.headline}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* 加载更多 */}
          {hasMore && users.length > 0 && (
            <div className="px-6 py-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-card border border-card-border text-muted hover:text-foreground hover:border-card-border/80 transition-colors font-medium cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    加载中...
                  </span>
                ) : (
                  '加载更多'
                )}
              </button>
            </div>
          )}

          {/* 底部加载中 */}
          {loading && users.length === 0 && (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
