import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenCheck, CalendarDays, ChevronLeft, ChevronRight, House, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { getActiveSemester, semesterLabel } from "@/features/academic/period";
import { canAccess } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";
import { extraPrograms } from "@/features/extras/constants";
import { getIsoWeekValue, getWeekEnd, getWeekStart, parseIsoWeek } from "@/features/extras/week";
import { db } from "@/lib/db";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_CONFIG.timeZone }).format(new Date());
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function shiftDate(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function progressPercent(done: number, total: number) {
  return total ? Math.round(done / total * 100) : 0;
}

function ProgressBar({ value, color = "bg-teal-600" }: { value: number; color?: string }) {
  return (
    <div role="progressbar" aria-label={`${value}% lengkap`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default async function AsramaPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  if (!canAccess(profile.role, "asrama")) notFound();

  const params = await searchParams;
  const selectedView = typeof params.view === "string" ? params.view : "kelengkapan";
  const period = await getActiveSemester();
  const today = new Date(`${todayIso()}T00:00:00.000Z`);
  const requestedDate = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? new Date(`${params.date}T00:00:00.000Z`)
    : today;
  const dateIsValid = !Number.isNaN(requestedDate.getTime());
  const selectedDateValue = dateIsValid ? requestedDate.toISOString().slice(0, 10) : todayIso();
  const selectedDate = period
    ? selectedDateValue >= period.startDate.toISOString().slice(0, 10) && selectedDateValue <= period.endDate.toISOString().slice(0, 10)
      ? new Date(`${selectedDateValue}T00:00:00.000Z`)
      : today >= period.startDate && today <= period.endDate
        ? today
        : new Date(period.startDate)
    : new Date(`${selectedDateValue}T00:00:00.000Z`);
  const selectedDateText = selectedDate.toISOString().slice(0, 10);
  const dailyDate = new Date(`${selectedDateText}T00:00:00.000Z`);
  const thisWeek = getWeekStart(today);
  const requestedWeek = typeof params.week === "string" ? parseIsoWeek(params.week) : null;
  const weekCandidate = requestedWeek ?? getWeekStart(dailyDate);
  const selectedWeekStart = period
    ? getWeekEnd(weekCandidate) < period.startDate || weekCandidate > period.endDate
      ? getWeekStart(period.startDate)
      : weekCandidate
    : weekCandidate;
  const selectedWeekEnd = getWeekEnd(selectedWeekStart);
  const canSeeSensitiveRecaps = profile.role === "ADMIN" || profile.role === "KEPALA_ASRAMA";

  const [rooms, absenceRows, violations, allExtraAssignments] = period
    ? await Promise.all([
        db.room.findMany({
          where: {
            semesterId: period.id,
            ...(profile.role === "MUSYRIF" ? { supervisorId: profile.id } : {}),
          },
          include: {
            supervisor: { select: { displayName: true } },
            _count: { select: { enrollments: true } },
            dormJournals: {
              where: { date: dailyDate },
              select: {
                id: true,
                presenceSubmittedAt: true,
                tahajjudSubmittedAt: true,
                pagiSubmittedAt: true,
                soreSubmittedAt: true,
                malamSubmittedAt: true,
              },
            },
          },
          orderBy: { name: "asc" },
        }),
        canSeeSensitiveRecaps
          ? db.dormDailyPresence.findMany({
              where: {
                status: { not: "H" },
                journal: { semesterId: period.id, date: dailyDate },
              },
              include: {
                student: { select: { id: true, nis: true, fullName: true } },
                journal: { include: { room: { select: { name: true } } } },
              },
              orderBy: [{ status: "asc" }, { student: { fullName: "asc" } }],
            })
          : Promise.resolve([]),
        canSeeSensitiveRecaps
          ? db.dormViolation.findMany({
              where: { review: { semesterId: period.id, weekStartDate: selectedWeekStart } },
              include: {
                student: { select: { id: true, nis: true, fullName: true } },
                review: { include: { room: { select: { name: true } } } },
              },
              orderBy: [{ student: { fullName: "asc" } }, { violationType: "asc" }],
            })
          : Promise.resolve([]),
        db.extraStudentAssignment.findMany({
          where: { semesterId: period.id, program: "TAHFIZH_INTENSIF" },
          select: { studentId: true },
        }),
      ])
    : [[], [], [], []];
  const intensiveStudentIds = allExtraAssignments.map(({ studentId }) => studentId);

  const [regularHalaqahs, intensiveGroups, ummiGroups] = period
    ? await Promise.all([
        db.halaqah.findMany({
          where: {
            semesterId: period.id,
            ...(profile.role === "MUSYRIF" ? { teacherId: profile.id } : {}),
          },
          include: {
            teacher: { select: { displayName: true } },
            enrollments: {
              where: { studentId: { notIn: intensiveStudentIds } },
              select: { studentId: true },
            },
          },
          orderBy: { name: "asc" },
        }),
        db.extraHalaqah.findMany({
          where: {
            semesterId: period.id,
            program: "TAHFIZH_INTENSIF",
            ...(profile.role === "MUSYRIF" ? { teacherId: profile.id } : {}),
          },
          include: { _count: { select: { members: true } }, members: { select: { studentId: true } }, teacher: { select: { displayName: true } } },
          orderBy: { name: "asc" },
        }),
        db.extraHalaqah.findMany({
          where: {
            semesterId: period.id,
            program: "TAHSIN_UMMI",
            ...(profile.role === "MUSYRIF" ? { teacherId: profile.id } : {}),
          },
          include: { _count: { select: { members: true } }, members: { select: { studentId: true } }, teacher: { select: { displayName: true } } },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], [], []];
  const regularGroupIds = regularHalaqahs.map(({ id }) => id);
  const intensiveGroupIds = intensiveGroups.map(({ id }) => id);
  const ummiGroupIds = ummiGroups.map(({ id }) => id);
  const intensiveRosterIds = intensiveGroups.flatMap((group) => group.members.map(({ studentId }) => studentId));
  const ummiRosterIds = ummiGroups.flatMap((group) => group.members.map(({ studentId }) => studentId));
  const [regularEntries, intensiveEntries, ummiEntries] = period
    ? await Promise.all([
        regularGroupIds.length
          ? db.tahfidzEntry.findMany({
              where: {
                semesterId: period.id,
                date: selectedWeekStart,
                halaqahId: { in: regularGroupIds },
                studentId: { notIn: intensiveStudentIds },
              },
              select: { halaqahId: true, type: true },
            })
          : Promise.resolve([]),
        intensiveGroupIds.length
          ? db.tahfizhIntensiveEntry.findMany({
              where: {
                semesterId: period.id,
                weekStartDate: selectedWeekStart,
                groupId: { in: intensiveGroupIds },
                studentId: { in: intensiveRosterIds },
              },
              select: { groupId: true, type: true },
            })
          : Promise.resolve([]),
        ummiGroupIds.length
          ? db.ummiWeeklyEntry.findMany({
              where: {
                semesterId: period.id,
                weekStartDate: selectedWeekStart,
                groupId: { in: ummiGroupIds },
                studentId: { in: ummiRosterIds },
              },
              select: { groupId: true, type: true },
            })
          : Promise.resolve([]),
      ])
    : [[], [], []];

  const dailyDone = rooms.reduce((sum, room) => {
    const journal = room.dormJournals[0];
    return sum + (journal
      ? [journal.presenceSubmittedAt, journal.tahajjudSubmittedAt, journal.pagiSubmittedAt, journal.soreSubmittedAt, journal.malamSubmittedAt].filter(Boolean).length
      : 0);
  }, 0);
  const dailyTotal = rooms.length * 5;
  const dailyProgress = progressPercent(dailyDone, dailyTotal);
  const regularTotal = regularHalaqahs.reduce((sum, group) => sum + group.enrollments.length * 3, 0);
  const regularProgress = progressPercent(regularEntries.length, regularTotal);
  const intensiveTotal = intensiveGroups.reduce((sum, group) => sum + group._count.members * 3, 0);
  const intensiveProgress = progressPercent(intensiveEntries.length, intensiveTotal);
  const ummiTotal = ummiGroups.reduce((sum, group) => sum + group._count.members * 2, 0);
  const ummiProgress = progressPercent(ummiEntries.length, ummiTotal);
  const weeklyDone = regularEntries.length + intensiveEntries.length + ummiEntries.length;
  const weeklyTotal = regularTotal + intensiveTotal + ummiTotal;
  const weeklyProgress = progressPercent(weeklyDone, weeklyTotal);

  const linkForDate = (date: Date, view = selectedView) => `/asrama?${new URLSearchParams({
    date: date.toISOString().slice(0, 10),
    week: getIsoWeekValue(getWeekStart(date)),
    view,
  })}`;
  const linkForWeek = (week: Date) => `/asrama?${new URLSearchParams({
    date: selectedDateText,
    week: getIsoWeekValue(week),
    view: selectedView,
  })}`;

  return (
    <div className="space-y-5">
      <section className="mosque-panel relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-slate-950/10 sm:p-10">
        <div className="mosque-art -z-10" aria-hidden />
        <p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-teal-200">{APP_CONFIG.name}</p>
        <h1 className="max-w-[85%] text-3xl font-bold tracking-tight sm:text-5xl">Rekap Asrama</h1>
        <p className="mt-5 flex items-center gap-2 text-sm text-slate-100">
          <CalendarDays className="size-4 shrink-0" aria-hidden />{period ? `${period.academicYear.name} · ${semesterLabel[period.name]}` : "Belum ada semester aktif"}
        </p>
      </section>

      <section className="relative -mt-2 grid items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-lg sm:grid-cols-[auto_1fr_auto] sm:p-5">
        <div className="relative flex size-28 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(#0f766e ${dailyProgress * 3.6}deg, hsl(var(--muted)) 0deg)` }}>
          <div className="flex size-20 flex-col items-center justify-center rounded-full bg-card text-center">
            <span className="text-2xl font-extrabold tabular-nums">{dailyProgress}%</span>
            <span className="text-[10px] font-semibold text-muted-foreground">Harian</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Ringkasan hari ini</p>
          <h2 className="mt-1 text-lg font-bold">Jurnal kegiatan asrama</h2>
          <p className="mt-1 text-sm text-muted-foreground">{dailyDone} dari {dailyTotal} laporan tersimpan · {rooms.length} kamar dalam cakupan.</p>
          <ProgressBar value={dailyProgress} />
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button asChild variant="outline"><Link href={linkForDate(shiftDate(selectedDate, -1))} aria-label="Hari sebelumnya"><ChevronLeft className="size-4" aria-hidden />Hari sebelumnya</Link></Button>
          <Button asChild variant="outline"><Link href={linkForDate(today, "kelengkapan")}>Hari ini</Link></Button>
          <Button asChild variant="outline"><Link href={linkForDate(shiftDate(selectedDate, 1))} aria-label="Hari berikutnya">Hari berikutnya<ChevronRight className="size-4" aria-hidden /></Link></Button>
        </div>
      </section>

      {!period && <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Belum ada semester aktif.</p>}

      {period && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-amber-700 dark:text-amber-300">Harian · {formatDate(selectedDate)}</p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-bold"><House className="size-5 text-amber-600" aria-hidden />Kelengkapan Jurnal Asrama</h2>
            </div>
            <form action="/asrama" method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="view" value={selectedView} />
              <label className="grid gap-1 text-xs font-semibold">Pilih tanggal
                <input type="date" name="date" defaultValue={selectedDateText}
                  min={period.startDate.toISOString().slice(0, 10)} max={period.endDate.toISOString().slice(0, 10)}
                  className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm" />
              </label>
              <Button type="submit" variant="outline">Tampilkan</Button>
            </form>
          </header>
          {rooms.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada kamar dalam cakupan akses.</p> : (
            <ul className="grid gap-3 md:grid-cols-2">
              {rooms.map((room) => {
                const journal = room.dormJournals[0];
                const done = journal
                  ? [journal.presenceSubmittedAt, journal.tahajjudSubmittedAt, journal.pagiSubmittedAt, journal.soreSubmittedAt, journal.malamSubmittedAt].filter(Boolean).length
                  : 0;
                const percent = progressPercent(done, 5);
                return (
                  <li key={room.id} className="space-y-2 rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{room.name}</p>
                        <p className="text-xs text-muted-foreground">{room.supervisor?.displayName ?? "Belum ada musyrif"} · {room._count.enrollments} santri</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{done}/5 · {percent}%</span>
                    </div>
                    <ProgressBar value={percent} color={percent === 100 ? "bg-emerald-600" : "bg-amber-500"} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {period && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-teal-700 dark:text-teal-300">Pekan · {formatDate(selectedWeekStart)} – {formatDate(selectedWeekEnd)}</p>
              <h2 className="mt-1 text-xl font-bold">Progress Pekanan</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link href={linkForWeek(shiftDate(selectedWeekStart, -7))}><ChevronLeft className="size-4" aria-hidden />Pekan sebelumnya</Link></Button>
              <Button asChild variant="outline"><Link href={linkForWeek(thisWeek)}>Pekan ini</Link></Button>
              <Button asChild variant="outline"><Link href={linkForWeek(shiftDate(selectedWeekStart, 7))}>Pekan berikutnya<ChevronRight className="size-4" aria-hidden /></Link></Button>
            </div>
          </header>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100"><BookOpenCheck className="size-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">Kelengkapan Jurnal Tahfizh</h3>
                <p className="text-xs text-muted-foreground">Ziyadah · Murajaah · Juziyyah untuk anggota halaqah reguler</p>
              </div>
              <span className="text-sm font-bold tabular-nums">{regularEntries.length}/{regularTotal} · {regularProgress}%</span>
            </div>
            <div className="mt-3"><ProgressBar value={regularProgress} /></div>
            {regularHalaqahs.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Belum ada halaqah reguler dalam cakupan.</p>}
          </div>

          <div className="rounded-xl border border-amber-900/10 bg-amber-50/30 p-4 dark:bg-amber-950/10">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100"><Sparkles className="size-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">Progress Ekstra</h3>
                <p className="text-xs text-muted-foreground">Tahfizh Intensif Nukhbatul Huffazh · Tahsin UMMI</p>
              </div>
              <span className="text-sm font-bold tabular-nums">{intensiveEntries.length + ummiEntries.length}/{intensiveTotal + ummiTotal} · {progressPercent(intensiveEntries.length + ummiEntries.length, intensiveTotal + ummiTotal)}%</span>
            </div>
            <div className="mt-3 space-y-3">
              <ProgressBar value={progressPercent(intensiveEntries.length + ummiEntries.length, intensiveTotal + ummiTotal)} color="bg-amber-600" />
              {extraPrograms.map((program) => {
                const groups = program.value === "TAHFIZH_INTENSIF" ? intensiveGroups : ummiGroups;
                const entries = program.value === "TAHFIZH_INTENSIF" ? intensiveEntries : ummiEntries;
                const total = program.value === "TAHFIZH_INTENSIF" ? intensiveTotal : ummiTotal;
                const done = entries.length;
                const percent = progressPercent(done, total);
                return (
                  <div key={program.value} className="flex flex-wrap items-center gap-2 border-t border-amber-900/10 pt-2 text-sm">
                    <span className="min-w-0 flex-1 font-semibold">{program.label}</span>
                    <span className="text-xs text-muted-foreground">{groups.length} halaqah</span>
                    <span className="font-bold tabular-nums">{done}/{total} · {percent}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {canSeeSensitiveRecaps && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <nav aria-label="Rekap asrama" className="flex flex-wrap gap-2">
            <Button asChild variant={selectedView === "izin" ? undefined : "outline"}><Link href={linkForDate(selectedDate, "izin")}>Daftar Izin</Link></Button>
            <Button asChild variant={selectedView === "pelanggaran" ? undefined : "outline"}><Link href={linkForDate(selectedDate, "pelanggaran")}>Pelanggaran pekanan</Link></Button>
          </nav>
          {selectedView === "izin" && (
            <div>
              <h3 className="font-bold">Daftar Izin · {selectedDateText}</h3>
              {absenceRows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Tidak ada santri berstatus S, I, atau A pada tanggal ini.</p> : (
                <ul className="mt-2 divide-y divide-border">
                  {absenceRows.map((entry) => (
                    <li key={`${entry.journalId}:${entry.studentId}`} className="py-3">
                      <p className="font-semibold">{entry.student.fullName} <span className="text-xs font-normal text-muted-foreground">· {entry.student.nis}</span></p>
                      <p className="text-sm text-muted-foreground">Kamar {entry.journal.room.name} · Status {entry.status}{entry.note ? ` · ${entry.note}` : ""}</p>
                      {profile.role !== "KEPALA_ASRAMA" && (
                        <Link className="text-sm font-semibold text-primary underline" href={`/portfolio?studentId=${entry.student.id}&month=${selectedDateText.slice(0, 7)}`}>Lihat portfolio santri</Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {selectedView === "pelanggaran" && (
            <div>
              <h3 className="font-bold">Pelanggaran pekan {formatDate(selectedWeekStart)} – {formatDate(selectedWeekEnd)}</h3>
              {violations.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Belum ada pelanggaran yang dicatat pada pekan ini.</p> : (
                <ul className="mt-2 divide-y divide-border">
                  {violations.map((entry) => (
                    <li key={entry.id} className="py-3">
                      <p className="font-semibold">{entry.student.fullName} <span className="text-xs font-normal text-muted-foreground">· {entry.student.nis}</span></p>
                      <p className="text-sm text-muted-foreground">
                        Kamar {entry.review.room.name} · {entry.violationType} · {entry.repetitions} × {entry.pointsPerOccurrence} = {entry.repetitions * entry.pointsPerOccurrence} poin
                      </p>
                      {profile.role !== "KEPALA_ASRAMA" && (
                        <Link className="text-sm font-semibold text-primary underline" href={`/portfolio?studentId=${entry.student.id}&month=${selectedDateText.slice(0, 7)}`}>Lihat portfolio santri</Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
