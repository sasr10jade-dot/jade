"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ThumbnailUploader } from "@/components/thumbnail-uploader";

const MAX_SIZE_MB = 300;
const ALLOWED_TYPES = ["audio/wav", "audio/x-wav", "audio/mpeg"];

type State = "idle" | "uploading" | "creating" | "error";

export function DeliverForm({ requestId, defaultTitle }: { requestId: string; defaultTitle: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File) {
    const tooLarge = f.size > MAX_SIZE_MB * 1024 * 1024;
    const typeInvalid = !ALLOWED_TYPES.includes(f.type);
    if (tooLarge) {
      setFileError(`파일이 ${MAX_SIZE_MB}MB를 초과했습니다.`);
      setFile(null);
      return;
    }
    if (typeInvalid) {
      setFileError("WAV 또는 MP3 파일만 지원합니다.");
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(f);
  }

  async function submit() {
    if (!file) {
      setError("납품할 음원 파일을 첨부해주세요");
      return;
    }
    setError(null);
    setState("uploading");
    setProgress(0);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data.error ?? "업로드 URL 발급에 실패했습니다");
      }
      const { uploadUrl, fileUrl } = await presignRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`업로드 실패 (${xhr.status})`)));
        xhr.onerror = () => reject(new Error("업로드 중 네트워크 오류가 발생했습니다"));
        xhr.send(file);
      });

      setState("creating");
      const res = await fetch(`/api/commissions/${requestId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || file.name,
          fileUrl,
          fileSize: file.size,
          thumbnailUrl: thumbnailUrl ?? undefined,
          bpm: bpm ? Number(bpm) : undefined,
          key: musicalKey || undefined,
          lyrics: lyrics || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "납품에 실패했습니다");

      router.push(`/track/${data.track.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
      setState("error");
    }
  }

  const busy = state === "uploading" || state === "creating";

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold">곡 납품하기</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        납품 즉시 합의된 가격으로 에스크로 결제가 시작됩니다.
      </p>

      <label
        htmlFor="deliver-file"
        className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground hover:border-foreground/40"
      >
        <span>{file?.name ?? "WAV / MP3 파일을 드래그하거나 클릭하여 업로드"}</span>
        <span className="text-xs">최대 {MAX_SIZE_MB}MB</span>
        <input
          id="deliver-file"
          type="file"
          accept="audio/wav,audio/mpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>
      {fileError && <p className="mt-2 text-sm text-destructive">{fileError}</p>}

      <div className="mt-4">
        <Label>커버 썸네일 (선택)</Label>
        <div className="mt-1.5">
          <ThumbnailUploader onUploaded={setThumbnailUrl} size="sm" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="deliver-title">제목</Label>
          <Input id="deliver-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="deliver-bpm">BPM (선택)</Label>
          <Input id="deliver-bpm" value={bpm} onChange={(e) => setBpm(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="deliver-key">Key (선택)</Label>
          <Input id="deliver-key" value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)} className="mt-1.5" />
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="deliver-lyrics">가사 (선택)</Label>
        <Textarea id="deliver-lyrics" rows={4} value={lyrics} onChange={(e) => setLyrics(e.target.value)} className="mt-1.5" />
      </div>

      {busy && (
        <div className="mt-4">
          <Progress value={state === "creating" ? 100 : progress} />
          <p className="mt-1 text-xs text-muted-foreground">
            {state === "uploading" ? `업로드 중... ${progress}%` : "납품 처리 중..."}
          </p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <Button className="mt-4" disabled={!file || busy} onClick={submit}>
        {busy ? "처리 중..." : "납품 완료"}
      </Button>
    </div>
  );
}
