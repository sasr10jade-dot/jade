import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no Prisma / Credentials provider here — those need
// the Node runtime and live in lib/auth.ts). middleware.ts imports only this.
const PROTECTED_PREFIXES = ["/upload", "/studio", "/inbox", "/settings", "/orders", "/admin", "/wallet"];

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  // Trust the request's Host header instead of a fixed AUTH_URL — needed so
  // sign-in/callback URLs resolve correctly behind the cloudflared tunnel
  // (whose public hostname changes every run) as well as on localhost.
  trustHost: true,
  // Must match lib/auth.ts's useSecureCookies exactly — this config is also
  // used standalone by proxy.ts's edge middleware (NextAuth(authConfig).auth),
  // so if the two disagree on cookie security the proxy looks for a
  // __Secure- prefixed cookie that the login API never sets (or vice versa),
  // and every protected route silently treats a logged-in user as logged out.
  useSecureCookies: process.env.NODE_ENV === "production",
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = PROTECTED_PREFIXES.some((p) =>
        nextUrl.pathname.startsWith(p)
      );
      return !isProtected || isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
