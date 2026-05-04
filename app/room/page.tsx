"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type AppUser = {
  id: string;
  email: string | null;
  displayName: string;
};

type DraftMode = "single_roster" | "dual_roster";

const TURN_TIMER_OPTIONS = [
  { value: 0, label: "Без таймера" },
  { value: 60, label: "1 хв на хід" },
  { value: 120, label: "2 хв на хід" },
  { value: 180, label: "3 хв на хід" },
  { value: 240, label: "4 хв на хід" },
  { value: 300, label: "5 хв на хід" },
] as const;

function formatRoomError(error: { message: string; code?: string } | null) {
  if (!error) return "";

  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /Could not find the table 'public\.(rooms|room_players)' in the schema cache/i.test(error.message)
  ) {
    return 'У БД немає таблиць кімнат. Створи "rooms" та "room_players" у Supabase.';
  }

  if (error.code === "23505") {
    return "Такий код уже існує. Спробуй ще раз.";
  }

  if (error.code === "42703" && /(ban_count|pick_count|turn_timer_seconds|draft_mode|draft_state|immunity_count)/i.test(error.message)) {
    return 'У таблиці "rooms" бракує нових колонок налаштувань. Запусти оновлений SQL зі схеми (rooms-schema.sql).';
  }

  return error.message;
}

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    code += alphabet[randomIndex];
  }

  return code;
}

