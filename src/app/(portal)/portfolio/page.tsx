import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarCheck2,
  ChartNoAxesColumnIncreasing,
  Heart,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { adabCriteria } from "@/features/dorm/constants";
import { requireProfile } from "@/features/auth/session";
import { db } from "@/lib/db";

const card = "space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm";
const fieldClass = "min-h-11 rounded-xl border border-border bg-background px-3 text-sm";

function isMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function Meter({ label, value, color = "bg-teal-600" }: { label: string; value: number; color?: string }) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-bold tabular-nums">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} ${value}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.max(0, value))}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, caption }: {
  icon: LucideIcon;
  title: string;
  caption: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}

export default async function PortfolioPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  if (!["ADMIN", "MUSYRIF", "WALI_SANTRI"].includes(profile.role)) notFound();

  if (profile.role === "WALI_SANTRI") {
    return (
      <section className={card}>
        <h1 className="text-2xl font-bold">Portfolio Santri</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio wali belum dapat ditampilkan karena akun wali belum memiliki relasi santri di database. Hubungi Admin untuk menyambungkan data wali–santri.
        </p>
      </section>
    );
  }

  const params = await searchParams;
  const requestedMonthParam = typeof params.month === "string" && isMonth(params.month) ? params.month : "";
  const period = await db.semester.findFirst({
    where: { isActive: true, closedAt: null, academicYear: { isActive: true } },
    select: { id: true, startDate: true, endDate: true, academicYear: { select: { name: true } } },
  });
  const currentMonth = new Date().toISOString().slice(0, 7);
  const firstPeriodMonth = period?.startDate.toISOString().slice(0, 7);
  const lastPeriodMonth = period?.endDate.toISOString().slice(0, 7);
  const requestedMonth = period && firstPeriodMonth && lastPeriodMonth
    ? requestedMonthParam >= firstPeriodMonth && requestedMonthParam <= lastPeriodMonth
      ? requestedMonthParam
      : currentMonth >= firstPeriodMonth && currentMonth <= lastPeriodMonth
        ? currentMonth
        : firstPeriodMonth
    : requestedMonthParam || currentMonth;
  const [yearText, monthText] = requestedMonth.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0));
  const reportStart = period ? new Date(Math.max(monthStart.getTime(), period.startDate.getTime())) : monthStart;
  const reportEnd = period ? new Date(Math.min(monthEnd.getTime(), period.endDate.getTime())) : monthEnd;
  const daysInMonth = Math.floor((reportEnd.getTime() - reportStart.getTime()) / 86400000) + 1;

  const enrollments = period
    ? await db.enrollment.findMany({
        where: {
          semesterId: period.id,
          ...(profile.role === "MUSYRIF" ? {
            OR: [
              { room: { supervisorId: profile.id } },
              { halaqah: { teacherId: profile.id } },
            ],
          } : {}),
        },
        include: {
          student: { select: { id: true, nis: true, fullName: true } },
          room: { select: { name: true } },
        },
        orderBy: { student: { fullName: "asc" } },
      })
    : [];
  const requestedStudentId = typeof params.studentId === "string" ? params.studentId : "";
  const selectedEnrollment = enrollments.find((enrollment) => enrollment.studentId === requestedStudentId) ?? enrollments[0];
  const selectedStudent = selectedEnrollment?.student;

  const [presenceRows, weeklyReviews, tahfidzEntries] = selectedStudent && period
    ? await Promise.all([
        db.dormDailyPresence.findMany({
          where: {
            studentId: selectedStudent.id,
            journal: { semesterId: period.id, date: { gte: reportStart, lte: reportEnd } },
          },
          include: { journal: { select: { date: true, room: { select: { name: true } } } } },
          orderBy: { journal: { date: "desc" } },
        }),
        db.dormWeeklyReview.findMany({
          where: {
            semesterId: period.id,
            weekStartDate: {
              gte: new Date(reportStart.getTime() - 6 * 86400000),
              lte: reportEnd,
            },
          },
          include: {
            room: { select: { name: true } },
            adabScores: { where: { studentId: selectedStudent.id } },
            violations: { where: { studentId: selectedStudent.id } },
          },
          orderBy: { weekStartDate: "desc" },
        }),
        db.tahfidzEntry.findMany({
          where: {
            studentId: selectedStudent.id,
            semesterId: period.id,
            date: { gte: reportStart, lte: reportEnd },
          },
          include: { halaqah: { select: { name: true } } },
          orderBy: [{ date: "desc" }, { type: "asc" }],
        }),
      ])
    : [[], [], []];

  const presenceCount = (status: "H" | "S" | "I" | "A") => presenceRows.filter((row) => row.status === status).length;
  const presenceTotal = presenceRows.length;
  const presencePercent = (status: "H" | "S" | "I" | "A") =>
    presenceTotal ? Math.round((presenceCount(status) / presenceTotal) * 100) : 0;
  const ziyadahEntries = tahfidzEntries.filter((entry) => entry.type === "ZIYADAH");
  const murajaahEntries = tahfidzEntries.filter((entry) => entry.type === "MURAJAAH");
  const ziyadahLines = ziyadahEntries.reduce((sum, entry) => sum + (entry.lineCount ?? 0), 0);
  const ziyadahPages = ziyadahEntries.reduce((sum, entry) => sum + Math.max(0, (entry.toPage ?? 0) - (entry.fromPage ?? 0) + 1), 0);
  const ziyadahTarget = APP_CONFIG.defaultZiyadahTarget * daysInMonth;
  const ziyadahPercent = ziyadahTarget ? Math.round((ziyadahLines / ziyadahTarget) * 100) : 0;
  const murajaahTarget = APP_CONFIG.defaultMurajaahTarget * daysInMonth;
  const murajaahPercent = murajaahTarget ? Math.round((murajaahEntries.length / murajaahTarget) * 100) : 0;
  const latestHafalan = [...tahfidzEntries]
    .filter((entry) => entry.type === "ZIYADAH")
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const totalPoints = weeklyReviews.flatMap((review) => review.violations)
    .reduce((sum, item) => sum + item.repetitions * item.pointsPerOccurrence, 0);
  const violations = weeklyReviews.flatMap((review) => review.violations.map((violation) => ({
    ...violation,
    weekStartDate: review.weekStartDate,
  })));

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[.15em] text-primary">Perkembangan santri</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Portfolio Bulanan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {period?.academicYear.name ?? "Belum ada semester aktif"} · ringkasan belajar dan keseharian.
        </p>
      </header>

      <section className={card}>
        {!period && <p className="text-sm text-muted-foreground">Belum ada semester aktif.</p>}
        {period && enrollments.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada santri dalam cakupan akses Anda di semester aktif.</p>}
        {period && enrollments.length > 0 && (
          <form action="/portfolio" method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="grid gap-1 text-sm font-semibold">
              Santri
              <select name="studentId" defaultValue={selectedStudent?.id} className={fieldClass}>
                {enrollments.map(({ student, room }) => (
                  <option key={student.id} value={student.id}>{student.fullName} · {room?.name ?? "Belum ada kamar"}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Bulan
              <input
                type="month"
                name="month"
                defaultValue={requestedMonth}
                min={firstPeriodMonth}
                max={lastPeriodMonth}
                className={fieldClass}
              />
            </label>
            <Button type="submit" variant="outline">Tampilkan</Button>
          </form>
        )}
      </section>

      {selectedStudent && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 p-5">
            <div>
              <h2 className="text-xl font-bold">{selectedStudent.fullName}</h2>
              <p className="text-sm text-muted-foreground">NIS {selectedStudent.nis} · Kamar {selectedEnrollment.room?.name ?? "—"} · {requestedMonth}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="size-4" aria-hidden />{totalPoints} poin
            </div>
          </header>

          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-border p-4">
              <SectionTitle icon={CalendarCheck2} title="Kehadiran" caption="Komposisi status kehadiran bulan ini" />
              {presenceTotal === 0 ? <p className="text-sm text-muted-foreground">Belum ada kehadiran yang dicatat bulan ini.</p> : (
                <div className="space-y-3">
                  <Meter label={`Hadir · ${presenceCount("H")} hari`} value={presencePercent("H")} color="bg-emerald-600" />
                  <Meter label={`Sakit · ${presenceCount("S")} hari`} value={presencePercent("S")} color="bg-sky-600" />
                  <Meter label={`Izin · ${presenceCount("I")} hari`} value={presencePercent("I")} color="bg-amber-500" />
                  <Meter label={`Alpa · ${presenceCount("A")} hari`} value={presencePercent("A")} color="bg-rose-600" />
                  <p className="text-xs text-muted-foreground">Berdasarkan {presenceTotal} catatan kehadiran tersimpan.</p>
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-border p-4">
              <SectionTitle icon={BookOpen} title="Tahfizh" caption="Pencapaian hafalan selama bulan ini" />
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-teal-50 p-2 text-teal-800 dark:bg-teal-950 dark:text-teal-200"><BookOpen className="size-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-sm"><span className="font-semibold">Ziyadah</span><span className="font-bold">{ziyadahPercent}% target</span></div>
                    <p className="text-xs text-muted-foreground">{ziyadahLines} baris / {ziyadahPages} halaman · target {ziyadahTarget} baris</p>
                    <div className="mt-2"><Meter label="" value={ziyadahPercent} color="bg-teal-600" /></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-indigo-50 p-2 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"><RotateCcw className="size-4" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-sm"><span className="font-semibold">Murajaah</span><span className="font-bold">{murajaahPercent}% target</span></div>
                    <p className="text-xs text-muted-foreground">{murajaahEntries.length} kali · target {murajaahTarget} kali</p>
                    <div className="mt-2"><Meter label="" value={murajaahPercent} color="bg-indigo-600" /></div>
                  </div>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Hafalan terakhir</p>
                  {latestHafalan ? (
                    <p className="mt-1 text-sm font-semibold">
                      Juz {latestHafalan.juzNumber ?? "—"} · Hal {latestHafalan.fromPage ?? "—"}–{latestHafalan.toPage ?? "—"}
                      {latestHafalan.fluencyGrade ? ` · Nilai ${latestHafalan.fluencyGrade}` : ""}
                    </p>
                  ) : <p className="mt-1 text-sm text-muted-foreground">Belum ada catatan Ziyadah bulan ini.</p>}
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-border p-4">
              <SectionTitle icon={Heart} title="Penilaian Adab" caption="Rata-rata Huquq Sittah bulan ini" />
              {weeklyReviews.every((review) => review.adabScores.length === 0)
                ? <p className="text-sm text-muted-foreground">Belum ada penilaian adab bulan ini.</p>
                : (
                  <div className="space-y-3">
                    {adabCriteria.map(({ key, label }) => {
                      const scores = weeklyReviews.flatMap((review) => review.adabScores.map((score) => score[key]));
                      const percentage = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 10) : 0;
                      return <Meter key={key} label={label} value={percentage} color="bg-amber-500" />;
                    })}
                  </div>
                )}
            </section>

            <section className="space-y-4 rounded-2xl border border-border p-4">
              <SectionTitle icon={Award} title="Prestasi & Pelanggaran" caption="Catatan pembinaan bulan ini" />
              <div className="rounded-xl border border-dashed border-border p-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-amber-500" aria-hidden />Prestasi</div>
                <p className="mt-1 text-xs text-muted-foreground">Belum ada modul pencatatan prestasi.</p>
              </div>
              {violations.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada pelanggaran tercatat bulan ini.</p> : (
                <ul className="divide-y divide-border">
                  {violations.map((violation) => (
                    <li key={violation.id} className="flex items-start gap-2 py-2 text-sm">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{violation.violationType}</span>
                        <span className="block text-xs text-muted-foreground">
                          {violation.repetitions} × {violation.pointsPerOccurrence} = {violation.repetitions * violation.pointsPerOccurrence} poin
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="font-semibold">Total poin pelanggaran</span><span className="font-bold text-rose-700 dark:text-rose-300">{totalPoints}</span>
              </p>
            </section>
          </div>
          <footer className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <ChartNoAxesColumnIncreasing className="size-4" aria-hidden />
            Ringkasan berdasarkan catatan yang tersimpan pada periode aktif.
          </footer>
        </section>
      )}
    </div>
  );
}
