'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import UserListModal from './UserListModal';

interface FollowStatsProps {
  userId: string;
  initialFollowing?: number;
  initialFollowers?: number;
}

export default function FollowStats({
  userId,
  initialFollowing = 0,
  initialFollowers = 0,
}: FollowStatsProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [followers, setFollowers] = useState(initialFollowers);
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);

  // 获取最新数据
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch(`/api/follow/counts?userId=${userId}`);
        const data = await res.json();
        if (data.code === 200) {
          setFollowing(data.data.following);
          setFollowers(data.data.followers);
        }
      } catch (error) {
        console.error('Failed to fetch follow counts:', error);
      }
    };

    fetchCounts();
  }, [userId]);

  // 监听关注变化事件
  useEffect(() => {
    const handleFollowChange = () => {
      // 重新获取数据
      fetch(`/api/follow/counts?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 200) {
            setFollowing(data.data.following);
            setFollowers(data.data.followers);
          }
        });
    };

    window.addEventListener('followChange', handleFollowChange);
    return () => window.removeEventListener('followChange', handleFollowChange);
  }, [userId]);

  const formatCount = (count: number) => {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + 'w';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setModalType('following')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/50 border border-card-border/50 hover:bg-card hover:border-card-border transition-all cursor-pointer group"
        >
          <Users className="w-4 h-4 text-muted group-hover:text-foreground" />
          <span className="text-sm">
            <span className="font-bold text-foreground">{formatCount(following)}</span>
            <span className="text-muted ml-1">关注</span>
          </span>
        </button>

        <button
          onClick={() => setModalType('followers')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/50 border border-card-border/50 hover:bg-card hover:border-card-border transition-all cursor-pointer group"
        >
          <Users className="w-4 h-4 text-muted group-hover:text-foreground" />
          <span className="text-sm">
            <span className="font-bold text-foreground">{formatCount(followers)}</span>
            <span className="text-muted ml-1">粉丝</span>
          </span>
        </button>
      </div>

      {/* 用户列表弹窗 */}
      <UserListModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        userId={userId}
        type={modalType || 'followers'}
        title={modalType === 'following' ? '关注列表' : '粉丝列表'}
      />
    </>
  );
}
