'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // 在客户端挂载前显示占位符，避免闪烁
  if (!mounted) {
    return (
      <div className="w-12 h-12 rounded-full border border-card-border bg-card" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-12 h-12 rounded-full border border-card-border bg-card hover:border-primary/30 transition-all duration-500 flex items-center justify-center group overflow-hidden cursor-pointer z-50"
      aria-label={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
      type="button"
    >
      {/* 太阳图标 */}
      <svg
        className={`absolute w-5 h-5 transition-all duration-500 ${
          theme === 'dark' 
            ? 'opacity-0 rotate-90 scale-0' 
            : 'opacity-100 rotate-0 scale-100 text-amber-500'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
      
      {/* 月亮图标 */}
      <svg
        className={`absolute w-5 h-5 transition-all duration-500 ${
          theme === 'dark' 
            ? 'opacity-100 rotate-0 scale-100 text-primary' 
            : 'opacity-0 -rotate-90 scale-0'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
