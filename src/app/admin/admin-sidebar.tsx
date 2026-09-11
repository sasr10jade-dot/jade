"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { getAdminBadgeCounts } from "@/lib/admin-stats";

type BadgeCounts = Awaited<ReturnType<typeof getAdminBadgeCounts>>;

type NavGroup = {
  label: string | null;
  items: { href: string; label: string; badgeKey?: keyof BadgeCounts }[];
  accent?: boolean; // 최고관리자 전용 그룹 — 다른 그룹과 시각적으로 분리(구분선 + 강조색)
};

const ADMIN_NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ href: "/admin", label: "대시보드" }] },
  {
    label: "운영",
    items: [
      { href: "/admin/users", label: "사용자" },
      { href: "/admin/tracks", label: "트랙 모더레이션" },
      { href: "/admin/reports", label: "신고", badgeKey: "reports" },
      { href: "/admin/activity", label: "활동 로그" },
    ],
  },
  {
    label: "정산",
    items: [
      { href: "/admin/settlements", label: "정산", badgeKey: "settlements" },
      { href: "/admin/disputes", label: "분쟁/보류", badgeKey: "disputes" },
    ],
  },
  {
    label: "지원",
    items: [
      { href: "/admin/commissions", label: "곡 의뢰" },
      { href: "/admin/support", label: "고객문의", badgeKey: "support" },
    ],
  },
];

const SUPER_ADMIN_GROUP: NavGroup = {
  label: "최고관리자",
  accent: true,
  items: [{ href: "/admin/admins", label: "관리자 계정" }],
};

export function AdminSidebar({
  badgeCounts,
  isSuperAdmin,
}: {
  badgeCounts: BadgeCounts;
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const groups = isSuperAdmin ? [...ADMIN_NAV_GROUPS, SUPER_ADMIN_GROUP] : ADMIN_NAV_GROUPS;

  return (
    <nav className="flex shrink-0 flex-col gap-5 sm:w-48">
      {groups.map((group, i) => (
        <div
          key={i}
          className={group.accent ? "border-t border-primary/30 pt-4" : undefined}
        >
          {group.label && (
            <p
              className={cn(
                "mb-1.5 px-3 text-xs font-semibold",
                group.accent ? "text-primary" : "text-muted-foreground"
              )}
            >
              {group.label}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const count = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm transition",
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                  {count > 0 && (
                    <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-white">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
