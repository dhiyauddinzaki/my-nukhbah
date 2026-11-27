"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { uploadPortfolioMedia, type PortfolioMediaState } from "./media-actions";

const initialState: PortfolioMediaState = { ok: false, message: "" };

export function PortfolioMediaForm({
  kind,
  targetId,
  label,
}: {
  kind: "studentPortrait" | "profileSignature";
  targetId: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(uploadPortfolioMedia, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="targetId" value={targetId} />
      <label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold">
        {label}
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="min-h-10 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs"
        />
      </label>
      <Button type="submit" variant="outline" disabled={pending} className="min-h-10 px-3 text-xs">
        {pending ? "Mengunggah…" : "Simpan"}
      </Button>
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className="w-full text-xs text-muted-foreground">{state.message}</p>
      )}
    </form>
  );
}
