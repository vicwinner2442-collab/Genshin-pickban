"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { getCharacterImageUrl } from "../../lib/character-image";
import { supabase } from "../../lib/supabase";
import { ResponsiveFilters } from "./ResponsiveFilters";
import { ProfileHeader } from "./ProfileHeader";
import { PlayerSearch } from "./PlayerSearch";

type Character = {
  slug: string;
  name: string;
  element: string | null;
  rarity: number | null;
  weapon_type: string | null;
  image_path: string | null;
};

type UserCharacter = {
  character_slug: string;
  constellation: number | null;
  level: number | null;
};

const ELEMENTS = ["Піро", "Гідро", "Кріо", "Електро", "Анемо", "Гео", "Дендро"] as const;
const WEAPONS = ["Меч", "Дворучний меч", "Спис", "Каталізатор", "Лук"] as const;
const CHARACTER_LEVEL_OPTIONS = Array.from({ length: 10 }, (_, index) => (index + 1) * 10);
const SORT_OPTIONS = [
  { value: "level_desc", label: "Від більшого рівня до меншого" },
  { value: "level_asc", label: "Від меншого рівня до більшого" },
  { value: "constellation_desc", label: "Від більшої кількості сузір'їв" },
  { value: "constellation_asc", label: "Від меншої кількості сузір'їв" },
] as const;
type SortOption = (typeof SORT_OPTIONS)[number]["value"];
const DEFAULT_SORT: SortOption = "level_desc";

const ELEMENT_LABELS: Record<string, (typeof ELEMENTS)[number]> = {
  Pyro: "Піро",
  "Піро": "Піро",
  Hydro: "Гідро",
  "Гідро": "Гідро",
  Cryo: "Кріо",
  "Кріо": "Кріо",
  Electro: "Електро",
  "Електро": "Електро",
  Anemo: "Анемо",
  "Анемо": "Анемо",
  Geo: "Гео",
  "Гео": "Гео",
  Dendro: "Дендро",
  "Дендро": "Дендро",
};

const WEAPON_LABELS: Record<string, (typeof WEAPONS)[number]> = {
  Sword: "Меч",
  "Меч": "Меч",
  Claymore: "Дворучний меч",
  "Дворучний меч": "Дворучний меч",
  Polearm: "Спис",
  "Спис": "Спис",
  Catalyst: "Каталізатор",
  "Каталізатор": "Каталізатор",
  Bow: "Лук",
  "Лук": "Лук",
};

function formatSupabaseError(error: { message: string; code?: string } | null) {
  if (!error) return "";

  if (error.code === "42P01") {
    return 'Не знайдено таблицю в БД. Перевірте, що створені таблиці "characters" та "user_characters".';
  }

  if (error.code === "42703" && /constellation/i.test(error.message)) {
    return 'У таблиці "user_characters" немає колонки "constellation". Запусти оновлений SQL зі схеми.';
  }

  return error.message;
}

function normalizeCharacterLevel(level: number | null | undefined) {
  return Math.min(100, Math.max(10, Number(level) || 10));
}

function compareByDirection(a: number, b: number, direction: "asc" | "desc") {
  return direction === "asc" ? a - b : b - a;
}

function getElementBadgeClass(element: string | null) {
  switch (element) {
    case "Піро":
      return "bg-red-500/15 text-red-200 border-red-400/20";
    case "Гідро":
      return "bg-sky-500/15 text-sky-200 border-sky-400/20";
    case "Кріо":
      return "bg-cyan-400/15 text-cyan-100 border-cyan-300/20";
    case "Електро":
      return "bg-violet-500/15 text-violet-200 border-violet-400/20";
    case "Анемо":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-400/20";
    case "Гео":
      return "bg-amber-500/15 text-amber-200 border-amber-400/20";
    case "Дендро":
      return "bg-lime-500/15 text-lime-200 border-lime-400/20";
    default:
      return "bg-white/10 text-white/70 border-white/10";
  }
}

function getLocalizedElement(element: string | null) {
  if (!element) return null;
  return ELEMENT_LABELS[element] ?? element;
}

function getLocalizedWeapon(weapon: string | null) {
  if (!weapon) return null;
  return WEAPON_LABELS[weapon] ?? weapon;
}

