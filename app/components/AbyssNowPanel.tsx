import { ABYSS_NOW } from "../../lib/abyss-now";

type AbyssNowPanelProps = {
  className?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
};

export function AbyssNowPanel({ className = "", defaultOpen = true, collapsible = false }: AbyssNowPanelProps) {
  const content = (
    <>
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
        <AbyssHalfGrid title="Перша половина" half="firstHalf" />
        <AbyssHalfGrid title="Друга половина" half="secondHalf" />
      </div>
    </>
  );

  if (collapsible) {
    return (
      <details className={`rounded-3xl border border-white/10 bg-slate-900/45 p-5 shadow-xl backdrop-blur md:p-6 ${className}`} open={defaultOpen}>
        <summary className="cursor-pointer list-none text-lg font-semibold text-white md:text-xl">
          {ABYSS_NOW.title} · {ABYSS_NOW.floor}
          <span className="ml-2 text-sm font-normal text-white/55">{ABYSS_NOW.cycle}</span>
        </summary>
        <div className="mt-5">{content}</div>
      </details>
    );
  }

  return <div className={`rounded-3xl border border-white/10 bg-slate-900/45 p-6 shadow-xl backdrop-blur md:p-8 ${className}`}>{content}</div>;
}

function AbyssHalfGrid({ title, half }: { title: string; half: "firstHalf" | "secondHalf" }) {
  return (
    <div className="p-0">
      <p className="text-lg font-semibold text-white md:text-xl">{title}</p>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ABYSS_NOW.chambers.map((chamber) => (
          <article key={`${chamber.id}-${half}`} className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-normal">Зала {chamber.id}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {chamber[half].enemies.map((enemy) => (
                <div key={`${chamber.id}-${half}-${enemy.name}`} className="group relative">
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
  );
}
