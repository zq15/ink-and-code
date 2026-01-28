import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  coverImage?: string;
}

export interface Post extends PostMeta {
  content: string;
}

// 确保目录存在
function ensureDirectoryExists() {
  if (!fs.existsSync(postsDirectory)) {
    fs.mkdirSync(postsDirectory, { recursive: true });
  }
}

// 获取所有文章的元数据
export function getAllPosts(): PostMeta[] {
  ensureDirectoryExists();
  
  const fileNames = fs.readdirSync(postsDirectory);
  const allPosts = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title || slug,
        date: data.date || new Date().toISOString(),
        excerpt: data.excerpt || '',
        tags: data.tags || [],
        coverImage: data.coverImage,
      };
    });

  // 按日期排序，最新的在前
  return allPosts.sort((a, b) => (a.date > b.date ? -1 : 1));
}

// 获取单篇文章
export function getPostBySlug(slug: string): Post | null {
  ensureDirectoryExists();
  
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || '',
      tags: data.tags || [],
      coverImage: data.coverImage,
      content,
    };
  } catch {
    return null;
  }
}

// 获取所有文章的 slug，用于静态生成
export function getAllPostSlugs(): string[] {
  ensureDirectoryExists();
  
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => fileName.replace(/\.md$/, ''));
}

// 获取所有标签
export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tagSet = new Set<string>();
  posts.forEach((post) => {
    post.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet);
}

// 根据标签获取文章
export function getPostsByTag(tag: string): PostMeta[] {
  const posts = getAllPosts();
  return posts.filter((post) => post.tags.includes(tag));
}
