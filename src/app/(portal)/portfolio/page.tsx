import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarCheck2,
  ChartNoAxesColumnIncreasing,
  Heart,
  RotateCcw,
  Sparkles,
  Star,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { adabCriteria } from "@/features/dorm/constants";
import { requireProfile } from "@/features/auth/session";
import { getSupabaseAdminClient } from "@/features/auth/supabase-admin";
import { NarrativeForm } from "@/features/portfolio/narrative-form";
import { PortfolioPdfDownloadTrigger } from "@/features/portfolio/pdf-download-trigger";
import type { PortfolioPdfData } from "@/features/portfolio/pdf-download";
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
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(monthStart);
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
              {
                student: {
                  extraAssignments: {
                    some: {
                      semesterId: period.id,
                      program: "TAHFIZH_INTENSIF",
                      group: { teacherId: profile.id },
                    },
                  },
                },
              },
            ],
          } : {}),
          ...(profile.role === "WALI_SANTRI" ? {
            student: { guardians: { some: { guardianId: profile.id, isActive: true } } },
          } : {}),
        },
        include: {
          student: { select: { id: true, nis: true, fullName: true, portraitPath: true } },
          classroom: { select: { name: true } },
          room: {
            select: {
              name: true,
              supervisor: { select: { id: true, displayName: true, signaturePath: true } },
            },
          },
          halaqah: {
            select: {
              name: true,
              teacher: { select: { id: true, displayName: true, signaturePath: true } },
            },
          },
        },
        orderBy: { student: { fullName: "asc" } },
      })
    : [];
  const requestedStudentId = typeof params.studentId === "string" ? params.studentId : "";
  const selectedEnrollment = enrollments.find((enrollment) => enrollment.studentId === requestedStudentId) ?? enrollments[0];
  const selectedStudent = selectedEnrollment?.student;
  const extraAssignment = selectedStudent && period
    ? await db.extraStudentAssignment.findUnique({
        where: { semesterId_studentId: { semesterId: period.id, studentId: selectedStudent.id } },
        include: { group: { select: { name: true, program: true, teacher: { select: { id: true, displayName: true, signaturePath: true } } } } },
      })
    : null;

  const monthStartDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const [presenceRows, weeklyReviews, tahfidzEntries, intensiveEntries, narrative] = selectedStudent && period
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
            updatedBy: { select: { displayName: true } },
            adabScores: { where: { studentId: selectedStudent.id } },
            violations: { where: { studentId: selectedStudent.id } },
            achievements: { where: { studentId: selectedStudent.id } },
          },
          orderBy: { weekStartDate: "desc" },
        }),
        db.tahfidzEntry.findMany({
          where: {
            studentId: selectedStudent.id,
            semesterId: period.id,
            date: { gte: reportStart, lte: reportEnd },
          },
          include: {
            halaqah: { select: { name: true, teacher: { select: { displayName: true } } } },
            createdBy: { select: { displayName: true } },
          },
          orderBy: [{ date: "desc" }, { type: "asc" }],
        }),
        extraAssignment?.program === "TAHFIZH_INTENSIF"
          ? db.tahfizhIntensiveEntry.findMany({
              where: {
                studentId: selectedStudent.id,
                semesterId: period.id,
                groupId: extraAssignment.groupId,
                weekStartDate: {
                  gte: new Date(reportStart.getTime() - 6 * 86400000),
                  lte: reportEnd,
                },
                type: { in: ["ZIYADAH", "MURAJAAH", "TASMI"] },
              },
              include: { tasmiScores: true, createdBy: { select: { displayName: true } } },
              orderBy: { weekStartDate: "desc" },
            })
          : Promise.resolve([]),
        db.portfolioNarrative.findUnique({
          where: {
            semesterId_studentId_monthStart: {
              semesterId: period.id,
              studentId: selectedStudent.id,
              monthStart: monthStartDate,
            },
          },
        }),
      ])
    : [[], [], [], [], null];

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
  const intensivePages = intensiveEntries
    .filter((entry) => entry.type === "ZIYADAH" && !entry.isMurajaahWeek)
    .reduce((sum, entry) => sum + (entry.pagesCompleted ?? 0), 0);
  const intensiveTasmiCount = intensiveEntries
    .filter((entry) => entry.type === "TASMI" && entry.tasmiScores.length > 0).length;
  const intensiveProgress = Math.round(intensivePages / APP_CONFIG.intensiveSemesterTargetPages * 100);
  const intensiveLastZiyadah = [...intensiveEntries]
    .filter((entry) => entry.type === "ZIYADAH" && !entry.isMurajaahWeek)
    .sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime())[0];
  const intensiveMurajaah = intensiveEntries.filter((entry) => entry.type === "MURAJAAH");
  const intensiveMurajaahJadid = intensiveMurajaah.filter((entry) => entry.jadid).length;
  const intensiveMurajaahQadim = intensiveMurajaah.filter((entry) => entry.qadim).length;
  const intensiveTasmiEntries = intensiveEntries.filter((entry) => entry.type === "TASMI" && entry.tasmiScores.length > 0);
  const totalPoints = weeklyReviews.flatMap((review) => review.violations)
    .reduce((sum, item) => sum + item.repetitions * item.pointsPerOccurrence, 0);
  const violations = weeklyReviews.flatMap((review) => review.violations.map((violation) => ({
    ...violation,
    weekStartDate: review.weekStartDate,
  })));
  const achievements = weeklyReviews.flatMap((review) => review.achievements);
  const adabPercentages = adabCriteria.map(({ key, label }) => {
    const scores = weeklyReviews.flatMap((review) => review.adabScores.map((score) => score[key]));
    return {
      label,
      value: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 10) : 0,
      count: scores.length,
    };
  });
  const adabTutors = [...new Set(weeklyReviews
    .filter((review) => review.adabScores.length > 0)
    .map((review) => review.updatedBy.displayName))];
  const murabbi = selectedEnrollment?.room?.supervisor;
  const quranTeacher = extraAssignment?.group.teacher ?? selectedEnrollment?.halaqah?.teacher;
  const kepalaAsramaProfiles = selectedStudent
    ? await db.profile.findMany({
        where: { role: "KEPALA_ASRAMA", isActive: true },
        select: { displayName: true, signaturePath: true },
        orderBy: { displayName: "asc" },
      })
    : [];
  const rawSigners = [
    { role: "Murabbi", name: murabbi?.displayName ?? "Belum ditentukan", path: murabbi?.signaturePath ?? null },
    { role: "Muhaffizh", name: quranTeacher?.displayName ?? "Belum ditentukan", path: quranTeacher?.signaturePath ?? null },
    ...(kepalaAsramaProfiles.length
      ? kepalaAsramaProfiles.map((head) => ({ role: "Kepala Asrama", name: head.displayName, path: head.signaturePath }))
      : [{ role: "Kepala Asrama", name: "Belum ditentukan", path: null }]),
  ];
  const storage = rawSigners.some((signer) => signer.path) || selectedStudent?.portraitPath ? getSupabaseAdminClient() : null;
  if ((rawSigners.some((signer) => signer.path) || selectedStudent?.portraitPath) && !storage) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY dibutuhkan untuk menampilkan foto portfolio dan tanda tangan.");
  }
  async function signedMediaUrl(path: string | null | undefined) {
    if (!path || !storage) return null;
    const { data, error } = await storage.storage.from("mutabaah").createSignedUrl(path, 3600);
    if (error) {
      console.error("Gagal membuat URL media portfolio:", error);
      throw new Error("Media portfolio belum dapat ditampilkan. Periksa konfigurasi Supabase Storage.");
    }
    return data.signedUrl;
  }
  const [portraitUrl, signerUrls] = await Promise.all([
    signedMediaUrl(selectedStudent?.portraitPath),
    Promise.all(rawSigners.map((signer) => signedMediaUrl(signer.path))),
  ]);
  const signers = rawSigners.map((signer, index) => ({
    role: signer.role,
    name: signer.name,
    signatureUrl: signerUrls[index],
  }));
  const averageAdab = adabPercentages.filter((item) => item.count > 0);
  const conclusionCandidates = [
    ...(presenceTotal ? [{ label: "Kehadiran", value: presencePercent("H") }] : []),
    ...(ziyadahEntries.length || intensiveEntries.length
      ? [{
          label: extraAssignment?.program === "TAHFIZH_INTENSIF" ? "Tahfizh Intensif" : "Tahfizh",
          value: extraAssignment?.program === "TAHFIZH_INTENSIF" ? intensiveProgress : ziyadahPercent,
        }]
      : []),
    ...(averageAdab.length ? [{
      label: "Adab",
      value: Math.round(averageAdab.reduce((sum, item) => sum + item.value, 0) / averageAdab.length),
    }] : []),
  ];
  const conclusion = {
    good: [
      ...conclusionCandidates.filter((item) => item.value >= 80).map((item) => item.label),
      ...(achievements.length ? ["Prestasi"] : []),
    ],
    support: [
      ...conclusionCandidates.filter((item) => item.value < 80).map((item) => item.label),
      ...(totalPoints > 0 ? ["Kedisiplinan"] : []),
    ],
    hasData: conclusionCandidates.length > 0 || achievements.length > 0 || violations.length > 0,
  };
  const generatedOpening = conclusion.hasData
    ? `Alhamdulillah, yang sudah baik: ${conclusion.good.join(", ") || "konsistensi dan ikhtiar santri"}. Yang perlu pendampingan bersama: ${conclusion.support.join(", ") || "menjaga perkembangan positif"}.`
    : "Alhamdulillah, portfolio ini merangkum perkembangan santri berdasarkan catatan yang tersedia pada periode ini.";
  const regularLatestMurajaah = [...murajaahEntries].sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const pdfData: PortfolioPdfData | undefined = selectedStudent ? {
    appName: APP_CONFIG.name,
    pesantrenName: APP_CONFIG.pesantrenName,
    studentName: selectedStudent.fullName,
    nis: selectedStudent.nis,
    room: selectedEnrollment?.room?.name ?? "—",
    classroom: selectedEnrollment?.classroom?.name ?? "—",
    halaqah: extraAssignment?.group.name ?? selectedEnrollment?.halaqah?.name ?? "—",
    month: monthLabel,
    academicYear: period?.academicYear.name ?? "—",
    portraitUrl,
    attendance: {
      present: presencePercent("H"),
      sick: presencePercent("S"),
      permission: presencePercent("I"),
      absent: presencePercent("A"),
      total: presenceTotal,
    },
    tahfidz: extraAssignment?.program === "TAHFIZH_INTENSIF"
      ? [
          `Ziyadah: ${intensivePages} halaman · ${intensiveProgress}% target semester ${APP_CONFIG.intensiveSemesterTargetPages} halaman`,
          intensiveLastZiyadah ? `Posisi terakhir: Juz ${intensiveLastZiyadah.juzNumber ?? "—"}, halaman ${intensiveLastZiyadah.fromPage ?? "—"}–${intensiveLastZiyadah.toPage ?? "—"}` : "Posisi terakhir: belum ada catatan",
          `Murajaah: ${intensiveMurajaah.length} pekan · Jadid ${intensiveMurajaahJadid} · Qadim ${intensiveMurajaahQadim}`,
          ...intensiveTasmiEntries.map((entry) => `Tasmi' pekan ${entry.weekStartDate.toISOString().slice(0, 10)}: ${entry.tasmiScores.map((score) => `Juz ${score.juzNumber} ${score.grade}`).join(", ")}`),
        ]
      : [
          `Ziyadah: ${ziyadahLines} baris / ${ziyadahPages} halaman · ${ziyadahPercent}% target`,
          `Murajaah: ${murajaahEntries.length} kali · ${murajaahPercent}% target`,
          latestHafalan ? `Hafalan terakhir: Juz ${latestHafalan.juzNumber ?? "—"}, hal ${latestHafalan.fromPage ?? "—"}–${latestHafalan.toPage ?? "—"}` : "Hafalan terakhir: belum ada catatan",
          regularLatestMurajaah ? `Murajaah terakhir: Juz ${regularLatestMurajaah.juzNumber ?? "—"}, hal ${regularLatestMurajaah.fromPage ?? "—"}–${regularLatestMurajaah.toPage ?? "—"}` : "Murajaah terakhir: belum ada catatan",
        ],
    tahfidzProgress: extraAssignment?.program === "TAHFIZH_INTENSIF" ? intensiveProgress : ziyadahPercent,
    tahfidzTutor: quranTeacher?.displayName ?? "Belum ditentukan",
    adab: adabPercentages.filter((item) => item.count > 0).map(({ label, value }) => ({
      label,
      value,
      tutor: adabTutors.join(", ") || murabbi?.displayName || "Belum ditentukan",
    })),
    achievements: achievements.map((item) => `${item.title}${item.description ? ` — ${item.description}` : ""}`),
    violations: violations.map((item) => ({ title: item.violationType, points: item.repetitions * item.pointsPerOccurrence })),
    totalPoints,
    conclusion,
    narrative: {
      openingNote: narrative?.openingNote || generatedOpening,
      strengths: narrative?.strengths ?? "",
      growthAreas: narrative?.growthAreas ?? "",
      recommendation: narrative?.recommendation ?? "",
      developmentNote: narrative?.developmentNote ?? "",
    },
    signers,
  } : undefined;

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 via-teal-700 to-slate-800 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[28px] border-white/5" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.17em] text-teal-100">{APP_CONFIG.pesantrenName}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Portfolio Bulanan</h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">Ringkasan perkembangan, ikhtiar belajar, dan keseharian santri.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-sm backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-[.12em] text-teal-100">Periode laporan</p>
            <p className="mt-1 text-xl font-bold">{period ? monthLabel : "Belum aktif"}</p>
            <p className="mt-0.5 text-xs text-white/75">{period?.academicYear.name ?? "Pilih periode aktif"}</p>
          </div>
        </div>
      </header>

      <section className={card}>
        {!period && <p className="text-sm text-muted-foreground">Belum ada semester aktif.</p>}
        {profile.role === "WALI_SANTRI" && period && enrollments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Belum ada santri yang ditautkan ke akun ini. Hubungi Admin untuk mengatur akses portfolio.
          </p>
        )}
        {profile.role !== "WALI_SANTRI" && period && enrollments.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada santri dalam cakupan akses Anda di semester aktif.</p>}
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
          <header className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-teal-800 via-teal-700 to-slate-800 p-5 text-white sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              {portraitUrl ? (
                <img
                  src={portraitUrl}
                  alt={`Foto ${selectedStudent.fullName}`}
                  className="size-24 shrink-0 rounded-2xl border-2 border-white/40 object-cover shadow-md sm:size-28"
                />
              ) : (
                <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 sm:size-28">
                  <UserRound className="size-10 text-white/80" aria-hidden />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-teal-100">Profil santri</p>
                <h2 className="mt-1 truncate text-xl font-bold sm:text-2xl">{selectedStudent.fullName}</h2>
                <p className="mt-1 text-sm text-white/80">NIS {selectedStudent.nis}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-white/10 px-2.5 py-1">Kelas {selectedEnrollment?.classroom?.name ?? "—"}</span>
                  <span className="rounded-lg bg-white/10 px-2.5 py-1">Kamar {selectedEnrollment?.room?.name ?? "—"}</span>
                  <span className="rounded-lg bg-white/10 px-2.5 py-1">
                    {extraAssignment?.group.name ?? selectedEnrollment?.halaqah?.name ?? "Belum ada halaqah"}
                  </span>
                </div>
                {!portraitUrl && profile.role === "ADMIN" && (
                  <Link href="/admin/master" className="mt-2 inline-flex text-xs font-semibold text-teal-100 underline underline-offset-2">
                    Kelola foto profil santri
                  </Link>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-teal-100">Bulan</p>
                <p className="font-bold">{monthLabel}</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-amber-300/15 px-3 py-2 text-sm font-bold text-amber-100">
                <AlertTriangle className="size-4" aria-hidden />{totalPoints} poin
              </div>
              {profile.role === "ADMIN" && (
                <Link href="/admin/master" className="rounded-xl border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10">
                  Foto & tanda tangan
                </Link>
              )}
              {pdfData && <PortfolioPdfDownloadTrigger data={pdfData} />}
            </div>
          </header>

          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-border p-4">
              <SectionTitle
                icon={CalendarCheck2}
                title="Kehadiran"
                caption={`Komposisi status bulan ini · Murabbi: ${murabbi?.displayName ?? "Belum ditentukan"}`}
              />
              {presenceTotal === 0 ? <p className="text-sm text-muted-foreground">Belum ada kehadiran yang dicatat bulan ini.</p> : (
                <div className="space-y-3">
                  <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-label="Diagram komposisi kehadiran">
                    <span className="bg-emerald-600" style={{ width: `${presencePercent("H")}%` }} />
                    <span className="bg-sky-600" style={{ width: `${presencePercent("S")}%` }} />
                    <span className="bg-amber-500" style={{ width: `${presencePercent("I")}%` }} />
                    <span className="bg-rose-600" style={{ width: `${presencePercent("A")}%` }} />
                  </div>
                  <Meter label={`Hadir · ${presenceCount("H")} hari`} value={presencePercent("H")} color="bg-emerald-600" />
                  <Meter label={`Sakit · ${presenceCount("S")} hari`} value={presencePercent("S")} color="bg-sky-600" />
                  <Meter label={`Izin · ${presenceCount("I")} hari`} value={presencePercent("I")} color="bg-amber-500" />
                  <Meter label={`Alpa · ${presenceCount("A")} hari`} value={presencePercent("A")} color="bg-rose-600" />
                  <p className="text-xs text-muted-foreground">Berdasarkan {presenceTotal} catatan kehadiran tersimpan.</p>
                </div>
              )}
            </section>

            {extraAssignment?.program === "TAHFIZH_INTENSIF" ? (
              <section className="space-y-4 rounded-2xl border border-amber-900/15 border-l-4 border-l-amber-500 bg-amber-50/20 p-4 dark:bg-amber-950/10">
                <SectionTitle
                  icon={BookOpen}
                  title="Tahfizh Intensif Nukhbatul Huffazh"
                  caption={`${extraAssignment.group.name} · Muhaffizh: ${quranTeacher?.displayName ?? "Belum ditentukan"}`}
                />
                <div className="space-y-3">
                  <Meter label={`${intensivePages} halaman · target semester ${APP_CONFIG.intensiveSemesterTargetPages} halaman`} value={intensiveProgress} color="bg-amber-600" />
                  <p className="text-xs text-muted-foreground">Capaian dihitung dari pekan Ziyadah yang beririsan dengan bulan terpilih.</p>
                  <div className="rounded-xl bg-white/70 p-3 text-sm dark:bg-black/10">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Posisi hafalan terakhir</p>
                    {intensiveLastZiyadah ? (
                      <p className="mt-1 font-semibold">
                        Juz {intensiveLastZiyadah.juzNumber ?? "—"} · halaman {intensiveLastZiyadah.fromPage ?? "—"}–{intensiveLastZiyadah.toPage ?? "—"}
                      </p>
                    ) : <p className="mt-1 text-muted-foreground">Belum ada catatan Ziyadah.</p>}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/70 p-3 text-sm dark:bg-black/10">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Murajaah</p>
                      <p className="mt-1 font-semibold">{intensiveMurajaah.length} pekan</p>
                      <p className="text-xs text-muted-foreground">Jadid {intensiveMurajaahJadid} · Qadim {intensiveMurajaahQadim}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 p-3 text-sm dark:bg-black/10">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tasmi&apos;</p>
                      <p className="mt-1 font-semibold">{intensiveTasmiCount} pekan ujian</p>
                      {intensiveTasmiEntries.slice(0, 2).map((entry) => (
                        <p key={entry.id} className="text-xs text-muted-foreground">
                          {entry.tasmiScores.map((score) => `Juz ${score.juzNumber} ${score.grade}`).join(" · ")}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                    <span className="flex items-center gap-2 text-sm font-semibold"><Star className="size-4 text-amber-600" aria-hidden />Ujian Tasmi&apos;</span>
                    <span className="flex items-center gap-1" aria-label={`${intensiveTasmiCount} pekan ujian Tasmi'`}>
                      {Array.from({ length: Math.min(5, intensiveTasmiCount) }, (_, index) => <Star key={index} className="size-4 fill-amber-500 text-amber-600" aria-hidden />)}
                      {intensiveTasmiCount === 0 && <span className="text-xs text-muted-foreground">Belum ada</span>}
                    </span>
                  </div>
                </div>
              </section>
            ) : (
            <section className="space-y-4 rounded-2xl border border-border p-4">
              <SectionTitle
                icon={BookOpen}
                title="Tahfizh"
                caption={`${selectedEnrollment?.halaqah?.name ?? "Halaqah"} · Muhaffizh: ${quranTeacher?.displayName ?? "Belum ditentukan"}`}
              />
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
                <div className="rounded-xl bg-indigo-50/70 p-3 dark:bg-indigo-950/20">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Murajaah terakhir</p>
                  {regularLatestMurajaah ? (
                    <p className="mt-1 text-sm font-semibold">
                      Juz {regularLatestMurajaah.juzNumber ?? "—"} · Hal {regularLatestMurajaah.fromPage ?? "—"}–{regularLatestMurajaah.toPage ?? "—"}
                      {regularLatestMurajaah.fluencyGrade ? ` · Nilai ${regularLatestMurajaah.fluencyGrade}` : ""}
                    </p>
                  ) : <p className="mt-1 text-sm text-muted-foreground">Belum ada catatan Murajaah bulan ini.</p>}
                </div>
              </div>
            </section>
            )}

            <section className="space-y-4 rounded-2xl border border-border p-4">
              <SectionTitle
                icon={Heart}
                title="Penilaian Adab"
                caption={`Rata-rata Huquq Sittah · Murabbi: ${adabTutors.join(", ") || murabbi?.displayName || "Belum ditentukan"}`}
              />
              {weeklyReviews.every((review) => review.adabScores.length === 0)
                ? <p className="text-sm text-muted-foreground">Belum ada penilaian adab bulan ini.</p>
                : (
                  <div className="space-y-3">
                    {adabPercentages.map(({ label, value }) => {
                      return <Meter key={label} label={label} value={value} color="bg-amber-500" />;
                    })}
                  </div>
                )}
            </section>

            <section className="space-y-4 rounded-2xl border border-border p-4">
              <SectionTitle icon={Award} title="Prestasi & Pelanggaran" caption="Catatan pembinaan bulan ini" />
              <div className="rounded-xl border border-dashed border-border p-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-amber-500" aria-hidden />Prestasi</div>
                {achievements.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Belum ada prestasi tercatat bulan ini.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {achievements.map((achievement) => (
                      <li key={achievement.id}>
                        <p className="font-semibold">{achievement.title}</p>
                        {achievement.description && <p className="text-xs text-muted-foreground">{achievement.description}</p>}
                      </li>
                    ))}
                  </ul>
                )}
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
          <section className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 sm:p-5">
            {signers.map((signer) => (
              <div key={`${signer.role}-${signer.name}`} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                {signer.signatureUrl ? (
                  <img src={signer.signatureUrl} alt={`Tanda tangan ${signer.name}`} className="h-12 w-20 object-contain" />
                ) : (
                  <span className="flex h-12 w-20 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">Tanda tangan</span>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">{signer.role}</p>
                  <p className="text-sm font-semibold">{signer.name}</p>
                </div>
              </div>
            ))}
          </section>
          <footer className="flex items-center gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <ChartNoAxesColumnIncreasing className="size-4" aria-hidden />
            {profile.role === "WALI_SANTRI" ? "Tampilan wali hanya-baca. Nilai dihitung dari catatan yang tersimpan." : "Ringkasan berdasarkan catatan yang tersimpan pada periode aktif."}
          </footer>
        </section>
      )}
      {selectedStudent && (
        <div className="space-y-4">
          <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-100">
                <Sparkles className="size-4" aria-hidden />Alhamdulillah, yang sudah baik
              </div>
              <p className="mt-2 text-sm text-emerald-950/80 dark:text-emerald-100/80">
                {conclusion.hasData ? conclusion.good.join(", ") || "Terus jaga konsistensi dan kebiasaan baik." : "Belum cukup catatan untuk menyusun kesimpulan otomatis."}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100">
                <Heart className="size-4" aria-hidden />Yang perlu pendampingan bersama
              </div>
              <p className="mt-2 text-sm text-amber-950/80 dark:text-amber-100/80">
                {conclusion.hasData ? conclusion.support.join(", ") || "Pertahankan perkembangan positif bersama." : "Lengkapi catatan agar kebutuhan pendampingan dapat terlihat."}
              </p>
            </div>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
          <section className={card}>
            <SectionTitle icon={Sparkles} title="Catatan perkembangan" caption="Narasi bulanan untuk portfolio santri" />
            {narrative ? (
              <div className="space-y-3 text-sm">
                <p>{narrative.openingNote || generatedOpening}</p>
                <p><span className="font-semibold">Perkembangan baik</span><br />{narrative.strengths || "—"}</p>
                <p><span className="font-semibold">Area penguatan</span><br />{narrative.growthAreas || "—"}</p>
                <p><span className="font-semibold">Arahan bulan berikutnya</span><br />{narrative.recommendation || "—"}</p>
                <p>{narrative.developmentNote || "—"}</p>
                <p className="text-xs text-muted-foreground">Diperbarui {narrative.updatedAt.toLocaleDateString("id-ID")}.</p>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <p>{generatedOpening}</p>
                <p className="text-muted-foreground">Catatan perkembangan belum ditambahkan.</p>
              </div>
            )}
          </section>
          {profile.role !== "WALI_SANTRI" && period && (
            <section className={card}>
              <SectionTitle icon={Heart} title="Sunting narasi" caption="Hanya Admin dan Murabbi dalam cakupan santri" />
              <NarrativeForm
                studentId={selectedStudent.id}
                month={requestedMonth}
                openingNote={narrative?.openingNote || generatedOpening}
                strengths={narrative?.strengths ?? ""}
                growthAreas={narrative?.growthAreas ?? ""}
                recommendation={narrative?.recommendation ?? ""}
                developmentNote={narrative?.developmentNote ?? ""}
              />
            </section>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
