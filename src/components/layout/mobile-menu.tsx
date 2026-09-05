"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

// 좁은 화면에서 헤더 내비게이션(7개 링크 + 사용자 정보)이 넘치는 걸 막기 위한 햄버거
// 메뉴 — 서버에서 렌더링한 내비/사용자 블록을 그대로 children으로 받아 열고 닫기만 담당.
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // 메뉴 안의 링크를 눌러 다른 페이지로 이동하면 자동으로 닫힘 — 렌더링 중 이전 경로와
  // 비교해서 바뀌었으면 그 자리에서 반영(React 공식 "prop이 바뀌면 state 조정" 패턴).
  // useEffect로 하면 한 박자 늦게(커밋 후) 닫혀 깜빡임이 생기고 set-state-in-effect
  // 린트 규칙에도 걸린다.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

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
