'use client';

import { Globe } from 'lucide-react';
import { AutoSaveField } from './AutoSaveField';

interface SiteConfigData {
  githubUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
}

interface SocialLinksSectionProps {
  config: SiteConfigData;
  onUpdate: (data: Partial<SiteConfigData>) => Promise<void>;
}

export function SocialLinksSection({ config, onUpdate }: SocialLinksSectionProps) {
  return (
    <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-card-border/50 bg-card/50 flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-foreground">社交链接</h2>
        </div>
        
        <div className="p-4 space-y-4">
             <div className="space-y-4">
                <AutoSaveField
                    label="GitHub"
                    value={config.githubUrl}
                    onSave={async (val) => await onUpdate({ githubUrl: val })}
                    placeholder="https://github.com/username"
                    type="url"
                />
                <AutoSaveField
                    label="Twitter / X"
                    value={config.twitterUrl}
                    onSave={async (val) => await onUpdate({ twitterUrl: val })}
                    placeholder="https://twitter.com/username"
                    type="url"
                />
                <AutoSaveField
                    label="LinkedIn"
                    value={config.linkedinUrl}
                    onSave={async (val) => await onUpdate({ linkedinUrl: val })}
                    placeholder="https://linkedin.com/in/username"
                    type="url"
                />
                <AutoSaveField
                    label="个人网站"
                    value={config.websiteUrl}
                    onSave={async (val) => await onUpdate({ websiteUrl: val })}
                    placeholder="https://example.com"
                    type="url"
                />
             </div>
        </div>
    </div>
  );
}
