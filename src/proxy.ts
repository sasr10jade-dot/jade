import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe: only checks JWT presence via authConfig.callbacks.authorized.
// The Prisma-backed Credentials provider lives in lib/auth.ts and never runs here.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/upload/:path*",
    "/studio/:path*",
    "/inbox/:path*",
    "/settings/:path*",
    "/orders/:path*",
    "/admin/:path*",
    "/wallet/:path*",
  ],
};
