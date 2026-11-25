"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveMasterData } from "./actions";

export function MasterForm({ children, label = "Simpan", resetOnSuccess = false }: {
  children: React.ReactNode;
  label?: string;
  resetOnSuccess?: boolean;
}) {
  const [result, setResult] = useState<{ ok: boolean; message: string }>();
  const [pending, startTransition] = useTransition();

  return (
    <form className="space-y-3" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      startTransition(async () => {
        setResult(undefined);
        try {
          const next = await saveMasterData(data);
          if (next.ok && resetOnSuccess) form.reset();
          setResult(next);
        } catch {
          setResult({ ok: false, message: "Sambungan terputus. Muat ulang sebelum mencoba kembali." });
        }
      });
    }}>
      <fieldset className="grid gap-3 sm:grid-cols-2" disabled={pending}>
        {children}
      </fieldset>
      <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : label}</Button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-red-700 dark:text-red-300"}>
          {result.message}
        </p>
      )}
    </form>
  );
}
