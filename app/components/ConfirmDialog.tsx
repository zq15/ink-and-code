'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Trash2, HelpCircle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

interface ConfirmProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '确认',
    description: '',
    confirmText: '确定',
    cancelText: '取消',
    variant: 'default',
  });
  // 使用 ref 存储 resolve 函数，避免闭包问题
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions({
      title: opts.title || '确认',
      description: opts.description,
      confirmText: opts.confirmText || '确定',
      cancelText: opts.cancelText || '取消',
      variant: opts.variant || 'default',
    });
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(true);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          // 点击外部关闭时也要 resolve 为 false
          resolveRef.current?.(false);
          resolveRef.current = null;
        }
        setIsOpen(open);
      }}>
        <AlertDialogContent className="bg-card/90 backdrop-blur-3xl border border-card-border/60 sm:max-w-[400px] rounded-[3rem] shadow-2xl p-10 overflow-hidden relative border-t-primary/10">
          {/* 背景装饰 - 改为中心发光 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
          
          <AlertDialogHeader className="text-center relative z-10 flex flex-col items-center">
            <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-inner mb-6 ${
              options.variant === 'destructive' 
                ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}>
              {options.variant === 'destructive' ? (
                <Trash2 className="w-8 h-8" />
              ) : (
                <HelpCircle className="w-8 h-8" />
              )}
            </div>
            
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground mb-2">
              {options.title}
            </AlertDialogTitle>
            
            <AlertDialogDescription className="text-muted/60 text-base leading-relaxed serif italic max-w-[280px] mx-auto">
              {options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-3 mt-10 relative z-10">
            <AlertDialogCancel
              onClick={handleCancel}
              className="flex-1 bg-background/40 hover:bg-card-border/40 border border-card-border/60 text-muted-foreground hover:text-foreground rounded-2xl h-12 font-bold uppercase tracking-widest text-[11px] transition-all shadow-sm"
            >
              {options.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={`flex-1 border-0 rounded-2xl h-12 font-extrabold uppercase tracking-[0.2em] text-[11px] transition-all shadow-md active:scale-95 ${
                options.variant === 'destructive'
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                  : 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/30'
              }`}
            >
              {options.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
