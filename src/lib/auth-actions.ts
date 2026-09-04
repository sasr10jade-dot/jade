"use server";

import { signOut } from "@/lib/auth";

// Server Action — same rationale as src/app/login/actions.ts: a real form POST
// works even when client JS/hydration is unreliable, unlike next-auth/react's
// fetch-based signOut() from an onClick handler.
export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
