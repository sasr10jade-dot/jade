"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { claimPlayback } from "@/lib/now-playing";
import { pingTrackPlay } from "@/lib/waveform";

export type QueueTrack = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  fileUrl: string;
  creatorName: string;
};

type QueueContextValue = {
  queue: QueueTrack[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playQueue: (tracks: QueueTrack[], startIndex: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (time: number) => void;
  close: () => void;
};

const QueueContext = createContext<QueueContextValue | null>(null);

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useQueue must be used within QueueProvider");
  return ctx;
}

// 전역 "연속 듣기" 큐 — 레이아웃 최상단에 한 번만 마운트되어 페이지를 이동해도(라우트
// 전환) 재생이 끊기지 않는다. 트랙 상세 페이지의 개별 플레이어와는 완전히 별개의
// <audio> 엘리먼트를 쓰고, 둘 중 하나가 재생을 시작하면 lib/now-playing.ts를 통해
// 다른 쪽을 멈춰서 소리가 겹치지 않게 한다.
export function QueueProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pinged = useRef<string | null>(null);
  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  // 모바일(특히 iOS Safari)은 el.play()가 사용자 제스처의 동기 호출 스택 안에서
  // 실행돼야만 허용한다 — setState 후 useEffect에서 나중에 play()를 부르면(비동기,
  // 제스처 컨텍스트 밖) 데스크톱에선 되던 게 모바일에서는 조용히 막힌다. 그래서
  // playQueue/next/prev는 클릭 핸들러 안에서 이 함수를 직접, 동기적으로 호출한다.
  function loadAndPlay(track: QueueTrack | undefined) {
    const el = audioRef.current;
    if (!el || !track) return;
    if (el.src !== track.fileUrl) {
      el.src = track.fileUrl;
      pinged.current = null;
    }
    claimPlayback(stop);
    el.play().catch(() => setIsPlaying(false));
  }

  function playQueue(tracks: QueueTrack[], startIndex: number) {
    setQueue(tracks);
    setCurrentIndex(startIndex);
    setIsPlaying(true);
    loadAndPlay(tracks[startIndex]);
  }

  function togglePlay() {
    const el = audioRef.current;
    if (!el || queue.length === 0) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      claimPlayback(stop);
      el.play().catch(() => {});
      setIsPlaying(true);
    }
  }

  function next() {
    const ni = Math.min(currentIndex + 1, queue.length - 1);
    setCurrentIndex(ni);
    if (isPlaying) loadAndPlay(queue[ni]);
  }
  function prev() {
    const pi = Math.max(currentIndex - 1, 0);
    setCurrentIndex(pi);
    if (isPlaying) loadAndPlay(queue[pi]);
  }
  function seekTo(time: number) {
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  }
  function close() {
    stop();
    setQueue([]);
    setCurrentIndex(0);
  }

  return (
    <QueueContext.Provider
      value={{ queue, currentIndex, isPlaying, currentTime, duration, playQueue, togglePlay, next, prev, seekTo, close }}
    >
      {children}
      <audio
        ref={audioRef}
        className="hidden"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onPlay={() => {
          const track = queue[currentIndex];
          if (track && pinged.current !== track.id) {
            pinged.current = track.id;
            pingTrackPlay(track.id);
          }
        }}
        onEnded={() => {
          if (currentIndex + 1 < queue.length) {
            const ni = currentIndex + 1;
            setCurrentIndex(ni);
            loadAndPlay(queue[ni]);
          } else {
            setIsPlaying(false);
          }
        }}
        onError={(e) => {
          console.error("[VOICEMAP] 큐 재생 오류:", e.currentTarget.error);
          setIsPlaying(false);
        }}
      />
    </QueueContext.Provider>
  );
}
