"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewCommissionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [licenseType, setLicenseType] = useState<"EXCLUSIVE" | "NON_EXCLUSIVE">("NON_EXCLUSIVE");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (!title.trim() || !description.trim()) {
      setError("제목과 설명을 입력해주세요");
      return;
    }
    if (!Number.isFinite(min) || min <= 0 || !Number.isFinite(max) || max <= 0) {
      setError("예산을 올바르게 입력해주세요");
      return;
    }
    if (!deadline) {
      setError("마감일을 선택해주세요");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          genre: genre || undefined,
          mood: mood || undefined,
          referenceUrl: referenceUrl || undefined,
          budgetMin: min,
          budgetMax: max,
          licenseType,
          deadline: new Date(deadline).toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "의뢰 등록에 실패했습니다");
      router.push(`/commissions/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">곡 의뢰 등록</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        원하는 조건을 적어주시면 크리에이터들이 가격을 제안합니다.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="c-title">제목</Label>
          <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="c-desc">설명</Label>
          <Textarea
            id="c-desc"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1.5"
            placeholder="원하는 분위기, 용도(광고/영상/앨범 등), 참고할 만한 포인트를 자세히 적어주세요"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-genre">장르 (선택)</Label>
            <Input id="c-genre" value={genre} onChange={(e) => setGenre(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="c-mood">무드 (선택)</Label>
            <Input id="c-mood" value={mood} onChange={(e) => setMood(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <div>
          <Label htmlFor="c-ref">레퍼런스 링크 (선택)</Label>
          <Input
            id="c-ref"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            className="mt-1.5"
            placeholder="https://..."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-min">최소 예산 (원)</Label>
            <Input
              id="c-min"
              type="number"
              min={1}
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="c-max">최대 예산 (원)</Label>
            <Input
              id="c-max"
              type="number"
              min={1}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-license">라이선스</Label>
            <select
              id="c-license"
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value as "EXCLUSIVE" | "NON_EXCLUSIVE")}
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="NON_EXCLUSIVE">Non-Exclusive</option>
              <option value="EXCLUSIVE">Exclusive</option>
            </select>
          </div>
          <div>
            <Label htmlFor="c-deadline">마감일</Label>
            <Input
              id="c-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6">
        <Button onClick={submit} disabled={busy}>
          {busy ? "등록 중..." : "의뢰 등록"}
        </Button>
      </div>
    </div>
  );
}
