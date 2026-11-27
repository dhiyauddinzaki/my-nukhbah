import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Crown,
  House,
  Medal,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { canAccess } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";
import { semesterLabel } from "@/features/academic/period";
import { db } from "@/lib/db";

type Candidate = {
  id: string;
  name: string;
  nis: string;
  room: string;
  score: number;
  metric: string;
  detail: string;
  coverage: number;
};

type Leaderboard = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: string;
  entries: Candidate[];
  direction?: "asc" | "desc";
};

const gradePoints = { A: 4, B: 3, C: 2, D: 1 } as const;
const podiumTone = [
  "border-amber-300 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/25",
  "border-slate-300 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40",
  "border-orange-300 bg-orange-50/70 dark:border-orange-950 dark:bg-orange-950/20",
];

function getTopThree(entries: Candidate[], direction: "asc" | "desc" = "desc") {
  const sorted = entries
    .filter((entry) => entry.coverage > 0)
    .sort((a, b) => (direction === "desc" ? b.score - a.score : a.score - b.score) || a.name.localeCompare(b.name, "id"));
  if (sorted.length === 0) return [];

  const cutoff = sorted[Math.min(2, sorted.length - 1)].score;
  let rank = 0;
  let previousScore: number | null = null;
  return sorted
    .filter((entry, index) => index < 3 || entry.score === cutoff)
    .map((entry, index) => {
      if (previousScore === null || entry.score !== previousScore) rank = index + 1;
      previousScore = entry.score;
      return { ...entry, rank };
    });
}

