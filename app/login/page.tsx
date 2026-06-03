import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { loginAction } from "./actions";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/projects");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl shadow-black/20">
        <p className="mb-2 text-sm uppercase tracking-[0.3em] text-amber-400">Amazon Tools</p>
        <h1 className="text-3xl font-semibold">登录竞品监控台</h1>
        <p className="mt-3 text-sm text-zinc-400">
          使用 demo 账号快速体验。邮箱和密码可以在 `.env` 中配置。
        </p>
        <form action={loginAction} className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-300">邮箱</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={process.env.DEMO_USER_EMAIL ?? "demo@example.com"}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-zinc-300">密码</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              defaultValue={process.env.DEMO_USER_PASSWORD ?? "password123"}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm"
            />
          </div>
          <button className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400">
            登录并进入项目
          </button>
        </form>
        <p className="mt-6 text-sm text-zinc-400">
          还没有账号？
          <Link href="/register" className="ml-2 text-amber-300 transition hover:text-amber-200">
            去注册
          </Link>
        </p>
      </div>
    </main>
  );
}
