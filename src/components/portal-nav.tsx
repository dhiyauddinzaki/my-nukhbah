"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ChartNoAxesColumn, House, LayoutDashboard, NotebookText } from "lucide-react";
import { canAccess, sections, type AppRole, type Section } from "@/features/auth/permissions";
import { cn } from "@/lib/utils";

const icons = {
  admin: LayoutDashboard,
  asrama: House,
  pembinaan: BookOpen,
  portfolio: NotebookText,
  kalender: CalendarDays,
  "rekap-admin": ChartNoAxesColumn,
};

export function PortalNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const items = (Object.keys(sections) as Section[]).filter((item) => canAccess(role, item));
  return (
    <nav aria-label="Menu utama" className="fixed inset-x-0 bottom-0 z-20 flex gap-1 overflow-x-auto border-t border-border bg-card px-2 pt-1 pb-[max(.25rem,env(safe-area-inset-bottom))] md:static md:flex-col md:overflow-visible md:border-0 md:p-0">
      {items.map((item) => {
        const href = `/${item}`;
        const active = pathname === href || pathname.startsWith(href + "/");
        const Icon = icons[item];
        return (
          <Link key={item} href={href} aria-current={active ? "page" : undefined}
            className={cn("flex min-h-12 min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-center text-[10px] font-semibold leading-tight md:flex-row md:justify-start md:gap-3 md:px-3 md:text-sm", active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted")}>
            <Icon className="size-[18px] shrink-0" aria-hidden />{sections[item].label}
          </Link>
        );
      })}
    </nav>
  );
}
