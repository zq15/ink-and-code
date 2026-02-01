import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

/**
 * 生成唯一用户名
 * 基于用户名字 + 随机后缀
 */
async function generateUniqueUsername(name: string | null): Promise<string> {
  // 从名字生成基础用户名
  let baseName = (name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // 只保留字母数字
    .slice(0, 15) // 限制长度
  
  if (!baseName) baseName = 'user'
  
  // 生成随机后缀
  const randomSuffix = Math.random().toString(36).slice(2, 8)
  let username = `${baseName}-${randomSuffix}`
  
  // 检查是否已存在，如果存在则重新生成
  let attempts = 0
  while (attempts < 5) {
    const existing = await prisma.user.findUnique({
      where: { username },
    })
    if (!existing) break
    
    // 重新生成
    const newSuffix = Math.random().toString(36).slice(2, 8)
    username = `${baseName}-${newSuffix}`
    attempts++
  }
  
  return username
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true, // 信任所有主机（生产环境建议配置 AUTH_URL）
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // 将 user id 添加到 session 中
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  events: {
    // 用户首次创建时自动生成用户名
    async createUser({ user }) {
      const username = await generateUniqueUsername(user.name || null)
      await prisma.user.update({
        where: { id: user.id },
        data: { username },
      })
    },
  },
})
