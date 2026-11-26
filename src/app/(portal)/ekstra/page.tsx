import { notFound } from "next/navigation";
import { BookOpenCheck, CalendarDays, Sparkles } from "lucide-react";
import { APP_CONFIG } from "@/config/constants";
import { getActiveSemester, semesterLabel } from "@/features/academic/period";
import { canAccess } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";
import { ExtraWeeklyForm } from "@/features/extras/extra-weekly-form";
import { getWeekEnd, getWeekStart, parseIsoWeek } from "@/features/extras/week";
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

  const { halaqah: halaqahParam, week: weekParam } = await searchParams;
  const period = await getActiveSemester();
  const halaqahs = period
    ? await db.halaqah.findMany({
        where: {
          semesterId: period.id,
          ...(profile.role === "MUSYRIF" ? { teacherId: profile.id } : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];
  const requestedHalaqah = typeof halaqahParam === "string" && z.string().uuid().safeParse(halaqahParam).success ? halaqahParam : "";
  const selectedHalaqahId = halaqahs.some(({ id }) => id === requestedHalaqah) ? requestedHalaqah : halaqahs[0]?.id ?? "";

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

  const enrollments = period && selectedHalaqahId
    ? await db.enrollment.findMany({
        where: { semesterId: period.id, halaqahId: selectedHalaqahId },
        include: { student: { select: { id: true, nis: true, fullName: true } } },
        orderBy: { student: { fullName: "asc" } },
      })
    : [];
  const [entries, history] = period && selectedHalaqahId
    ? await Promise.all([
        db.extraWeeklyEntry.findMany({
          where: {
            semesterId: period.id,
            halaqahId: selectedHalaqahId,
            weekStartDate: selectedWeekStart,
          },
          orderBy: [{ student: { fullName: "asc" } }, { program: "asc" }],
        }),
        db.extraWeeklyEntry.findMany({
          where: { semesterId: period.id, halaqahId: selectedHalaqahId },
          include: { student: { select: { fullName: true } } },
          orderBy: [{ weekStartDate: "desc" }, { student: { fullName: "asc" } }, { program: "asc" }],
          take: 30,
        }),
      ])
    : [[], []];

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

      <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-card shadow-sm">
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
          {period && halaqahs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {profile.role === "MUSYRIF" ? "Anda belum ditugaskan ke halaqah pada semester aktif." : "Belum ada halaqah pada semester aktif."}
            </p>
          )}
          {period && halaqahs.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                Isi progres per santri pada halaqah yang dipilih. Setiap program disimpan terpisah dan memiliki riwayat pekan.
              </p>
              <ExtraWeeklyForm
                key={`${selectedHalaqahId}:${weekStartDate}`}
                halaqahs={halaqahs}
                selectedHalaqahId={selectedHalaqahId}
                weekStartDate={weekStartDate}
                semesterStartDate={period.startDate.toISOString().slice(0, 10)}
                semesterEndDate={period.endDate.toISOString().slice(0, 10)}
                students={enrollments.map(({ student }) => student)}
                entries={entries.map((entry) => ({
                  studentId: entry.studentId,
                  program: entry.program,
                  targetPages: entry.targetPages,
                  pagesCompleted: entry.pagesCompleted,
                  ummiLevel: entry.ummiLevel,
                  fromPage: entry.fromPage,
                  toPage: entry.toPage,
                  fluencyGrade: entry.fluencyGrade,
                  note: entry.note,
                }))}
                history={history.map((entry) => ({
                  studentId: entry.studentId,
                  program: entry.program,
                  weekStartDate: entry.weekStartDate,
                  targetPages: entry.targetPages,
                  pagesCompleted: entry.pagesCompleted,
                  ummiLevel: entry.ummiLevel,
                  fromPage: entry.fromPage,
                  toPage: entry.toPage,
                  fluencyGrade: entry.fluencyGrade,
                  note: entry.note,
                  student: entry.student,
                }))}
              />
            </>
          )}
        </div>
      </section>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <BookOpenCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        Musyrif hanya dapat melihat halaqah yang ditugaskan. Catatan ekstra terikat pada tahun ajaran dan semester aktif.
      </p>
    </div>
  );
}
