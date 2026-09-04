"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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

  const playQueue = useCallback((tracks: QueueTrack[], startIndex: number) => {
    setQueue(tracks);
    setCurrentIndex(startIndex);
    setIsPlaying(true);
  }, []);

  // queue/currentIndex가 바뀔 때마다(playQueue, next, prev, 자동 다음곡) 실제 src 전환 +
  // 재생을 여기서 일괄 처리 — "무엇을 재생할지 결정"과 "실제로 재생 시작"을 분리해두면
  // next()/prev()가 그냥 인덱스만 바꿔도 항상 일관되게 동작한다.
  useEffect(() => {
    const el = audioRef.current;
    const track = queue[currentIndex];
    if (!el || !track) return;

    if (el.src !== track.fileUrl) {
      el.src = track.fileUrl;
      pinged.current = null;
    }
    if (isPlaying) {
      claimPlayback(stop);
      el.play().catch(() => setIsPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentIndex]);

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
    setCurrentIndex((i) => Math.min(i + 1, queue.length - 1));
  }
  function prev() {
    setCurrentIndex((i) => Math.max(i - 1, 0));
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
          setCurrentIndex((i) => {
            if (i + 1 < queue.length) return i + 1;
            setIsPlaying(false);
            return i;
          });
        }}
      />
    </QueueContext.Provider>
  );
}
