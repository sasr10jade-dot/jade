import { auth } from "@/lib/auth";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  const session = await auth();

  if (session && session.user.role !== "CREATOR") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">트랙 업로드</h1>
        <p className="mt-4 rounded-lg border-l-2 border-amber-500 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          업로드는 Creator 계정만 가능합니다. 현재 {session.user.role} 계정으로 로그인되어
          있습니다.
        </p>
      </div>
    );
  }

  return <UploadForm />;
}
