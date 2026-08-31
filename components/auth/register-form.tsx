'use client';

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [registering, setRegistering] = useState(false);

  async function handleSendCode() {
    setSendingCode(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch("/api/auth/register/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "验证码发送失败");
      }

      setStatusMessage(payload.message || "验证码已发送");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "验证码发送失败");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegistering(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          password,
          code
        })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "注册失败");
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (signInResult?.error) {
        throw new Error("注册成功，但自动登录失败，请返回登录页手动登录");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "注册失败");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl shadow-black/20">
      <p className="mb-2 text-sm uppercase tracking-[0.3em] text-amber-400">Sellumio</p>
      <h1 className="text-3xl font-semibold">注册账号</h1>
      <p className="mt-3 text-sm text-zinc-400">
        先获取邮箱验证码，再完成注册。注册成功后会自动登录。
      </p>

      <form onSubmit={handleRegister} className="mt-8 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-zinc-300">姓名</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="你的名字"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-300">邮箱</label>
          <div className="flex gap-3">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode || !email}
              className="rounded-xl border border-amber-500/50 px-4 py-3 text-sm font-semibold text-amber-300 transition hover:border-amber-400 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingCode ? "发送中..." : "发送验证码"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-300">验证码</label>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            pattern="\d{6}"
            required
            placeholder="6 位数字验证码"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-300">密码</label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            autoComplete="new-password"
            placeholder="至少 8 位"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm"
          />
        </div>

        {statusMessage ? <p className="text-sm text-emerald-400">{statusMessage}</p> : null}
        {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}

        <button
          type="submit"
          disabled={registering}
          className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {registering ? "注册中..." : "注册并登录"}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-400">
        已有账号？
        <Link href="/login" className="ml-2 text-amber-300 transition hover:text-amber-200">
          返回登录
        </Link>
      </p>
    </div>
  );
}
