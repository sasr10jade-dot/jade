"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";

const RegisterSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  nickname: z.string().optional(),
  displayNickname: z.boolean().default(false),
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
  role: z.enum(["CREATOR", "PERFORMER", "BUYER"]),
});

function fail(fields: { name: string; email: string; nickname: string; role: string }, message: string) {
  const params = new URLSearchParams({ ...fields, error: message });
  redirect(`/register?${params.toString()}`);
}

// Server Action — 로그인/로그아웃과 같은 이유로 실제 form POST 방식(클라이언트 JS
// hydration에 의존하지 않음). 가입 성공 시 서버사이드 signIn()으로 바로 로그인까지 처리.
export async function registerAction(formData: FormData) {
  const raw = {
    name: String(formData.get("name") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    displayNickname: formData.get("displayNickname") === "on",
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "CREATOR"),
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    fail(
      { name: raw.name, email: raw.email, nickname: raw.nickname, role: raw.role },
      parsed.error.issues[0]?.message ?? "잘못된 입력입니다"
    );
    return;
  }
  const { name, nickname, displayNickname, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    fail({ name, email, nickname: nickname ?? "", role }, "이미 가입된 이메일입니다");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      nickname: nickname || null,
      displayNickname: displayNickname && !!nickname,
      email,
      passwordHash,
      role,
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/studio" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?email=${encodeURIComponent(email)}`);
    }
    throw error; // re-throw redirect() signal from a successful signIn(), and any other error
  }
}
