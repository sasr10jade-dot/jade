"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

const MAX_SIZE_MB = 300;
const ALLOWED_TYPES = ["audio/wav", "audio/x-wav", "audio/mpeg"];
const DEFAULT_SPLIT_ASK = 20; // Performer's proposed share, default 80/20 (Section 5).

type SubmitState = "idle" | "uploading" | "creating" | "done" | "error";
type Mode = "upload" | "record";

// MediaRecorder 지원 mimeType 중 브라우저가 실제로 낼 수 있는 걸 골라준다 — 이건 확장자와
// storage.ts의 ALLOWED_CONTENT_TYPES(webm/mp4/ogg 허용) 둘 다에 맞춰져 있어야 함.
const RECORD_MIME_CANDIDATES = ["audio/webm", "audio/mp4", "audio/ogg"];
function pickRecorderMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return RECORD_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

export function GuideSubmitForm({ trackId }: { trackId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileTooLarge, setFileTooLarge] = useState(false);
  const [fileTypeInvalid, setFileTypeInvalid] = useState(false);
  const [splitAsk, setSplitAsk] = useState(String(DEFAULT_SPLIT_ASK));
  const [state, setState] = useState<SubmitState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 녹음 상태
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function handleFile(f: File) {
    const tooLarge = f.size > MAX_SIZE_MB * 1024 * 1024;
    const typeInvalid = !ALLOWED_TYPES.includes(f.type);
    setFileTooLarge(tooLarge);
    setFileTypeInvalid(typeInvalid);
    setFile(tooLarge || typeInvalid ? null : f);
    setState("idle");
    setError(null);
  }

  async function startRecording() {
    setError(null);
    const mimeType = pickRecorderMimeType();
    if (!mimeType) {
      setError("이 브라우저는 마이크 녹음을 지원하지 않습니다. 파일 업로드를 이용해주세요.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.split("/")[1];
        const recordedFile = new File([blob], `guide-recording.${ext}`, { type: mimeType });
        setFile(recordedFile);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setError("마이크 접근 권한이 필요합니다. 브라우저 설정을 확인해주세요.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function resetRecording() {
    setFile(null);
    setRecordedUrl(null);
    setRecordSeconds(0);
  }

  async function handleSubmit() {
    if (!file) return;
    const splitAskNum = Number(splitAsk);
    if (!Number.isFinite(splitAskNum) || splitAskNum < 0 || splitAskNum > 100) {
      setError("희망 분배율은 0~100 사이 숫자여야 합니다");
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
          purpose: "guide",
        }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data.error ?? "업로드 URL 발급에 실패했습니다");
      }
      const { uploadUrl, fileUrl } = await presignRes.json();

      await uploadWithProgress(uploadUrl, file, setProgress);

      setState("creating");
      const guideRes = await fetch("/api/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId, audioUrl: fileUrl, splitAsk: splitAskNum }),
      });
      if (!guideRes.ok) {
        const data = await guideRes.json().catch(() => ({}));
        throw new Error(data.error ?? "가이드 제출에 실패했습니다");
      }

      setState("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "제출 중 오류가 발생했습니다");
      setState("error");
    }
  }

  const busy = state === "uploading" || state === "creating";

  if (state === "done") {
    return (
      <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        가이드가 제출되었습니다. 크리에이터의 검토를 기다려 주세요.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border p-4">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "upload" ? "default" : "outline"}
          onClick={() => {
            setMode("upload");
            resetRecording();
          }}
        >
          파일 업로드
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "record" ? "default" : "outline"}
          onClick={() => {
            setMode("record");
            setFile(null);
          }}
        >
          🎙 지금 녹음하기
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {mode === "record"
          ? "녹음 장비나 편집 경험이 없어도 괜찮습니다 — 브라우저 마이크로 바로 가이드를 녹음해서 제출할 수 있어요."
          : "완성된 오디오 파일이 있다면 바로 업로드하세요."}
      </p>

      {mode === "upload" ? (
        <>
          <label
            htmlFor="guide-file"
            className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground hover:border-foreground/40"
          >
            <span>{file?.name ?? "가이드 보컬 WAV / MP3 파일을 업로드"}</span>
            <span className="text-xs">최대 {MAX_SIZE_MB}MB</span>
            <input
              id="guide-file"
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
            <p className="mt-2 text-sm text-destructive">파일이 {MAX_SIZE_MB}MB를 초과했습니다.</p>
          )}
          {fileTypeInvalid && <p className="mt-2 text-sm text-destructive">WAV 또는 MP3 파일만 지원합니다.</p>}
        </>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed p-6">
          {recordedUrl ? (
            <>
              <audio controls src={recordedUrl} className="w-full" />
              <Button type="button" variant="outline" size="sm" onClick={resetRecording}>
                다시 녹음
              </Button>
            </>
          ) : (
            <>
              <div
                className={`flex size-16 items-center justify-center rounded-full text-2xl ${
                  isRecording ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                🎙
              </div>
              <p className="text-sm text-muted-foreground">
                {isRecording ? `녹음 중... ${recordSeconds}초` : "버튼을 눌러 녹음을 시작하세요"}
              </p>
              <Button type="button" size="sm" onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? "녹음 종료" : "녹음 시작"}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="mt-4 max-w-[200px]">
        <Label htmlFor="split-ask">희망 분배율 (Performer, %)</Label>
        <Input
          id="split-ask"
          type="number"
          min={0}
          max={100}
          value={splitAsk}
          onChange={(e) => setSplitAsk(e.target.value)}
          className="mt-1.5"
        />
      </div>

      {busy && (
        <div className="mt-4">
          <Progress value={state === "creating" ? 100 : progress} />
          <p className="mt-1 text-xs text-muted-foreground">
            {state === "uploading" ? `업로드 중... ${progress}%` : "가이드 등록 중..."}
          </p>
        </div>
      )}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Button onClick={handleSubmit} disabled={!file || busy} className="mt-4">
        {busy ? "처리 중..." : "가이드 제출"}
      </Button>
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
