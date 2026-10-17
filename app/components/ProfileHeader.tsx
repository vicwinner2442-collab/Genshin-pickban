"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { getCharacterImageUrl } from "../../lib/character-image";
import { supabase } from "../../lib/supabase";

type AvatarCharacter = { slug: string; name: string; image_path: string | null };

type ProfileHeaderProps = {
  loading: boolean;
  userId: string;
  nickname: string;
  email: string;
  avatarSlug: string | null;
  characters: AvatarCharacter[];
  isOwner: boolean;
  onAvatarChange: (slug: string) => void;
  onLogout: () => Promise<void>;
};

export function ProfileHeader({ loading, userId, nickname, email, avatarSlug, characters, isOwner, onAvatarChange, onLogout }: ProfileHeaderProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [avatarSearch, setAvatarSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copying, setCopying] = useState(false);
  const avatar = characters.find((character) => character.slug === avatarSlug);
  const avatarCharacters = characters.filter((character) => character.name.toLocaleLowerCase("uk").includes(avatarSearch.trim().toLocaleLowerCase("uk")));

  async function saveAvatar(slug: string) {
    if (!isOwner || saving) return;
    setSaving(true);
    setAvatarError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (user?.id !== userId) throw new Error("Увійдіть у свій акаунт, щоб змінити аватарку.");
      const { data, error } = await supabase.from("profiles")
        .upsert({ id: userId, nickname, avatar_character_slug: slug, updated_at: new Date().toISOString() }, { onConflict: "id" })
        .select("avatar_character_slug").single();
      if (error) {
        if (error.code === "42703" || error.code === "PGRST204") {
          throw new Error("Збереження аватарки потребує оновлення бази з файлу supabase/profiles-schema.sql. Решта профілю вже доступна.");
        }
        throw error;
      }
      onAvatarChange(data.avatar_character_slug);
      dialogRef.current?.close();
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : (error as { message: string }).message);
    } finally {
      setSaving(false);
    }
  }

  async function shareProfile() {
    if (!userId || copying) return;
    const url = new URL(`/profile/${userId}`, window.location.origin).href;
    setCopying(true);
    setShareUrl("");
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Посилання скопійовано!");
    } catch {
      setShareUrl(url);
      setShareStatus("Скопіюйте посилання нижче:");
    } finally {
      setCopying(false);
    }
  }

  const avatarContent = avatar?.image_path ? (
    <Image src={getCharacterImageUrl(avatar.image_path)} alt={avatar.name} width={112} height={112} unoptimized className="h-full w-full object-cover" />
  ) : (
    <span className="text-4xl font-semibold text-violet-100">{nickname ? Array.from(nickname)[0].toLocaleUpperCase("uk") : "?"}</span>
  );

  return (
    <>
      <header className="mb-8 rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.18),transparent_65%)] bg-slate-900/40 p-5 shadow-[0_20px_45px_rgba(2,8,23,0.42)] sm:p-8">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm uppercase tracking-[0.24em] text-violet-200/80">Genshin Pickban</p>
          <nav className="flex flex-wrap gap-3 text-sm" aria-label="Навігація профілю">
            <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 transition hover:bg-white/10">На головну</Link>
            {isOwner ? (
              <button type="button" onClick={() => void onLogout()} className="min-h-11 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-red-200 transition hover:bg-red-500/20">Вийти</button>
            ) : (
              <Link href="/profile" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-400/10 px-4 py-2 text-violet-100 transition hover:bg-violet-400/20">Мій профіль</Link>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="shrink-0 text-center">
              {isOwner ? (
                <button
                  type="button"
                  aria-label="Змінити аватарку"
                  aria-haspopup="dialog"
                  disabled={loading}
                  onClick={() => { setAvatarSearch(""); setAvatarError(""); dialogRef.current?.showModal(); }}
                  className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-violet-300/40 bg-violet-400/15 ring-4 ring-violet-400/5 transition hover:border-violet-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-200"
                >
                  {avatarContent}
                  <span className="absolute inset-x-0 bottom-0 bg-slate-950/75 py-1 text-[10px] font-medium text-white">Змінити</span>
                </button>
              ) : (
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-violet-300/40 bg-violet-400/15">{avatarContent}</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-violet-200/65">{isOwner ? "Мій профіль" : "Профіль гравця"}</p>
              <h1 className="break-words text-3xl font-bold sm:text-4xl">{loading ? "Завантаження…" : nickname || "Мій профіль"}</h1>
              {email && <p className="mt-2 break-all text-sm text-white/55">{email}</p>}
            </div>
          </div>
          {userId && (
            <div className="flex w-full flex-col gap-2 md:w-auto md:max-w-sm md:items-end">
              <button type="button" disabled={loading || copying} onClick={() => void shareProfile()} className="flex items-center justify-center gap-2 rounded-2xl border border-violet-300/30 bg-violet-400/20 px-5 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-400/30 disabled:opacity-50">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m-5 5 5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
                Поділитися профілем
              </button>
              <p role="status" className="text-xs text-violet-100/80">{shareStatus}</p>
              {shareUrl && <input aria-label="Посилання на профіль" value={shareUrl} readOnly onFocus={(event) => event.currentTarget.select()} className="w-full rounded-lg border border-white/15 bg-slate-950/60 p-2 text-xs text-white" />}
            </div>
          )}
        </div>
      </header>

      <dialog ref={dialogRef} aria-labelledby="avatar-picker-title" onCancel={(event) => { if (saving) event.preventDefault(); }} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl border border-white/15 bg-[#09122b] p-5 text-white shadow-2xl backdrop:bg-black/70 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 id="avatar-picker-title" className="text-xl font-bold">Оберіть аватарку</h2>
          <button type="button" disabled={saving} onClick={() => dialogRef.current?.close()} aria-label="Закрити вибір аватарки" className="min-h-11 min-w-11 rounded-xl border border-white/10 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40">✕</button>
        </div>
        <p className="mt-2 text-sm text-white/60">Будь-який персонаж — навіть якщо його немає у вашому ростері.</p>
        <input autoFocus aria-label="Пошук персонажа для аватарки" placeholder="Ім’я персонажа…" value={avatarSearch} onChange={(event) => setAvatarSearch(event.target.value)} className="my-5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm outline-none focus:border-violet-300/50" />
        {avatarError && <p role="alert" className="mb-4 rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{avatarError}</p>}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5" aria-busy={saving}>
          {avatarCharacters.map((character) => (
            <button key={character.slug} type="button" disabled={saving} aria-pressed={avatarSlug === character.slug} onClick={() => void saveAvatar(character.slug)} className={`flex min-w-0 flex-col items-center gap-2 rounded-2xl border p-2 transition hover:bg-violet-400/15 disabled:opacity-50 ${avatarSlug === character.slug ? "border-violet-200/60 bg-violet-400/20" : "border-white/10 bg-white/5"}`}>
              {character.image_path ? <Image src={getCharacterImageUrl(character.image_path)} alt="" width={64} height={64} unoptimized className="h-16 w-16 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl">{Array.from(character.name)[0]}</span>}
              <span className="w-full break-words text-center text-xs">{character.name}</span>
            </button>
          ))}
        </div>
        {avatarCharacters.length === 0 && <p className="py-8 text-center text-sm text-white/60">Персонажів не знайдено.</p>}
        {saving && <p role="status" className="mt-4 text-sm text-violet-100">Збереження аватарки…</p>}
      </dialog>
    </>
  );
}
