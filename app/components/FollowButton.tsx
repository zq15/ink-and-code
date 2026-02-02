'use client';

import { useState, useEffect } from 'react';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface FollowButtonProps {
  userId: string;
  onFollowChange?: (following: boolean) => void;
  className?: string;
}

export default function FollowButton({ userId, onFollowChange, className = '' }: FollowButtonProps) {
  const { data: session, status } = useSession();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // 检查是否是自己
  const isSelf = session?.user?.id === userId;

  // 获取关注状态
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/follow/status?userId=${userId}`);
        const data = await res.json();
        if (data.code === 200) {
          setFollowing(data.data.following);
        }
      } catch (error) {
        console.error('Failed to fetch follow status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [userId, session, status]);

  const handleToggle = async () => {
    if (!session) {
      // 跳转到登录页
      window.location.href = '/login';
      return;
    }

    setToggling(true);
    try {
      const res = await fetch('/api/follow/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setFollowing(data.data.following);
        onFollowChange?.(data.data.following);
        // 触发全局事件更新关注数
        window.dispatchEvent(new CustomEvent('followChange'));
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setToggling(false);
    }
  };

  // 不显示自己的关注按钮
  if (isSelf) {
    return null;
  }

  if (loading) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all cursor-pointer ${
        following
          ? 'bg-card border border-card-border text-muted hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      } ${toggling ? 'opacity-70' : ''} ${className}`}
    >
      {toggling ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : following ? (
        <UserMinus className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      <span>{following ? '已关注' : '关注'}</span>
    </button>
  );
}