function getRarityBadgeClass(rarity: number | null) {
  if (rarity === 5) {
    return "border-yellow-300/30 bg-yellow-400/15 text-yellow-100";
  }

  if (rarity === 4) {
    return "border-violet-300/35 bg-violet-500/15 text-violet-100";
  }

  return "border-white/15 bg-white/10 text-white/80";
}

export default function ProfilePage({ profileId }: { profileId?: string }) {
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatarSlug, setAvatarSlug] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [profileFound, setProfileFound] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedBySlug, setSelectedBySlug] = useState<Record<string, number>>({});
  const [selectedLevelsBySlug, setSelectedLevelsBySlug] = useState<Record<string, number>>({});
  const [levelDraftsBySlug, setLevelDraftsBySlug] = useState<Record<string, string>>({});
  const [openLevelPickerSlug, setOpenLevelPickerSlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [rarityFilters, setRarityFilters] = useState<Array<"4" | "5">>([]);
  const [elementFilter, setElementFilter] = useState("all");
  const [weaponFilter, setWeaponFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);

  const selectedSet = useMemo(() => new Set(Object.keys(selectedBySlug)), [selectedBySlug]);
  const selectedCount = useMemo(() => Object.keys(selectedBySlug).length, [selectedBySlug]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setSessionVersion((version) => version + 1);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      setMessage("");
      setShowAuthPrompt(false);
      setProfileFound(false);
      setCharacters([]);
      setSelectedBySlug({});
      setSelectedLevelsBySlug({});
      setLevelDraftsBySlug({});
      setUserEmail("");
      setIsOwner(false);
      setNickname("");
      setAvatarSlug(null);
      setUserId("");
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (cancelled) return;
        const targetId = profileId ?? user?.id;
        if (!targetId) {
          if (authError && authError.name !== "AuthSessionMissingError") throw authError;
          setShowAuthPrompt(true);
          return;
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
          setMessage("Профіль не знайдено. Перевірте посилання.");
          return;
        }
        const ownProfile = user?.id === targetId;
        const [profileResult, charsResult] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", targetId).maybeSingle(),
          supabase.from("characters").select("slug, name, element, rarity, weapon_type, image_path").order("name", { ascending: true }),
        ]);
        if (cancelled) return;
        if (profileResult.error) throw profileResult.error;
        if (!profileResult.data && !ownProfile) {
          setMessage("Профіль не знайдено. Перевірте посилання.");
          return;
        }
        setUserId(targetId);
        setIsOwner(ownProfile);
        setUserEmail(ownProfile ? user?.email ?? "" : "");
        setNickname(profileResult.data?.nickname ?? (ownProfile ? user?.user_metadata?.nickname : null) ?? "Гравець");
        setAvatarSlug(profileResult.data?.avatar_character_slug ?? null);
        setProfileFound(true);
        if (charsResult.error) throw charsResult.error;
        setCharacters(charsResult.data ?? []);
        if (!user) {
          setShowAuthPrompt(true);
          return;
        }
        const { data: picked, error: pickedError } = await supabase
          .from("user_characters")
          .select("character_slug, constellation, level")
          .eq("user_id", targetId);
        if (cancelled) return;
        if (pickedError) throw pickedError;
        const pickedMap: Record<string, number> = {};
        const pickedLevelMap: Record<string, number> = {};
        const pickedLevelDraftMap: Record<string, string> = {};
        for (const item of (picked ?? []) as UserCharacter[]) {
          const level = normalizeCharacterLevel(item.level);
          pickedMap[item.character_slug] = item.constellation ?? 0;
          pickedLevelMap[item.character_slug] = level;
          pickedLevelDraftMap[item.character_slug] = String(level);
        }
        setSelectedBySlug(pickedMap);
        setSelectedLevelsBySlug(pickedLevelMap);
        setLevelDraftsBySlug(pickedLevelDraftMap);
      } catch (error) {
        if (!cancelled) setMessage(formatSupabaseError(error as { message: string; code?: string }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadData();
    return () => { cancelled = true; };
  }, [profileId, sessionVersion]);

  const filteredCharacters = useMemo(() => {
    const filtered = characters.filter((character) => {
      if (!isOwner && !selectedSet.has(character.slug)) return false;
      const matchesSearch = character.name.toLowerCase().includes(search.toLowerCase());
      const matchesRarity =
        rarityFilters.length === 0 || (character.rarity !== null && rarityFilters.includes(String(character.rarity) as "4" | "5"));
      const matchesElement = elementFilter === "all" || getLocalizedElement(character.element) === elementFilter;
      const matchesWeapon = weaponFilter === "all" || getLocalizedWeapon(character.weapon_type) === weaponFilter;

      return matchesSearch && matchesRarity && matchesElement && matchesWeapon;
    });

    return [...filtered].sort((a, b) => {
      // Sort by rarity descending (5* above 4*)
      const aRarity = a.rarity ?? 0;
      const bRarity = b.rarity ?? 0;
      if (aRarity !== bRarity) {
        return bRarity - aRarity;
      }

      const aSelected = selectedSet.has(a.slug);
      const bSelected = selectedSet.has(b.slug);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;

      const [sortField, sortDirection] = sortBy.split("_") as ["level" | "constellation", "asc" | "desc"];
      const aValue =
        sortField === "level"
          ? aSelected
            ? selectedLevelsBySlug[a.slug] ?? 10
            : -1
          : aSelected
          ? selectedBySlug[a.slug] ?? 0
          : -1;
      const bValue =
        sortField === "level"
          ? bSelected
            ? selectedLevelsBySlug[b.slug] ?? 10
            : -1
          : bSelected
          ? selectedBySlug[b.slug] ?? 0
          : -1;

      const valueSort = compareByDirection(aValue, bValue, sortDirection);
      if (valueSort !== 0) return valueSort;

      return a.name.localeCompare(b.name, "uk");
    });
  }, [characters, search, rarityFilters, elementFilter, weaponFilter, sortBy, selectedBySlug, selectedLevelsBySlug, selectedSet, isOwner]);

  const toggleCharacter = async (slug: string) => {
    if (!isOwner) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      setMessage("Спочатку увійдіть в акаунт.");
      return;
    }

    setMessage("");
    setSavingSlug(slug);

    if (selectedSet.has(slug)) {
      const { error } = await supabase
        .from("user_characters")
        .delete()
        .eq("user_id", user.id)
        .eq("character_slug", slug);

      setSavingSlug(null);

      if (error) {
        setMessage(formatSupabaseError(error));
        return;
      }

      setSelectedBySlug((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
      setSelectedLevelsBySlug((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
      setLevelDraftsBySlug((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
      setOpenLevelPickerSlug((prev) => (prev === slug ? null : prev));
      return;
    }

    const { error } = await supabase.from("user_characters").insert({
      user_id: user.id,
      character_slug: slug,
      constellation: 0,
      level: 10,
    });

    setSavingSlug(null);

    if (error) {
      setMessage(formatSupabaseError(error));
      return;
    }

    setSelectedBySlug((prev) => ({ ...prev, [slug]: 0 }));
    setSelectedLevelsBySlug((prev) => ({ ...prev, [slug]: 10 }));
    setLevelDraftsBySlug((prev) => ({ ...prev, [slug]: "10" }));
  };

  const handleCharacterCardClick = (slug: string) => {
    if (!isOwner || savingSlug === slug) return;
    void toggleCharacter(slug);
  };

  const handleCharacterCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, slug: string) => {
    if (!isOwner || event.target !== event.currentTarget || savingSlug === slug) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void toggleCharacter(slug);
    }
  };

  const updateConstellation = async (slug: string, constellation: number) => {
    if (!isOwner) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      setMessage("Спочатку увійдіть в акаунт.");
      return;
    }

    setSavingSlug(slug);
    setMessage("");

    const { error } = await supabase.from("user_characters").upsert(
      {
        user_id: user.id,
        character_slug: slug,
        constellation,
      },
      { onConflict: "user_id,character_slug" }
    );

    setSavingSlug(null);

    if (error) {
      setMessage(formatSupabaseError(error));
      return;
    }

    setSelectedBySlug((prev) => ({ ...prev, [slug]: constellation }));
  };

  const updateLevel = async (slug: string, level: number) => {
    if (!isOwner) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      setMessage("Спочатку увійдіть в акаунт.");
      return;
    }

    setSavingSlug(slug);
    setMessage("");

    const nextLevel = normalizeCharacterLevel(level);

    const { error } = await supabase.from("user_characters").upsert(
      {
        user_id: user.id,
        character_slug: slug,
        level: nextLevel,
      },
      { onConflict: "user_id,character_slug" }
    );

    setSavingSlug(null);

    if (error) {
      setMessage(formatSupabaseError(error));
      setLevelDraftsBySlug((prev) => ({ ...prev, [slug]: String(selectedLevelsBySlug[slug] ?? 10) }));
      return;
    }

    setSelectedLevelsBySlug((prev) => ({ ...prev, [slug]: nextLevel }));
    setLevelDraftsBySlug((prev) => ({ ...prev, [slug]: String(nextLevel) }));
    setOpenLevelPickerSlug(null);
  };

  const commitLevelDraft = (slug: string) => {
    const draft = levelDraftsBySlug[slug];
    const nextLevel = normalizeCharacterLevel(draft === "" ? selectedLevelsBySlug[slug] : Number(draft));

    setLevelDraftsBySlug((prev) => ({ ...prev, [slug]: String(nextLevel) }));

    if (nextLevel !== selectedLevelsBySlug[slug]) {
      void updateLevel(slug, nextLevel);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setRarityFilters([]);
    setElementFilter("all");
    setWeaponFilter("all");
    setSortBy(DEFAULT_SORT);
  };

  const hasFilters =
    search.trim().length > 0 ||
    rarityFilters.length > 0 ||
    elementFilter !== "all" ||
    weaponFilter !== "all" ||
    sortBy !== DEFAULT_SORT;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage("Ви вийшли з акаунта.");
    setSelectedBySlug({});
    setSelectedLevelsBySlug({});
    setLevelDraftsBySlug({});
    setOpenLevelPickerSlug(null);
    setUserEmail("");
  };

  return (
    <main className="min-h-screen bg-[#040B25] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-center">
          <PlayerSearch key={profileId ?? "my-profile"} />
        </div>
        <ProfileHeader
          loading={loading}
          userId={userId}
          nickname={nickname}
          email={userEmail}
          avatarSlug={avatarSlug}
          characters={characters}
          isOwner={isOwner}
          onAvatarChange={setAvatarSlug}
          onLogout={handleLogout}
        />

        {profileFound && !showAuthPrompt && (
          <>
            <div className="mb-5">
              <h2 className="text-2xl font-bold">{isOwner ? "Мій ростер" : "Ростер гравця"}</h2>
              <p className="mt-2 text-sm text-white/60">
                {isOwner
                  ? "Обирайте персонажів, які у вас є, та вказуйте їхні рівні й сузір’я. Цей ростер використовується у кімнатах драфту."
                  : "Персонажі, рівні та сузір’я гравця."}
              </p>
            </div>
            <ResponsiveFilters
              active={hasFilters}
              className="mb-6 rounded-3xl border border-white/10 bg-slate-900/35 p-3 shadow-[0_14px_35px_rgba(2,8,23,0.3)] backdrop-blur-md sm:p-4 lg:grid-cols-12 lg:gap-4"
              searchClassName="lg:col-span-3"
              search={(
              <input
                type="text"
                placeholder="Пошук по імені..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-14 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none placeholder:text-white/40 lg:col-span-3"
              />
              )}
            >

              <div className="grid h-14 grid-cols-2 gap-2 lg:col-span-2">
                <button
                  type="button"
                  onClick={() =>
                    setRarityFilters((prev) => (prev.includes("5") ? prev.filter((value) => value !== "5") : [...prev, "5"]))
                  }
                  className={`h-14 rounded-2xl border px-3 text-sm font-semibold transition ${
                    rarityFilters.includes("5")
                      ? "border-yellow-300/40 bg-yellow-400/20 text-yellow-100"
                      : "border-white/10 bg-white/10 text-white/75 hover:bg-white/15"
                  }`}
                >
                  5★
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRarityFilters((prev) => (prev.includes("4") ? prev.filter((value) => value !== "4") : [...prev, "4"]))
                  }
                  className={`h-14 rounded-2xl border px-3 text-sm font-semibold transition ${
                    rarityFilters.includes("4")
                      ? "border-violet-300/45 bg-violet-500/25 text-violet-100"
                      : "border-white/10 bg-white/10 text-white/75 hover:bg-white/15"
                  }`}
                >
                  4★
                </button>
              </div>

              <select
                value={elementFilter}
                onChange={(e) => setElementFilter(e.target.value)}
                className="h-14 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none lg:col-span-2"
              >
                <option className="bg-slate-900 text-white" value="all">Усі елементи</option>
                {ELEMENTS.map((element) => (
                  <option className="bg-slate-900 text-white" key={element} value={element}>
                    {element}
                  </option>
                ))}
              </select>

              <select
                value={weaponFilter}
                onChange={(e) => setWeaponFilter(e.target.value)}
                className="h-14 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none lg:col-span-2"
              >
                <option className="bg-slate-900 text-white" value="all">Уся зброя</option>
                {WEAPONS.map((weapon) => (
                  <option className="bg-slate-900 text-white" key={weapon} value={weapon}>
                    {weapon}
                  </option>
                ))}
              </select>

              <div className="relative h-14 lg:col-span-2">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-white">Сортування</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Сортування персонажів"
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-transparent outline-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option className="bg-slate-900 text-white" key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasFilters}
                title="Скинути фільтри та сортування"
                aria-label="Скинути фільтри та сортування"
                className="h-14 rounded-2xl border border-white/15 bg-white/10 px-4 text-xl font-semibold text-white/80 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 lg:col-span-1"
              >
                ↺
              </button>
            </ResponsiveFilters>

            <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-white/75">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">Усього персонажів: {characters.length}</div>
              <div className="rounded-2xl border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-violet-100">Наявність: {selectedCount}</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">Показано: {filteredCharacters.length}</div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">Завантаження персонажів...</div>
            ) : filteredCharacters.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">
                {characters.length === 0
                  ? "Треба увійти, щоб тут з'явилися персонажі."
                  : "Нічого не знайдено. Спробуйте змінити фільтри."}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredCharacters.map((character) => {
                  const isSelected = selectedSet.has(character.slug);

                  return (
                    <div
                      key={character.slug}
                      role={isOwner ? "button" : undefined}
                      tabIndex={!isOwner || savingSlug === character.slug ? -1 : 0}
                      aria-pressed={isOwner ? isSelected : undefined}
                      aria-disabled={savingSlug === character.slug}
                      onClick={isOwner ? () => handleCharacterCardClick(character.slug) : undefined}
                      onKeyDown={isOwner ? (event) => handleCharacterCardKeyDown(event, character.slug) : undefined}
                      className={`group rounded-3xl border p-5 text-left shadow-lg transition ${
                        isSelected
                          ? "border-violet-300/50 bg-violet-500/12 ring-1 ring-violet-300/30"
                          : "border-white/10 bg-slate-900/35 hover:bg-slate-800/50"
                      } ${savingSlug === character.slug ? "cursor-not-allowed opacity-80" : isOwner ? "cursor-pointer" : ""}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0">
                          {character.image_path ? (
                            <Image
                              src={getCharacterImageUrl(character.image_path)}
                              alt={character.name}
                              width={88}
                              height={88}
                              className="h-[88px] w-[88px] rounded-2xl object-cover ring-1 ring-white/10"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-[88px] w-[88px] items-center justify-center rounded-2xl bg-white/10 text-xs text-white/50">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-semibold md:text-xl">{character.name}</h3>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-medium ${getElementBadgeClass(
                                    getLocalizedElement(character.element)
                                  )}`}
                                >
                                  {getLocalizedElement(character.element) ?? "Unknown"}
                                </span>

                                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getRarityBadgeClass(character.rarity)}`}>
                                  {character.rarity ?? "?"}★
                                </span>
                              </div>
                            </div>

                            {isOwner && <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                isSelected ? "bg-violet-200 text-slate-950" : "bg-white/10 text-white/70"
                              }`}
                            >
                              {savingSlug === character.slug ? "..." : isSelected ? "Є" : "Немає"}
                            </span>}
                          </div>

                          <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white/75">
                            {!isOwner ? (
                              <dl className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <dt className="text-white/80">Консти:</dt>
                                  <dd className="text-xs font-semibold text-white">C{selectedBySlug[character.slug] ?? 0}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <dt className="text-white/80">Рівень:</dt>
                                  <dd className="text-xs font-semibold text-white">{selectedLevelsBySlug[character.slug] ?? 10}</dd>
                                </div>
                              </dl>
                            ) : isSelected ? (
                              <div
                                className="space-y-2"
                                onClick={(event) => event.stopPropagation()}
                                onPointerDown={(event) => event.stopPropagation()}
                              >
                                <label className="flex items-center justify-between gap-2" data-constellation-control="true">
                                  <span className="text-white/80">Консти:</span>
                                  <select
                                    disabled={!isOwner || savingSlug === character.slug}
                                    value={String(selectedBySlug[character.slug] ?? 0)}
                                    data-constellation-control="true"
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={(event) => void updateConstellation(character.slug, Number(event.target.value))}
                                    className="min-h-11 min-w-16 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-base text-white outline-none sm:text-sm"
                                  >
                                    {Array.from({ length: 7 }, (_, index) => (
                                      <option key={index} value={index} className="bg-slate-900 text-white">
                                        C{index}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="flex items-center justify-between gap-2" data-level-control="true">
                                  <span className="text-white/80">Рівень:</span>
                                  <span className="relative">
                                    <input
                                      readOnly={!isOwner}
                                      disabled={savingSlug === character.slug}
                                      type="text"
                                      inputMode="numeric"
                                      value={levelDraftsBySlug[character.slug] ?? String(selectedLevelsBySlug[character.slug] ?? 10)}
                                      data-level-control="true"
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onPointerDown={(event) => event.stopPropagation()}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (isOwner) setOpenLevelPickerSlug(character.slug);
                                      }}
                                      onFocus={() => { if (isOwner) setOpenLevelPickerSlug(character.slug); }}
                                      onChange={(event) =>
                                        setLevelDraftsBySlug((prev) => ({ ...prev, [character.slug]: event.target.value.replace(/\D/g, "") }))
                                      }
                                      onBlur={() => commitLevelDraft(character.slug)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.currentTarget.blur();
                                        }

                                        if (event.key === "Escape") {
                                          setOpenLevelPickerSlug(null);
                                          event.currentTarget.blur();
                                        }
                                      }}
                                      className="min-h-11 w-16 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-base text-white outline-none focus:border-violet-300/45 sm:text-sm"
                                    />

                                    {isOwner && openLevelPickerSlug === character.slug && (
                                      <span className="absolute right-0 top-[calc(100%+8px)] z-50 grid w-40 grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-[#111827] p-1 shadow-2xl">
                                        {CHARACTER_LEVEL_OPTIONS.map((level) => (
                                          <button
                                            key={level}
                                            type="button"
                                            aria-pressed={normalizeCharacterLevel(selectedLevelsBySlug[character.slug]) === level}
                                            onPointerDown={(event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                            }}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              setLevelDraftsBySlug((prev) => ({ ...prev, [character.slug]: String(level) }));
                                              void updateLevel(character.slug, level);
                                            }}
                                            className={`rounded-lg min-h-11 px-3 py-2 text-left text-sm font-semibold transition hover:bg-violet-400/20 ${
                                              normalizeCharacterLevel(selectedLevelsBySlug[character.slug]) === level
                                                ? "bg-violet-400/25 text-violet-50"
                                                : "text-white/85"
                                            }`}
                                          >
                                            {level}
                                          </button>
                                        ))}
                                      </span>
                                    )}
                                  </span>
                                </label>
                              </div>
                            ) : (
                              <span className="text-white/55">Додайте персонажа, щоб обрати консту та рівень</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {message && <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85">{message}</div>}
        {showAuthPrompt && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85">
            Щоб переглянути ростер, увійдіть в акаунт — перейдіть на{" "}
            <Link href="/auth" className="font-semibold text-violet-200 underline decoration-violet-300/70 underline-offset-4">
              вхід
            </Link>
            .
          </div>
        )}

        {loading && <p role="status" className="py-8 text-white/60">Завантаження профілю…</p>}
      </div>
    </main>
  );
}
