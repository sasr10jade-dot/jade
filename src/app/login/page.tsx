import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DEMO_ACCOUNTS, demoPasswordFor } from "@/lib/demo-accounts";
import { loginAction } from "./actions";

const IS_DEV = process.env.NODE_ENV !== "production";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  const { email, error } = await searchParams;
  // 데모 계정일 때만 비밀번호도 같이 채움 — 서버에서 렌더링되므로 클라이언트
  // JS/hydration이 실패해도(브라우저 확장 프로그램 등) 필드는 항상 채워진 채로 로드된다.
  // 광석(실계정)은 다른 데모 계정과 비밀번호가 다르므로 계정별로 조회.
  const isDemoAccount = email && DEMO_ACCOUNTS.some((acc) => acc.email === email);
  const prefillPassword = email && isDemoAccount ? demoPasswordFor(email) : "";

  return (
    <div className="mx-auto max-w-sm px-5 py-16">
      <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
      <p className="mt-1 text-sm text-muted-foreground">VOICEMAP에 오신 것을 환영합니다</p>

      {IS_DEV && (
        <div className="mt-6 rounded-lg border border-dashed p-4">
          <p className="text-xs font-semibold text-muted-foreground">빠른 로그인 (개발용)</p>
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            클릭하면 아이디/비밀번호가 채워진 채로 이 페이지가 다시 로드됩니다. 채워진 뒤
            아래 &quot;로그인&quot; 버튼을 눌러주세요.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <Link key={acc.email} href={`/login?email=${encodeURIComponent(acc.email)}`}>
                <Button type="button" variant="outline" size="sm" className="w-full">
                  {`${acc.label} (${acc.role})`}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Server Action 폼 — 실제 form POST이므로 클라이언트 JS가 hydrate되지 않아도
          동작한다 (next-auth/react의 fetch 기반 signIn()에 의존하지 않음). */}
      <form action={loginAction} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={email ?? ""}
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            name="password"
            type="password"
            defaultValue={prefillPassword}
            required
            className="mt-1.5"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">이메일 또는 비밀번호가 올바르지 않습니다</p>
        )}

        <Button type="submit" className="w-full">
          로그인
        </Button>
      </form>

      <Separator className="my-4" />

      <p className="text-center text-sm text-muted-foreground">
        계정이 없으신가요?{" "}
        <Link href="/register" className="underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}
