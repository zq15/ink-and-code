'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Users,
  FileText,
  Shield,
  ShieldOff,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  image: string | null;
  bannedAt: string | null;
  banReason: string | null;
  profileHidden: boolean;
  isTestAccount: boolean;
  testLoginCode: string | null;
  isAdmin: boolean;
  createdAt: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isDeveloper: boolean;
}

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
  published: boolean;
  bannedAt: string | null;
  banReason: string | null;
  deletedByAdmin: boolean;
  adminDeletedAt: string | null;
  adminNote: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    username: string | null;
    image: string | null;
  };
  category: {
    id: string;
    name: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function DeveloperPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const urlToken = searchParams.get('token') || '';
  
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [usersPagination, setUsersPagination] = useState<Pagination | null>(null);
  const [postsPagination, setPostsPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [postStatus, setPostStatus] = useState('');
  
  // 模态框状态
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [modalTarget, setModalTarget] = useState<{ type: 'user' | 'post'; id: string; name: string } | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [newTestEmail, setNewTestEmail] = useState('');
  const [newTestName, setNewTestName] = useState('');
  
  // 复制状态
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 授权状态
  const [tokenInput, setTokenInput] = useState(urlToken);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authMethod, setAuthMethod] = useState<'token' | 'session' | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUserIsDeveloper, setCurrentUserIsDeveloper] = useState(false); // 当前用户是否是开发者（不是管理者）
  
  // 用于 API 调用的 token（如果是 session 方式则为空）
  const token = urlToken;

  // 获取用户列表
  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (token) params.set('token', token);
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      
      if (data.code === 200) {
        setUsers(data.data.list);
        setUsersPagination(data.data.pagination);
        setIsAuthorized(true);
      } else {
        setError(data.message || '获取用户列表失败');
        if (data.code === 403) setIsAuthorized(false);
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  // 获取文章列表
  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (token) params.set('token', token);
      if (search) params.set('search', search);
      if (selectedUserId) params.set('userId', selectedUserId);
      if (postStatus) params.set('status', postStatus);
      
      const res = await fetch(`/api/admin/posts?${params}`);
      const data = await res.json();
      
      if (data.code === 200) {
        setPosts(data.data.list);
        setPostsPagination(data.data.pagination);
        setIsAuthorized(true);
      } else {
        setError(data.message || '获取文章列表失败');
        if (data.code === 403) setIsAuthorized(false);
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [token, search, selectedUserId, postStatus]);

  // 初始验证开发者身份
  useEffect(() => {
    const verifyDeveloper = async () => {
      setCheckingAuth(true);
      try {
        // 构建验证 URL
        const params = new URLSearchParams();
        if (urlToken) params.set('token', urlToken);
        
        const res = await fetch(`/api/admin/verify?${params}`);
        const data = await res.json();
        
        if (data.code === 200 && data.data?.authorized) {
          setIsAuthorized(true);
          setAuthMethod(data.data.method);
          setCurrentUserIsDeveloper(data.data.isDeveloper === true);
        } else {
          setIsAuthorized(false);
          setCurrentUserIsDeveloper(false);
        }
      } catch {
        setIsAuthorized(false);
        setCurrentUserIsDeveloper(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    // 等待 session 加载完成后再验证
    if (sessionStatus !== 'loading') {
      verifyDeveloper();
    }
  }, [urlToken, sessionStatus]);

  // 加载数据
  useEffect(() => {
    if (isAuthorized) {
      if (activeTab === 'users') {
        fetchUsers();
      } else {
        fetchPosts();
      }
    }
  }, [isAuthorized, activeTab, fetchUsers, fetchPosts]);

  // 验证 Token
  const handleTokenSubmit = () => {
    if (tokenInput) {
      router.push(`/developer?token=${tokenInput}`);
    }
  };

  // 禁用/解禁用户
  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      const res = await fetch('/api/admin/user/ban', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, banned: ban, reason: modalReason }),
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchUsers(usersPagination?.page || 1);
        setShowBanModal(false);
        setModalReason('');
      } else {
        setError(data.message);
      }
    } catch {
      setError('操作失败');
    }
  };

  // 切换用户资料可见性
  const handleToggleProfile = async (userId: string, hidden: boolean) => {
    try {
      const res = await fetch('/api/admin/user/toggle-profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, hidden }),
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchUsers(usersPagination?.page || 1);
      } else {
        setError(data.message);
      }
    } catch {
      setError('操作失败');
    }
  };

  // 禁用/解禁文章
  const handleBanPost = async (postId: string, ban: boolean) => {
    try {
      const res = await fetch('/api/admin/post/ban', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ postId, banned: ban, reason: modalReason }),
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchPosts(postsPagination?.page || 1);
        setShowBanModal(false);
        setModalReason('');
      } else {
        setError(data.message);
      }
    } catch {
      setError('操作失败');
    }
  };

  // 删除/恢复文章
  const handleDeletePost = async (postId: string, restore: boolean) => {
    try {
      const res = await fetch('/api/admin/post/delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ postId, restore, reason: modalReason }),
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchPosts(postsPagination?.page || 1);
        setShowDeleteModal(false);
        setModalReason('');
      } else {
        setError(data.message);
      }
    } catch {
      setError('操作失败');
    }
  };

  // 成功提示
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // 设置/取消管理者
  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const res = await fetch('/api/admin/user/toggle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isAdmin }),
      });
      const data = await res.json();
      if (data.code === 200) {
        showSuccess(isAdmin ? '已设为管理者' : '已取消管理者');
        fetchUsers(usersPagination?.page || 1);
      } else {
        setError(data.message);
      }
    } catch {
      setError('操作失败');
    }
  };

  // 创建测试账号
  const handleCreateTestAccount = async () => {
    try {
      const res = await fetch('/api/admin/user/create-test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTestName, email: newTestEmail }),
      });
      const data = await res.json();
      if (data.code === 200) {
        showSuccess(`测试账号创建成功！登录码: ${data.data.testLoginCode}`);
        fetchUsers(1);
        setShowCreateTestModal(false);
        setNewTestEmail('');
        setNewTestName('');
      } else {
        setError(data.message);
      }
    } catch {
      setError('创建失败');
    }
  };

  // 刷新测试登录码
  const handleRefreshCode = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/user/refresh-code', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.code === 200) {
        fetchUsers(usersPagination?.page || 1);
      } else {
        setError(data.message);
      }
    } catch {
      setError('刷新失败');
    }
  };

  // 复制登录码
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // 加载中
  if (checkingAuth || sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted text-sm">正在验证权限...</p>
        </div>
      </div>
    );
  }

  // 未授权页面
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-card-border rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">开发者后台</h1>
            <p className="text-muted text-sm">
              {sessionStatus === 'authenticated' 
                ? '您的账号没有开发者权限' 
                : '请登录开发者账号或输入 Token'}
            </p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="输入开发者 Token"
              className="w-full px-4 py-3 bg-background border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              onKeyDown={(e) => e.key === 'Enter' && handleTokenSubmit()}
            />
            <button
              onClick={handleTokenSubmit}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              验证并进入
            </button>
            
            {sessionStatus !== 'authenticated' && (
              <div className="text-center pt-2">
                <a href="/login" className="text-sm text-primary hover:underline">
                  或登录开发者账号
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 sm:pt-20">
      {/* Header */}
      <header className="bg-card border-b border-card-border sticky top-16 sm:top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">开发者后台</h1>
              <p className="text-xs text-muted">管理用户和内容</p>
            </div>
          </div>
          
          {/* 搜索和操作按钮 */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (activeTab === 'users') fetchUsers(1);
                    else fetchPosts(1);
                  }
                }}
                placeholder="搜索..."
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => setShowCreateTestModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">创建测试账号</span>
              <span className="sm:hidden">创建</span>
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            用户管理
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'posts'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            文章管理
          </button>
        </div>
      </header>

      {/* Success Message */}
      {successMsg && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600 flex items-center gap-2">
            <Check className="w-5 h-5" />
            {successMsg}
            <button onClick={() => setSuccessMsg(null)} className="ml-auto text-sm underline">关闭</button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-sm underline">关闭</button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : activeTab === 'users' ? (
          /* 用户列表 */
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className={`bg-card border rounded-2xl p-4 ${
                  user.bannedAt ? 'border-red-500/30 bg-red-500/5' : 'border-card-border'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* 头像 */}
                  <div className="shrink-0">
                    {user.image ? (
                      <img src={user.image} alt="" className="w-12 h-12 rounded-xl" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{user.name || '未设置昵称'}</span>
                      {user.isDeveloper && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">开发者</span>
                      )}
                      {user.isAdmin && !user.isDeveloper && (
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 text-xs rounded-full">管理者</span>
                      )}
                      {user.isTestAccount && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs rounded-full">测试账号</span>
                      )}
                      {user.bannedAt && (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs rounded-full">已禁用</span>
                      )}
                      {user.profileHidden && (
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs rounded-full">资料隐藏</span>
                      )}
                    </div>
                    <div className="text-sm text-muted mb-1">{user.email}</div>
                    {user.username && (
                      <Link 
                        href={`/u/${user.username}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2"
                      >
                        <span>/u/{user.username}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span>文章: {user.postCount}</span>
                      <span>粉丝: {user.followerCount}</span>
                      <span>关注: {user.followingCount}</span>
                      <span>注册: {new Date(user.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                    
                    {/* 测试登录码 */}
                    {user.isTestAccount && user.testLoginCode && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-muted">登录码:</span>
                        <code className="px-2 py-1 bg-background rounded text-sm font-mono">{user.testLoginCode}</code>
                        <button
                          onClick={() => handleCopyCode(user.testLoginCode!)}
                          className="p-1 hover:bg-card-border/50 rounded transition-colors"
                          title="复制"
                        >
                          {copiedCode === user.testLoginCode ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRefreshCode(user.id)}
                          className="p-1 hover:bg-card-border/50 rounded transition-colors"
                          title="刷新登录码"
                        >
                          <RefreshCw className="w-4 h-4 text-muted" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* 操作 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setActiveTab('posts');
                      }}
                      className="p-2 hover:bg-card-border/50 rounded-xl transition-colors"
                      title="查看文章"
                    >
                      <FileText className="w-4 h-4 text-muted" />
                    </button>
                    <button
                      onClick={() => handleToggleProfile(user.id, !user.profileHidden)}
                      className="p-2 hover:bg-card-border/50 rounded-xl transition-colors"
                      title={user.profileHidden ? '显示资料' : '隐藏资料'}
                    >
                      {user.profileHidden ? (
                        <Eye className="w-4 h-4 text-muted" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted" />
                      )}
                    </button>
                    {/* 开发者可以设置/取消管理者（不能对开发者操作） */}
                    {currentUserIsDeveloper && !user.isDeveloper && (
                      <button
                        onClick={() => handleToggleAdmin(user.id, !user.isAdmin)}
                        className={`p-2 rounded-xl transition-colors ${
                          user.isAdmin 
                            ? 'hover:bg-purple-500/10' 
                            : 'hover:bg-card-border/50'
                        }`}
                        title={user.isAdmin ? '取消管理者' : '设为管理者'}
                      >
                        <Users className={`w-4 h-4 ${user.isAdmin ? 'text-purple-500' : 'text-muted'}`} />
                      </button>
                    )}
                    {/* 开发者账号不显示禁用按钮，管理者不能操作开发者和其他管理者 */}
                    {!user.isDeveloper && (currentUserIsDeveloper || !user.isAdmin) && (
                      user.bannedAt ? (
                        <button
                          onClick={() => handleBanUser(user.id, false)}
                          className="p-2 hover:bg-green-500/10 rounded-xl transition-colors"
                          title="解禁"
                        >
                          <ShieldOff className="w-4 h-4 text-green-500" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setModalTarget({ type: 'user', id: user.id, name: user.name || user.email });
                            setShowBanModal(true);
                          }}
                          className="p-2 hover:bg-red-500/10 rounded-xl transition-colors"
                          title="禁用"
                        >
                          <Shield className="w-4 h-4 text-red-500" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 分页 */}
            {usersPagination && usersPagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => fetchUsers(usersPagination.page - 1)}
                  disabled={usersPagination.page <= 1}
                  className="p-2 hover:bg-card-border/50 rounded-xl transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-muted">
                  {usersPagination.page} / {usersPagination.totalPages}
                </span>
                <button
                  onClick={() => fetchUsers(usersPagination.page + 1)}
                  disabled={usersPagination.page >= usersPagination.totalPages}
                  className="p-2 hover:bg-card-border/50 rounded-xl transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 文章列表 */
          <div className="space-y-4">
            {/* 筛选 */}
            <div className="flex items-center gap-3 mb-4">
              {selectedUserId && (
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                >
                  <span>筛选用户</span>
                  <span className="ml-1">×</span>
                </button>
              )}
              <select
                value={postStatus}
                onChange={(e) => setPostStatus(e.target.value)}
                className="px-3 py-1.5 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">全部状态</option>
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
                <option value="banned">已禁用</option>
                <option value="deleted">已删除</option>
              </select>
            </div>

            {posts.map((post) => (
              <div
                key={post.id}
                className={`bg-card border rounded-2xl p-4 ${
                  post.deletedByAdmin
                    ? 'border-red-500/30 bg-red-500/5'
                    : post.bannedAt
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : 'border-card-border'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* 作者头像 */}
                  <div className="shrink-0">
                    {post.user.image ? (
                      <img src={post.user.image} alt="" className="w-10 h-10 rounded-lg" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {(post.user.name || post.user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{post.title || '无标题'}</span>
                      {!post.published && (
                        <span className="px-2 py-0.5 bg-gray-500/10 text-gray-500 text-xs rounded-full">草稿</span>
                      )}
                      {post.bannedAt && (
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs rounded-full">已禁用</span>
                      )}
                      {post.deletedByAdmin && (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs rounded-full">已删除</span>
                      )}
                    </div>
                    <div className="text-sm text-muted mb-2">
                      作者: {post.user.name || post.user.email}
                      {post.category && <span className="ml-2">· 分类: {post.category.name}</span>}
                    </div>
                    {post.excerpt && (
                      <p className="text-sm text-muted/70 line-clamp-2 mb-2">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span>创建: {new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
                      {post.tags.length > 0 && <span>标签: {post.tags.join(', ')}</span>}
                    </div>
                    {(post.banReason || post.adminNote) && (
                      <div className="mt-2 text-xs text-red-500">
                        原因: {post.banReason || post.adminNote}
                      </div>
                    )}
                  </div>
                  
                  {/* 操作 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {post.deletedByAdmin ? (
                      <button
                        onClick={() => handleDeletePost(post.id, true)}
                        className="p-2 hover:bg-green-500/10 rounded-xl transition-colors"
                        title="恢复文章"
                      >
                        <RotateCcw className="w-4 h-4 text-green-500" />
                      </button>
                    ) : (
                      <>
                        {post.bannedAt ? (
                          <button
                            onClick={() => handleBanPost(post.id, false)}
                            className="p-2 hover:bg-green-500/10 rounded-xl transition-colors"
                            title="解禁"
                          >
                            <ShieldOff className="w-4 h-4 text-green-500" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setModalTarget({ type: 'post', id: post.id, name: post.title });
                              setShowBanModal(true);
                            }}
                            className="p-2 hover:bg-yellow-500/10 rounded-xl transition-colors"
                            title="禁用（对外不可见）"
                          >
                            <Shield className="w-4 h-4 text-yellow-500" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setModalTarget({ type: 'post', id: post.id, name: post.title });
                            setShowDeleteModal(true);
                          }}
                          className="p-2 hover:bg-red-500/10 rounded-xl transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* 分页 */}
            {postsPagination && postsPagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => fetchPosts(postsPagination.page - 1)}
                  disabled={postsPagination.page <= 1}
                  className="p-2 hover:bg-card-border/50 rounded-xl transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-muted">
                  {postsPagination.page} / {postsPagination.totalPages}
                </span>
                <button
                  onClick={() => fetchPosts(postsPagination.page + 1)}
                  disabled={postsPagination.page >= postsPagination.totalPages}
                  className="p-2 hover:bg-card-border/50 rounded-xl transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 禁用模态框 */}
      {showBanModal && modalTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-card-border rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              禁用{modalTarget.type === 'user' ? '用户' : '文章'}
            </h3>
            <p className="text-sm text-muted mb-4">
              确定要禁用「{modalTarget.name}」吗？
              {modalTarget.type === 'post' && '禁用后文章对外不可见，但作者仍可查看。'}
            </p>
            <textarea
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              placeholder="禁用原因（可选）"
              className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setModalReason('');
                }}
                className="px-4 py-2 text-sm font-medium hover:bg-card-border/50 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (modalTarget.type === 'user') {
                    handleBanUser(modalTarget.id, true);
                  } else {
                    handleBanPost(modalTarget.id, true);
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors"
              >
                确认禁用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除模态框 */}
      {showDeleteModal && modalTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-card-border rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">删除文章</h3>
            <p className="text-sm text-muted mb-4">
              确定要删除「{modalTarget.name}」吗？删除后用户将看到违规提示。
            </p>
            <textarea
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              placeholder="删除原因（将显示给用户）"
              className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setModalReason('');
                }}
                className="px-4 py-2 text-sm font-medium hover:bg-card-border/50 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeletePost(modalTarget.id, false)}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建测试账号模态框 */}
      {showCreateTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-card-border rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">创建测试账号</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">邮箱 *</label>
                <input
                  type="email"
                  value={newTestEmail}
                  onChange={(e) => setNewTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">昵称</label>
                <input
                  type="text"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder="测试用户"
                  className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateTestModal(false);
                  setNewTestEmail('');
                  setNewTestName('');
                }}
                className="px-4 py-2 text-sm font-medium hover:bg-card-border/50 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateTestAccount}
                disabled={!newTestEmail}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeveloperPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted text-sm">加载中...</p>
          </div>
        </div>
      }
    >
      <DeveloperPageContent />
    </Suspense>
  );
}
