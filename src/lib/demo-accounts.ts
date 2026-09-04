// Quick-login accounts shown on /login in dev (see prisma/seed.ts). Most share
// DEMO_PASSWORD; 광석 is the real creator account with its own real password.
export const DEMO_PASSWORD = "password1234";

export const DEMO_ACCOUNTS = [
  { email: "sasr10@naver.com", label: "광석", role: "Creator", password: "kk101312!@" },
  { email: "korg900@naver.com", label: "KEY", role: "Creator", password: "kk101312!@" },
  { email: "seoah@voicemap.test", label: "서아", role: "Performer" },
  { email: "minji@voicemap.test", label: "민지", role: "Performer" },
  { email: "minsu@voicemap.test", label: "민수", role: "Buyer (A&R)" },
  { email: "admin@voicemap.test", label: "관리자", role: "Admin" },
] as const;

export function demoPasswordFor(email: string): string {
  const acc = DEMO_ACCOUNTS.find((a) => a.email === email);
  return (acc && "password" in acc && acc.password) || DEMO_PASSWORD;
}
