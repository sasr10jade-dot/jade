// Shared by every audio player component — fetch + AudioContext.decodeAudioData,
// downsampled to peaks, driving native <audio> elements (no player library).

export function formatTime(sec: number) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Fire-and-forget play counter — call once per playback start, not per timeupdate.
export function pingTrackPlay(trackId: string) {
  fetch(`/api/tracks/${trackId}/play`, { method: "POST" }).catch(() => {});
}

export async function extractPeaks(url: string, bars: number): Promise<number[]> {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const channel = decoded.getChannelData(0);
    const blockSize = Math.floor(channel.length / bars) || 1;
    const peaks: number[] = [];
    for (let i = 0; i < bars; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize && start + j < channel.length; j++) {
        const abs = Math.abs(channel[start + j]);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }
    return peaks;
  } finally {
    ctx.close();
  }
}
