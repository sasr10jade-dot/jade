import { Badge } from "@/components/ui/badge";
import { SplitActions } from "./split-actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  PROPOSED: "합의 대기중",
  COUNTERED: "역제안 검토중",
  AGREED: "합의 완료",
  STALLED: "합의 보류",
};

const ACTION_LABEL: Record<string, string> = {
  PROPOSE: "제안",
  COUNTER: "역제안",
  ACCEPT: "수락",
};

export default async function SplitSettingsPage() {
  const session = await auth();

  const splits = session?.user
    ? await prisma.split.findMany({
        where: {
          OR: [{ track: { creatorId: session.user.id } }, { performerId: session.user.id }],
        },
        orderBy: { createdAt: "desc" },
        include: {
          track: { select: { title: true, creatorId: true } },
          performer: { select: { name: true } },
          log: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Split 에디터</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Creator가 초기 지분 제안 → Performer 수락/역제안, 로그 타임라인 보관
      </p>

      {splits.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          진행 중인 Split 협의가 없습니다. 트랙에 가이드가 제출되면 트랙 상세 페이지에서 Split을
          제안할 수 있습니다.
        </p>
      )}

      <div className="mt-6 space-y-6">
        {splits.map((split) => {
          const canRespond =
            (split.status === "PROPOSED" || split.status === "COUNTERED") &&
            split.lastActorId !== session!.user.id;

          return (
            <div key={split.id}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{split.track.title}</span>
                <Badge variant="outline">{STATUS_LABEL[split.status] ?? split.status}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                상대방: {split.track.creatorId === session!.user.id ? split.performer.name : "크리에이터"}
              </p>

              <div className="mt-3 flex h-5 w-full overflow-hidden rounded">
                <div className="bg-foreground/80" style={{ width: `${split.creatorShare}%` }} />
                <div className="bg-muted" style={{ width: `${split.performerShare}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>Creator {split.creatorShare}%</span>
                <span>Performer {split.performerShare}%</span>
              </div>

              {canRespond && (
                <SplitActions splitId={split.id} creatorShare={split.creatorShare} />
              )}
              {!canRespond && (split.status === "PROPOSED" || split.status === "COUNTERED") && (
                <p className="mt-3 text-sm text-muted-foreground">상대방의 응답을 기다리는 중입니다.</p>
              )}

              <div className="mt-4 rounded-lg border p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">합의 로그</p>
                <ul className="space-y-1 text-sm">
                  {split.log.map((entry) => (
                    <li key={entry.id} className="flex gap-2">
                      <span className="text-muted-foreground">·</span>
                      <span>
                        {entry.actor.name} {ACTION_LABEL[entry.action] ?? entry.action}:{" "}
                        {entry.creatorShare} / {entry.performerShare}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
