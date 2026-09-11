import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import type { AdminTier, Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      name: string;
      email: string;
      isAdmin: boolean;
      adminTier: AdminTier | null;
    };
  }
  interface User {
    role: Role;
    isAdmin: boolean;
    adminTier: AdminTier | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // useSecureCookies (forced off outside production) comes from authConfig —
  // see auth.config.ts for why it must match what proxy.ts's edge middleware uses.
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (user.suspended) return null; // Admin panel — 계정 정지된 유저는 로그인 차단

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isAdmin: user.isAdmin,
          adminTier: user.adminTier,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.isAdmin = user.isAdmin;
        token.adminTier = user.adminTier;
        return token;
      }
      // 로그인 시점 이후 발급된 세션(JWT)은 재로그인 전까지 고정되므로, 관리자
      // 권한 부여/해제/등급변경이 기존 세션에 바로 반영되도록 매 요청마다 최신값으로
      // 갱신한다 (role/isAdmin/adminTier는 자주 안 바뀌고 조회 비용도 낮음).
      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isAdmin: true, adminTier: true },
        });
        if (current) {
          token.role = current.role;
          token.isAdmin = current.isAdmin;
          token.adminTier = current.adminTier;
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.isAdmin = token.isAdmin as boolean;
      session.user.adminTier = token.adminTier as AdminTier | null;
      return session;
    },
  },
});
