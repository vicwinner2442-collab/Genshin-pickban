"use client";

import Image from "next/image";
import Link from "next/link";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { getCharacterImageUrl } from "../../lib/character-image";
import { supabase } from "../../lib/supabase";

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
};

const ELEMENTS = ["Піро", "Гідро", "Кріо", "Електро", "Анемо", "Гео", "Дендро"] as const;
const WEAPONS = ["Меч", "Дворучний меч", "Спис", "Каталізатор", "Лук"] as const;

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

const COLLECTION_BG_STYLE: CSSProperties = {
  backgroundColor: "#0b1020",
  backgroundImage:
    "radial-gradient(circle at top, rgba(168, 188, 255, 0.29), transparent 30%), linear-gradient(to bottom, #09090f, #111827, #0b1020)",
  backgroundRepeat: "no-repeat",
  backgroundAttachment: "fixed",
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

export default function CollectionPage() {
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedBySlug, setSelectedBySlug] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [elementFilter, setElementFilter] = useState("all");
  const [weaponFilter, setWeaponFilter] = useState("all");

  const selectedSet = useMemo(() => new Set(Object.keys(selectedBySlug)), [selectedBySlug]);
  const selectedCount = useMemo(() => Object.keys(selectedBySlug).length, [selectedBySlug]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Ви ще не увійшли в акаунт. Перейдіть на /auth.");
        setLoading(false);
        return;
      }

      setUserEmail(user.email ?? "");

      const { data: chars, error: charsError } = await supabase
        .from("characters")
        .select("slug, name, element, rarity, weapon_type, image_path")
        .order("name", { ascending: true });

      if (charsError) {
        setMessage(formatSupabaseError(charsError));
        setLoading(false);
        return;
      }

      const { data: picked, error: pickedError } = await supabase
        .from("user_characters")
        .select("character_slug, constellation")
        .eq("user_id", user.id);

      if (pickedError) {
        setMessage(formatSupabaseError(pickedError));
        setLoading(false);
        return;
      }

      setCharacters(chars ?? []);
      const pickedMap: Record<string, number> = {};
      for (const item of (picked ?? []) as UserCharacter[]) {
        pickedMap[item.character_slug] = item.constellation ?? 0;
      }
      setSelectedBySlug(pickedMap);
      setLoading(false);
    };

    loadData();
  }, []);

  const filteredCharacters = useMemo(() => {
    return characters.filter((character) => {
      const matchesSearch = character.name.toLowerCase().includes(search.toLowerCase());
      const matchesRarity = rarityFilter === "all" || String(character.rarity) === rarityFilter;
      const matchesElement = elementFilter === "all" || getLocalizedElement(character.element) === elementFilter;
      const matchesWeapon = weaponFilter === "all" || getLocalizedWeapon(character.weapon_type) === weaponFilter;

      return matchesSearch && matchesRarity && matchesElement && matchesWeapon;
    });
  }, [characters, search, rarityFilter, elementFilter, weaponFilter]);

  const toggleCharacter = async (slug: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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
      return;
    }

    const { error } = await supabase.from("user_characters").insert({
      user_id: user.id,
      character_slug: slug,
      constellation: 0,
    });

    setSavingSlug(null);

    if (error) {
      setMessage(formatSupabaseError(error));
      return;
    }

    setSelectedBySlug((prev) => ({ ...prev, [slug]: 0 }));
  };

  const updateConstellation = async (slug: string, constellation: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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

  const clearFilters = () => {
    setSearch("");
    setRarityFilter("all");
    setElementFilter("all");
    setWeaponFilter("all");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage("Ви вийшли з акаунта.");
    setSelectedBySlug({});
    setUserEmail("");
  };

  return (
    <main className="min-h-screen px-6 py-10 text-white" style={COLLECTION_BG_STYLE}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-violet-200/80">Genshin Pickban</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Мої персонажі</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
              Обирайте персонажів, які у вас є. Саме ця колекція потім використовується у кімнатах драфту.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            {userEmail && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">{userEmail}</div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link href="/" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15">
                На головну
              </Link>
              {userEmail ? (
                <button
                  onClick={handleLogout}
                  className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/15"
                >
                  Вийти
                </button>
              ) : (
                <Link
                  href="/auth"
                  className="rounded-2xl border border-violet-300/30 bg-violet-400/20 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-400/30"
                >
                  Увійти
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur lg:grid-cols-5">
          <input
            type="text"
            placeholder="Пошук по імені..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
          />

          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
          >
            <option className="bg-slate-900 text-white" value="all">Усі зірки</option>
            <option className="bg-slate-900 text-white" value="5">5★</option>
            <option className="bg-slate-900 text-white" value="4">4★</option>
          </select>

          <select
            value={elementFilter}
            onChange={(e) => setElementFilter(e.target.value)}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
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
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
          >
            <option className="bg-slate-900 text-white" value="all">Уся зброя</option>
            {WEAPONS.map((weapon) => (
              <option className="bg-slate-900 text-white" key={weapon} value={weapon}>
                {weapon}
              </option>
            ))}
          </select>

          <button onClick={clearFilters} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 font-medium hover:bg-white/15">
            Скинути фільтри
          </button>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-white/75">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">Усього персонажів: {characters.length}</div>
          <div className="rounded-2xl border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-violet-100">Наявність: {selectedCount}</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">Показано: {filteredCharacters.length}</div>
        </div>

        {message && <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85">{message}</div>}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">Завантаження персонажів...</div>
        ) : filteredCharacters.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/70">
            {characters.length === 0
              ? "У базі поки немає персонажів або доступ до таблиці обмежений."
              : "Нічого не знайдено. Спробуйте змінити фільтри."}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredCharacters.map((character) => {
              const isSelected = selectedSet.has(character.slug);

              return (
                <div
                  key={character.slug}
                  className={`group rounded-3xl border p-5 text-left shadow-lg transition ${
                    isSelected
                      ? "border-violet-300/50 bg-violet-400/10 ring-1 ring-violet-300/30"
                      : "border-white/10 bg-white/5 hover:bg-white/8"
                  }`}
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
                          <h2 className="truncate text-lg font-semibold md:text-xl">{character.name}</h2>

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

                        <button
                          type="button"
                          onClick={() => void toggleCharacter(character.slug)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            isSelected ? "bg-violet-200 text-slate-950" : "bg-white/10 text-white/70"
                          }`}
                        >
                          {savingSlug === character.slug ? "..." : isSelected ? "Є" : "Немає"}
                        </button>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-white/75">
                        {isSelected ? (
                          <label className="flex items-center justify-between gap-3" data-constellation-control="true">
                            <span className="text-white/80">Консти:</span>
                            <select
                              value={String(selectedBySlug[character.slug] ?? 0)}
                              data-constellation-control="true"
                              onMouseDown={(event) => event.stopPropagation()}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => void updateConstellation(character.slug, Number(event.target.value))}
                              className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-white outline-none"
                            >
                              {Array.from({ length: 7 }, (_, index) => (
                                <option key={index} value={index} className="bg-slate-900 text-white">
                                  C{index}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <span className="text-white/55">Додайте персонажа, щоб обрати консту</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
