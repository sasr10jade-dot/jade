"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { claimPlayback } from "@/lib/now-playing";
import { pingTrackPlay } from "@/lib/waveform";
import { audioEngine } from "@/lib/audio-engine";

export type QueueTrack = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  fileUrl: string;
  creatorName: string;
};

type QueueContextValue = {
  queue: QueueTrack[];
  currentTrack: QueueTrack | undefined;
  position: number;
  total: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: boolean;
  expanded: boolean;
  orderedQueue: QueueTrack[];
  playQueue: (tracks: QueueTrack[], startIndex: number) => void;
  playAt: (pos: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (time: number) => void;
  close: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setExpanded: (v: boolean) => void;
};

const QueueContext = createContext<QueueContextValue | null>(null);

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useQueue must be used within QueueProvider");
  return ctx;
}

function identityOrder(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

// Fisher-Yates 셔플 후 keepFirst(현재 재생 중이던 트랙)를 맨 앞으로 보내 — 셔플을 켜는
// 순간 지금 듣던 곡이 갑자기 바뀌지 않게.
function shuffleOrder(n: number, keepFirst: number) {
  const arr = identityOrder(n);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const idx = arr.indexOf(keepFirst);
  if (idx > 0) [arr[0], arr[idx]] = [arr[idx], arr[0]];
  return arr;
}

// 전역 "연속 듣기" 큐 — 레이아웃 최상단에 한 번만 마운트되어 페이지를 이동해도(라우트
// 전환) 재생이 끊기지 않는다. 트랙 상세 페이지의 개별 플레이어와는 완전히 별개의
// <audio> 엘리먼트를 쓰고, 둘 중 하나가 재생을 시작하면 lib/now-playing.ts를 통해
// 다른 쪽을 멈춰서 소리가 겹치지 않게 한다.
//
// 재생 순서는 order(큐 인덱스의 순열) + position(그 순열 안에서의 위치)로 관리 —
// 셔플을 켜면 order만 새로 섞고, 끄면 원래 순서(identity)로 되돌리되 지금 곡은 그대로.
export function QueueProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pinged = useRef<string | null>(null);
  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const currentIndex = order[position];
  const currentTrack = queue[currentIndex];
  const orderedQueue = order.map((i) => queue[i]);

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
    // 기본 재생을 먼저 보장하고(EQ/비주얼라이저 그래프 연결은 그 이후 별도 시도) —
    // use-native-audio-player.ts와 동일한 순서. 트랙 상세 페이지 플레이어와 같은
    // audioEngine을 공유하므로 큐 플레이어에서도 이퀄라이저/비주얼라이저가 그대로 동작한다.
    el.play()
      .then(() => {
        audioEngine.connect(el);
        audioEngine.resume();
      })
      .catch(() => setIsPlaying(false));
  }

  function playQueue(tracks: QueueTrack[], startIndex: number) {
    const ord = shuffle ? shuffleOrder(tracks.length, startIndex) : identityOrder(tracks.length);
    setQueue(tracks);
    setOrder(ord);
    setPosition(Math.max(0, ord.indexOf(startIndex)));
    setIsPlaying(true);
    loadAndPlay(tracks[startIndex]);
  }

  function playAt(pos: number) {
    if (pos < 0 || pos >= order.length) return;
    setPosition(pos);
    setIsPlaying(true);
    loadAndPlay(queue[order[pos]]);
  }

  function togglePlay() {
    const el = audioRef.current;
    if (!el || queue.length === 0) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      claimPlayback(stop);
      el.play()
        .then(() => {
          audioEngine.connect(el);
          audioEngine.resume();
        })
        .catch(() => {});
      setIsPlaying(true);
    }
  }

  function next() {
    if (order.length === 0) return;
    const atEnd = position >= order.length - 1;
    if (atEnd && !repeat) return;
    const np = atEnd ? 0 : position + 1;
    setPosition(np);
    if (isPlaying) loadAndPlay(queue[order[np]]);
  }

  function prev() {
    if (order.length === 0) return;
    const atStart = position <= 0;
    if (atStart && !repeat) return;
    const pp = atStart ? order.length - 1 : position - 1;
    setPosition(pp);
    if (isPlaying) loadAndPlay(queue[order[pp]]);
  }

  function seekTo(time: number) {
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  }

  function close() {
    stop();
    setQueue([]);
    setOrder([]);
    setPosition(0);
    setExpanded(false);
  }

  function toggleShuffle() {
    setShuffle((prevShuffle) => {
      const nextShuffle = !prevShuffle;
      if (queue.length > 0) {
        const playingIndex = order[position];
        const newOrder = nextShuffle ? shuffleOrder(queue.length, playingIndex) : identityOrder(queue.length);
        setOrder(newOrder);
        setPosition(Math.max(0, newOrder.indexOf(playingIndex)));
      }
      return nextShuffle;
    });
  }

  function toggleRepeat() {
    setRepeat((r) => !r);
  }

  return (
    <QueueContext.Provider
      value={{
        queue,
        currentTrack,
        position,
        total: order.length,
        isPlaying,
        currentTime,
        duration,
        shuffle,
        repeat,
        expanded,
        orderedQueue,
        playQueue,
        playAt,
        togglePlay,
        next,
        prev,
        seekTo,
        close,
        toggleShuffle,
        toggleRepeat,
        setExpanded,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        className="hidden"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onPlay={() => {
          if (currentTrack && pinged.current !== currentTrack.id) {
            pinged.current = currentTrack.id;
            pingTrackPlay(currentTrack.id);
          }
        }}
        onEnded={() => {
          const atEnd = position >= order.length - 1;
          if (atEnd && !repeat) {
            setIsPlaying(false);
            return;
          }
          const np = atEnd ? 0 : position + 1;
          setPosition(np);
          loadAndPlay(queue[order[np]]);
        }}
        onError={(e) => {
          console.error("[VOICEMAP] 큐 재생 오류:", e.currentTarget.error);
          setIsPlaying(false);
        }}
      />
    </QueueContext.Provider>
  );
}