function LeaderboardCard({ board }: { board: Leaderboard }) {
  const leaders = getTopThree(board.entries, board.direction);
  const winnerCount = board.entries.filter((entry) => entry.coverage > 0).length;
  const Icon = board.icon;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-start gap-3 border-b border-border p-4 sm:p-5">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${board.tone}`}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">{board.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{board.subtitle}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">{winnerCount} santri</span>
      </header>
      {leaders.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">Belum ada catatan terkirim untuk kategori ini.</p>
      ) : (
        <ol className="space-y-2 p-3 sm:p-4">
          {leaders.map((entry) => (
            <li key={entry.id} className={`flex items-start gap-3 rounded-xl border p-3 ${podiumTone[Math.min(entry.rank - 1, 2)]}`}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background/80 text-sm font-extrabold tabular-nums">
                {entry.rank === 1 ? <Crown className="size-4 text-amber-600" aria-label="Peringkat pertama" /> : `#${entry.rank}`}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{entry.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.nis} · Kamar {entry.room}</p>
                <p className="mt-2 text-xs text-muted-foreground">{entry.detail}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-extrabold tabular-nums">{entry.metric}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{entry.coverage} catatan</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function monthValue(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function MutamayyizunPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  if (!canAccess(profile.role, "mutamayyizun")) notFound();

  const params = await searchParams;
  const periods = await db.semester.findMany({
    include: { academicYear: true },
    orderBy: [{ startDate: "desc" }, { name: "desc" }],
  });
  const activePeriod = periods.find((item) => item.isActive && !item.closedAt && item.academicYear.isActive);
  const requestedSemester = typeof params.semester === "string" ? params.semester : "";
  const period = periods.find((item) => item.id === requestedSemester) ?? activePeriod ?? periods[0];
  const startMonth = period ? monthValue(period.startDate) : "";
  const endMonth = period ? monthValue(period.endDate) : "";
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_CONFIG.timeZone,
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const requestedMonth = typeof params.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
    ? params.month
    : "";
  const defaultMonth = period && currentMonth >= startMonth && currentMonth <= endMonth ? currentMonth : startMonth;
  const selectedMonth = period && requestedMonth >= startMonth && requestedMonth <= endMonth
    ? requestedMonth
    : defaultMonth;
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);

  const [enrollments, journals, weeklyReviews, tahfidzEntries, intensiveEntries, intensiveAssignments] = period
    ? await Promise.all([
        db.enrollment.findMany({
          where: { semesterId: period.id },
          include: {
            student: { select: { id: true, nis: true, fullName: true } },
            room: { select: { id: true, name: true } },
          },
          orderBy: { student: { fullName: "asc" } },
        }),
        db.dormJournal.findMany({
          where: {
            semesterId: period.id,
            date: { gte: monthStart, lte: monthEnd },
            presenceSubmittedAt: { not: null },
          },
          select: { dailyPresences: { select: { studentId: true, status: true } } },
        }),
        db.dormWeeklyReview.findMany({
          where: {
            semesterId: period.id,
            weekStartDate: { gte: monthStart, lte: monthEnd },
          },
          select: {
            roomId: true,
            adabSubmittedAt: true,
            violationsSubmittedAt: true,
            achievementsSubmittedAt: true,
            adabScores: {
              select: {
                studentId: true,
                haqLinafsih: true,
                haqLisyaikhih: true,
                haqLizamilih: true,
                haqLilMakan: true,
                haqLilKitab: true,
                haqLilIlm: true,
              },
            },
            violations: { select: { studentId: true, repetitions: true, pointsPerOccurrence: true } },
            achievements: { select: { studentId: true } },
          },
        }),
        db.tahfidzEntry.findMany({
          where: {
            semesterId: period.id,
            date: { gte: monthStart, lte: monthEnd },
            type: { in: ["ZIYADAH", "MURAJAAH"] },
          },
          select: { studentId: true, lineCount: true, fluencyGrade: true },
        }),
        db.tahfizhIntensiveEntry.findMany({
          where: {
            semesterId: period.id,
            weekStartDate: { gte: monthStart, lte: monthEnd },
            type: "ZIYADAH",
            isMurajaahWeek: false,
          },
          select: { studentId: true, pagesCompleted: true },
        }),
        db.extraStudentAssignment.findMany({
          where: { semesterId: period.id, program: "TAHFIZH_INTENSIF" },
          select: { studentId: true },
        }),
      ])
    : [[], [], [], [], [], []];

  const attendanceByStudent = new Map<string, { present: number; total: number }>();
  for (const journal of journals) {
    for (const row of journal.dailyPresences) {
      const current = attendanceByStudent.get(row.studentId) ?? { present: 0, total: 0 };
      current.total += 1;
      if (row.status === "H") current.present += 1;
      attendanceByStudent.set(row.studentId, current);
    }
  }

  const adabByStudent = new Map<string, { total: number; records: number }>();
  const violationsByStudent = new Map<string, number>();
  const achievementsByStudent = new Map<string, number>();
  const completedViolationReviews = weeklyReviews.filter((review) => review.violationsSubmittedAt);
  for (const review of weeklyReviews) {
    if (review.adabSubmittedAt) {
      for (const score of review.adabScores) {
        const current = adabByStudent.get(score.studentId) ?? { total: 0, records: 0 };
        current.total += score.haqLinafsih + score.haqLisyaikhih + score.haqLizamilih
          + score.haqLilMakan + score.haqLilKitab + score.haqLilIlm;
        current.records += 1;
        adabByStudent.set(score.studentId, current);
      }
    }
    if (review.violationsSubmittedAt) {
      for (const violation of review.violations) {
        const points = violation.repetitions * violation.pointsPerOccurrence;
        violationsByStudent.set(violation.studentId, (violationsByStudent.get(violation.studentId) ?? 0) + points);
      }
    }
    if (review.achievementsSubmittedAt) {
      for (const achievement of review.achievements) {
        achievementsByStudent.set(achievement.studentId, (achievementsByStudent.get(achievement.studentId) ?? 0) + 1);
      }
    }
  }

  const fluencyByStudent = new Map<string, { total: number; records: number; lines: number }>();
  for (const entry of tahfidzEntries) {
    const current = fluencyByStudent.get(entry.studentId) ?? { total: 0, records: 0, lines: 0 };
    current.lines += entry.lineCount ?? 0;
    if (entry.fluencyGrade) {
      current.total += gradePoints[entry.fluencyGrade];
      current.records += 1;
    }
    fluencyByStudent.set(entry.studentId, current);
  }

  const intensiveByStudent = new Map<string, { pages: number; records: number }>();
  for (const entry of intensiveEntries) {
    const current = intensiveByStudent.get(entry.studentId) ?? { pages: 0, records: 0 };
    current.pages += entry.pagesCompleted ?? 0;
    current.records += 1;
    intensiveByStudent.set(entry.studentId, current);
  }

  const candidates = enrollments.map(({ student, room }) => ({
    id: student.id,
    name: student.fullName,
    nis: student.nis,
    room: room?.name ?? "Belum ditetapkan",
    roomId: room?.id ?? null,
  }));
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const makeCandidate = (studentId: string, values: Omit<Candidate, "id" | "name" | "nis" | "room">): Candidate | null => {
    const student = candidateById.get(studentId);
    return student ? { ...student, ...values } : null;
  };
  const attendanceBoard = candidates.flatMap((student) => {
    const data = attendanceByStudent.get(student.id);
    const candidate = data && makeCandidate(student.id, {
      score: data.present / data.total,
      metric: `${Math.round(data.present / data.total * 100)}%`,
      detail: `${data.present} hadir dari ${data.total} catatan kehadiran`,
      coverage: data.total,
    });
    return candidate ? [candidate] : [];
  });
  const adabBoard = candidates.flatMap((student) => {
    const data = adabByStudent.get(student.id);
    const average = data && data.total / (data.records * 6);
    const candidate = data && average !== undefined && makeCandidate(student.id, {
      score: average,
      metric: `${average.toFixed(1)}/10`,
      detail: "Rata-rata enam kriteria Huquq Sittah",
      coverage: data.records,
    });
    return candidate ? [candidate] : [];
  });
  const tahfidzBoard = candidates.flatMap((student) => {
    const data = fluencyByStudent.get(student.id);
    const average = data && data.records > 0 ? data.total / data.records : 0;
    const candidate = data && data.records > 0 && makeCandidate(student.id, {
      score: average,
      metric: `${average.toFixed(1)}/4`,
      detail: `${data.lines} baris · rata-rata nilai kelancaran`,
      coverage: data.records,
    });
    return candidate ? [candidate] : [];
  });
  const intensiveStudentIds = new Set(intensiveAssignments.map(({ studentId }) => studentId));
  const intensiveBoard = candidates.flatMap((student) => {
    if (!intensiveStudentIds.has(student.id)) return [];
    const data = intensiveByStudent.get(student.id);
    const candidate = data && data.records > 0 && makeCandidate(student.id, {
      score: data.pages,
      metric: `${data.pages} hal`,
      detail: "Total halaman Ziyadah, di luar pekan Murajaah",
      coverage: data.records,
    });
    return candidate ? [candidate] : [];
  });
  const achievementBoard = candidates.flatMap((student) => {
    const count = achievementsByStudent.get(student.id) ?? 0;
    const candidate = count > 0 && makeCandidate(student.id, {
      score: count,
      metric: `${count} prestasi`,
      detail: "Catatan apresiasi yang sudah dikirim",
      coverage: count,
    });
    return candidate ? [candidate] : [];
  });
  const disciplineBoard = candidates.flatMap((student) => {
    const reviews = student.roomId
      ? completedViolationReviews.filter((review) => review.roomId === student.roomId).length
      : 0;
    const totalPoints = violationsByStudent.get(student.id) ?? 0;
    const averagePoints = reviews > 0 ? totalPoints / reviews : 0;
    const candidate = reviews > 0 && makeCandidate(student.id, {
      score: averagePoints,
      metric: `${averagePoints.toFixed(1)} poin/pekan`,
      detail: `${totalPoints} poin dalam ${reviews} pekan yang diperiksa`,
      coverage: reviews,
    });
    return candidate ? [candidate] : [];
  });

  const totalAchievementRecords = Array.from(achievementsByStudent.values()).reduce((sum, count) => sum + count, 0);
  const totalViolationPoints = Array.from(violationsByStudent.values()).reduce((sum, points) => sum + points, 0);
  const totalViolationRecords = completedViolationReviews.reduce(
    (total, review) => total + review.violations.length,
    0,
  );
  const boards: Leaderboard[] = [
    {
      title: "Kehadiran",
      subtitle: "Persentase Hadir dari catatan kehadiran yang sudah dikirim.",
      icon: House,
      tone: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
      entries: attendanceBoard,
    },
    {
      title: "Adab · Huquq Sittah",
      subtitle: "Rata-rata enam hak; hanya penilaian pekanan yang sudah dikirim.",
      icon: Star,
      tone: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
      entries: adabBoard,
    },
    {
      title: "Tahfizh Reguler",
      subtitle: "Rata-rata kelancaran Ziyadah/Murajaah yang sudah dinilai (A=4 hingga D=1).",
      icon: BookOpenCheck,
      tone: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200",
      entries: tahfidzBoard,
    },
    {
      title: "Tahfizh Intensif",
      subtitle: "Jumlah halaman Ziyadah; pekan Murajaah tidak dihitung.",
      icon: Medal,
      tone: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
      entries: intensiveBoard,
    },
    {
      title: "Prestasi & Reward",
      subtitle: "Jumlah catatan apresiasi yang tercatat pada rekap pekanan.",
      icon: Sparkles,
      tone: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-200",
      entries: achievementBoard,
    },
    {
      title: "Kedisiplinan",
      subtitle: "Rata-rata poin pelanggaran per pekan yang sudah diperiksa; lebih rendah lebih baik.",
      icon: ShieldCheck,
      tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
      entries: disciplineBoard,
      direction: "asc",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="mosque-panel relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-slate-950/10 sm:p-9">
        <div className="mosque-art -z-10" aria-hidden />
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-teal-200">
          <Trophy className="size-4" aria-hidden />{APP_CONFIG.name} · apresiasi santri
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mutamayyizun</h1>
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-100">
          <CalendarDays className="size-4" aria-hidden />
          {period ? `${period.academicYear.name} · ${semesterLabel[period.name]} · ${monthLabel}` : "Belum ada periode akademik"}
        </p>
      </section>

      <form action="/mutamayyizun" method="get" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-1 text-sm font-semibold">
          Tahun & semester
          <select name="semester" defaultValue={period?.id ?? ""} className="min-h-11 rounded-xl border border-border bg-background px-3" disabled={periods.length === 0}>
            {periods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.academicYear.name} · {semesterLabel[item.name]}{item.closedAt ? " · Arsip" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Bulan penilaian
          <input
            type="month"
            name="month"
            min={startMonth || undefined}
            max={endMonth || undefined}
            defaultValue={selectedMonth}
            className="min-h-11 rounded-xl border border-border bg-background px-3"
            disabled={!period}
          />
        </label>
        <Button type="submit" disabled={!period}>Tampilkan</Button>
      </form>

      {!period ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <CalendarDays className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 font-bold">Belum ada semester</h2>
          <p className="mt-1 text-sm text-muted-foreground">Buat periode akademik dan data kelompok sebelum melihat peringkat.</p>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Catatan prestasi", value: totalAchievementRecords, icon: Award, tone: "bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-950/30 dark:text-fuchsia-200" },
              { label: "Catatan pelanggaran", value: totalViolationRecords, icon: CheckCircle2, tone: "bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" },
              { label: "Poin pelanggaran", value: totalViolationPoints, icon: ShieldCheck, tone: "bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-200" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <article key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" aria-hidden /></span>
                <div><p className="text-xs text-muted-foreground">{label} · {monthLabel}</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p></div>
              </article>
            ))}
          </section>

          <aside className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100 sm:flex-row sm:items-center">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/70"><Trophy className="size-5" aria-hidden /></span>
            <p className="flex-1 text-sm leading-relaxed">
              Peringkat diberikan terpisah per kategori, tanpa skor gabungan. Hanya catatan yang sudah dikirim yang dihitung; jumlah catatan di samping nama menunjukkan cakupan data, jadi bandingkan cakupannya sebelum menetapkan apresiasi.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-9 px-3 text-xs"><Link href="/asrama?view=pelanggaran">Rekap Asrama</Link></Button>
              {profile.role === "ADMIN" && <Button asChild className="min-h-9 px-3 text-xs"><Link href="/pembinaan?frequency=weekly">Catat Reward</Link></Button>}
            </div>
          </aside>

          <section className="grid gap-4 xl:grid-cols-2">
            {boards.map((board) => <LeaderboardCard key={board.title} board={board} />)}
          </section>
        </>
      )}
    </div>
  );
}
