"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ThumbnailUploader } from "@/components/thumbnail-uploader";

const SUGGESTED_TAGS = ["발라드", "무드: 잔잔한", "여성보컬 추천"];
const MAX_SIZE_MB = 300;
const ALLOWED_TYPES = ["audio/wav", "audio/x-wav", "audio/mpeg"];

type UploadState = "idle" | "uploading" | "creating" | "done" | "error";

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileTooLarge, setFileTooLarge] = useState(false);
  const [fileTypeInvalid, setFileTypeInvalid] = useState(false);
  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [exclusivePrice, setExclusivePrice] = useState("300000");
  const [nonExclusivePrice, setNonExclusivePrice] = useState("120000");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // EC-01: 지원 포맷 외 또는 300MB 초과 시 업로드 즉시 차단.
  function handleFile(f: File) {
    const tooLarge = f.size > MAX_SIZE_MB * 1024 * 1024;
    const typeInvalid = !ALLOWED_TYPES.includes(f.type);
    setFileTooLarge(tooLarge);
    setFileTypeInvalid(typeInvalid);
    setFile(tooLarge || typeInvalid ? null : f);
    setState("idle");
    setError(null);
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleUpload() {
    if (!file) return;
    const exclusiveNum = Number(exclusivePrice);
    const nonExclusiveNum = Number(nonExclusivePrice);
    if (!Number.isFinite(exclusiveNum) || exclusiveNum <= 0 || !Number.isFinite(nonExclusiveNum) || nonExclusiveNum <= 0) {
      setError("라이선스 가격을 올바르게 입력해주세요");
      setState("error");
      return;
    }
    setError(null);
    setState("uploading");
    setProgress(0);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data.error ?? "업로드 URL 발급에 실패했습니다");
      }
      const { uploadUrl, fileUrl } = await presignRes.json();

      await uploadWithProgress(uploadUrl, file, setProgress);

      setState("creating");
      const trackRes = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || file.name,
          bpm: bpm ? Number(bpm) : undefined,
          bpmAuto: !bpm,
          key: musicalKey || undefined,
          keyAuto: !musicalKey,
          tags,
          fileUrl,
          fileSize: file.size,
          thumbnailUrl: thumbnailUrl ?? undefined,
          exclusivePrice: exclusiveNum,
          nonExclusivePrice: nonExclusiveNum,
        }),
      });
      if (!trackRes.ok) {
        const data = await trackRes.json().catch(() => ({}));
        throw new Error(data.error ?? "트랙 등록에 실패했습니다");
      }

      setState("done");
      router.push("/studio");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다");
      setState("error");
    }
  }

  const busy = state === "uploading" || state === "creating";

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">트랙 업로드</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        WAV + 가사 + BPM/Key + 레퍼런스 태그
      </p>

      <label
        htmlFor="track-file"
        className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground hover:border-foreground/40"
      >
        <span>{file?.name ?? "WAV / MP3 파일을 드래그하거나 클릭하여 업로드"}</span>
        <span className="text-xs">최대 {MAX_SIZE_MB}MB</span>
        <input
          id="track-file"
          type="file"
          accept="audio/wav,audio/mpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>
      {fileTooLarge && (
        <p className="mt-2 text-sm text-destructive">
          파일이 {MAX_SIZE_MB}MB를 초과했습니다.
        </p>
      )}
      {fileTypeInvalid && (
        <p className="mt-2 text-sm text-destructive">
          WAV 또는 MP3 파일만 지원합니다.
        </p>
      )}

      <div className="mt-6">
        <Label>커버 썸네일 (선택)</Label>
        <div className="mt-1.5">
          <ThumbnailUploader onUploaded={setThumbnailUrl} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="title">제목</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="bpm">BPM (미입력 시 자동감지)</Label>
          <Input id="bpm" value={bpm} onChange={(e) => setBpm(e.target.value)} className="mt-1.5" placeholder="98" />
        </div>
        <div>
          <Label htmlFor="key">Key (미입력 시 자동감지)</Label>
          <Input id="key" value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)} className="mt-1.5" placeholder="C# Minor" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="exclusive-price">Exclusive 가격 (원)</Label>
          <Input
            id="exclusive-price"
            type="number"
            min={1}
            value={exclusivePrice}
            onChange={(e) => setExclusivePrice(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="non-exclusive-price">Non-Exclusive 가격 (원)</Label>
          <Input
            id="non-exclusive-price"
            type="number"
            min={1}
            value={nonExclusivePrice}
            onChange={(e) => setNonExclusivePrice(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTED_TAGS.map((tag) => (
          <Badge
            key={tag}
            variant={tags.includes(tag) ? "default" : "outline"}
            className="cursor-pointer rounded-full px-3 py-1.5"
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>

      {busy && (
        <div className="mt-6">
          <Progress value={state === "creating" ? 100 : progress} />
          <p className="mt-1 text-xs text-muted-foreground">
            {state === "uploading" ? `업로드 중... ${progress}%` : "트랙 등록 중..."}
          </p>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex gap-2">
        <Button variant="outline" disabled={busy}>
          임시저장
        </Button>
        <Button onClick={handleUpload} disabled={!file || busy}>
          {busy ? "처리 중..." : "다음: 보컬 매칭 →"}
        </Button>
      </div>
    </div>
  );
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`업로드 실패 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("업로드 중 네트워크 오류가 발생했습니다"));
    xhr.send(file);
  });
}
