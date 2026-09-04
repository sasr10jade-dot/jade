import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { EqualizerButton } from "@/components/layout/equalizer-button";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatKRW } from "@/lib/format";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/commissions", label: "곡 의뢰" },
  { href: "/matching", label: "가이드 모집" },
  { href: "/upload", label: "업로드" },
  { href: "/studio", label: "Studio" },
  { href: "/inbox", label: "Inbox" },
  { href: "/likes", label: "좋아요" },
  { href: "/orders", label: "구매내역" },
  { href: "/wallet", label: "지갑" },
] as const;

const ROLE_LABEL: Record<string, string> = {
  CREATOR: "Creator",
  PERFORMER: "Performer",
  BUYER: "Buyer",
  ADMIN: "Admin",
};

export async function SiteHeader() {
  const session = await auth();
  const [cashBalance, unreadCount] = session?.user
    ? await Promise.all([
        prisma.user
          .findUnique({ where: { id: session.user.id }, select: { cashBalance: true } })
          .then((u) => u?.cashBalance),
        prisma.notification.count({ where: { userId: session.user.id, read: false } }),
      ])
    : [undefined, 0];

  const navLinks = (
    <>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="relative rounded-md px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {item.label}
          {item.href === "/inbox" && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      ))}
      {session?.user?.role === "ADMIN" && (
        <Link
          href="/admin"
          className="rounded-md px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          관리자
        </Link>
      )}
    </>
  );

  const userBlock = session?.user ? (
    <>
      <Link href="/settings/account" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
        {session.user.name}
      </Link>
      {cashBalance !== undefined && (
        <Link href="/wallet" className="text-sm font-semibold hover:underline">
          {formatKRW(cashBalance)}
        </Link>
      )}
      <Badge variant="outline">{ROLE_LABEL[session.user.role] ?? session.user.role}</Badge>
      <SignOutButton />
    </>
  ) : (
    <>
      <Link href="/login">
        <Button variant="ghost" size="sm">
          로그인
        </Button>
      </Link>
      <Link href="/register">
        <Button size="sm">회원가입</Button>
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary text-[13px] font-bold text-primary-foreground">
            V
          </div>
          <span className="hidden text-[15px] font-bold tracking-tight sm:inline">VOICEMAP</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">{navLinks}</nav>

        <form action="/search" method="GET" className="hidden max-w-xs flex-1 md:block">
          <input
            type="search"
            name="q"
            placeholder="트랙, 크리에이터 검색"
            className="w-full rounded-full border border-input bg-transparent px-3.5 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </form>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            aria-label="검색"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            <EqualizerButton />
            {userBlock}
          </div>
          <MobileMenu>
            <nav className="flex flex-col gap-1 text-sm">{navLinks}</nav>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
              <EqualizerButton />
              {userBlock}
            </div>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
