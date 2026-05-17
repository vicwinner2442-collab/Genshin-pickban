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
    "Поки активний персонаж захищений щитом, його атаки по ворогах викликають ударну хвилю у ворога, що завдає справжню шкоду. Спрацьовує раз на 3с.",
  stageEffects: {
    firstHalf: "Всі члени загону отримують +75% піро шкоди",
    secondHalf: "Шкода від місячного цвітіння збільшується на 75%",
  },
  chambers: [
    {
      id: "12-1",
      completion: "420/300/180с",
      firstHalf: {
        label: "Перша половина",
        enemies: [
          {
            name: "Суперважкий Сухопутний Ровер: Механізована Фортеця",
            icon: "/abyss/mobs/UI_MonsterIcon_Fatuimecha_AMP.png",
            level: 95,
            hp: "3.747.864",
            hoverTitle: "Всі резисти 150%, після зняття щита -20%",
            hoverDescription:
              "Має унікальну Шкалу Люті з максимумом 600 очок. При атаці Піро шкала зростає на 5 очок +5 за кожну одиницю Піро-шкали. При 50% заповнення шкали починає перегрів (пластини червоніють) і зменшує всі резисти на 100%. Після повного заповнення шкали він згенерує Кріо щит , який забезпечує імунітет до шкоди, і спробує охолонути за допомогою своєї гармати. Шкала Люті потім не з'являтеметься протягом наступних 18 секунд ",
          },
        ],
      },
      secondHalf: {
        label: "Друга половина",
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
            name: "Володар Прихованих Глибин: Шепітник Кошмарів",
            icon: "/abyss/mobs/UI_MonsterIcon_Lloigor_Primo.png",
            level: 95,
            hp: "5.416.573",
            hoverTitle: "Резисти до всього 10%, паралізований -60%",
            hoverDescription: "Реве, телепортується в центр, отримує Глибокотемний Щит (45% макс. HP) і кличе 4 Рибалок. Кожен убитий знімає 25% щита (усі — зносять повністю). Щит б’ється лише Елементальною шкодою (Місячні реакції ×300%). Якщо за ~18с не зламати — поглинає Рибалок і б’є по всій арені (200% ATK як Електро). Якщо зламати вчасно — шкода 20% макс. HP як фізична, -70% резистів, параліч 10 с, Рибалки вмирають.",
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
            name: "Фатуї Маг Електро Цицин",
            icon: "/abyss/mobs/UI_MonsterIcon_Fatuus_Summoner_01.png",
            level: 98,
            hp: "574.841",
            hoverTitle: "Всі резисти 10%, електро 50%",
            hoverDescription: "Нічого особливого, якшо чєсна",
          },
                    {
            name: "Руїн Дрейк: Земляний страж",
            icon: "/abyss/mobs/UI_MonsterIcon_Gargoyle.png",
            level: 98,
            hp: "621.528",
            hoverTitle: "Всі резисти 10%",
            hoverDescription: "Нічого особливого, якшо чєсна",
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
            name: "Загартований у битвах заземлений геогриб",
            icon: "/abyss/mobs/UI_MonsterIcon_Fungus_Amanita_Du_Udatta_Rock_Elite.png",
            level: 98,
            hp: "4.542.352",
            hoverTitle: "Всі резисти 130%, окрім дендро і гео (150%). Під час паралічу всі резисти -120%.",
            hoverDescription: "Одразу входить у стан “Підпалений” із шкалою Люті (до 300), що заповнюється Дендро шкодою (15 за кожну одиницю, 10 за 0U). При заповненні стає оглушеним на 16с і шкала спадає на 13с назад у “Підпалений”, додатковий Дендро сповільнює спад, Піро повністю обнуляє. Стани змінюються без обмежень: у “Підпаленому” — використовує снаряди/замах/ривок/удар головою, у звичайному — рев і удар ногою, в активованому — грибний залп.",
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
            name: "Гексадекатонічна загартована в боях мандрагора",
            icon: "/abyss/mobs/UI_MonsterIcon_Mandragora_Elite.png",
            level: 100,
            hp: "3.549.441",
            hoverTitle: "Всі резисти 80%, окрім дендро (205%). Під час знедоленого стану - 10% до всього і 135% до дендро",
            hoverDescription: "Під час початку бою або після “Квіткового вибуху спор” Мандрагора отримує повну шкалу Люті (спадає за 35 с). Піро й Електро скорочують час спадання 1с, 0U удари — 0,15. Коли шкала порожня — використовує “Квітковий вибух спор” (але не може при <4% HP і тоді не отримує шкалу). Виконує “танець”, заривається в землю, створює “Міні-мандрагор” (по 2% HP, до 10 шт) і знову отримує повну шкалу Люті (17 с). Коли шкала закінчується — мініки зливаються назад. Якщо злилось ≤2 або всіх мініків вбито до цього — Мандрагора падає, паралізується на 6 с і входить у знедолений стан до наступного “Квіткового вибуху спор”.",
          },
        ],
      },
      secondHalf: {
        label: "Друга половина",
        enemies: [
          {
            name: "Страж Руїн",
            icon: "/abyss/mobs/UI_MonsterIcon_Defender_Noner_01.png",
            level: 100,
            hp: "965 084",
            hoverTitle: "Всі резисти 10%",
            hoverDescription: "Нічого особливого, якшо чєсна",
          },
          {
            name: "Побитий у боях кам’яний краб",
            icon: "/abyss/mobs/UI_MonsterIcon_HermitCrab_Mature_Elite.png",
            level: 100,
            hp: "4.025.383",
            hoverTitle: "Щит 210% резистів, паралізований -30%, звичайний стан 10%, якщо не знищити щит - 80%.",
            hoverDescription: "Летить у центр арени й створює щит, одночасно запускаючи нові насіння по три в візерунку. Якщо не перервати — заряджає атаку, яка підриває всі насіння (по 100% ATK як Гідро), і виходить з захищеного стану з підвищеними всіма резистами 80%. Щоб зламати щит і збити заряд, треба реакціями “Цвітіння” вдарити краба сумарно 6 насіннями. Тоді він виходить із заряджання і стає оглушеним на 5с",
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

          <div className="mt-4 rounded-2xl border border-violet-200/15 bg-violet-950/15 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/90">Ефекти безодні</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-violet-200/15 bg-violet-950/25 p-3">
                <p className="text-sm font-semibold">Перша половина</p>
                <p className="mt-1 text-sm text-white/75">{ABYSS_NOW.stageEffects.firstHalf}</p>
              </div>
              <div className="rounded-xl border border-violet-200/15 bg-violet-950/25 p-3">
                <p className="text-sm font-semibold">Друга половина</p>
                <p className="mt-1 text-sm text-white/75">{ABYSS_NOW.stageEffects.secondHalf}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="p-0">
              <p className="text-lg font-semibold text-violet-100 md:text-xl">Перша половина</p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ABYSS_NOW.chambers.map((chamber) => (
                  <article key={`${chamber.id}-first`} className="rounded-2xl border border-violet-200/15 bg-violet-950/15 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-normal">Зала {chamber.id}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {chamber.firstHalf.enemies.map((enemy) => (
                        <div key={`${chamber.id}-first-${enemy.name}`} className="group relative">
                          <div className="relative flex h-[170px] w-full min-w-0 flex-col items-center rounded-2xl border border-violet-200/20 bg-violet-950/35 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            {enemy.count ? (
                              <span className="absolute right-2 top-2 rounded-full border border-violet-300/25 bg-violet-400/15 px-1.5 py-0.5 text-[10px] font-medium leading-none text-violet-100">
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
                            <p className="mt-2 text-[11px] font-semibold text-violet-200">{enemy.hoverTitle}</p>
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
              <p className="text-lg font-semibold text-violet-100 md:text-xl">Друга половина</p>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ABYSS_NOW.chambers.map((chamber) => (
                  <article key={`${chamber.id}-second`} className="rounded-2xl border border-violet-200/15 bg-violet-950/15 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-normal">Зала {chamber.id}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {chamber.secondHalf.enemies.map((enemy) => (
                        <div key={`${chamber.id}-second-${enemy.name}`} className="group relative">
                          <div className="relative flex h-[170px] w-full min-w-0 flex-col items-center rounded-2xl border border-violet-200/20 bg-violet-950/35 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            {enemy.count ? (
                              <span className="absolute right-2 top-2 rounded-full border border-violet-300/25 bg-violet-400/15 px-1.5 py-0.5 text-[10px] font-medium leading-none text-violet-100">
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
                            <p className="mt-2 text-[11px] font-semibold text-violet-200">{enemy.hoverTitle}</p>
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
