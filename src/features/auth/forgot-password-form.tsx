"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, type AuthActionState } from "./actions";

const initialState: AuthActionState = { ok: false, message: "" };

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="mt-5 space-y-3 rounded-xl border border-border p-4">
      <label htmlFor="reset-email" className="grid gap-1 text-sm font-semibold">
        Email untuk tautan reset
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
        />
      </label>
      <Button type="submit" variant="outline" className="w-full" disabled={!configured || pending}>
        {pending ? "Mengirim tautan…" : "Kirim tautan reset"}
      </Button>
      {state.message && <p role={state.ok ? "status" : "alert"} className="text-sm text-muted-foreground">{state.message}</p>}
    </form>
  );
}
