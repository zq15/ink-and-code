'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Save, Globe, User, Link2, Loader2, CheckCircle2, XCircle, Copy, ExternalLink, Sparkles } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  username: string | null;
  bio: string | null;
  headline: string | null;
}

interface SiteConfig {
  siteName: string | null;
  siteTagline: string | null;
  primaryColor: string | null;
  githubUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 用户名检测状态
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string | null;
  }>({ checking: false, available: null, reason: null });
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 用户资料
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    username: '',
    name: '',
    headline: '',
    bio: '',
  });

  // 检查用户名是否可用（防抖）
  const checkUsername = useCallback(async (username: string, originalUsername: string | null) => {
    if (username === originalUsername) {
      setUsernameStatus({ checking: false, available: null, reason: null });
      return;
    }

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    if (!username || username.length < 3) {
      setUsernameStatus({ checking: false, available: null, reason: username ? '用户名至少 3 个字符' : null });
      return;
    }

    setUsernameStatus({ checking: true, available: null, reason: null });

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        
        if (data.data) {
          setUsernameStatus({
            checking: false,
            available: data.data.available,
            reason: data.data.reason,
          });
        }
      } catch {
        setUsernameStatus({ checking: false, available: null, reason: '检测失败' });
      }
    }, 500);
  }, []);

  const handleUsernameChange = (value: string) => {
    setProfileForm({ ...profileForm, username: value });
    checkUsername(value, profile?.username || null);
  };

  // 站点配置
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [siteForm, setSiteForm] = useState({
    siteName: '',
    siteTagline: '',
    githubUrl: '',
    twitterUrl: '',
    linkedinUrl: '',
    websiteUrl: '',
  });

  useEffect(() => {
    if (status === 'authenticated') {
      loadData();
    }
  }, [status]);

  const loadData = async () => {
    try {
      const [profileRes, siteRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/user/site-config'),
      ]);

      const profileData = await profileRes.json();
      const siteData = await siteRes.json();

      if (profileData.data) {
        setProfile(profileData.data);
        
        let defaultUsername = profileData.data.username || '';
        if (!defaultUsername && profileData.data.name) {
          const baseName = profileData.data.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 15) || 'user';
          const randomSuffix = Math.random().toString(36).slice(2, 8);
          defaultUsername = `${baseName}-${randomSuffix}`;
        }
        
        setProfileForm({
          username: defaultUsername,
          name: profileData.data.name || '',
          headline: profileData.data.headline || '',
          bio: profileData.data.bio || '',
        });
        
        if (!profileData.data.username && defaultUsername) {
          checkUsername(defaultUsername, null);
        }
      }

      if (siteData.data) {
        setSiteConfig(siteData.data);
        setSiteForm({
          siteName: siteData.data.siteName || '',
          siteTagline: siteData.data.siteTagline || '',
          githubUrl: siteData.data.githubUrl || '',
          twitterUrl: siteData.data.twitterUrl || '',
          linkedinUrl: siteData.data.linkedinUrl || '',
          websiteUrl: siteData.data.websiteUrl || '',
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/u/${profile?.username || profileForm.username}`;
    try {
      await navigator.clipboard.writeText(url);
      showMessage('success', '链接已复制到剪贴板');
    } catch {
      showMessage('error', '复制失败，请手动复制');
    }
  };

  const [saving, setSaving] = useState(false);

  const saveAll = async () => {
    setSaving(true);
    try {
      const [profileRes, siteRes] = await Promise.all([
        fetch('/api/user/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileForm),
        }),
        fetch('/api/user/site-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(siteForm),
        }),
      ]);

      const profileData = await profileRes.json();
      const siteData = await siteRes.json();

      if (profileData.code >= 400) {
        showMessage('error', profileData.message || '保存个人资料失败');
        return;
      }

      if (siteData.code >= 400) {
        showMessage('error', siteData.message || '保存站点配置失败');
        return;
      }

      setProfile(profileData.data);
      setSiteConfig(siteData.data);
      setUsernameStatus({ checking: false, available: null, reason: null });
      showMessage('success', '保存成功！你的主页已更新');
    } catch {
      showMessage('error', '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <Link href="/login" className="text-primary hover:underline">
            前往登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="w-10 h-10 rounded-full border border-card-border bg-card/50 flex items-center justify-center text-muted hover:text-foreground hover:bg-card hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">设置你的主页</h1>
            <p className="text-sm text-muted">填写信息后保存，即可生成专属链接</p>
          </div>
        </div>

        {/* 分享链接卡片 */}
        {profile?.username && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">你的主页已生成</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-background/80 rounded-lg border border-card-border truncate">
                <code className="text-sm text-foreground">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/u/{profile.username}
                </code>
              </div>
              <button
                onClick={copyLink}
                className="shrink-0 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                复制
              </button>
              <a
                href={`/u/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-3 py-2 bg-card border border-card-border rounded-lg text-sm font-medium hover:bg-card-border/30 transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                访问
              </a>
            </div>
          </div>
        )}

        {/* 表单区域 */}
        <div className="space-y-6">
          {/* 用户名 - 最重要，单独一个卡片 */}
          <div className="p-5 rounded-2xl border border-card-border bg-card/20">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-primary" />
              <label className="text-sm font-semibold text-foreground">
                用户名 <span className="text-red-400">*</span>
              </label>
              {!profile?.username && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                  必填
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted text-sm font-mono">/u/</span>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => handleUsernameChange(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="your-username"
                  className={`w-full px-3 py-2.5 pr-10 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all font-mono ${
                    usernameStatus.available === true
                      ? 'border-green-500/50 focus:ring-green-500/20 focus:border-green-500'
                      : usernameStatus.available === false
                      ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-card-border focus:ring-primary/20 focus:border-primary/40'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus.checking && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
                  {!usernameStatus.checking && usernameStatus.available === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {!usernameStatus.checking && usernameStatus.available === false && <XCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
            </div>
            <p className={`mt-2 text-xs ${usernameStatus.available === false ? 'text-red-500' : 'text-muted'}`}>
              {usernameStatus.reason || (profileForm.username === profile?.username ? '这是你当前的用户名' : '只能包含字母、数字、下划线和短横线')}
            </p>
          </div>

          {/* 个人资料 */}
          <div className="p-5 rounded-2xl border border-card-border bg-card/20">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">个人资料</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1.5">显示名称</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="你的名字"
                  className="w-full px-3 py-2.5 bg-background border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1.5">一句话介绍</label>
                <input
                  type="text"
                  value={profileForm.headline}
                  onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
                  placeholder="例如：全栈开发者 / 设计师"
                  className="w-full px-3 py-2.5 bg-background border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1.5">个人简介</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="介绍一下你自己..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-background border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* 站点配置 */}
          <div className="p-5 rounded-2xl border border-card-border bg-card/20">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-foreground">站点配置</span>
              <span className="text-xs text-muted">（可选）</span>
            </div>
            
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1.5">站点名称</label>
                  <input
                    type="text"
                    value={siteForm.siteName}
                    onChange={(e) => setSiteForm({ ...siteForm, siteName: e.target.value })}
                    placeholder="我的博客"
                    className="w-full px-3 py-2.5 bg-background border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">站点标语</label>
                  <input
                    type="text"
                    value={siteForm.siteTagline}
                    onChange={(e) => setSiteForm({ ...siteForm, siteTagline: e.target.value })}
                    placeholder="记录生活，分享技术"
                    className="w-full px-3 py-2.5 bg-background border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-card-border/50">
                <p className="text-xs text-muted mb-3">社交链接</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="url"
                    value={siteForm.githubUrl}
                    onChange={(e) => setSiteForm({ ...siteForm, githubUrl: e.target.value })}
                    placeholder="GitHub 链接"
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                  <input
                    type="url"
                    value={siteForm.twitterUrl}
                    onChange={(e) => setSiteForm({ ...siteForm, twitterUrl: e.target.value })}
                    placeholder="Twitter 链接"
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                  <input
                    type="url"
                    value={siteForm.linkedinUrl}
                    onChange={(e) => setSiteForm({ ...siteForm, linkedinUrl: e.target.value })}
                    placeholder="LinkedIn 链接"
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                  <input
                    type="url"
                    value={siteForm.websiteUrl}
                    onChange={(e) => setSiteForm({ ...siteForm, websiteUrl: e.target.value })}
                    placeholder="个人网站"
                    className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部保存区域 */}
        <div className="mt-8 sticky bottom-6">
          <div className="p-4 rounded-2xl bg-card/80 backdrop-blur-lg border border-card-border shadow-xl">
            {/* 消息提示 */}
            {message && (
              <div
                className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                  message.type === 'success'
                    ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0" />
                )}
                {message.text}
              </div>
            )}
            
            <button
              onClick={saveAll}
              disabled={saving || usernameStatus.checking || usernameStatus.available === false || !profileForm.username}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  保存设置
                </>
              )}
            </button>
            
            {!profile?.username && (
              <p className="mt-3 text-center text-xs text-muted">
                保存后即可生成你的专属分享链接
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
