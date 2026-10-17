"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { getCharacterImageUrl } from "../../lib/character-image";
import { supabase } from "../../lib/supabase";

type Player = { id: string; nickname: string; avatar_character_slug?: string | null; imagePath?: string | null };
type SearchResult = { query: string; players: Player[]; error?: string };

export function PlayerSearch() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const id = useId();
  const query = search.trim();
  const ready = result?.query === query;
  const players = ready ? result.players : [];
  const showResults = open && query.length > 0;

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;

    async function findPlayers() {
      try {
        const response = await supabase.from("profiles")
          .select("id, nickname, avatar_character_slug")
          .ilike("nickname", pattern).order("nickname").limit(8).abortSignal(controller.signal);
        let data: Player[] | null = response.data;
        let error = response.error;

        // Profiles remain searchable before the avatar migration has been applied.
        if (response.error?.code === "42703" || response.error?.code === "PGRST204") {
          const fallback = await supabase.from("profiles").select("id, nickname")
            .ilike("nickname", pattern).order("nickname").limit(8).abortSignal(controller.signal);
          data = fallback.data;
          error = fallback.error;
        }
        if (controller.signal.aborted) return;
        if (error) throw error;
        const matches = data ?? [];
        const slugs = [...new Set(matches.flatMap((player) => player.avatar_character_slug ? [player.avatar_character_slug] : []))];
        if (slugs.length) {
          const { data } = await supabase.from("characters").select("slug, image_path")
            .in("slug", slugs).abortSignal(controller.signal);
          if (controller.signal.aborted) return;
          const images = new Map((data ?? []).map((character) => [character.slug, character.image_path]));
          for (const player of matches) player.imagePath = images.get(player.avatar_character_slug ?? "") ?? null;
        }
        setResult({ query, players: matches });
      } catch {
        if (!controller.signal.aborted) setResult({ query, players: [], error: "Не вдалося знайти гравців. Спробуйте ще раз трохи пізніше." });
      }
    }

    const timer = setTimeout(() => void findPlayers(), 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(false);
      return;
    }
    const index = linksRef.current.findIndex((link) => link === event.target);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (players.length) linksRef.current[Math.min(index + 1, players.length - 1)]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index <= 0) inputRef.current?.focus();
      else linksRef.current[index - 1]?.focus();
    } else if (event.key === "Enter" && event.target === inputRef.current && showResults && players.length) {
      event.preventDefault();
      linksRef.current[0]?.click();
    }
  }

  return (
    <div
      ref={containerRef}
      role="search"
      aria-label="Пошук гравця"
      onKeyDown={handleKeyDown}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      className="relative z-50 mb-10 w-full max-w-xl text-left md:mb-12"
    >
      <label htmlFor={id} className="sr-only">Знайти гравця за ніком</label>
      <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-slate-950/35 px-4 shadow-lg transition focus-within:border-violet-200/60 focus-within:ring-2 focus-within:ring-violet-300/15">
        <svg aria-hidden="true" className="shrink-0 text-violet-200/75" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
        <input
          ref={inputRef}
          id={id}
          type="search"
          autoComplete="off"
          maxLength={24}
          placeholder="Знайти гравця за ніком…"
          aria-controls={showResults ? `${id}-results` : undefined}
          aria-describedby={showResults ? `${id}-status` : undefined}
          value={search}
          onChange={(event) => { setSearch(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/50 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
        />
        {search && <button type="button" aria-label="Очистити пошук гравця" onClick={() => { setSearch(""); setResult(null); inputRef.current?.focus(); }} className="min-h-11 min-w-11 shrink-0 rounded-lg px-2 py-1 text-white/60 transition hover:bg-white/10 hover:text-white">✕</button>}
      </div>

      {showResults && (
        <div id={`${id}-results`} className="absolute inset-x-0 top-[calc(100%+8px)] max-h-[min(60dvh,420px)] overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-[#09122b] p-2 shadow-2xl">
          <p id={`${id}-status`} role="status" className="px-3 py-2 text-xs text-white/55">
            {!ready ? "Шукаємо гравців…" : result.error ? result.error : players.length ? `Знайдено: ${players.length}${players.length === 8 ? ". Уточніть нік, якщо потрібного гравця немає." : ""}` : "Гравців з таким ніком не знайдено."}
          </p>
          {players.length > 0 && (
            <ul aria-label="Знайдені гравці">
              {players.map((player, index) => (
                <li key={player.id}>
                  <Link
                    ref={(link) => { linksRef.current[index] = link; }}
                    href={`/profile/${player.id}`}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-violet-400/15 focus-visible:bg-violet-400/15 focus-visible:outline-2 focus-visible:outline-violet-200/50"
                  >
                    <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-violet-200/25 bg-violet-400/15 text-lg font-semibold text-violet-100">
                      {player.imagePath && !failedImages.has(player.id) ? (
                        <Image src={getCharacterImageUrl(player.imagePath)} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" onError={() => setFailedImages((previous) => new Set(previous).add(player.id))} />
                      ) : Array.from(player.nickname)[0]?.toLocaleUpperCase("uk")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{player.nickname}</span>
                    <span aria-hidden="true" className="text-violet-200/60">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
