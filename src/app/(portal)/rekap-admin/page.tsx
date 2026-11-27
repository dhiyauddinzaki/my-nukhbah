import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, BookOpen, CalendarDays, ClipboardCheck, GraduationCap, House, Sparkles, Users } from "lucide-react";
import { BarReport, PieReport } from "@/features/reports/report-charts";
import { APP_CONFIG } from "@/config/constants";
import { semesterLabel } from "@/features/academic/period";
import { canAccess } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";
import { db } from "@/lib/db";

const card = "rounded-2xl border border-border bg-card p-5 shadow-sm";

export default async function RekapAdminPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  if (!canAccess(profile.role, "rekap-admin")) notFound();

  const params = await searchParams;
  const periods = await db.semester.findMany({
    include: { academicYear: true },
    orderBy: [{ startDate: "desc" }, { name: "desc" }],
  });
  const active = periods.find((period) => period.isActive && !period.closedAt && period.academicYear.isActive);
  const requested = typeof params.semester === "string" ? params.semester : "";
  const period = periods.find((period) => period.id === requested) ?? active ?? periods[0];

  const [
    enrollments,
    rooms,
    halaqahs,
    staffProfiles,
    journals,
    presences,
    tahfidzEntries,
    weeklyAdab,
    violations,
    intensiveEntries,
    ummiEntries,
  ] = period
    ? await Promise.all([
        db.enrollment.findMany({
          where: { semesterId: period.id },
          include: { student: { select: { id: true, nis: true, fullName: true } }, room: { select: { id: true, name: true } }, halaqah: { select: { id: true, name: true } } },
          orderBy: { student: { fullName: "asc" } },
        }),
        db.room.findMany({
          where: { semesterId: period.id },
          include: { supervisor: { select: { displayName: true } }, _count: { select: { enrollments: true } } },
          orderBy: { name: "asc" },
        }),
        db.halaqah.findMany({
          where: { semesterId: period.id },
          include: { teacher: { select: { displayName: true } }, _count: { select: { enrollments: true } } },
          orderBy: { name: "asc" },
        }),
        db.profile.findMany({ where: { role: "MUSYRIF", isActive: true }, select: { id: true, displayName: true } }),
        db.dormJournal.findMany({
          where: { semesterId: period.id },
          select: { id: true, date: true, roomId: true, createdById: true, presenceSubmittedAt: true, tahajjudSubmittedAt: true, pagiSubmittedAt: true, soreSubmittedAt: true, malamSubmittedAt: true },
        }),
        db.dormDailyPresence.findMany({
          where: { journal: { semesterId: period.id } },
          select: { studentId: true, status: true, journal: { select: { roomId: true } } },
        }),
        db.tahfidzEntry.findMany({
          where: { semesterId: period.id },
          include: { student: { select: { id: true, fullName: true } }, halaqah: { select: { name: true, teacher: { select: { displayName: true } } } } },
        }),
        db.dormWeeklyAdabScore.findMany({
          where: { review: { semesterId: period.id } },
          select: { studentId: true, haqLinafsih: true, haqLisyaikhih: true, haqLizamilih: true, haqLilMakan: true, haqLilKitab: true, haqLilIlm: true },
        }),
        db.dormViolation.findMany({
          where: { review: { semesterId: period.id } },
          select: { repetitions: true, pointsPerOccurrence: true },
        }),
        db.tahfizhIntensiveEntry.findMany({
          where: { semesterId: period.id, type: "ZIYADAH" },
          select: { pagesCompleted: true, isMurajaahWeek: true, createdById: true },
        }),
        db.ummiWeeklyEntry.findMany({
          where: { semesterId: period.id },
          select: { type: true, createdById: true },
        }),
      ])
    : [[], [], [], [], [], [], [], [], [], [], []];

  const presenceTotals = presences.reduce<Record<string, number>>((result, row) => {
    result[row.status] = (result[row.status] ?? 0) + 1;
    return result;
  }, {});
  const presenceData = [
    { name: "Hadir", value: presenceTotals.H ?? 0, fill: "#0f766e" },
    { name: "Sakit", value: presenceTotals.S ?? 0, fill: "#f59e0b" },
    { name: "Izin", value: presenceTotals.I ?? 0, fill: "#38bdf8" },
    { name: "Alpa", value: presenceTotals.A ?? 0, fill: "#ef4444" },
  ];

  const roomReport = rooms.map((room) => {
    const rows = presences.filter((row) => row.journal.roomId === room.id);
    const hadHadir = rows.filter((row) => row.status === "H").length;
    const percent = rows.length ? Math.round(hadHadir / rows.length * 100) : 0;
    return { name: room.name, value: percent };
  });

  const tahfidzReport = halaqahs.map((halaqah) => ({
    name: halaqah.name,
    value: tahfidzEntries.filter((entry) => entry.halaqah.name === halaqah.name).length,
  }));

  const weeklySubmissions = staffProfiles.map((staffMember) => {
    const dorm = journals.filter((journal) => journal.createdById === staffMember.id).length;
    const tahfidz = tahfidzEntries.filter((entry) => entry.halaqah.teacher?.displayName === staffMember.displayName).length;
    const extra = intensiveEntries.filter((entry) => entry.createdById === staffMember.id).length
      + ummiEntries.filter((entry) => entry.createdById === staffMember.id).length;
    return { name: staffMember.displayName, value: dorm + tahfidz + extra };
  }).sort((a, b) => b.value - a.value).slice(0, 12);

  const violationPoints = violations.reduce((total, violation) => total + violation.repetitions * violation.pointsPerOccurrence, 0);
  const intensivePages = intensiveEntries.reduce((total, entry) => total + (entry.isMurajaahWeek ? 0 : entry.pagesCompleted ?? 0), 0);
  const averageAdab = weeklyAdab.length
    ? Math.round(weeklyAdab.reduce((total, row) => total + (row.haqLinafsih + row.haqLisyaikhih + row.haqLizamilih + row.haqLilMakan + row.haqLilKitab + row.haqLilIlm) / 6, 0) / weeklyAdab.length * 10)
    : 0;
  const submissionCount = journals.filter((journal) => journal.presenceSubmittedAt).length
    + journals.filter((journal) => journal.tahajjudSubmittedAt).length
    + journals.filter((journal) => journal.pagiSubmittedAt).length
    + journals.filter((journal) => journal.soreSubmittedAt).length
    + journals.filter((journal) => journal.malamSubmittedAt).length;

  const studentRows = enrollments.map((enrollment) => {
    const studentPresences = presences.filter((row) => row.studentId === enrollment.student.id);
    const hadHadir = studentPresences.filter((row) => row.status === "H").length;
    return {
      id: enrollment.student.id,
      nis: enrollment.student.nis,
      name: enrollment.student.fullName,
      room: enrollment.room?.name ?? "—",
      hadir: studentPresences.length ? Math.round(hadHadir / studentPresences.length * 100) : 0,
      tahfidz: tahfidzEntries.filter((entry) => entry.student.id === enrollment.student.id).length,
    };
  }).sort((a, b) => b.hadir - a.hadir || b.tahfidz - a.tahfidz).slice(0, 30);

  return (
    <div className="space-y-5">
      <section className="mosque-panel relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-slate-950/10 sm:p-9">
        <div className="mosque-art -z-10" aria-hidden />
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-teal-200">{APP_CONFIG.name} · Rekap terpadu</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Rekap & Grafik</h1>
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-100"><CalendarDays className="size-4" aria-hidden />{period ? `${period.academicYear.name} · ${semesterLabel[period.name]}` : "Belum ada periode"}</p>
      </section>

      <form action="/rekap-admin" method="get" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-1 text-sm font-semibold">Tahun & semester
          <select name="semester" defaultValue={period?.id ?? ""} className="min-h-11 rounded-xl border border-border bg-background px-3">
            {periods.map((item) => (
              <option key={item.id} value={item.id}>{item.academicYear.name} · {semesterLabel[item.name]}{item.closedAt ? " · Arsip" : ""}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">Tampilkan</button>
      </form>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Santri aktif", value: enrollments.length, icon: Users, tone: "bg-teal-50 text-teal-800 dark:bg-teal-950/30 dark:text-teal-200" },
          { label: "Submisi asrama", value: submissionCount, icon: ClipboardCheck, tone: "bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200" },
          { label: "Entri Tahfidz", value: tahfidzEntries.length, icon: BookOpen, tone: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" },
          { label: "Poin pelanggaran", value: violationPoints, icon: GraduationCap, tone: "bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className={`${card} flex items-start gap-3`}>
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" aria-hidden /></span>
            <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className={card}>
          <header className="mb-3 flex items-center gap-3"><House className="size-5 text-teal-700" /><div><h2 className="font-bold">Kehadiran asrama</h2><p className="text-xs text-muted-foreground">Komposisi seluruh catatan harian</p></div></header>
          <PieReport data={presenceData} />
        </article>
        <article className={card}>
          <header className="mb-3 flex items-center gap-3"><BarChart3 className="size-5 text-teal-700" /><div><h2 className="font-bold">Kehadiran per kamar</h2><p className="text-xs text-muted-foreground">Persentase status Hadir</p></div></header>
          <BarReport data={roomReport} label="Persen hadir" />
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className={card}>
          <header className="mb-3 flex items-center gap-3"><BookOpen className="size-5 text-amber-700" /><div><h2 className="font-bold">Entri Tahfidz per halaqah</h2><p className="text-xs text-muted-foreground">Jumlah entri jurnal reguler</p></div></header>
          <BarReport data={tahfidzReport} label="Entri" />
        </article>
        <article className={card}>
          <header className="mb-3 flex items-center gap-3"><Sparkles className="size-5 text-sky-700" /><div><h2 className="font-bold">Aktivitas Murabbi & Muhaffizh</h2><p className="text-xs text-muted-foreground">Submisi asrama, Tahfidz, dan Ekstra</p></div></header>
          <BarReport data={weeklySubmissions} label="Submisi" />
        </article>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Halaman Intensif", value: intensivePages },
          { label: "Entri UMMI", value: ummiEntries.length },
          { label: "Rata-rata Adab", value: `${averageAdab}%` },
          { label: "Jumlah kamar", value: rooms.length },
        ].map((item) => (
          <article key={item.label} className={card}><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-2 text-2xl font-bold">{item.value}</p></article>
        ))}
      </section>

      <section className={card}>
        <header className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="font-bold">Ringkasan per santri</h2><p className="text-xs text-muted-foreground">30 santri teratas berdasarkan kehadiran dan jumlah Tahfidz</p></div>
          <Link href="/portfolio" className="text-sm font-bold text-teal-700 dark:text-teal-300">Portfolio</Link>
        </header>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-y border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-5 py-3">Santri</th><th className="px-4 py-3">Kamar</th><th className="px-4 py-3">Kehadiran</th><th className="px-4 py-3">Entri Tahfidz</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {studentRows.map((student) => (
                <tr key={student.id}><td className="px-5 py-3"><p className="font-semibold">{student.name}</p><p className="text-xs text-muted-foreground">{student.nis}</p></td><td className="px-4 py-3">{student.room}</td><td className="px-4 py-3 font-bold">{student.hadir}%</td><td className="px-4 py-3">{student.tahfidz}</td></tr>
              ))}
              {studentRows.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Belum ada santri pada periode ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
