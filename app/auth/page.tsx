"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const nicknameOk = mode === "login" || (nickname.trim().length >= 3 && nickname.trim().length <= 24);
    return email.trim().length > 3 && password.length >= 6 && nicknameOk && !loading;
  }, [email, password, nickname, mode, loading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (mode === "login") {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      const loginUser = loginData.user;
      if (loginUser?.id) {
        const fallbackNickname =
          (
            (typeof loginUser.user_metadata?.nickname === "string" && loginUser.user_metadata.nickname) ||
            loginUser.email?.split("@")[0] ||
            `user-${loginUser.id.slice(0, 6)}`
          ).trim();

        await supabase.from("profiles").upsert(
          {
            id: loginUser.id,
            nickname: fallbackNickname,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
            ignoreDuplicates: true,
          }
        );
      }

      setMessage("Успішний вхід. Тепер можеш перейти в колекцію.");
      setLoading(false);
      return;
    }

    const nicknameValue = nickname.trim();

    if (nicknameValue.length < 3 || nicknameValue.length > 24) {
      setError("Нік має бути від 3 до 24 символів.");
      setLoading(false);
      return;
    }

    const { data: existingNickname, error: nicknameCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("nickname", nicknameValue)
      .maybeSingle();

    if (nicknameCheckError) {
      setError(nicknameCheckError.message);
      setLoading(false);
      return;
    }

    if (existingNickname) {
      setError("Цей нік вже зайнятий.");
      setLoading(false);
      return;
    }

    const { data: signUpData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nicknameValue,
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (signUpData.session?.user?.id) {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: signUpData.session.user.id,
          nickname: nicknameValue,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

      if (profileError) {
        if (profileError.code === "23505") {
          setError("Цей нік вже зайнятий. Спробуй інший.");
        } else {
          setError(profileError.message);
        }
        setLoading(false);
        return;
      }
    }

    setMessage(
      "Акаунт створено. Якщо увімкнене підтвердження пошти, перевірте email перед входом."
    );
    setNickname("");
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.18),_transparent_30%),linear-gradient(to_bottom,_#09090f,_#111827,_#0b1020)] px-6 py-10 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
        <p className="text-sm uppercase tracking-[0.24em] text-violet-200/80">
          Genshin Pickban
        </p>
        <h1 className="mt-2 text-3xl font-bold">Вхід</h1>
        <p className="mt-2 text-sm text-white/70">
          Увійдіть або створіть акаунт, щоб бачити і обрати своїх персонажів.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              mode === "login" ? "bg-white text-slate-900" : "text-white/70"
            }`}
          >
            Увійти
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              mode === "signup" ? "bg-white text-slate-900" : "text-white/70"
            }`}
          >
            Реєстрація
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="mb-1 block text-sm text-white/80">Нік</span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ваш нік"
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-violet-300/40"
                minLength={3}
                maxLength={24}
                required
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm text-white/80">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-violet-300/40"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-white/80">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Мінімум 6 символів"
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-violet-300/40"
              minLength={6}
              required
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Обробка..." : mode === "login" ? "Увійти" : "Створити акаунт"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {message}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/collection"
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 hover:bg-white/15"
          >
            Мої персонажі
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 hover:bg-white/15"
          >
            На головну
          </Link>
        </div>
      </div>
    </main>
  );
}
