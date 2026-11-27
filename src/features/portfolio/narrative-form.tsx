"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { savePortfolioNarrative, type PortfolioActionState } from "./actions";

const initialState: PortfolioActionState = { ok: false, message: "" };
const inputClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

export function NarrativeForm({
  studentId,
  month,
  strengths,
  growthAreas,
  recommendation,
  openingNote,
  developmentNote,
}: {
  studentId: string;
  month: string;
  strengths: string;
  growthAreas: string;
  recommendation: string;
  openingNote: string;
  developmentNote: string;
}) {
  const [state, formAction, pending] = useActionState(savePortfolioNarrative, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="month" value={month} />
      <label className="grid gap-1 text-sm font-semibold">
        Kalimat pembuka portfolio
        <textarea name="openingNote" defaultValue={openingNote} maxLength={1500} rows={2} className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Hal yang berkembang baik
        <textarea name="strengths" defaultValue={strengths} maxLength={1500} rows={3} className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Area yang perlu dikuatkan
        <textarea name="growthAreas" defaultValue={growthAreas} maxLength={1500} rows={3} className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Catatan dan arahan untuk bulan berikutnya
        <textarea name="recommendation" defaultValue={recommendation} maxLength={1500} rows={3} className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Catatan perkembangan tambahan
        <textarea name="developmentNote" defaultValue={developmentNote} maxLength={1500} rows={3} className={inputClass} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan narasi"}</Button>
        {state.message && <p role={state.ok ? "status" : "alert"} className="text-sm text-muted-foreground">{state.message}</p>}
      </div>
    </form>
  );
}
