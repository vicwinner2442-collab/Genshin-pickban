"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AbyssEnemy = {
  name: string;
  icon: string;
  count?: number;
  level: number;
  hp: string;
  hoverTitle: string;
  hoverDescription: string;
};

type AbyssHalf = {
  label: string;
  bonus?: string;
  enemies: AbyssEnemy[];
};

type AbyssChamber = {
  id: string;
  completion: string;
  firstHalf: AbyssHalf;
  secondHalf: AbyssHalf;
};

const ABYSS_NOW: {
  title: string;
  cycle: string;
  floor: string;
  moonBlessingTitle: string;
  moonBlessingText: string;
  stageEffects: {
    firstHalf: string;
    secondHalf: string;
  };
  chambers: AbyssChamber[];
} = {
  title: "Безодня зараз",
  cycle: "2026-05-16 - 2026-06-16",
  floor: "12 поверх",
  moonBlessingTitle: "Місяць, що трощить щити",
  moonBlessingText:
    "Коли персонаж поза полем викликає кріо-реакції на супротивників, на позиції супротивника вивільняється ударна хвиля, завдаючи справжньої шкоди. Цей ефект може спрацьовувати раз на 3,5 секунди.",
  stageEffects: {
    firstHalf: "Шкода елементального скіла персонажа +75%",
    secondHalf: "Всім персонажам +75% піро шкоди",
  },
  chambers: [
    {
      id: "12-1",
      completion: "420/300/180с",
      firstHalf: {
        label: "Перша половина",
        enemies: [
          {
            name: "Гідро Гілічурл Роуг",
            icon: "/abyss/mobs/UI_MonsterIcon_Hilistray_Water.png",
            level: 95,
            hp: "658.291",
            hoverTitle: "Резисти до всього 10%, до гідро 50%",
            hoverDescription: "Нічого особливого, якшо чєсна",
          },
          {
            name: "Грімовий прояв Вайоба",
            icon: "/abyss/mobs/UI_MonsterIcon_Wayob_Bisonsaurus.png",
            level: 95,
            hp: "1.192.502",
            hoverTitle: "Всі резисти 10%, до електро 50%",
            hoverDescription:
              "Розгортає арену та накладає на себе неелементальний щит, який ламається будь-якою шкодою. Також всі персонажі втрачають енергію і не здатні її отримати. Демедж персонажів збільшується на 120%, а шкода персонажів з Нічним Духом збільшується ще на 60%. Якщо не встигнути розбити щит, то Вайоб накладає на себе електро щит. Якщо ж щит розбито, Вайоб генерує 90 частинок енергії і паралізується на 5 секунд.",
          },
          {
            name: "Фантом",
            icon: "/abyss/mobs/UI_MonsterIcon_Necalevia_Normal.png",
            level: 95,
            hp: "2.487.219",
            hoverTitle: "Резисти до всього 10%, до гідро імунітет",
            hoverDescription: "Нічого особливого, якшо чєсна",
          },
        ],
      },
      secondHalf: {
        label: "Друга половина",
        enemies: [
          {
            name: "Мисливець-Шукач",
            icon: "/abyss/mobs/UI_MonsterIcon_ToothTrap.png",
            level: 95,
            hp: "658.291",
            hoverTitle: "Резисти до всього 50%",
            hoverDescription: "Коли накопичує 100 очок якихось адаптивних контрзаходів (він це робить коли персонажі входять в стан ночого духу і підтримують його), то випускає лазер протягом 5 секунд. Під час лазеру і після ще 4 секунди його резисти знижуються на 40%.",
          },
          {
            name: "Пристрій конфігурації (світовий бос)",
            icon: "/abyss/mobs/UI_MonsterIcon_DragonClaw.png",
            level: 95,
            hp: "5.416.573",
            hoverTitle: "Резисти до всього 60%, паралізований -30%",
            hoverDescription: "Пристрій уєбанства короче. Створює 2 колони, на які заберуться тільки дві калєкі. Можна знищити штучки лише в ближньому бою. Тоді він паралізується і можна бити нормально вже.",
          },
        ],
      },
    },
    {
      id: "12-2",
      completion: "420/300/180с",
      firstHalf: {
        label: "Перша половина",
        enemies: [
          {
            name: "Лектор Безодні: Фіолетова Блискавка",
            icon: "/abyss/mobs/UI_MonsterIcon_Invoker_Deacon_Electric_01.png",
            level: 98,
            hp: "574.841",
            hoverTitle: "Всі резисти 10%, електро 50%",
            hoverDescription: "Коли його хп досягає 20% - накладає електро щит. Після того, як щит розбито вмирає (слава богу).",
          },
          {
            name: "Прімо Геовішап",
            icon: "/abyss/mobs/UI_MonsterIcon_Drake_Primo_Rock.png",
            level: 98,
            hp: "3.449.051",
            hoverTitle: "Всі резисти 10%, гео 50%. Під час паралічу всі резисти -50%. Цей стан 5с",
            hoverDescription: "Вибухає елементальною хвилею по великій зоні: 100% ATK як поточний елемент, або 25% під щитом. Ігнорує ухилення. Якщо всю шкоду заблоковано — атака відскакує, бос втрачає HP, паралізується і отримує -50% резистів. Гео або збіг елемента — -15% HP; інший не-гео щит — -5% HP. На 20% HP припиняє цю атаку й переходить в іншу фазу.",
          },
        ],
      },
      secondHalf: {
        label: "Друга половина",
        enemies: [
          {
            name: "Дзеркальна діва",
            icon: "/abyss/mobs/UI_MonsterIcon_Fatuus_Maiden_Water.png",
            level: 98,
            hp: "1.158.763",
            hoverTitle: "Всі резисти 10%, до гідро 50%.",
            hoverDescription: "Падла протівна",
          },
          {
            name: "Самотня Суанні",
            icon: "/abyss/mobs/UI_MonsterIcon_Hermit.png",
            level: 98,
            hp: "3.205.911",
            hoverTitle: "Всі резисти 10%, до гідро 70%",
            hoverDescription: "В якийсь момент перетвопюється на гідро кицьку і отримує плюс 200% резитів до всього. Можна заморозити кріо, а реакції таяння, розбиття, надпровідник, кристалізація чи роздмухування видаляє ауру і паралізує. Ще в одному стані стоврює 3 перлинки духовного вітру, також +200% резистів. Щоб знищти перлини використайте кріо, електро, гідро або піро. Знищення перлин паралізує Суанні. ",
          },
        ],
      },
    },
    {
      id: "12-3",
      completion: "420/300/180с",
      firstHalf: {
        label: "Перша половина",
        enemies: [
          {
            name: "Спостерігач",
            icon: "/abyss/mobs/UI_MonsterIcon_Watcher_Primo_01.png",
            level: 100,
            hp: "5.954.236",
            hoverTitle: "Всі резисти 10%. Під час зірочки 80%.",
            hoverDescription: "Ох бляха.. Короче, під шкалою здоров'я з'являюються кола. Вони заповнюються або піро, або гідро, або електро, або кріо удари. Чим більше наприклад гідро, той цей елемент він запам'ятає. Так два рази. Потім він взлітає догори і генерує дві зірочки тих елементів, які запам'ятав. Якщо не запам'ятав елемент (не встигли коло заповнити) - то він генерує зірку неелементальну. При розбитті зірочок авн отримує демедж якою була та зірочка. Круто, коли водночас розбивається піро і гідро і викливається реакція пару, наносячи купу шкоди. Вроді всьо"
          },
        ],
      },
      secondHalf: {
        label: "Друга половина",
        enemies: [
          {
            name: "Норовлива Герметична Духовна Ораторка",
            icon: "/abyss/mobs/UI_MonsterIcon_TribalWarrior_Udugan.png",
            level: 100,
            hp: "3.535.576",
            hoverTitle: "Всі резисти 10%, паралізований -30%",
            hoverDescription: "Телепортується до центру арени, починає ритуал і генерує Сяюче Відображення, сама стає невидимою. Відображення є кріо тіпіхамі. Оророн і Сітлалі можуть зупинити їх рух, так легше вбивати. Знищення цих відображень повертає тьотю і паралізує її."
          },
        ],
      },
    },
  ],
};

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
      <section className="mx-auto flex w-full max-w-screen-xl flex-col items-center justify-start px-4 pt-10 pb-12 text-center sm:px-6 md:px-8 md:pt-16">
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

      <section className="mx-auto mt-0 w-full max-w-screen-2xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur md:p-8">
          <h2 className="text-2xl font-bold md:text-3xl">Як грати?</h2>

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
            <div className="h-full rounded-2xl border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-violet-200/80">Крок 1</p>
              <h3 className="mt-2 text-lg font-semibold">Відмітьте, хто у вас є</h3>
              <p className="mt-2 text-sm text-white/70">
                На сторінці “Мої персонажі" оберіть персонажів, які у вас є. Воно збережеться і підв'яжеться до акаунту.
              </p>
            </div>

            <div className="h-full rounded-2xl border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-violet-200/80">Крок 2</p>
              <h3 className="mt-2 text-lg font-semibold">Створіть або приєднайтеся до кімнати</h3>
              <p className="mt-2 text-sm text-white/70">
                Один гравець створює кімнату, другий заходить по коду.
              </p>
            </div>

            <div className="h-full rounded-2xl border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-violet-200/80">Крок 3</p>
              <h3 className="mt-2 text-lg font-semibold">Бани і піки</h3>
              <p className="mt-2 text-sm text-white/70">
                В залежності від режимів, ви баните персонажів гравцю/один одному. Після банів обирайте, ким гратимете, і переходьте до безодні!
              </p>
            </div>

            <div className="h-full rounded-2xl border border-white/10 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-violet-200/80">Крок 4</p>
              <h3 className="mt-2 text-lg font-semibold">Налаштування</h3>
              <p className="mt-2 text-sm text-white/70">
                Кімнати можна налаштувати, деякі налаштування залежать від режиму. Можна налаштувати бани від 1 до 4 (в режимі "Два акаунти" - "1 бан на гравця"), таймер (без нього, 1-5 хв на хід). Загалом можна обрати 8 (16) персонажів, к-сть фіксована.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <div className="mb-6 rounded-3xl border border-white/10 bg-slate-900/45 p-6 shadow-xl backdrop-blur md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">{ABYSS_NOW.title}</h2>
              <p className="mt-1 text-sm text-white/60">
                {ABYSS_NOW.floor} · {ABYSS_NOW.cycle}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
              {ABYSS_NOW.moonBlessingTitle}
            </div>
          </div>

          <p className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-white/75">{ABYSS_NOW.moonBlessingText}</p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/80">Ефекти безодні</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-900/35 p-3">
                <p className="text-sm font-semibold">Перша половина</p>
                <p className="mt-1 text-sm text-white/75">{ABYSS_NOW.stageEffects.firstHalf}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/35 p-3">
                <p className="text-sm font-semibold">Друга половина</p>
                <p className="mt-1 text-sm text-white/75">{ABYSS_NOW.stageEffects.secondHalf}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="p-0">
              <p className="text-lg font-semibold text-white md:text-xl">Перша половина</p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ABYSS_NOW.chambers.map((chamber) => (
                  <article key={`${chamber.id}-first`} className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-normal">Зала {chamber.id}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {chamber.firstHalf.enemies.map((enemy) => (
                        <div key={`${chamber.id}-first-${enemy.name}`} className="group relative">
                          <div className="relative flex h-[170px] w-full min-w-0 flex-col items-center rounded-2xl border border-white/15 bg-slate-900/55 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            {enemy.count ? (
                              <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white/80">
                                x{enemy.count}
                              </span>
                            ) : null}
                            <div className="mx-auto h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                              <img src={enemy.icon} alt={enemy.name} className="h-full w-full object-cover" />
                            </div>
                            <p
                              className="mt-2 h-8 max-w-full overflow-hidden text-xs font-semibold leading-tight"
                              style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
                            >
                              {enemy.name}
                            </p>
                            <p className="mt-1 text-[0.68rem] text-white/80">Lv.{enemy.level}</p>
                            <div className="mt-1 flex max-w-full flex-wrap items-center justify-center gap-2 text-xs text-white/70">
                              <span>HP {enemy.hp}</span>
                            </div>
                          </div>

                          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-40 hidden max-h-[min(70vh,620px)] w-[min(92vw,520px)] -translate-x-1/2 overflow-y-auto rounded-xl border border-white/10 bg-[#09122b]/95 p-4 text-left shadow-2xl group-hover:block">
                            <p className="text-xs font-semibold">{enemy.name}</p>
                            <p className="mt-1 text-[11px] text-white/70">
                              Lv. {enemy.level} · HP: {enemy.hp}
                              {enemy.count ? ` · Кількість: ${enemy.count}` : ""}
                            </p>
                            <p className="mt-2 text-[11px] font-semibold text-cyan-100/85">{enemy.hoverTitle}</p>
                            <p className="mt-1 text-xs leading-6 text-white/75">{enemy.hoverDescription}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="p-0">
              <p className="text-lg font-semibold text-white md:text-xl">Друга половина</p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ABYSS_NOW.chambers.map((chamber) => (
                  <article key={`${chamber.id}-second`} className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-normal">Зала {chamber.id}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {chamber.secondHalf.enemies.map((enemy) => (
                        <div key={`${chamber.id}-second-${enemy.name}`} className="group relative">
                          <div className="relative flex h-[170px] w-full min-w-0 flex-col items-center rounded-2xl border border-white/15 bg-slate-900/55 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            {enemy.count ? (
                              <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white/80">
                                x{enemy.count}
                              </span>
                            ) : null}
                            <div className="mx-auto h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                              <img src={enemy.icon} alt={enemy.name} className="h-full w-full object-cover" />
                            </div>
                            <p
                              className="mt-2 h-8 max-w-full overflow-hidden text-xs font-semibold leading-tight"
                              style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
                            >
                              {enemy.name}
                            </p>
                            <p className="mt-1 text-[0.68rem] text-white/80">Lv.{enemy.level}</p>
                            <div className="mt-1 flex max-w-full flex-wrap items-center justify-center gap-2 text-xs text-white/70">
                              <span>HP {enemy.hp}</span>
                            </div>
                          </div>

                          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-40 hidden max-h-[min(70vh,620px)] w-[min(92vw,520px)] -translate-x-1/2 overflow-y-auto rounded-xl border border-white/10 bg-[#09122b]/95 p-4 text-left shadow-2xl group-hover:block">
                            <p className="text-xs font-semibold">{enemy.name}</p>
                            <p className="mt-1 text-[11px] text-white/70">
                              Lv. {enemy.level} · HP: {enemy.hp}
                              {enemy.count ? ` · Кількість: ${enemy.count}` : ""}
                            </p>
                            <p className="mt-2 text-[11px] font-semibold text-cyan-100/85">{enemy.hoverTitle}</p>
                            <p className="mt-1 text-xs leading-6 text-white/75">{enemy.hoverDescription}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
