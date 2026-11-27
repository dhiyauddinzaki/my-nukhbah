import { Logo } from "@/components/logo";
import { APP_CONFIG } from "@/config/constants";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-9">
        <div className="mb-6 flex items-center gap-3">
          <Logo />
          <span className="font-bold">{APP_CONFIG.name}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Buat kata sandi baru</h1>
        <p className="mt-2 text-sm text-muted-foreground">Gunakan minimal 8 karakter dan jangan bagikan kata sandi Anda.</p>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