export default function RoomLobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [message, setMessage] = useState("");
  const [banCount, setBanCount] = useState(2);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState<number>(120);
  const [draftMode, setDraftMode] = useState<DraftMode>("single_roster");

  const canJoin = useMemo(() => joinCode.trim().length >= 4 && !loadingJoin, [joinCode, loadingJoin]);

  useEffect(() => {
    void supabase.rpc("cleanup_stale_rooms", { max_age_minutes: 180 });
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setMessage("Спочатку увійди в акаунт, щоб працювати з кімнатами.");
        setUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", authUser.id)
        .maybeSingle();

      setUser({
        id: authUser.id,
        email: authUser.email ?? null,
        displayName:
          (
            (typeof profile?.nickname === "string" && profile.nickname) ||
            (typeof authUser.user_metadata?.nickname === "string" && authUser.user_metadata.nickname) ||
            (typeof authUser.user_metadata?.display_name === "string" && authUser.user_metadata.display_name) ||
            authUser.email?.split("@")[0] ||
            `user-${authUser.id.slice(0, 6)}`
          ).trim(),
      });
    };

    void loadUser();
  }, []);

  const createRoom = async () => {
    if (!user) {
      setMessage("Для створення кімнати потрібно увійти в акаунт.");
      return;
    }

    setLoadingCreate(true);
    setMessage("");

    let newCode = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateRoomCode();

      const { error: roomError } = await supabase.from("rooms").insert({
        code,
        host_user_id: user.id,
        status: "waiting",
        ban_count: banCount,
        pick_count: 8,
        turn_timer_seconds: turnTimerSeconds,
        draft_mode: draftMode,
        immunity_count: draftMode === "dual_roster" ? 2 : 0,
        draft_state: {
          target_user_id: null,
          turn_started_at: null,
          ready_user_ids: [],
          first_turn_user_id: null,
          immunities: [],
          bans: [],
          picks: [],
        },
      });

      if (roomError?.code === "23505") {
        continue;
      }

      if (roomError) {
        setMessage(formatRoomError(roomError));
        setLoadingCreate(false);
        return;
      }

      newCode = code;
      break;
    }

    if (!newCode) {
      setMessage("Не вдалося згенерувати унікальний код кімнати. Спробуйте ще раз.");
      setLoadingCreate(false);
      return;
    }

    const { error: playerError } = await supabase.from("room_players").insert({
      room_code: newCode,
      user_id: user.id,
      role: "host",
      display_name: user.displayName,
    });

    setLoadingCreate(false);

    if (playerError) {
      setMessage(formatRoomError(playerError));
      return;
    }

    router.push(`/room/${newCode}`);
  };

  const joinRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setMessage("Для входу в кімнату потрібно увійти в акаунт.");
      return;
    }

    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setMessage("Введи коректний код кімнати.");
      return;
    }

    setLoadingJoin(true);
    setMessage("");

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("code")
      .eq("code", code)
      .maybeSingle();

    if (roomError) {
      setMessage(formatRoomError(roomError));
      setLoadingJoin(false);
      return;
    }

    if (!room) {
      setMessage("Кімнату з таким кодом не знайдено.");
      setLoadingJoin(false);
      return;
    }

    const { data: existingPlayers, error: playersError } = await supabase
      .from("room_players")
      .select("user_id")
      .eq("room_code", code);

    if (playersError) {
      setMessage(formatRoomError(playersError));
      setLoadingJoin(false);
      return;
    }

    const currentPlayers = existingPlayers ?? [];
    const alreadyInRoom = currentPlayers.some((player: { user_id: string }) => player.user_id === user.id);

    if (!alreadyInRoom && currentPlayers.length >= 2) {
      setMessage("У кімнаті вже максимум 2 гравці.");
      setLoadingJoin(false);
      return;
    }

    const { error: joinError } = await supabase.from("room_players").upsert(
      {
        room_code: code,
        user_id: user.id,
        role: "guest",
        display_name: user.displayName,
      },
      {
        onConflict: "room_code,user_id",
      }
    );

    setLoadingJoin(false);

    if (joinError) {
      setMessage(formatRoomError(joinError));
      return;
    }

    router.push(`/room/${code}`);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.18),_transparent_30%),linear-gradient(to_bottom,_#09090f,_#111827,_#0b1020)] px-6 py-10 text-white">
      <section className="mx-auto w-full max-w-7xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-violet-200/80">Genshin Pickban</p>
        <h1 className="mt-3 text-3xl font-bold md:text-4xl">Кімната драфту</h1>
        <p className="mt-3 text-sm text-white/70 md:text-base">Створіть нову кімнату або приєднайтеся по коду.</p>

        {user?.displayName && (
          <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">
            Ви увійшли як: {user.displayName}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-violet-200/80">Налаштування кімнати</p>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <label className="text-xs text-white/65" htmlFor="draftMode">
              Режим драфту
            </label>
            <select
              id="draftMode"
              value={draftMode}
              onChange={(event) => setDraftMode(event.target.value as DraftMode)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
            >
              <option value="single_roster" className="bg-slate-900 text-white">
                Один акаунт
              </option>
              <option value="dual_roster" className="bg-slate-900 text-white">
                Два акаунти
              </option>
            </select>
          </div>

          <div className="mt-3 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            <label className="rounded-xl border border-white/10 bg-white/5 p-3 xl:col-span-1">
              <span className="text-xs text-white/65">Бани</span>
              <select
                value={banCount}
                onChange={(event) => setBanCount(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
              >
                {[1, 2, 3, 4].map((value) => (
                  <option key={value} value={value} className="bg-slate-900 text-white">
                    {draftMode === "dual_roster" ? `${value} на гравця` : value}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3 xl:col-span-1">
              <span className="text-xs text-white/65">Піки</span>
              <p className="mt-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white">
                {draftMode === "dual_roster" ? "8 на гравця" : "8"}
              </p>
            </div>

            <label className="rounded-xl border border-white/10 bg-white/5 p-3 xl:col-span-1">
              <span className="text-xs text-white/65">Таймер</span>
              <select
                value={turnTimerSeconds}
                onChange={(event) => setTurnTimerSeconds(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white outline-none"
              >
                {TURN_TIMER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {draftMode === "dual_roster" && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 xl:col-span-1">
                <span className="text-xs text-white/65">Імунітети</span>
                <p className="mt-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white">2</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={createRoom}
            disabled={!user || loadingCreate}
            className="rounded-2xl bg-white px-5 py-4 text-left text-slate-900 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <p className="text-lg font-semibold">{loadingCreate ? "Створюємо..." : "Створити кімнату"}</p>
            <p className="mt-1 text-sm text-slate-700">Згенеруємо код і відкриємо кімнату.</p>
          </button>

          <form onSubmit={joinRoom} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <label className="text-sm text-white/80" htmlFor="roomCode">
              Код кімнати
            </label>
            <input
              id="roomCode"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="Наприклад: A7K2P9"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white outline-none placeholder:text-white/40 focus:border-violet-300/40"
            />
            <button
              type="submit"
              disabled={!user || !canJoin}
              className="mt-3 w-full rounded-xl border border-violet-300/30 bg-violet-400/20 px-4 py-2 font-medium text-violet-100 transition hover:bg-violet-400/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingJoin ? "Перевіряємо..." : "Приєднатися"}
            </button>
          </form>
        </div>

        {message && <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/85">{message}</div>}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
            На головну
          </Link>
          <Link href="/collection" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
            Мій список персонажів
          </Link>
        </div>
      </section>
    </main>
  );
}
