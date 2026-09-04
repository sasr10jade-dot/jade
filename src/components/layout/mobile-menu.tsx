"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// 좁은 화면에서 헤더 내비게이션(7개 링크 + 사용자 정보)이 넘치는 걸 막기 위한 햄버거
// 메뉴 — 서버에서 렌더링한 내비/사용자 블록을 그대로 children으로 받아 열고 닫기만 담당.
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="sm"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        )}
      </Button>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-6xl px-5 py-4">{children}</div>
        </div>
      )}
    </div>
  );
}
