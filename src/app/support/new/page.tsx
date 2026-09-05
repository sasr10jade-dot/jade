import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NewTicketForm } from "./new-ticket-form";

export default async function NewTicketPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <NewTicketForm />;
}
