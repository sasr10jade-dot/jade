import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAccountAction } from "./actions";

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string;
    email?: string;
    nickname?: string;
    displayNickname?: string;
    error?: string;
    success?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const { name, email, nickname, displayNickname, error, success } = await searchParams;

  const currentName = name ?? user.name;
  const currentEmail = email ?? user.email;
  const currentNickname = nickname ?? user.nickname ?? "";
  const currentDisplay = displayNickname ?? (user.displayNickname ? "nickname" : "name");

  return (
    <div className="mx-auto max-w-sm px-5 py-16">
      <h1 className="text-2xl font-bold tracking-tight">회원정보 수정</h1>
      <p className="mt-1 text-sm text-muted-foreground">이름, 닉네임, 이메일을 변경할 수 있습니다</p>

      {/* Server Action 폼 — 로그인/회원가입과 같은 이유로 실제 form POST. */}
      <form action={updateAccountAction} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">이름</Label>
          <Input id="name" name="name" defaultValue={currentName} required autoComplete="off" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="nickname">닉네임</Label>
          <Input
            id="nickname"
            name="nickname"
            defaultValue={currentNickname}
            autoComplete="off"
            className="mt-1.5"
            placeholder="공개 활동명"
          />
        </div>
        <div>
          <Label>공개 프로필에 표시할 이름</Label>
          <div className="mt-1.5 flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="displayNickname"
                value="name"
                defaultChecked={currentDisplay === "name"}
              />
              이름
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="displayNickname"
                value="nickname"
                defaultChecked={currentDisplay === "nickname"}
              />
              닉네임
            </label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            닉네임을 선택했는데 닉네임이 비어있으면 이름이 대신 표시됩니다.
          </p>
        </div>
        <div>
          <Label htmlFor="email">이메일</Label>
          <Input id="email" name="email" type="email" defaultValue={currentEmail} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="newPassword">새 비밀번호 (선택)</Label>
          <Input id="newPassword" name="newPassword" type="password" className="mt-1.5" minLength={8} />
          <p className="mt-1 text-xs text-muted-foreground">비밀번호를 바꾸지 않으려면 비워두세요.</p>
        </div>
        <div>
          <Label htmlFor="password">현재 비밀번호</Label>
          <Input id="password" name="password" type="password" required className="mt-1.5" />
          <p className="mt-1 text-xs text-muted-foreground">변경사항 저장을 위해 현재 비밀번호를 입력해주세요.</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && !error && <p className="text-sm text-primary">저장되었습니다.</p>}

        <Button type="submit" className="w-full">
          저장
        </Button>
      </form>
    </div>
  );
}
