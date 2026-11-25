import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { APP_CONFIG } from "@/config/constants";
import { getSupabaseConfig } from "@/features/auth/config";
import { LoginForm } from "@/features/auth/login-form";
import { home } from "@/features/auth/permissions";
import { getActiveProfile } from "@/features/auth/session";

export default async function LoginPage() {
  const profile = await getActiveProfile();
  if (profile) redirect(home[profile.role]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl items-center px-4 py-6 sm:p-8">
      <div className="grid w-full overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-slate-950/5 md:grid-cols-[1fr_1.05fr]">
        <section className="mosque-panel relative isolate flex min-h-52 flex-col justify-between gap-8 overflow-hidden px-6 py-7 text-white sm:px-10 md:min-h-[580px] md:py-12">
          <div className="mosque-art -z-10" aria-hidden />
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-white/90 p-1"><Logo /></span>
            <span className="text-lg font-bold">{APP_CONFIG.name}</span>
          </div>
          <div className="max-w-xs">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.19em] text-teal-200">{APP_CONFIG.pesantrenName}</p>
            <p className="text-3xl font-bold leading-tight sm:text-4xl">Mutabaah Yaumiyyah Santri</p>
          </div>
        </section>
        <section className="p-6 sm:p-10 md:p-12">
          <div className="mb-8 flex justify-end"><ThemeToggle /></div>
          <h1 className="text-3xl font-bold tracking-tight">Masuk ke {APP_CONFIG.name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Gunakan akun yang diberikan oleh admin pesantren.</p>
          <LoginForm configured={!!getSupabaseConfig()} />
        </section>
      </div>
    </main>
  );
}
