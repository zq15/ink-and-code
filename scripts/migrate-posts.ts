/**
 * 迁移脚本：将现有的 Markdown 文章迁移到数据库
 * 
 * 使用方法：
 * 1. 确保已配置 DATABASE_URL 环境变量
 * 2. 运行 npx prisma db push 创建数据库表
 * 3. 运行 npx tsx scripts/migrate-posts.ts <userId>
 *    其中 userId 是要关联文章的用户 ID
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
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  
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

async function migrate(userId: string) {
  console.log('🚀 开始迁移文章...\n');

  // 验证用户存在
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    console.error(`❌ 用户不存在: ${userId}`);
    console.log('\n请先登录创建用户，或指定正确的用户 ID');
    process.exit(1);
  }

  console.log(`👤 目标用户: ${user.name || user.email} (${user.id})\n`);

  try {
    const posts = await getMarkdownPosts();
    console.log(`📝 找到 ${posts.length} 篇 Markdown 文章\n`);

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const post of posts) {
      try {
        // 检查该用户下是否已有此 slug 的文章
        const existing = await prisma.post.findFirst({
          where: { userId, slug: post.slug },
        });

        if (existing) {
          // 更新
          await prisma.post.update({
            where: { id: existing.id },
            data: {
              title: post.title,
              content: post.content,
              excerpt: post.excerpt,
              tags: post.tags,
              coverImage: post.coverImage,
            },
          });
          updated++;
          console.log(`✏️  更新: ${post.title} (${post.slug})`);
        } else {
          // 创建
          await prisma.post.create({
            data: {
              userId,
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

// 获取命令行参数
const userId = process.argv[2];

if (!userId) {
  console.log('使用方法: npx tsx scripts/migrate-posts.ts <userId>');
  console.log('');
  console.log('userId: 要将文章迁移到的用户 ID');
  console.log('');
  console.log('你可以通过以下 SQL 查询用户 ID:');
  console.log('  SELECT id, name, email FROM users;');
  process.exit(1);
}

// 运行迁移
migrate(userId);
