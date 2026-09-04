"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { auth, signIn } from "@/lib/auth";

const UpdateAccountSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  nickname: z.string().optional(),
  displayNickname: z.boolean().default(false),
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(1, "현재 비밀번호를 입력해주세요"),
  newPassword: z.string().min(0).refine((v) => v.length === 0 || v.length >= 8, {
    message: "새 비밀번호는 8자 이상이어야 합니다",
  }),
});

function fail(
  fields: { name: string; email: string; nickname: string; displayNickname: boolean },
  message: string
) {
  const params = new URLSearchParams({
    name: fields.name,
    email: fields.email,
    nickname: fields.nickname,
    displayNickname: fields.displayNickname ? "nickname" : "name",
    error: message,
  });
  redirect(`/settings/account?${params.toString()}`);
}

// Server Action — 로그인/회원가입과 같은 이유로 실제 form POST 방식.
// 비밀번호는 새 비밀번호 설정용이 아니라 "본인 확인"용 필수 입력값 — 검증 통과 시
// 변경사항 반영 후 같은 자격증명으로 다시 signIn()해서 세션(JWT) 안의 name/email도 갱신.
export async function updateAccountAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
    return;
  }

  const raw = {
    name: String(formData.get("name") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    displayNickname: formData.get("displayNickname") === "nickname",
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  };

  const parsed = UpdateAccountSchema.safeParse(raw);
  if (!parsed.success) {
    fail(raw, parsed.error.issues[0]?.message ?? "잘못된 입력입니다");
    return;
  }
  const { name, nickname, displayNickname, email, password, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    redirect("/login");
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    fail({ name, email, nickname: nickname ?? "", displayNickname }, "비밀번호가 일치하지 않습니다");
    return;
  }

  if (email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      fail({ name, email, nickname: nickname ?? "", displayNickname }, "이미 사용 중인 이메일입니다");
      return;
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      nickname: nickname || null,
      displayNickname: displayNickname && !!nickname,
      email,
      ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 10) } : {}),
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: newPassword || password,
      redirectTo: "/settings/account?success=1",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?email=${encodeURIComponent(email)}`);
    }
    throw error; // re-throw redirect() signal from a successful signIn(), and any other error
  }
}
