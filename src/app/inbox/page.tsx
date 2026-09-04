import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expireStalePriceOffers, notifyUpcomingPriceOfferExpirations } from "@/lib/price-offers";

function timeAgo(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default async function InboxPage() {
  await expireStalePriceOffers();
  await notifyUpcomingPriceOfferExpirations();
  const session = await auth();
  const notifications = session?.user
    ? await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { fromUser: { select: { name: true } } },
      })
    : [];

  // 목록은 이미 가져온 스냅샷(안 읽음 점 표시용)으로 그대로 렌더링하고, DB 쪽만
  // 읽음 처리 — 헤더의 안 읽은 알림 뱃지가 이 페이지를 열면 사라지도록.
  if (session?.user && notifications.some((n) => !n.read)) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        가이드 제출, Split 제안, 가격 흥정, 리뷰, 팔로우한 크리에이터 신곡 등 모든 알림
      </p>

      {notifications.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">새 알림이 없습니다.</p>
      )}

      <div className="mt-6 space-y-3">
        {notifications.map((n) => {
          const name = n.fromUser?.name ?? "VOICEMAP";
          return (
            <div key={n.id} className="flex items-center gap-3 rounded-lg border p-4">
              <Avatar>
                <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{name}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{n.message}</p>
              </div>
              {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
