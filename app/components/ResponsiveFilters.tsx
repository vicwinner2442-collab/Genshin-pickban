"use client";

import { useId, useState, type ReactNode } from "react";

export function ResponsiveFilters({ search, children, active, className, searchClassName = "" }: {
  search: ReactNode;
  children: ReactNode;
  active: boolean;
  className: string;
  searchClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 ${className}`}>
      <div className={`min-w-0 [&>input]:w-full ${searchClassName}`}>{search}</div>
      <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((value) => !value)} className={`min-h-11 rounded-xl border px-3 text-sm font-medium transition lg:hidden ${active ? "border-violet-300/50 bg-violet-400/20 text-violet-100" : "border-white/15 bg-white/10 text-white/80 hover:bg-white/15"}`}>
        Фільтри{active ? " •" : ""}
      </button>
      <div id={id} className={`${expanded ? "grid" : "hidden"} col-span-2 grid-cols-2 gap-2 lg:contents`}>
        {children}
      </div>
    </div>
  );
}
