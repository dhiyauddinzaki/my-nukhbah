"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReviewRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">Data diperbarui otomatis setiap 15 detik.</p>
      <Button type="button" variant="outline" className="min-h-9 px-3 text-xs" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
        <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
        Perbarui sekarang
      </Button>
    </div>
  );
}
