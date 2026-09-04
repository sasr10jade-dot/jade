import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateCommissionSchema = z
  .object({
    title: z.string().min(1, "제목을 입력해주세요"),
    description: z.string().min(1, "설명을 입력해주세요"),
    genre: z.string().optional(),
    mood: z.string().optional(),
    referenceUrl: z.string().optional(),
    budgetMin: z.number().int().positive(),
    budgetMax: z.number().int().positive(),
    licenseType: z.enum(["EXCLUSIVE", "NON_EXCLUSIVE"]),
    deadline: z.string().min(1),
  })
  .refine((d) => d.budgetMax >= d.budgetMin, {
    message: "최대 예산은 최소 예산보다 크거나 같아야 합니다",
    path: ["budgetMax"],
  });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = CreateCommissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다" },
      { status: 400 }
    );
  }
  const { deadline, ...data } = parsed.data;

  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: "마감일은 미래 날짜여야 합니다" }, { status: 400 });
  }

  const request = await prisma.commissionRequest.create({
    data: {
      ...data,
      deadline: deadlineDate,
      buyerId: session.user.id,
    },
  });

  return NextResponse.json(request, { status: 201 });
}
