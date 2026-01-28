---
title: "用 Next.js 搭建个人博客的完整指南"
date: "2026-01-27"
excerpt: "从零开始，一步步教你用 Next.js 搭建一个现代化的个人博客系统。"
tags: ["Next.js", "React", "教程"]
---

# 用 Next.js 搭建个人博客

Next.js 是一个强大的 React 框架，非常适合用来构建博客网站。今天我来分享一下如何用它搭建一个完整的博客系统。

## 为什么选择 Next.js？

1. **服务端渲染 (SSR)** - 对 SEO 友好
2. **静态生成 (SSG)** - 博客内容可以预渲染，访问速度极快
3. **文件系统路由** - 创建文件即创建路由，非常直观
4. **内置优化** - 图片优化、代码分割等开箱即用

## 项目结构

```
my-blog/
├── app/
│   ├── page.tsx          # 首页
│   ├── blog/
│   │   ├── page.tsx      # 博客列表
│   │   └── [slug]/
│   │       └── page.tsx  # 博客详情
│   └── about/
│       └── page.tsx      # 关于页面
├── content/
│   └── posts/            # Markdown 文章
├── lib/
│   └── posts.ts          # 文章读取逻辑
└── components/
    └── ...               # 公共组件
```

## Markdown 文章格式

每篇文章使用 Markdown 格式，并在文件头部使用 frontmatter 定义元数据：

```markdown
---
title: "文章标题"
date: "2026-01-27"
excerpt: "文章摘要"
tags: ["标签1", "标签2"]
---

# 正文内容

这里是文章的正文...
```

## 部署到 Vercel

最后一步是部署。Vercel 和 Next.js 是天作之合：

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 自动部署完成！

每次你 push 新文章到 GitHub，Vercel 会自动重新部署。

---

这就是用 Next.js 搭建博客的基本流程。后续我会分享更多优化技巧！
