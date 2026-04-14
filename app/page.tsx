"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);

  const resolveDisplayName = async (
    user: { id: string; email?: string | null; user_metadata?: { nickname?: string; display_name?: string } } | null
  ) => {
    if (!user) {
      setUserDisplayName(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle();

    setUserDisplayName(
      profile?.nickname ??
        (typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : null) ??
        (typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null) ??
        user.email ??
        null
    );
  };

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        await resolveDisplayName(session?.user ?? null);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolveDisplayName(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(50%_55%_at_92%_18%,rgba(129,95,255,0.32)_0%,rgba(84,39,199,0.16)_42%,transparent_74%),radial-gradient(85%_65%_at_15%_0%,#0f5f7e_0%,#061b45_45%,#040a24_100%),radial-gradient(70%_45%_at_50%_105%,rgba(255,78,158,0.55)_0%,rgba(176,39,117,0.35)_35%,transparent_72%)] text-white">
      <section className="mx-auto flex min-h-[72vh] max-w-6xl flex-col items-center justify-start px-6 pt-20 pb-12 text-center md:pt-24">
        <h1 className="max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
          Драфтилка для батлів
        </h1>

        <p className="mt-6 max-w-2xl text-base text-white/70 md:text-lg">
          Обирайте персонажів, яких маєте, зберігайте, створюйте кімнатку і нумо батлитись!
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/collection"
            className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Мої персонажі
          </Link>

          <Link
            href="/room"
            className="rounded-2xl border border-violet-300/30 bg-violet-400/20 px-6 py-3 font-semibold text-violet-100 transition hover:bg-violet-400/30"
          >
            Створити або приєднатися до кімнати
          </Link>
        </div>

        <div className="mt-4 mb-8 flex flex-col items-center gap-3 sm:mb-0 sm:flex-row">
          {userDisplayName ? (
            <>
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">
                Ви увійшли як: {userDisplayName}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-red-400/30 bg-red-500/15 px-6 py-2 font-semibold text-red-100 transition hover:bg-red-500/25"
              >
                Вийти
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-2xl bg-white px-6 py-2 font-semibold text-slate-900 transition hover:scale-[1.02]"
            >
              Увійти
            </Link>
          )}
        </div>

      </section>

      <section className="mx-auto mt-2 w-full max-w-6xl px-6 pb-16 md:-mt-12">
        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:p-8">
            <h2 className="text-2xl font-bold md:text-3xl">Як грати?</h2>

            <div className="mt-6 grid flex-1 auto-rows-fr gap-4 md:grid-cols-2">
              <div className="h-full rounded-2xl border border-white/10 bg-black/15 p-4 md:col-start-1 md:row-start-1">
                <p className="text-xs uppercase tracking-[0.18em] text-violet-200/80">Крок 1</p>
                <h3 className="mt-2 text-lg font-semibold">Відмітьте, хто у вас є</h3>
                <p className="mt-2 text-sm text-white/70">
                  На сторінці “Мої персонажі" оберіть персонажів, які у вас є. Воно збережеться і підв'яжеться до акаунту.
                </p>
              </div>

              <div className="h-full rounded-2xl border border-white/10 bg-black/15 p-4 md:col-start-1 md:row-start-2">
                <p className="text-xs uppercase tracking-[0.18em] text-violet-200/80">Крок 2</p>
                <h3 className="mt-2 text-lg font-semibold">Створіть або приєднайтеся до кімнати</h3>
                <p className="mt-2 text-sm text-white/70">
                  Один гравець створює кімнату, другий заходить по коду.
                </p>
              </div>

              <div className="h-full rounded-2xl border border-white/10 bg-black/15 p-4 md:col-start-2 md:row-start-1">
                <p className="text-xs uppercase tracking-[0.18em] text-violet-200/80">Крок 3</p>
                <h3 className="mt-2 text-lg font-semibold">Бани і піки</h3>
                <p className="mt-2 text-sm text-white/70">
                  В залежності від режимів, ви баните персонажів гравцю/один одному. Після банів обирайте, ким гратимете, і переходьте до безодні!
                </p>
              </div>

              <div className="h-full rounded-2xl border border-white/10 bg-black/15 p-4 md:col-start-2 md:row-start-2">
                <p className="text-xs uppercase tracking-[0.18em] text-violet-200/80">Крок 4</p>
                <h3 className="mt-2 text-lg font-semibold">Налаштування</h3>
                <p className="mt-2 text-sm text-white/70">
                  Кімнати можна налаштувати, деякі налаштування залежать від режиму. Можна налаштувати бани від 1 до 4 (в режимі "Два акаунти" - "1 бан на гравця"), таймер (без нього, 1-5 хв на хід). Загалом можна обрати 8 (16) персонажів, к-сть фіксована.
                </p>
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:p-8">
            <h2 className="text-2xl font-bold md:text-3xl">Режими</h2>

            <div className="mt-6 grid flex-1 auto-rows-fr gap-4">
              <div className="h-full rounded-2xl border border-white/10 bg-black/15 p-4">
                <h3 className="text-lg font-semibold">Один акаунт</h3>
                <p className="mt-2 text-sm text-white/70">
                  Банимо і пікаємо на один акаунт, проходимо безодню по черзі на швидкість.
                  Потім скидаємо драфт і повторюємо бани/піки вже на другий акаунт.
                </p>
              </div>

              <div className="h-full rounded-2xl border border-white/10 bg-black/15 p-4">
                <h3 className="text-lg font-semibold">Два акаунти</h3>
                <p className="mt-2 text-sm text-white/70">
                  Для тих, хто не хоче ділитися акаунтами: обираємо персонажів в імунітет, банимо, пікаємо і проходимо безодню на швидкість.
                  Персонажа в імунітеті можуть обрати обидва, але лише в особливий слот.
                  Якщо один гравець запікнув персонажа, інший вже не зможе обрати цього ж персонажа.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
