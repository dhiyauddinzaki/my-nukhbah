import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Award, BookOpenCheck, CalendarDays, Camera, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, House, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { getActiveSemester, semesterLabel } from "@/features/academic/period";
import { canAccess } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";
import { getSupabaseAdminClient } from "@/features/auth/supabase-admin";
import { adabCriteria } from "@/features/dorm/constants";
import { ReviewRefresh } from "@/features/dorm/review-refresh";
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
  const requestedRoomId = typeof params.room === "string" ? params.room : "";
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
                tahajjudPhotoPath: true,
                pagiPhotoPath: true,
                sorePhotoPath: true,
                malamPhotoPath: true,
              },
            },
            weeklyReviews: {
              where: { weekStartDate: selectedWeekStart },
              select: {
                adabSubmittedAt: true,
                violationsSubmittedAt: true,
                achievementsSubmittedAt: true,
                _count: { select: { adabScores: true } },
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
  const selectedRoomId = rooms.some((room) => room.id === requestedRoomId)
    ? requestedRoomId
    : rooms[0]?.id ?? "";

  const [selectedRoomStudents, selectedDailyJournal, selectedWeeklyReview] = period && selectedRoomId && canSeeSensitiveRecaps
    ? await Promise.all([
        db.enrollment.findMany({
          where: { semesterId: period.id, roomId: selectedRoomId },
          include: { student: { select: { id: true, nis: true, fullName: true } } },
          orderBy: { student: { fullName: "asc" } },
        }),
        db.dormJournal.findUnique({
          where: {
            semesterId_roomId_date: {
              semesterId: period.id,
              roomId: selectedRoomId,
              date: dailyDate,
            },
          },
          include: {
            dailyPresences: { include: { student: { select: { id: true, fullName: true, nis: true } } } },
            tahajjudAssessments: { include: { student: { select: { id: true, fullName: true } } } },
            activityAttendances: { include: { student: { select: { id: true, fullName: true } } } },
          },
        }),
        db.dormWeeklyReview.findUnique({
          where: {
            semesterId_roomId_weekStartDate: {
              semesterId: period.id,
              roomId: selectedRoomId,
              weekStartDate: selectedWeekStart,
            },
          },
          include: {
            adabScores: { include: { student: { select: { id: true, fullName: true, nis: true } } } },
            violations: { include: { student: { select: { id: true, fullName: true, nis: true } } } },
            achievements: { include: { student: { select: { id: true, fullName: true, nis: true } } } },
          },
        }),
      ])
    : [[], null, null];

  const reviewPhotos = [
    { key: "tahajjud", label: "Tahajjud", path: selectedDailyJournal?.tahajjudPhotoPath },
    { key: "pagi", label: "Kerapian pagi", path: selectedDailyJournal?.pagiPhotoPath },
    { key: "sore", label: "Kerapian sore", path: selectedDailyJournal?.sorePhotoPath },
    { key: "malam", label: "Kerapian malam", path: selectedDailyJournal?.malamPhotoPath },
  ];
  const storage = canSeeSensitiveRecaps && reviewPhotos.some(({ path }) => path)
    ? getSupabaseAdminClient()
    : null;
  const signedReviewPhotos = await Promise.all(reviewPhotos.map(async ({ key, label, path }) => {
    if (!path) return { key, label, url: null, error: null };
    if (!storage) return { key, label, url: null, error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server." };
    const { data, error } = await storage.storage.from("mutabaah").createSignedUrl(path, 600);
    if (error) {
      console.error("Gagal membuat tautan aman foto jurnal Asrama:", error);
      return { key, label, url: null, error: "Foto tidak dapat dibuka. Periksa policy baca bucket mutabaah." };
    }
    return { key, label, url: data.signedUrl, error: null };
  }));

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

  const reportRooms = rooms.filter((room) => room._count.enrollments > 0);
  const dailyDone = reportRooms.reduce((sum, room) => {
    const journal = room.dormJournals[0];
    return sum + (journal
      ? [journal.presenceSubmittedAt, journal.tahajjudSubmittedAt, journal.pagiSubmittedAt, journal.soreSubmittedAt, journal.malamSubmittedAt].filter(Boolean).length
      : 0);
  }, 0);
  const dailyTotal = reportRooms.length * 5;
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
  const dailyNotifications = reportRooms
    .map((room) => {
      const journal = room.dormJournals[0];
      const missing: string[] = [];
      if (!journal?.presenceSubmittedAt) missing.push("Daftar hadir");
      if (!journal?.tahajjudSubmittedAt) missing.push("Tahajjud + foto");
      else if (!journal.tahajjudPhotoPath) missing.push("Foto Tahajjud");
      if (!journal?.pagiSubmittedAt) missing.push("Pendampingan pagi + foto");
      else if (!journal.pagiPhotoPath) missing.push("Foto kerapian pagi");
      if (!journal?.soreSubmittedAt) missing.push("Pendampingan sore + foto");
      else if (!journal.sorePhotoPath) missing.push("Foto kerapian sore");
      if (!journal?.malamSubmittedAt) missing.push("Pendampingan malam + foto");
      else if (!journal.malamPhotoPath) missing.push("Foto kerapian malam");
      return { id: room.id, name: room.name, missing };
    })
    .filter((room) => room.missing.length > 0);
  const weeklyNotifications = reportRooms
    .map((room) => {
      const review = room.weeklyReviews[0];
      const missing: string[] = [];
      const scoredStudents = review?._count.adabScores ?? 0;
      if (!review?.adabSubmittedAt) missing.push(`Kirim Huquq Sittah (${scoredStudents}/${room._count.enrollments} santri)`);
      else if (scoredStudents < room._count.enrollments) missing.push(`Lengkapi Huquq Sittah (${scoredStudents}/${room._count.enrollments} santri)`);
      if (!review?.violationsSubmittedAt) missing.push("Pemeriksaan pelanggaran");
      if (!review?.achievementsSubmittedAt) missing.push("Pemeriksaan prestasi");
      return { id: room.id, name: room.name, missing };
    })
    .filter((room) => room.missing.length > 0);
  const missingDailyItems = dailyNotifications.reduce((count, room) => count + room.missing.length, 0);
  const missingWeeklyItems = weeklyNotifications.reduce((count, room) => count + room.missing.length, 0);
  const allReportsComplete = reportRooms.length > 0 && missingDailyItems + missingWeeklyItems === 0;

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

      {period && canSeeSensitiveRecaps && (
        <section aria-live="polite" className="rounded-2xl border border-amber-900/10 bg-gradient-to-br from-amber-50 via-card to-card p-4 shadow-sm dark:from-amber-950/20 sm:p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${missingDailyItems + missingWeeklyItems > 0 ? "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"}`}>
                <ClipboardCheck className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.15em] text-amber-800 dark:text-amber-200">Catatan untuk Kepala Asrama</p>
                <h2 className="text-lg font-bold">
                  {missingDailyItems + missingWeeklyItems > 0
                    ? `${missingDailyItems + missingWeeklyItems} isian masih ditunggu`
                    : allReportsComplete ? "Laporan kamar sudah lengkap" : "Belum ada kamar untuk dipantau"}
                </h2>
                <p className="text-xs text-muted-foreground">Harian {formatDate(selectedDate)} · Pekan {formatDate(selectedWeekStart)}–{formatDate(selectedWeekEnd)}</p>
              </div>
            </div>
            <ReviewRefresh />
          </header>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {[
              {
                key: "daily",
                title: `Harian · ${formatDate(selectedDate)}`,
                rooms: dailyNotifications,
                missing: missingDailyItems,
                completeText: "Semua laporan harian sudah masuk. Kamar-kamar terpantau lengkap.",
              },
              {
                key: "weekly",
                title: `Pekanan · ${formatDate(selectedWeekStart)}–${formatDate(selectedWeekEnd)}`,
                rooms: weeklyNotifications,
                missing: missingWeeklyItems,
                completeText: "Huquq Sittah, pemeriksaan pelanggaran, dan status prestasi sudah ditinjau.",
              },
            ].map((group) => (
              <section key={group.key} className="rounded-xl border border-border/80 bg-card/90 p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-bold">{group.title}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${group.missing ? "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100"}`}>
                    {group.missing ? `${group.missing} belum lengkap` : reportRooms.length ? "Lengkap" : "—"}
                  </span>
                </div>
                {group.rooms.length === 0 ? (
                  <p className={`rounded-lg px-3 py-2 text-sm ${reportRooms.length ? "bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" : "bg-muted/50 text-muted-foreground"}`}>
                    {reportRooms.length ? group.completeText : "Belum ada kamar berpenghuni pada semester ini."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {group.rooms.map((room) => {
                      const href = `/asrama?${new URLSearchParams({
                        room: room.id,
                        date: selectedDateText,
                        week: getIsoWeekValue(selectedWeekStart),
                        view: "kelengkapan",
                      })}#rincian-input`;
                      return (
                        <li key={room.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-900/10 bg-amber-50/50 px-3 py-2 dark:bg-amber-950/15">
                          <div className="min-w-0">
                            <p className="text-sm font-bold">{room.name}</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">{room.missing.join(" · ")}</p>
                          </div>
                          <Link href={href} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-teal-800 hover:bg-teal-50 dark:text-teal-200 dark:hover:bg-teal-950/50">
                            Periksa kamar<ChevronRight className="size-4" aria-hidden />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </section>
      )}

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
                        <p className="text-xs text-muted-foreground">{room.supervisor?.displayName ?? "Belum ada Murabbi"} · {room._count.enrollments} santri</p>
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

      {period && canSeeSensitiveRecaps && (
        <section id="rincian-input" className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-sky-700 dark:text-sky-300">Pemeriksaan · Admin & Kepala Asrama</p>
              <h2 className="mt-1 text-xl font-bold">Rincian hasil input</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pilih kamar, tanggal, dan pekan untuk melihat data yang sudah dikirim.</p>
            </div>
          </header>

          <form action="/asrama" method="get" className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <input type="hidden" name="view" value={selectedView} />
            <label className="grid gap-1 text-sm font-semibold">Kamar
              <select name="room" defaultValue={selectedRoomId} className="min-h-11 rounded-xl border border-border bg-background px-3" required>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">Tanggal harian
              <input type="date" name="date" defaultValue={selectedDateText} min={period.startDate.toISOString().slice(0, 10)} max={period.endDate.toISOString().slice(0, 10)} className="min-h-11 rounded-xl border border-border bg-background px-3" required />
            </label>
            <label className="grid gap-1 text-sm font-semibold">Pekan penilaian
              <input type="week" name="week" defaultValue={getIsoWeekValue(selectedWeekStart)} className="min-h-11 rounded-xl border border-border bg-background px-3" required />
            </label>
            <Button type="submit" variant="outline">Tampilkan rincian</Button>
          </form>

          <section className="space-y-4 rounded-xl border border-sky-900/10 bg-sky-50/20 p-3 dark:bg-sky-950/10 sm:p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 font-bold"><House className="size-4 text-sky-700" aria-hidden />Jurnal harian · {rooms.find((room) => room.id === selectedRoomId)?.name}</h3>
                <p className="text-xs text-muted-foreground">{formatDate(selectedDate)} · laporan dan foto yang telah disimpan</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedDailyJournal?.updatedAt
                  ? `Terakhir diperbarui ${new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: APP_CONFIG.timeZone }).format(selectedDailyJournal.updatedAt)}`
                  : "Belum ada laporan untuk tanggal ini"}
              </span>
            </header>

            {selectedRoomStudents.length === 0 ? (
              <p className="rounded-lg bg-card p-3 text-sm text-muted-foreground">Belum ada santri di kamar ini.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-3 py-3">Santri</th><th className="px-3 py-3">Kehadiran</th><th className="px-3 py-3">Tahajjud</th><th className="px-3 py-3">Pagi</th><th className="px-3 py-3">Sore</th><th className="px-3 py-3">Malam</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedRoomStudents.map(({ student }) => {
                      const presence = selectedDailyJournal?.dailyPresences.find((row) => row.studentId === student.id);
                      const tahajjud = selectedDailyJournal?.tahajjudAssessments.find((row) => row.studentId === student.id);
                      const activityValue = (activity: "PAGI" | "SORE" | "MALAM") => selectedDailyJournal?.activityAttendances.find((row) => row.studentId === student.id && row.activity === activity)?.status ?? "—";
                      return (
                        <tr key={student.id}>
                          <td className="px-3 py-3"><p className="font-semibold">{student.fullName}</p><p className="text-xs text-muted-foreground">{student.nis}</p></td>
                          <td className="px-3 py-3">
                            {presence ? <span className="font-semibold">[{presence.status}] {presence.status === "H" ? "Hadir" : presence.status === "S" ? "Sakit" : presence.status === "I" ? "Izin" : "Alpa"}</span> : <span className="text-muted-foreground">Belum diisi</span>}
                            {presence?.note && <p className="max-w-40 text-xs text-muted-foreground">{presence.note}</p>}
                          </td>
                          <td className="px-3 py-3">{tahajjud ? tahajjud.completed ? "Ya" : "Tidak" : "—"}</td>
                          <td className="px-3 py-3">{activityValue("PAGI")}</td>
                          <td className="px-3 py-3">{activityValue("SORE")}</td>
                          <td className="px-3 py-3">{activityValue("MALAM")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {signedReviewPhotos.map(({ key, label, url, error }) => {
                const submittedAt = key === "tahajjud" ? selectedDailyJournal?.tahajjudSubmittedAt
                  : key === "pagi" ? selectedDailyJournal?.pagiSubmittedAt
                    : key === "sore" ? selectedDailyJournal?.soreSubmittedAt
                      : selectedDailyJournal?.malamSubmittedAt;
                return (
                  <article key={key} className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2 border-b border-border p-3">
                      <Camera className="size-4 text-sky-700" aria-hidden />
                      <div><p className="text-sm font-bold">{label}</p><p className="text-xs text-muted-foreground">{submittedAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: APP_CONFIG.timeZone }).format(submittedAt) : "Belum dikirim"}</p></div>
                    </div>
                    {url
                      ? <Image src={url} alt={`Foto ${label}`} width={640} height={480} unoptimized className="aspect-[4/3] w-full object-cover" />
                      : <p className="p-3 text-xs text-muted-foreground">{error ?? "Belum ada foto pada laporan ini."}</p>}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-amber-900/10 bg-amber-50/20 p-3 dark:bg-amber-950/10 sm:p-4">
            <header>
              <h3 className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-4 text-amber-700" aria-hidden />Jurnal pekanan · {rooms.find((room) => room.id === selectedRoomId)?.name}</h3>
              <p className="text-xs text-muted-foreground">{formatDate(selectedWeekStart)} – {formatDate(selectedWeekEnd)}</p>
            </header>
            {!selectedWeeklyReview ? (
              <p className="rounded-lg bg-card p-3 text-sm text-muted-foreground">Belum ada input pekanan untuk kamar dan pekan ini.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Huquq Sittah {selectedWeeklyReview.adabSubmittedAt ? `· tersimpan ${new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: APP_CONFIG.timeZone }).format(selectedWeeklyReview.adabSubmittedAt)}` : "· belum dikirim"}
                  {" · "}
                  Pelanggaran {selectedWeeklyReview.violationsSubmittedAt ? `· tersimpan ${new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: APP_CONFIG.timeZone }).format(selectedWeeklyReview.violationsSubmittedAt)}` : "· belum dikirim"}
                  {" · "}
                  Prestasi {selectedWeeklyReview.achievementsSubmittedAt ? "· sudah diperiksa" : "· belum diperiksa"}
                </p>
                <div>
                  <h4 className="mb-2 text-sm font-bold">Nilai Huquq Sittah</h4>
                  {selectedWeeklyReview.adabScores.length === 0
                    ? <p className="rounded-lg bg-card p-3 text-sm text-muted-foreground">Belum ada nilai adab tersimpan.</p>
                    : <div className="grid gap-3 md:grid-cols-2">
                      {selectedWeeklyReview.adabScores.map((score) => (
                        <article key={score.studentId} className="rounded-lg border border-border bg-card p-3">
                          <p className="mb-2 font-semibold">{score.student.fullName} <span className="text-xs font-normal text-muted-foreground">· {score.student.nis}</span></p>
                          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                            {adabCriteria.map(({ key, label }) => {
                              const note = {
                                haqLinafsih: score.haqLinafsihNote,
                                haqLisyaikhih: score.haqLisyaikhihNote,
                                haqLizamilih: score.haqLizamilihNote,
                                haqLilMakan: score.haqLilMakanNote,
                                haqLilKitab: score.haqLilKitabNote,
                                haqLilIlm: score.haqLilIlmNote,
                              }[key];
                              return <div key={key}><dt className="text-muted-foreground">{label}</dt><dd className="font-bold">{score[key]}/10{note && <span className="block font-normal text-muted-foreground">{note}</span>}</dd></div>;
                            })}
                          </dl>
                        </article>
                      ))}
                    </div>}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-bold">Prestasi & apresiasi</h4>
                    {selectedWeeklyReview.achievements.length === 0
                      ? <p className="rounded-lg bg-card p-3 text-sm text-muted-foreground">Belum ada prestasi yang dicatat.</p>
                      : <ul className="space-y-2">{selectedWeeklyReview.achievements.map((item) => <li key={item.id} className="rounded-lg border border-border bg-card p-3"><p className="font-semibold">{item.student.fullName} · {item.title}</p>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}</li>)}</ul>}
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-bold">Pelanggaran</h4>
                    {selectedWeeklyReview.violations.length === 0
                      ? <p className="rounded-lg bg-card p-3 text-sm text-muted-foreground">Belum ada pelanggaran yang dicatat.</p>
                      : <ul className="space-y-2">{selectedWeeklyReview.violations.map((item) => <li key={item.id} className="rounded-lg border border-border bg-card p-3"><p className="font-semibold">{item.student.fullName} · {item.violationType}</p><p className="text-sm text-muted-foreground">{item.repetitions} × {item.pointsPerOccurrence} = {item.repetitions * item.pointsPerOccurrence} poin</p></li>)}</ul>}
                  </div>
                </div>
              </div>
            )}
          </section>
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
