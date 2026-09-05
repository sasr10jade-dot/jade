import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { QueueProvider } from "@/components/player/queue-context";
import { QueueBar, QueueBarSpacer } from "@/components/player/queue-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VOICEMAP",
  description: "작곡가와 보컬을 연결하고, 구매와 저작권을 하나의 플로우로 관리하는 음악 마켓플레이스.",
  appleWebApp: { title: "VOICEMAP", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <QueueProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <QueueBarSpacer />
            {/* 하단 큐 플레이어와 겹치지 않도록 토스트는 우상단에 표시 */}
            <Toaster position="top-right" />
            <QueueBar />
          </QueueProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
