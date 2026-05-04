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
  cycle: "2026-04-16 - 2026-05-16",
  floor: "12 поверх",
  moonBlessingTitle: "Благословення місяця",
  moonBlessingText:
    "Коли активується гармонія місяця, спрацьовує ударна хвиля й завдає справжню шкоду противникам. Ефект може спрацювати раз на 4с.",
  stageEffects: {
    firstHalf: "Шкода місячної-кристалізації +75%",
    secondHalf: "Шкода нормальних та заряджених атак +75%",
  },
  chambers: [
    {
      id: "12-1",
      completion: "420/300/180с",
      firstHalf: {
        label: "Перша половина",
        enemies: [
          {
            name: "Преторіанський Голем",
            icon: "/abyss/mobs/UI_MonsterIcon_Golem_Legion.png",
            level: 95,
            hp: "681,430",
            hoverTitle: "Всі резисти 10%, під час щиту 60%",
            hoverDescription:
              "Преторіанський Голем захищений гео щитом, який збільшує його резисти проти всіх типів шкоди на 50%. Знищування щита найефективніше фіз/гео атаками. Якщо щит знищено, Преторіанський Голем буде паралізований приблизно на 8 секунд, перш ніж відновить свій щит.",
          },
        ],
      },
      secondHalf: {
        label: "Друга половина",
        enemies: [
          {
            name: "Похмурий Мімезис",
            icon: "/abyss/mobs/UI_MonsterIcon_TheAbyss_Rhizome.png",
            level: 95,
            hp: "579.215",
            hoverTitle: "Резисти до всього 10%",
            hoverDescription: "Вступаючи в бій, приймає форму Тепетлізавра-воїна: Уламкового Страйкера. Має щитом порожнечі, який надає імунітет. Щит матиме міцність 40, яка зменшиться на 1 при враженні елементальною атакою або на 3 при враженні атакою з нічним духом. Коли щит зруйновано, Похмурий Міміфлора ненадовго паралізованим, але через деякий час знову трансформується. При другому і третьому створенні щиту порожнечі міцність щита зменшиться до 20 та 8 відповідно.",
          },
          {
            name: "Похмурий мімезис",
            icon: "/abyss/mobs/UI_MonsterIcon_TheAbyss_Rhizome.png",
            level: 95,
            hp: "749.572",
            hoverTitle: "Резисти до всього 10%",
            hoverDescription: "Вступаючи в бій, приймає форму Анемо Хілічурла-розбійника. Має щит порожнечі, який надає імунітет. Щит матиме міцність 70, яка зменшиться на 1 при враженні елементальною атакою або на 3 при враженні атакою з нічним духом. Коли щит зруйновано, Похмурий Міміфлора буде ненадовго паралізованим, але через деякий час знову трансформується. При другому і третьому створенні щиту порожнечі міцність щита зменшиться до 35 та 14 відповідно.",
          },
          {
            name: "Похмурий Мімезис",
            icon: "/abyss/mobs/UI_MonsterIcon_TheAbyss_Rhizome.png",
            level: 95,
            hp: "817.715",
            hoverTitle: "Резисти до всього 10%",
            hoverDescription: "Вступаючи в бій, приймає форму Автомата Таємного Джерела: Мисливця-Шукача. Має щит порожнечі, який надає імунітет. Щит матиме міцність 105, яка зменшиться на 1 при враженні елементальною атакою або на 3 при враженні атакою з нічним духом. Коли щит зруйновано, Похмурий Міміфлора буде ненадовго паралізованим, але через деякий час знову трансформується. При другому і третьому створенні щиту порожнечі міцність щита зменшиться до  53 та 21 відповідно.",
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
            name: "Дикий мисливець",
            icon: "/abyss/mobs/UI_MonsterIcon_WildHunt_Elite.png",
            count: 2,
            level: 98,
            hp: "2.008.523",
            hoverTitle: "Всі резисти 10%",
            hoverDescription: "Дикий Мисливець після втрати всього HP не помирає, а переходить у стан «Вражений горем» (або може ввійти в нього раніше через Місячний знак: Сяйво піднесення), де весь отриманий урон зменшує його максимальне HP (65% або 90% при активному ефекті), і коли максимальне HP падає до 0 — він помирає; при звичайному вході (після 0 HP) він одразу втрачає частину максимального HP, нічого не робить і через 10 секунд повністю відновлює HP до нового максимуму, а при ранньому вході продовжує битися, але весь урон одночасно зменшує і поточне, і максимальне HP, причому цей стан можна викликати кілька разів підряд.",
          },
        ],
      },
      secondHalf: {
        label: "Друга половина",
        enemies: [
          {
            name: "Квіткова ринг-танцівнця відлюдничка",
            icon: "/abyss/mobs/UI_MonsterIcon_Eremite_Female_Standard_Dancer.png",
            level: 98,
            hp: "965.636",
            hoverTitle: "Резисти до фіз.шкоди -30% в усіх станах, до всього іншого 10%. При посиленому стані резисти 60%. Після стану -50% до дендро ",
            hoverDescription: "На початку бою вона входить у посилений стан, викликаючи Духа знамення: Дендро змія-духа для допомоги в бою, отримуючи підвищенні резисти і високу стійкість до переривання. Коли цей змій гине, стан завершується, вона отримує чисту дендро-шкоду в розмірі 37,5% від свого поточного HP, після чого оглушується на 10 секунд і має знижений дендро-резист, причому увійти в цей посилений стан вона може лише один раз.",
          },
          {
            name: "Тварь неземена",
            icon: "/abyss/mobs/UI_MonsterIcon_Samurai_Ningyo.png",
            level: 96,
            hp: "2.299.367",
            hoverTitle: "Резисти до всього 10%",
            hoverDescription: "Просто гіршого боса годі й шукати. Не буду нічого тут писати, ви і самі все про нього знаєте. Поки встає цей дід проклятий, він шкоди не отримує. А встає він годин 10.",
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
            name: "Сяючий Мунгекко",
            icon: "/abyss/mobs/UI_MonsterIcon_Magbeast_Gecko.png",
            level: 100,
            hp: "1,120,000",
            hoverTitle: "Під час кокону всі резисти 10%, окрім гео (70%). Під час звичайного стану всі резисти 10%",
            hoverDescription: "Телепортується в центр, створює Якір місячного каменю, купол і дві свої копії. Купол має багатошаровий бар’єр із 9 сегментів, а якір найслабший до фіз і гео шкоди. При знищенні 3-го і 6-го сегментів бос отримує шкоду по 6% від свого макс. HP, при повному руйнуванні бар’єра — 18% і оглушується приблизно на 7 секунд. Якщо ж бар’єр не зламати за 25 секунд, Місячний гекон зникає, перевантажує якір і викликає вибух, що завдає 200% ATK гео-шкоди по полю боя. Після цього випускає вибух куувакі, знімаючи всім поруч HP у розмірі 10% від макс. HP + 1800 та накладаючи сяйливий кокон. Цей кокон знижує шанс криту на 100%, шкоду на 50% і отримуване лікування на 40%, але коли персонажа відхилюють до 100% HP, ефект зникає й дає «Розплутаність» (+15% криту і +50% шкоди на 15 с). У цей момент Місячний гекон на секунду хитається і отримує -60% гео резистів.",
          },
        ],
      },
      secondHalf: {
        label: "Друга половина",
        enemies: [
          {
            name: "Тенеброзна папіла: Тип II",
            icon: "/abyss/mobs/UI_MonsterIcon_TheAbyss_Dendrite.png",
            level: 100,
            hp: "3.327.601",
            hoverTitle: "Тип II: Магу Кенкі, Прімо Геовішап, електро, кріо і гідро гіпостазиси. Резисти залежать від станів. (читати нижче)",
            hoverDescription: "Одразу в центрі арени накладає щит порожнечі, міцністю 72. Стихійна навичка зменшує міцність щита на 1, а атаки з нічним духом - на 3. Якщо щит не зруйновано, Папіла випускає вибух, завдаючи 300% АТК як фіз шкоду. Знищення щита паралізує її і резисти зменшуються до 0%. Після цієї паралізації резисти збільшуються на 35% до всього.",
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
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/90">Ефекти безодні</p>
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

          <div className="mt-5 grid gap-4">
            {ABYSS_NOW.chambers.map((chamber) => (
              <article key={chamber.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">Зала {chamber.id}</h3>
                  <p className="text-sm text-white/60">{chamber.completion}</p>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[chamber.firstHalf, chamber.secondHalf].map((half) => (
                    <div key={half.label} className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                      <p className="text-sm font-semibold">{half.label}</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                        {half.enemies.map((enemy) => (
                          <div key={`${chamber.id}-${half.label}-${enemy.name}`} className="group relative">
                            <div className="flex h-[190px] w-full min-w-0 flex-col rounded-2xl border border-white/15 bg-slate-900/55 p-3 text-center">
                              <div className="mx-auto h-18 w-18 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                                <img src={enemy.icon} alt={enemy.name} className="h-full w-full object-cover" />
                              </div>
                              <p className="mt-auto min-h-[20px] text-sm font-semibold leading-tight">{enemy.name}</p>
                              <p className="mt-auto text-xs text-white/80">Lv.{enemy.level}</p>
                              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-white/70">
                                <span>HP {enemy.hp}</span>
                                {enemy.count ? (
                                  <span className="rounded-full border border-violet-300/25 bg-violet-400/15 px-2 py-0.5 font-semibold text-violet-100">
                                    x{enemy.count}
                                  </span>
                                ) : null}
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
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

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
