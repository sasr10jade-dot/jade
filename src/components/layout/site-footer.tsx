import Link from "next/link";

const LINKS = [
  { href: "/guide", label: "이용 가이드" },
  { href: "/support", label: "고객센터" },
  { href: "/legal", label: "Policy & Legal" },
];

// /legal, /guide, /support 어느 것도 헤더/모바일 메뉴에 자리가 없어(이미 항목이 많음)
// 발견 경로가 아예 없었음 — 모든 페이지 하단에 얇은 링크 줄로 최소한의 진입점을 만든다.
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-6 text-xs text-muted-foreground">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-foreground hover:underline">
            {l.label}
          </Link>
        ))}
        <span>© VOICEMAP</span>
      </div>
    </footer>
  );
}
