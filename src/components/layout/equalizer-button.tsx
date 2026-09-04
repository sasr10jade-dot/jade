"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EqualizerPanel } from "@/components/equalizer-panel";

export function EqualizerButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-label="이퀄라이저">
        🎚
      </Button>
      {open && (
        <div className="absolute top-full right-0 z-40 mt-2">
          <EqualizerPanel />
        </div>
      )}
    </div>
  );
}
