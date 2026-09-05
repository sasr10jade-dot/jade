import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";

const ADMIN_NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/users", label: "사용자" },
  { href: "/admin/tracks", label: "트랙 모더레이션" },
  { href: "/admin/disputes", label: "분쟁/보류" },
  { href: "/admin/settlements", label: "정산" },
  { href: "/admin/support", label: "고객문의" },
] as const;

// 관리자 페이지는 ADMIN 역할 계정으로만 접근 (proxy.ts는 로그인 여부만 확인하므로
// 역할 검사는 여기서). 존재를 드러내지 않도록 403 대신 404로 응답.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") notFound();

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">관리자</h1>
      <nav className="mt-4 flex gap-1 border-b text-sm">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-t-md px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
