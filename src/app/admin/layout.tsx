import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAdminBadgeCounts } from "@/lib/admin-stats";
import { AdminSidebar } from "./admin-sidebar";

// 관리자 페이지는 ADMIN 역할 계정으로만 접근 (proxy.ts는 로그인 여부만 확인하므로
// 역할 검사는 여기서). 존재를 드러내지 않도록 403 대신 404로 응답.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") notFound();

  const badgeCounts = await getAdminBadgeCounts();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:gap-10">
      <AdminSidebar badgeCounts={badgeCounts} />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight">관리자</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
