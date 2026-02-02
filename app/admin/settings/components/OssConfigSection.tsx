'use client';

import { Image, HelpCircle, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { AutoSaveField } from './AutoSaveField';

export const OSS_REGIONS = [
  { value: 'oss-cn-hangzhou', label: '华东1（杭州）' },
  { value: 'oss-cn-shanghai', label: '华东2（上海）' },
  { value: 'oss-cn-qingdao', label: '华北1（青岛）' },
  { value: 'oss-cn-beijing', label: '华北2（北京）' },
  { value: 'oss-cn-zhangjiakou', label: '华北3（张家口）' },
  { value: 'oss-cn-huhehaote', label: '华北5（呼和浩特）' },
  { value: 'oss-cn-shenzhen', label: '华南1（深圳）' },
  { value: 'oss-cn-guangzhou', label: '华南2（广州）' },
  { value: 'oss-cn-chengdu', label: '西南1（成都）' },
  { value: 'oss-cn-hongkong', label: '中国香港' },
  { value: 'oss-ap-southeast-1', label: '新加坡' },
  { value: 'oss-us-west-1', label: '美国西部' },
];

interface OssConfigData {
  ossRegion: string | null;
  ossBucket: string | null;
  ossAccessKeyId: string | null;
  ossAccessKeySecret: string | null;
  ossDir: string | null;
  ossDomain: string | null;
}

interface OssConfigSectionProps {
  config: OssConfigData;
  onUpdate: (data: Partial<OssConfigData>) => Promise<void>;
  onTestConnection: () => Promise<void>;
  testResult: { success: boolean; message: string } | null;
  isTesting: boolean;
}

export function OssConfigSection({ config, onUpdate, onTestConnection, testResult, isTesting }: OssConfigSectionProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if configured
  const isConfigured = !!(config.ossRegion && config.ossBucket && config.ossAccessKeyId && config.ossAccessKeySecret);

  return (
    <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <div 
            className="p-4 border-b border-card-border/50 bg-card/50 flex items-center justify-between cursor-pointer hover:bg-card/80 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-orange-500" />
                <h2 className="text-sm font-semibold text-foreground">图床配置</h2>
                <span className="text-xs text-muted">（阿里云 OSS）</span>
            </div>
            <div className="flex items-center gap-2">
                {isConfigured ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        已配置
                    </span>
                ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted border border-card-border">
                        未配置
                    </span>
                )}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            </div>
        </div>
        
        {isExpanded && (
            <div className="p-4 space-y-5 animate-in slide-in-from-top-2 duration-200">
                <p className="text-xs text-muted">
                  配置图床后，在编辑器中粘贴或拖拽图片会自动上传。
                  <span className="text-orange-500 block mt-1">注意：Bucket 需设为「公共读」权限才能正常显示图片</span>
                </p>

                 <div className="grid gap-4">
                    <AutoSaveField
                        label="Region 区域"
                        value={config.ossRegion}
                        onSave={async (val) => await onUpdate({ ossRegion: val })}
                        type="select"
                        options={OSS_REGIONS}
                        placeholder="请选择区域"
                    />

                    <AutoSaveField
                        label="Bucket 名称"
                        value={config.ossBucket}
                        onSave={async (val) => await onUpdate({ ossBucket: val })}
                        placeholder="your-bucket-name"
                    />
                    
                    <AutoSaveField
                        label="AccessKey ID"
                        value={config.ossAccessKeyId}
                        onSave={async (val) => await onUpdate({ ossAccessKeyId: val })}
                        placeholder="LTAI5t..."
                    />

                    <AutoSaveField
                        label="AccessKey Secret"
                        value={config.ossAccessKeySecret}
                        onSave={async (val) => await onUpdate({ ossAccessKeySecret: val })}
                        type="password"
                        placeholder="••••••••"
                    />

                    <AutoSaveField
                        label="存储目录"
                        value={config.ossDir}
                        onSave={async (val) => await onUpdate({ ossDir: val })}
                        placeholder="blog/images"
                        description="图片存储的文件夹路径"
                    />

                    <AutoSaveField
                        label="自定义域名（可选）"
                        value={config.ossDomain}
                        onSave={async (val) => await onUpdate({ ossDomain: val })}
                        placeholder="https://cdn.example.com"
                        description="绑定的 CDN 或自定义域名"
                    />
                 </div>

                 {/* Test Connection */}
                 <div className="pt-4 border-t border-card-border/50 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onTestConnection(); }}
                      disabled={isTesting}
                      className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          测试中...
                        </>
                      ) : (
                        '测试连接'
                      )}
                    </button>
                    {testResult && (
                      <span className={`text-xs flex items-center gap-1 ${testResult.success ? 'text-green-500' : 'text-red-500'}`}>
                        {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {testResult.message}
                      </span>
                    )}
                  </div>

                 {/* Help Section */}
                 <div>
                    <button
                      type="button"
                      onClick={() => setShowHelp(!showHelp)}
                      className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>配置遇到问题？查看帮助</span>
                      {showHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    
                    {showHelp && (
                      <div className="mt-3 p-4 bg-muted/30 border border-card-border/50 rounded-lg text-xs text-muted space-y-3">
                        <div>
                          <p className="font-medium text-foreground mb-1">1. 创建 RAM 子账号（推荐）</p>
                          <p>前往 <a href="https://ram.console.aliyun.com/users" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">RAM 访问控制</a> → 用户 → 创建用户 → 勾选「OpenAPI 调用访问」→ 保存 AccessKey</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground mb-1">2. 授予 OSS 权限</p>
                          <p>在 RAM 用户详情 → 权限管理 → 新增授权 → 搜索并添加 <code className="px-1 py-0.5 bg-card rounded">AliyunOSSFullAccess</code></p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground mb-1">3. 确认 Bucket 信息</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>在 <a href="https://oss.console.aliyun.com/bucket" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OSS 控制台</a> 确认 Bucket 名称正确</li>
                            <li>确认 Region 与 Bucket 所在区域一致</li>
                            <li className="text-orange-500">⚠️ Bucket 读写权限需设为<strong>「公共读」</strong></li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-foreground mb-1">4. 常见错误</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><code className="px-1 py-0.5 bg-card rounded">AccessDenied</code>：RAM 用户没有 OSS 权限</li>
                            <li><code className="px-1 py-0.5 bg-card rounded">NoSuchBucket</code>：Bucket 名称错误或 Region 不匹配</li>
                            <li><code className="px-1 py-0.5 bg-card rounded">InvalidAccessKeyId</code>：AccessKey ID 错误或已禁用</li>
                          </ul>
                        </div>
                      </div>
                    )}
                 </div>
            </div>
        )}
    </div>
  );
}
