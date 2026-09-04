import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRow } from "./user-row";

export default async function AdminUsersPage() {
  const session = await auth();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <h2 className="text-lg font-semibold">사용자 관리</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        전체 {users.length}명 — 역할 변경 및 계정 정지
      </p>
      <div className="mt-4 space-y-2">
        {users.map((u) => (
          <UserRow key={u.id} user={u} isSelf={u.id === session!.user.id} />
        ))}
      </div>
    </div>
  );
}
