import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction } from "./actions";

const ROLES = [
  { value: "CREATOR", label: "작곡가/작사가 (Creator)" },
  { value: "PERFORMER", label: "보컬리스트 (Performer)" },
  { value: "BUYER", label: "바이어 (Buyer)" },
] as const;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; email?: string; nickname?: string; role?: string; error?: string }>;
}) {
  const { name, email, nickname, role, error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-5 py-16">
      <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
      <p className="mt-1 text-sm text-muted-foreground">VOICEMAP 시작하기</p>

      {/* Server Action 폼 — 로그인과 같은 이유로 실제 form POST, 클라이언트 JS 불필요. */}
      <form action={registerAction} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">이름</Label>
          <Input id="name" name="name" defaultValue={name ?? ""} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="nickname">닉네임 (선택)</Label>
          <Input id="nickname" name="nickname" defaultValue={nickname ?? ""} className="mt-1.5" placeholder="공개 활동명" />
          <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" name="displayNickname" className="size-3.5" />
            작성자로 노출될 때 이름 대신 닉네임 사용
          </label>
        </div>
        <div>
          <Label htmlFor="email">이메일</Label>
          <Input id="email" name="email" type="email" defaultValue={email ?? ""} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" name="password" type="password" required minLength={8} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="role">역할</Label>
          <select
            id="role"
            name="role"
            defaultValue={role ?? "CREATOR"}
            className="mt-1.5 flex h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full">
          가입하기
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
