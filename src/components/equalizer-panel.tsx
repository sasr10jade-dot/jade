"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { audioEngine, EQ_BANDS, EQ_PRESETS } from "@/lib/audio-engine";

const SPECTRUM_BARS = 48;

function bandLabel(freq: number) {
  return freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
}

// 사이트 어디서든 재생 중인 오디오에 적용되는 전역 10밴드 이퀄라이저 패널 — 프리셋,
// 밴드별 슬라이더, 실시간 스펙트럼 분석기, VU미터. audio-engine.ts의 공유 그래프를
// 그대로 읽고 쓴다(이 컴포넌트가 오디오를 직접 재생하지는 않음).
export function EqualizerPanel() {
  const [gains, setGains] = useState<number[]>(() => audioEngine.getGains());
  const [spectrum, setSpectrum] = useState<number[]>(() => Array(SPECTRUM_BARS).fill(0));
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe(() => setGains(audioEngine.getGains()));
    return unsubscribe;
  }, []);

  useEffect(() => {
    function draw() {
      const analyser = audioEngine.getAnalyser();
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const groupSize = Math.floor(data.length / SPECTRUM_BARS) || 1;
        const bars: number[] = [];
        let sum = 0;
        for (let i = 0; i < SPECTRUM_BARS; i++) {
          let max = 0;
          for (let j = 0; j < groupSize; j++) {
            const v = data[i * groupSize + j] ?? 0;
            if (v > max) max = v;
            sum += v;
          }
          bars.push(max / 255);
        }
        setSpectrum(bars);
        setLevel(sum / (data.length * 255));
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="w-[340px] rounded-2xl border border-border bg-card p-4 shadow-xl sm:w-[420px]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">🎚 이퀄라이저</p>
        <p className="text-xs text-muted-foreground">설정은 이 브라우저에 저장돼요</p>
      </div>

      {/* 스펙트럼 분석기 */}
      <div className="mt-3 flex h-16 items-end gap-[2px] rounded-lg bg-background/60 p-2">
        {spectrum.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-full bg-primary transition-[height] duration-75"
            style={{ height: `${Math.max(3, Math.round(v * 100))}%` }}
          />
        ))}
      </div>

      {/* VU 미터 */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/60">
        <div
          className="h-full bg-primary transition-[width] duration-75"
          style={{ width: `${Math.min(100, Math.round(level * 140))}%` }}
        />
      </div>

      {/* 프리셋 */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {Object.keys(EQ_PRESETS).map((name) => (
          <Button
            key={name}
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={() => audioEngine.applyPreset(name)}
          >
            {name}
          </Button>
        ))}
      </div>

      {/* 10밴드 슬라이더 */}
      <div className="mt-4 flex items-end justify-between gap-1.5">
        {EQ_BANDS.map((freq, i) => (
          <div key={freq} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {gains[i] > 0 ? `+${gains[i]}` : gains[i]}
            </span>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={gains[i]}
              onChange={(e) => audioEngine.setBandGain(i, Number(e.target.value))}
              className="h-24 w-4 shrink-0 accent-primary"
              style={{ writingMode: "vertical-lr", direction: "rtl" }}
              aria-label={`${bandLabel(freq)}Hz`}
            />
            <span className="text-[10px] text-muted-foreground">{bandLabel(freq)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
