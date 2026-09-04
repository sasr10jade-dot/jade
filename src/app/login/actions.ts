"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

// Server Action — runs on the server via a real form POST (Next.js progressively
// enhances this; it works even if client JS never hydrates, which is what a plain
// onClick/onSubmit + next-auth/react signIn() fetch call cannot guarantee).
export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/studio" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?email=${encodeURIComponent(email)}&error=1`);
    }
    throw error; // re-throw redirect() signal from a successful signIn(), and any other error
  }
}
