"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ViewportTooltip({ children, content }: { children: ReactNode; content: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  function cancelClose() {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
  }

  function show() {
    cancelClose();
    setOpen(true);
  }

  function hideSoon() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  useLayoutEffect(() => {
    if (!open) return;

    function position() {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;

      const viewport = window.visualViewport;
      const margin = 12;
      const gap = 10;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const leftEdge = viewportLeft + margin;
      const topEdge = viewportTop + margin;
      const rightEdge = viewportLeft + viewportWidth - margin;
      const bottomEdge = viewportTop + viewportHeight - margin;
      const anchor = trigger.getBoundingClientRect();

      tooltip.style.width = `${Math.max(1, Math.min(520, viewportWidth - margin * 2))}px`;
      tooltip.style.maxHeight = `${Math.max(1, viewportHeight - margin * 2)}px`;
      const naturalHeight = tooltip.scrollHeight + tooltip.offsetHeight - tooltip.clientHeight;
      const above = Math.max(0, anchor.top - gap - topEdge);
      const below = Math.max(0, bottomEdge - anchor.bottom - gap);
      const useAbove = naturalHeight <= above || above >= below;
      const availableHeight = useAbove ? above : below;
      tooltip.style.maxHeight = `${Math.max(1, Math.min(620, availableHeight, viewportHeight - margin * 2))}px`;

      const { width, height } = tooltip.getBoundingClientRect();
      const left = Math.max(leftEdge, Math.min(anchor.left + anchor.width / 2 - width / 2, rightEdge - width));
      const top = Math.max(topEdge, Math.min(useAbove ? anchor.top - gap - height : anchor.bottom + gap, bottomEdge - height));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.style.visibility = "visible";
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    position();
    const observer = new ResizeObserver(position);
    if (triggerRef.current) observer.observe(triggerRef.current);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.addEventListener("keydown", onKeyDown);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      cancelClose();
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("keydown", onKeyDown);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open]);

  return (
    <div
      ref={triggerRef}
      tabIndex={0}
      aria-describedby={open ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onFocus={show}
      onBlur={hideSoon}
      className="relative min-w-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
    >
      {children}
      {open && createPortal(
        <div
          ref={tooltipRef}
          id={id}
          role="tooltip"
          onMouseEnter={cancelClose}
          onMouseLeave={hideSoon}
          className="fixed z-[100] overflow-y-auto overscroll-contain break-words rounded-xl border border-white/10 bg-[#09122b] p-4 text-left text-white shadow-2xl"
          style={{ visibility: "hidden" }}
        >
          {content}
        </div>,
        document.body,
      )}
    </div>
  );
}
