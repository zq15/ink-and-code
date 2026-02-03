'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';

export default function TestLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('请输入登录码');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (data.code === 200) {
        // 登录成功，刷新页面以更新 session
        router.push('/');
        router.refresh();
      } else {
        setError(data.message || '登录失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-card-border rounded-2xl p-8 shadow-lg">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">测试账号登录</h1>
          <p className="text-muted text-center mb-6 text-sm">
            输入测试登录码快速登录
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="输入登录码（如：5KTBAG）"
                className="w-full px-4 py-3 bg-background border border-card-border rounded-xl text-center text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <p className="mt-6 text-xs text-muted text-center">
            仅供测试使用，登录码由开发者后台生成
          </p>
        </div>
      </div>
    </div>
  );
}
