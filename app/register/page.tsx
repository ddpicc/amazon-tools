import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/projects");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <RegisterForm />
    </main>
  );
}
