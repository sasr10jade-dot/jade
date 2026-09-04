"use client";

import { useEffect, useRef, useState } from "react";
import { audioEngine } from "@/lib/audio-engine";

const BAR_COUNT = 32;

// 재생 중인 오디오에 실시간으로 반응하는 스펙트럼 시각화 — EqualizerPanel과 같은 공유
// AnalyserNode(audioEngine.getAnalyser())를 읽기만 하고 오디오를 직접 다루지 않는다.
// active=false(일시정지)일 때는 부드럽게 0으로 감쇠.
export function AudioVisualizer({ active, className }: { active: boolean; className?: string }) {
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function draw() {
      const analyser = active ? audioEngine.getAnalyser() : null;
      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const binCount = data.length;
        // FFT 빈은 선형(각 빈이 같은 Hz 폭)인데, 음악 에너지는 저음에 몰려 있어서 그대로
        // 균등 분할하면 저음 바만 움직이고 고음 바는 죽어 보임(실제 겪은 증상) — 로그
        // 스케일로 빈을 묶어서 저/중/고음 바에 골고루 대역폭을 나눠준다. 그래도 고음은
        // 물리적으로 에너지가 작으므로 인덱스가 높을수록(고음일수록) 약간의 게인 부스트를
        // 얹어서 시각적으로 화면 전체가 살아 움직이게 만든다(실제 레벨 미터가 아니라
        // 장식용 비주얼라이저이므로 이런 보정이 자연스럽다).
        const bars: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const startBin = Math.floor(Math.pow(binCount, i / BAR_COUNT));
          const endBin = Math.max(startBin + 1, Math.floor(Math.pow(binCount, (i + 1) / BAR_COUNT)));
          let max = 0;
          for (let j = startBin; j < endBin && j < binCount; j++) {
            if (data[j] > max) max = data[j];
          }
          const boost = 1 + (i / BAR_COUNT) * 1.4; // 저음 1.0x → 고음 약 2.4x
          bars.push(Math.min(1, (max / 255) * boost));
        }
        setLevels(bars);
      } else {
        setLevels((prev) => (prev.every((v) => v === 0) ? prev : prev.map((v) => Math.max(0, v - 0.1))));
      }
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return (
    <div aria-hidden="true" className={`flex items-end gap-[3px] ${className ?? ""}`}>
      {levels.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-full bg-primary transition-[height] duration-75"
          style={{ height: `${Math.max(4, Math.round(v * 100))}%`, opacity: 0.5 + v * 0.5 }}
        />
      ))}
    </div>
  );
}
