'use client';

import { User, Link2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { AutoSaveField } from './AutoSaveField';
import { useState, useRef, useEffect } from 'react';

interface ProfileData {
  username: string | null;
  name: string | null;
  headline: string | null;
  bio: string | null;
}

interface ProfileSectionProps {
  profile: ProfileData;
  onUpdate: (data: Partial<ProfileData>) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<{ available: boolean; reason: string | null }>;
}

export function ProfileSection({ profile, onUpdate, checkUsernameAvailability }: ProfileSectionProps) {
  const [username, setUsername] = useState(profile.username || '');
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string | null;
  }>({ checking: false, available: null, reason: null });
  
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync username from props if it changes externally
  useEffect(() => {
    if (profile.username && profile.username !== username) {
        setUsername(profile.username);
    }
  }, [profile.username]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(val);
    
    if (val === profile.username) {
        setUsernameStatus({ checking: false, available: null, reason: null });
        return;
    }

    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    
    if (val.length < 3) {
       setUsernameStatus({ checking: false, available: null, reason: '至少3个字符' });
       return;
    }

    setUsernameStatus({ checking: true, available: null, reason: null });
    checkTimeoutRef.current = setTimeout(async () => {
        try {
            const result = await checkUsernameAvailability(val);
            setUsernameStatus({ 
                checking: false, 
                available: result.available, 
                reason: result.reason 
            });
        } catch {
             setUsernameStatus({ checking: false, available: null, reason: '检测失败' });
        }
    }, 500);
  };

  const handleUsernameBlur = async () => {
      const trimmed = username.trim();
      if (trimmed === profile.username) return;
      if (usernameStatus.available === false) return; 
      if (usernameStatus.checking) return; 
      if (!trimmed || trimmed.length < 3) return;
      
      await onUpdate({ username: trimmed });
  };

  return (
    <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-card-border/50 bg-card/50 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-foreground">个人资料</h2>
        </div>
        
        <div className="p-4 space-y-5">
            {/* Username Field */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted flex items-center gap-1">
                        用户名 <span className="text-red-500">*</span>
                    </label>
                </div>
                
                <div className="flex items-center gap-2">
                     <span className="text-muted text-sm font-mono">/u/</span>
                     <div className="flex-1 relative">
                        <input 
                            value={username}
                            onChange={handleUsernameChange}
                            onBlur={handleUsernameBlur}
                            className={`w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all font-mono
                                ${usernameStatus.available === true ? 'border-green-500/50 focus:ring-green-500/20' : 
                                  usernameStatus.available === false ? 'border-red-500/50 focus:ring-red-500/20' : 
                                  'border-input hover:border-primary/50 focus:border-primary/40'}
                            `}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {usernameStatus.checking && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
                            {!usernameStatus.checking && usernameStatus.available === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {!usernameStatus.checking && usernameStatus.available === false && <XCircle className="w-4 h-4 text-red-500" />}
                        </div>
                     </div>
                </div>
                 <p className={`text-[10px] ${usernameStatus.available === false ? 'text-red-500' : 'text-muted'}`}>
                    {usernameStatus.reason || (username === profile.username ? '当前用户名' : '只能包含字母、数字、下划线和短横线')}
                </p>
            </div>

            <AutoSaveField 
                label="显示名称"
                value={profile.name}
                onSave={async (val) => await onUpdate({ name: val })}
                placeholder="你的名字"
            />
            
            <AutoSaveField 
                label="一句话介绍"
                value={profile.headline}
                onSave={async (val) => await onUpdate({ headline: val })}
                placeholder="例如：全栈开发者 / 设计师"
            />

            <AutoSaveField 
                label="个人简介"
                type="textarea"
                value={profile.bio}
                onSave={async (val) => await onUpdate({ bio: val })}
                placeholder="介绍一下你自己..."
            />
        </div>
    </div>
  );
}
