"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updatePassword, type AuthActionState } from "./actions";

const initialState: AuthActionState = { ok: false, message: "" };
const inputClass = "h-11 rounded-xl border border-border bg-background px-3 text-sm";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="grid gap-1 text-sm font-semibold">
        Kata sandi baru
        <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={256} required className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Ulangi kata sandi baru
        <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={256} required className={inputClass} />
      </label>
      {state.message && <p role={state.ok ? "status" : "alert"} className="text-sm text-red-700 dark:text-red-300">{state.message}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Menyimpan…" : "Simpan kata sandi baru"}
      </Button>
    </form>
  );
}
