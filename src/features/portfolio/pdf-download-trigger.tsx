"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { PortfolioPdfData } from "./pdf-download";

const PortfolioPdfDownload = dynamic(
  () => import("./pdf-download").then((module) => module.PortfolioPdfDownload),
  { ssr: false, loading: () => <span className="text-sm text-muted-foreground">Menyiapkan PDF…</span> },
);

export function PortfolioPdfDownloadTrigger({ data }: { data: PortfolioPdfData }) {
  const [open, setOpen] = useState(false);
  if (open) return <PortfolioPdfDownload data={data} />;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold shadow-sm hover:bg-muted"
    >
      Siapkan PDF
    </button>
  );
}
