"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { License, Track } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThumbnailUploader } from "@/components/thumbnail-uploader";
import { SheetMusicUploader } from "@/components/sheet-music-uploader";

const MAX_SIZE_MB = 300;
const ALLOWED_TYPES = ["audio/wav", "audio/x-wav", "audio/mpeg"];

export function TrackEditForm({ track }: { track: Track & { licenses: License[] } }) {
  const router = useRouter();
  const [title, setTitle] = useState(track.title);
  const [genre, setGenre] = useState(track.genre ?? "");
  const [bpm, setBpm] = useState(track.bpm?.toString() ?? "");
  const [lyrics, setLyrics] = useState(track.lyrics ?? "");
  const [exclusivePrice, setExclusivePrice] = useState(
    track.licenses.find((l) => l.type === "EXCLUSIVE")?.price.toString() ?? ""
  );
  const [nonExclusivePrice, setNonExclusivePrice] = useState(
    track.licenses.find((l) => l.type === "NON_EXCLUSIVE")?.price.toString() ?? ""
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(track.thumbnailUrl);
  const [sheetMusicUrl, setSheetMusicUrl] = useState<string | null>(track.sheetMusicUrl);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function handleAudioFile(f: File) {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setAudioError(`파일이 ${MAX_SIZE_MB}MB를 초과했습니다.`);
      setAudioFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setAudioError("WAV 또는 MP3 파일만 지원합니다.");
      setAudioFile(null);
      return;
    }
    setAudioError(null);
    setAudioFile(f);
  }

  async function handleSave() {
    setBusy(true);
    setProgress(0);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        title,
        genre: genre || undefined,
        bpm: bpm ? Number(bpm) : undefined,
        lyrics: lyrics || undefined,
        thumbnailUrl: thumbnailUrl ?? undefined,
        sheetMusicUrl,
        exclusivePrice: exclusivePrice ? Number(exclusivePrice) : undefined,
        nonExclusivePrice: nonExclusivePrice ? Number(nonExclusivePrice) : undefined,
      };

      if (audioFile) {
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: audioFile.name,
            contentType: audioFile.type,
            size: audioFile.size,
          }),
        });
        if (!presignRes.ok) {
          const data = await presignRes.json().catch(() => ({}));
          throw new Error(data.error ?? "업로드 URL 발급에 실패했습니다");
        }
        const { uploadUrl, fileUrl } = await presignRes.json();
        await uploadWithProgress(uploadUrl, audioFile, setProgress);
        payload.fileUrl = fileUrl;
        payload.fileSize = audioFile.size;
      }

      const res = await fetch(`/api/tracks/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "수정에 실패했습니다");
      }

      router.push("/studio");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <Label>커버 썸네일</Label>
      <div className="mt-1.5">
        <ThumbnailUploader onUploaded={setThumbnailUrl} initialUrl={thumbnailUrl} />
      </div>

      <div className="mt-6">
        <Label>악보 (선택)</Label>
        <div className="mt-1.5">
          <SheetMusicUploader onUploaded={setSheetMusicUrl} initialUrl={sheetMusicUrl} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="title">제목</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="genre">장르</Label>
          <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="bpm">BPM</Label>
          <Input id="bpm" value={bpm} onChange={(e) => setBpm(e.target.value)} className="mt-1.5" />
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

      <div className="mt-6">
        <Label htmlFor="lyrics">가사</Label>
        <Textarea
          id="lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          className="mt-1.5 min-h-40"
          placeholder="가사를 입력해주세요"
        />
      </div>

      <div className="mt-6">
        <Label htmlFor="audio-file">음원 파일 교체 (선택)</Label>
        <label
          htmlFor="audio-file"
          className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground hover:border-foreground/40"
        >
          <span>{audioFile?.name ?? "기존 음원을 그대로 두려면 비워두세요"}</span>
          <span className="text-xs">최대 {MAX_SIZE_MB}MB</span>
          <input
            id="audio-file"
            type="file"
            accept="audio/wav,audio/mpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAudioFile(f);
            }}
          />
        </label>
        {audioError && <p className="mt-2 text-sm text-destructive">{audioError}</p>}
      </div>

      {busy && audioFile && (
        <p className="mt-4 text-xs text-muted-foreground">음원 업로드 중... {progress}%</p>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex gap-2">
        <Button onClick={handleSave} disabled={busy || !title}>
          {busy ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  );
}

function uploadWithProgress(url: string, file: File, onProgress: (pct: number) => void) {
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
