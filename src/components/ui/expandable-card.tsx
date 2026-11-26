"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

export function ExpandableCard({
  icon: Icon,
  title,
  subtitle,
  children,
  tone = "amber",
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
  tone?: "amber" | "teal";
}) {
  const [open, setOpen] = useState(false);
  const tones = tone === "amber"
    ? "border-l-4 border-l-amber-500 bg-amber-500/5"
    : "border-l-4 border-l-teal-500 bg-teal-500/5";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className={`flex items-center justify-between gap-3 p-4 sm:px-5 ${tones}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-bold">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        >
          {open ? "Tutup" : "Isi"}
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>
      {open && <div className="animate-in fade-in slide-in-from-top-1 border-t border-border p-4 sm:p-5">{children}</div>}
    </section>
  );
}
