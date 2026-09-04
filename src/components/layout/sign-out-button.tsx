import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth-actions";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="ghost" size="sm">
        로그아웃
      </Button>
    </form>
  );
}
