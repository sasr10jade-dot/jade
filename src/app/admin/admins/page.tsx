import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddAdminForm } from "./add-admin-form";
import { AdminRow } from "./admin-row";

// 최고관리자 전용 — 페이지 자체 접근 가드는 layout.tsx의 isAdmin 체크와 별개로
// 이 목록/조작은 requireSuperAdmin()을 쓰는 API 라우트에서 최종 강제된다.
// 관리자 수가 적을 것으로 예상되어(운영 인원 규모) 페이지네이션은 생략.
export default async function AdminAdminsPage() {
  const session = await auth();
  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    orderBy: { createdAt: "asc" },
  });
  const superCount = admins.filter((a) => a.adminTier === "SUPER").length;

  return (
    <div>
      <h2 className="text-lg font-semibold">관리자 계정</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        전체 {admins.length}명 (최고관리자 {superCount}명) — 최고관리자만 이 페이지를 관리할 수 있습니다
      </p>

      <div className="mt-4 rounded-lg border p-4">
        <h3 className="text-sm font-medium">관리자 권한 부여</h3>
        <AddAdminForm />
      </div>

      <div className="mt-4 space-y-2">
        {admins.map((a) => (
          <AdminRow
            key={a.id}
            admin={a}
            isSelf={a.id === session!.user.id}
            isLastSuper={a.adminTier === "SUPER" && superCount <= 1}
          />
        ))}
      </div>
    </div>
  );
}
