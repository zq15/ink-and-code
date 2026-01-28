import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { ThemeProvider } from "./components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ink & Code | 用代码书写思想",
  description: "一个关于编程、技术和创意的个人博客",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 内联脚本，在 React 水合之前立即设置主题，避免闪烁
  const themeScript = `
    (function() {
      try {
        var theme = localStorage.getItem('theme');
        if (theme === 'light' || theme === 'dark') {
          document.documentElement.setAttribute('data-theme', theme);
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      } catch (e) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  `;

  return (
    <html lang="zh-CN" className={`${inter.variable} ${ebGaramond.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        <ThemeProvider>
          <Header />
          <main className="grow">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
