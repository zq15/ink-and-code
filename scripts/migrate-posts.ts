/**
 * 迁移脚本：将现有的 Markdown 文章迁移到数据库
 * 
 * 使用方法：
 * 1. 确保已配置 DATABASE_URL 环境变量
 * 2. 运行 npx prisma db push 创建数据库表
 * 3. 运行 npx tsx scripts/migrate-posts.ts
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const postsDirectory = path.join(process.cwd(), 'content/posts');

interface PostData {
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  coverImage: string | null;
  published: boolean;
  createdAt: Date;
}

async function getMarkdownPosts(): Promise<PostData[]> {
  const fileNames = fs.readdirSync(postsDirectory);
  
  return fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      // 解析日期
      let createdAt = new Date();
      if (data.date) {
        const parsed = new Date(data.date);
        if (!isNaN(parsed.getTime())) {
          createdAt = parsed;
        }
      }

      return {
        slug,
        title: data.title || slug,
        content,
        excerpt: data.excerpt || '',
        tags: data.tags || [],
        coverImage: data.coverImage || null,
        published: true, // 默认设为已发布
        createdAt,
      };
    });
}

async function migrate() {
  console.log('🚀 开始迁移文章...\n');

  try {
    const posts = await getMarkdownPosts();
    console.log(`📝 找到 ${posts.length} 篇 Markdown 文章\n`);

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const post of posts) {
      try {
        const result = await prisma.post.upsert({
          where: { slug: post.slug },
          update: {
            title: post.title,
            content: post.content,
            excerpt: post.excerpt,
            tags: post.tags,
            coverImage: post.coverImage,
            // 不更新 published 和 createdAt，保留现有值
          },
          create: {
            slug: post.slug,
            title: post.title,
            content: post.content,
            excerpt: post.excerpt,
            tags: post.tags,
            coverImage: post.coverImage,
            published: post.published,
            createdAt: post.createdAt,
          },
        });

        // 检查是创建还是更新
        const existing = await prisma.post.findUnique({
          where: { slug: post.slug },
          select: { createdAt: true },
        });
        
        if (existing && existing.createdAt.getTime() === result.createdAt.getTime()) {
          updated++;
          console.log(`✏️  更新: ${post.title} (${post.slug})`);
        } else {
          created++;
          console.log(`✅ 创建: ${post.title} (${post.slug})`);
        }
      } catch (error) {
        failed++;
        console.error(`❌ 失败: ${post.title} (${post.slug})`, error);
      }
    }

    console.log('\n📊 迁移完成:');
    console.log(`   - 创建: ${created} 篇`);
    console.log(`   - 更新: ${updated} 篇`);
    console.log(`   - 失败: ${failed} 篇`);

  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行迁移
migrate();
