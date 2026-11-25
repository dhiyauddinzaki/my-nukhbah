import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveSemester, semesterLabel } from "@/features/academic/period";
import { APP_CONFIG } from "@/config/constants";
import { canAccess, sections, type Section } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";

const plannedContent: Record<Section, string[]> = {
  admin: ["Ringkasan operasional"],
  asrama: ["Rekap kegiatan per kamar"],
  pembinaan: ["Jurnal Al-Quran", "Tahfizh Intensif dan Tahsin UMMI", "Reward, pelanggaran, dan Mutamayyizun"],
  portfolio: ["Catatan perkembangan bulanan", "Unduh portfolio PDF"],
  kalender: ["Agenda akademik"],
  "rekap-admin": ["Rekap per musyrif", "Rekap per santri", "Grafik keseluruhan"],
};

export default async function SectionPage({ params, searchParams }: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ keluar?: string }>;
}) {
  const profile = await requireProfile();
  const { section } = await params;
  if (!Object.hasOwn(sections, section) || !canAccess(profile.role, section as Section)) notFound();
  const active = section as Section;
  const { keluar } = await searchParams;
  const period = await getActiveSemester();

  return (
    <>
      {keluar === "gagal" && <p role="alert" className="mb-4 rounded-xl border border-border bg-card p-4 text-sm">Sesi belum berhasil ditutup. Coba keluar kembali.</p>}
      <section className="mosque-panel relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-slate-950/10 sm:p-10">
        <div className="mosque-art -z-10" aria-hidden />
        <p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-teal-200">{APP_CONFIG.name}</p>
        <h1 className="max-w-[85%] text-3xl font-bold tracking-tight sm:text-5xl">{sections[active].title}</h1>
        <p className="mt-5 flex items-center gap-2 text-sm text-slate-100">
          <CalendarDays className="size-4 shrink-0" aria-hidden />{period ? `${period.academicYear.name} · ${semesterLabel[period.name]}` : "Belum ada semester aktif"}
        </p>
      </section>
      {active === "admin" && (
        <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <h2 className="font-bold">Master data dan periode akademik</h2>
          <p className="mt-2 text-sm text-muted-foreground">Kelola santri, kelas, kamar, halaqah, tahun ajaran, dan semester.</p>
          <Button asChild className="mt-4"><Link href="/admin/master">Buka master data</Link></Button>
        </section>
      )}
      <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-muted p-3"><Construction className="size-5" aria-hidden /></span>
          <h2 className="font-bold">Modul dalam pengembangan</h2>
        </div>
        <ul className="mt-4 divide-y divide-border text-sm text-muted-foreground">
          {plannedContent[active].map((item) => <li key={item} className="py-3">{item}</li>)}
        </ul>
      </section>
    </>
  );
}
