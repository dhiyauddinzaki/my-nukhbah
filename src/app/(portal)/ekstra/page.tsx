import { notFound } from "next/navigation";
import { BookOpenCheck, CalendarDays, Sparkles } from "lucide-react";
import { APP_CONFIG } from "@/config/constants";
import { getActiveSemester, semesterLabel } from "@/features/academic/period";
import { canAccess } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";
import { IntensiveForm } from "@/features/extras/intensive-form";
import { extraPrograms } from "@/features/extras/constants";
import { getWeekEnd, getWeekStart, parseIsoWeek } from "@/features/extras/week";
import { UmmiForm } from "@/features/extras/ummi-form";
import { db } from "@/lib/db";
import { z } from "zod";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_CONFIG.timeZone }).format(new Date());
}

export default async function ExtraPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  if (!canAccess(profile.role, "ekstra")) notFound();

  const { halaqah: halaqahParam, week: weekParam, program: programParam } = await searchParams;
  const program = extraPrograms.some(({ value }) => value === programParam)
    ? programParam as (typeof extraPrograms)[number]["value"]
    : "TAHFIZH_INTENSIF";
  const period = await getActiveSemester();
  const halaqahs = period
    ? await db.extraHalaqah.findMany({
        where: {
          semesterId: period.id,
          program,
          ...(profile.role === "MUSYRIF" ? { teacherId: profile.id } : {}),
        },
        include: {
          teacher: { select: { displayName: true } },
          members: {
            include: { student: { select: { id: true, nis: true, fullName: true } } },
            orderBy: { student: { fullName: "asc" } },
          },
        },
        orderBy: { name: "asc" },
      })
    : [];
  const requestedHalaqah = typeof halaqahParam === "string" && z.uuid().safeParse(halaqahParam).success ? halaqahParam : "";
  const selectedHalaqah = halaqahs.find(({ id }) => id === requestedHalaqah) ?? halaqahs[0];

  const todayWeek = getWeekStart(new Date(`${todayIso()}T00:00:00.000Z`));
  const todayWeekEnd = getWeekEnd(todayWeek);
  const defaultWeekStart = period && (todayWeekEnd < period.startDate || todayWeek > period.endDate)
    ? getWeekStart(period.startDate)
    : todayWeek;
  const requestedWeekStart = typeof weekParam === "string" ? parseIsoWeek(weekParam) : null;
  const requestedWeekEnd = requestedWeekStart ? getWeekEnd(requestedWeekStart) : null;
  const weekInPeriod = !period || !requestedWeekStart || !requestedWeekEnd
    || (requestedWeekEnd >= period.startDate && requestedWeekStart <= period.endDate);
  const selectedWeekStart = requestedWeekStart && weekInPeriod ? requestedWeekStart : defaultWeekStart;
  const weekStartDate = selectedWeekStart.toISOString().slice(0, 10);
  const studentIds = selectedHalaqah?.members.map(({ studentId }) => studentId) ?? [];
  const students = selectedHalaqah?.members.map(({ student }) => student) ?? [];

  const [intensiveEntries, intensiveHistory, ummiEntries, ummiHistory, legacyHistory] = period && selectedHalaqah
    ? await Promise.all([
        program === "TAHFIZH_INTENSIF"
          ? db.tahfizhIntensiveEntry.findMany({
              where: {
                semesterId: period.id,
                groupId: selectedHalaqah.id,
                weekStartDate: selectedWeekStart,
                studentId: { in: studentIds },
              },
              include: { tasmiScores: true },
              orderBy: { student: { fullName: "asc" } },
            })
          : Promise.resolve([]),
        program === "TAHFIZH_INTENSIF"
          ? db.tahfizhIntensiveEntry.findMany({
              where: { semesterId: period.id, groupId: selectedHalaqah.id },
              include: { tasmiScores: true, student: { select: { fullName: true } } },
              orderBy: [{ weekStartDate: "desc" }, { student: { fullName: "asc" } }, { type: "asc" }],
              take: 80,
            })
          : Promise.resolve([]),
        program === "TAHSIN_UMMI"
          ? db.ummiWeeklyEntry.findMany({
              where: {
                semesterId: period.id,
                groupId: selectedHalaqah.id,
                weekStartDate: selectedWeekStart,
                studentId: { in: studentIds },
              },
              orderBy: [{ student: { fullName: "asc" } }, { type: "asc" }],
            })
          : Promise.resolve([]),
        program === "TAHSIN_UMMI"
          ? db.ummiWeeklyEntry.findMany({
              where: { semesterId: period.id, groupId: selectedHalaqah.id },
              include: { student: { select: { fullName: true } } },
              orderBy: [{ weekStartDate: "desc" }, { student: { fullName: "asc" } }, { type: "asc" }],
              take: 80,
            })
          : Promise.resolve([]),
        studentIds.length > 0
          ? db.extraWeeklyEntry.findMany({
              where: {
                semesterId: period.id,
                program,
                studentId: { in: studentIds },
              },
              include: {
                student: { select: { fullName: true } },
                halaqah: { select: { name: true } },
              },
              orderBy: { weekStartDate: "desc" },
              take: 80,
            })
          : Promise.resolve([]),
      ])
    : [[], [], [], [], []];

  return (
    <div className="space-y-5">
      <section className="mosque-panel relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-slate-950/10 sm:p-9">
        <div className="mosque-art -z-10" aria-hidden />
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-teal-200">{APP_CONFIG.name} · Program pekanan</p>
        <h1 className="max-w-[85%] text-3xl font-bold tracking-tight sm:text-4xl">Jurnal Ekstra</h1>
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-100">
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          {period ? `${period.academicYear.name} · ${semesterLabel[period.name]}` : "Belum ada semester aktif"}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <header className="flex items-center gap-3 border-l-4 border-l-teal-600 bg-teal-50/70 p-4 dark:bg-teal-950/20 sm:p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-teal-800 dark:text-teal-200">Tahfizh Intensif · Tahsin UMMI</p>
            <h2 className="text-lg font-bold">Laporan perkembangan pekanan</h2>
          </div>
        </header>
        <div className="space-y-4 p-4 sm:p-6">
          {!period && <p className="text-sm text-muted-foreground">Belum ada semester aktif. Hubungi Admin untuk mengaktifkan periode.</p>}
          {period && (
            <form action="/ekstra" method="get" className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <label className="grid gap-1 text-sm font-semibold">Program
                <select name="program" defaultValue={program} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm">
                  {extraPrograms.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">Halaqah
                <select name="halaqah" defaultValue={selectedHalaqah?.id ?? ""} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm" required>
                  {halaqahs.map((halaqah) => <option key={halaqah.id} value={halaqah.id}>{halaqah.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">Pekan
                <input type="week" name="week" defaultValue={(() => {
                  const thursday = new Date(selectedWeekStart);
                  thursday.setUTCDate(thursday.getUTCDate() + 3);
                  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
                  const monday = getWeekStart(jan4);
                  monday.setUTCDate(monday.getUTCDate() + 3);
                  const week = 1 + Math.round((thursday.getTime() - monday.getTime()) / (7 * 86400000));
                  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
                })()} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm" required />
              </label>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold hover:bg-muted">Tampilkan</button>
              {selectedHalaqah && <p className="text-xs text-muted-foreground sm:col-span-4">
                Pekan {new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(selectedWeekStart)} – {new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(getWeekEnd(selectedWeekStart))}
                {" · "}{selectedHalaqah.teacher.displayName} · {selectedHalaqah.members.length} santri
              </p>}
            </form>
          )}

          {period && halaqahs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Belum ada halaqah untuk program ini.</p>
              <p className="mt-1">Admin dapat mengatur halaqah, Muhaffizh, dan anggota melalui Dashboard → Master Data.</p>
            </div>
          )}
          {period && selectedHalaqah && program === "TAHFIZH_INTENSIF" && (
            <IntensiveForm
              key={`${selectedHalaqah.id}:${weekStartDate}`}
              groupId={selectedHalaqah.id}
              weekStartDate={weekStartDate}
              students={students}
              entries={intensiveEntries.map((entry) => ({
                id: entry.id,
                studentId: entry.studentId,
                type: entry.type,
                pagesCompleted: entry.pagesCompleted,
                juzNumber: entry.juzNumber,
                fromPage: entry.fromPage,
                toPage: entry.toPage,
                isMurajaahWeek: entry.isMurajaahWeek,
                jadid: entry.jadid,
                qadim: entry.qadim,
                note: entry.note,
                tasmiScores: entry.tasmiScores,
              }))}
            />
          )}
          {period && selectedHalaqah && program === "TAHSIN_UMMI" && (
            <UmmiForm
              key={`${selectedHalaqah.id}:${weekStartDate}`}
              groupId={selectedHalaqah.id}
              weekStartDate={weekStartDate}
              students={students}
              entries={ummiEntries.map((entry) => ({
                id: entry.id,
                studentId: entry.studentId,
                type: entry.type,
                stage: entry.stage,
                fromPage: entry.fromPage,
                toPage: entry.toPage,
                grade: entry.grade,
                note: entry.note,
              }))}
            />
          )}
        </div>
      </section>

      {period && selectedHalaqah && program === "TAHFIZH_INTENSIF" && intensiveHistory.length > 0 && (
        <details className="rounded-2xl border border-border bg-card shadow-sm">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-bold [&::-webkit-details-marker]:hidden">
            Riwayat Intensif dan Ujian Tasmi' <ChevronHistory />
          </summary>
          <ul className="divide-y divide-border border-t border-border px-4">
            {intensiveHistory.map((entry) => (
              <li key={entry.id} className="py-3 text-sm">
                <p className="font-semibold">{entry.weekStartDate.toISOString().slice(0, 10)} · {entry.student.fullName} · {entry.type}</p>
                <p className="text-muted-foreground">
                  {entry.type === "ZIYADAH" ? entry.isMurajaahWeek ? "Pekan Murajaah" : `${entry.pagesCompleted ?? 0} halaman${entry.juzNumber ? ` · Juz ${entry.juzNumber} hal ${entry.fromPage}–${entry.toPage}` : ""}` : ""}
                  {entry.type === "MURAJAAH" ? `Jadid ${entry.jadid ? "✓" : "—"} · Qadim ${entry.qadim ? "✓" : "—"}` : ""}
                  {entry.tasmiScores.length ? `Tasmi': ${entry.tasmiScores.map((score) => `Juz ${score.juzNumber} ${score.grade}`).join(" · ")}` : ""}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
      {period && selectedHalaqah && program === "TAHSIN_UMMI" && ummiHistory.length > 0 && (
        <details className="rounded-2xl border border-border bg-card shadow-sm">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-bold [&::-webkit-details-marker]:hidden">
            Riwayat Tahsin UMMI <ChevronHistory />
          </summary>
          <ul className="divide-y divide-border border-t border-border px-4">
            {ummiHistory.map((entry) => (
              <li key={entry.id} className="py-3 text-sm">
                <p className="font-semibold">{entry.weekStartDate.toISOString().slice(0, 10)} · {entry.student.fullName} · {entry.type === "LEARNING" ? "Pembelajaran" : "Ujian"}</p>
                <p className="text-muted-foreground">
                  {entry.stage} {entry.fromPage != null ? `· halaman ${entry.fromPage}–${entry.toPage}` : ""} · Nilai {entry.grade}{entry.note ? ` · ${entry.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
      {period && selectedHalaqah && legacyHistory.length > 0 && (
        <details className="rounded-2xl border border-dashed border-border bg-card shadow-sm">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-bold [&::-webkit-details-marker]:hidden">
            Arsip entri Ekstra format lama <ChevronHistory />
          </summary>
          <ul className="divide-y divide-border border-t border-border px-4">
            {legacyHistory.map((entry) => (
              <li key={entry.id} className="py-3 text-sm">
                <p className="font-semibold">{entry.weekStartDate.toISOString().slice(0, 10)} · {entry.student.fullName} · {entry.halaqah.name}</p>
                <p className="text-muted-foreground">
                  {entry.program === "TAHFIZH_INTENSIF"
                    ? `${entry.pagesCompleted ?? 0}/${entry.targetPages ?? 0} halaman`
                    : `${entry.ummiLevel ?? "Level"} · halaman ${entry.fromPage ?? "—"}–${entry.toPage ?? "—"} · ${entry.fluencyGrade ?? "—"}`}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <BookOpenCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        Catatan lama Tahap 5 tetap dipertahankan di database, terpisah dari format program baru.
      </p>
    </div>
  );
}

function ChevronHistory() {
  return <span aria-hidden className="text-muted-foreground">⌄</span>;
}
