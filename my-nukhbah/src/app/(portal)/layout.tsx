import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { PortalNav } from "@/components/portal-nav";
import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { signOut } from "@/features/auth/actions";
import { roleLabel } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      <aside className="md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-10 md:border-r md:border-border md:bg-card md:p-5">
        <div className="hidden items-center gap-3 md:flex"><Logo /><span className="font-bold">{APP_CONFIG.name}</span></div>
        <PortalNav role={profile.role} />
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="md:hidden"><Logo size={34} /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{profile.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel[profile.role]}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <ThemeToggle />
            <form action={signOut}>
              <Button variant="outline" type="submit" aria-label="Keluar" className="w-11 px-0">
                <LogOut className="size-4" aria-hidden />
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pt-5 pb-24 sm:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
