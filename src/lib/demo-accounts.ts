// Quick-login accounts shown on /login in dev (see prisma/seed.ts). Most share
// DEMO_PASSWORD; 광석/KEY are real creator accounts — their real passwords are never
// stored here, so quick-login only prefills the email and the password must be typed.
export const DEMO_PASSWORD = "password1234";

export const DEMO_ACCOUNTS = [
  { email: "sasr10@naver.com", label: "광석", role: "Creator" },
  { email: "korg900@naver.com", label: "KEY", role: "Creator" },
  { email: "seoah@voicemap.test", label: "서아", role: "Performer" },
  { email: "minji@voicemap.test", label: "민지", role: "Performer" },
  { email: "minsu@voicemap.test", label: "민수", role: "Buyer (A&R)" },
  { email: "admin@voicemap.test", label: "관리자", role: "Admin" },
] as const;

// Real creator accounts (광석/KEY) have no stored password here, so this only ever
// prefills DEMO_PASSWORD — real accounts require the password to be typed manually.
export function demoPasswordFor(_email: string): string {
  return DEMO_PASSWORD;
}
