'use client';

import { Globe } from 'lucide-react';
import { AutoSaveField } from './AutoSaveField';

interface SiteInfoData {
  siteName: string | null;
  siteTagline: string | null;
}

interface SiteInfoSectionProps {
  info: SiteInfoData;
  onUpdate: (data: Partial<SiteInfoData>) => Promise<void>;
}

export function SiteInfoSection({ info, onUpdate }: SiteInfoSectionProps) {
  return (
    <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-card-border/50 bg-card/50 flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-foreground">站点信息</h2>
        </div>
        
        <div className="p-4 space-y-4">
            <AutoSaveField
                label="站点名称"
                value={info.siteName}
                onSave={async (val) => await onUpdate({ siteName: val })}
                placeholder="我的博客"
            />
            
            <AutoSaveField
                label="站点标语"
                value={info.siteTagline}
                onSave={async (val) => await onUpdate({ siteTagline: val })}
                placeholder="记录生活，分享技术"
            />
        </div>
    </div>
  );
}
