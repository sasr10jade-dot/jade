import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NewCommissionForm } from "./new-commission-form";

export default async function NewCommissionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <NewCommissionForm />;
}
