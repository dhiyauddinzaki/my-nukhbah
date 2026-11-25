"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <h1 className="text-2xl font-bold">Halaman belum dapat dimuat</h1>
      <p className="mt-3 text-sm text-muted-foreground">Coba lagi. Jika masalah berlanjut, hubungi admin pesantren.</p>
      <Button className="mt-5" onClick={reset}>Coba lagi</Button>
    </main>
  );
}
