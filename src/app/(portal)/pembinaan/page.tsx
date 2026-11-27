import { notFound } from "next/navigation";
import { BookOpen, CalendarDays, House } from "lucide-react";
import { APP_CONFIG } from "@/config/constants";
import { getActiveSemester, semesterLabel } from "@/features/academic/period";
import { DormJournalForm } from "@/features/dorm/journal-form";
import { TahfidzForm } from "@/features/tahfidz/tahfidz-form";
import { canAccess } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";
import { db } from "@/lib/db";
import { z } from "zod";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_CONFIG.timeZone }).format(new Date());
}

function isoWeekStart(value: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - ((januaryFourth.getUTCDay() + 6) % 7) + (week - 1) * 7);
  return monday;
}

export default async function PembinaanPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  if (!canAccess(profile.role, "pembinaan")) notFound();

  const { room: roomParam, halaqah: halaqahParam, date: dateParam, week: weekParam, frequency: frequencyParam } = await searchParams;
  const period = await getActiveSemester();
  const rooms = period
    ? await db.room.findMany({
        where: {
          semesterId: period.id,
          ...(profile.role === "MUSYRIF" ? { supervisorId: profile.id } : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];
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
  const intensiveStudentIds = period
      ? (await db.extraStudentAssignment.findMany({
          where: { semesterId: period.id, program: "TAHFIZH_INTENSIF" },
          select: { studentId: true },
        })).map(({ studentId }) => studentId)
      : [];

  const requestedRoom = typeof roomParam === "string" && z.string().uuid().safeParse(roomParam).success ? roomParam : "";
  const selectedRoomId = rooms.some((r) => r.id === requestedRoom) ? requestedRoom : rooms[0]?.id ?? "";
  const requestedHalaqah = typeof halaqahParam === "string" && z.string().uuid().safeParse(halaqahParam).success ? halaqahParam : "";
  const selectedHalaqahId = halaqahs.some((halaqah) => halaqah.id === requestedHalaqah) ? requestedHalaqah : halaqahs[0]?.id ?? "";
  const rawDate = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayIso();
  const selectedDate = period && rawDate >= period.startDate.toISOString().slice(0, 10) && rawDate <= period.endDate.toISOString().slice(0, 10)
    ? rawDate
    : period ? (todayIso() >= period.startDate.toISOString().slice(0, 10) && todayIso() <= period.endDate.toISOString().slice(0, 10) ? todayIso() : period.startDate.toISOString().slice(0, 10)) : rawDate;
  const selectedDateObject = new Date(selectedDate + "T00:00:00.000Z");
  const weekStart = new Date(selectedDateObject);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const requestedWeekStart = typeof weekParam === "string" ? isoWeekStart(weekParam) : null;
  const requestedWeekEnd = requestedWeekStart ? new Date(requestedWeekStart) : null;
  requestedWeekEnd?.setUTCDate(requestedWeekEnd.getUTCDate() + 6);
  const requestedWeekInPeriod = !period || !requestedWeekStart || !requestedWeekEnd
    || (requestedWeekEnd >= period.startDate && requestedWeekStart <= period.endDate);
  const selectedWeekStart = requestedWeekStart && requestedWeekInPeriod ? requestedWeekStart : weekStart;
  const selectedWeekStartDate = selectedWeekStart.toISOString().slice(0, 10);

  const students = period && selectedRoomId
    ? await db.enrollment.findMany({
        where: { semesterId: period.id, roomId: selectedRoomId },
        include: { student: { select: { id: true, nis: true, fullName: true } } },
        orderBy: { student: { fullName: "asc" } },
      })
    : [];

  const journal = period && selectedRoomId
    ? await db.dormJournal.findUnique({
        where: { semesterId_roomId_date: { semesterId: period.id, roomId: selectedRoomId, date: new Date(selectedDate + "T00:00:00.000Z") } },
          include: {
            dailyPresences: true,
            tahajjudAssessments: true,
            activityAttendances: true,
          },
      })
    : null;
  const weeklyReview = period && selectedRoomId
    ? await db.dormWeeklyReview.findUnique({
          where: {
            semesterId_roomId_weekStartDate: {
              semesterId: period.id,
              roomId: selectedRoomId,
              weekStartDate: new Date(selectedWeekStartDate + "T00:00:00.000Z"),
            },
          },
          include: { adabScores: true, violations: true, achievements: true },
        })
    : null;
  const halaqahStudents = period && selectedHalaqahId
    ? await db.enrollment.findMany({
        where: {
          semesterId: period.id,
          halaqahId: selectedHalaqahId,
          studentId: { notIn: intensiveStudentIds },
        },
        include: { student: { select: { id: true, nis: true, fullName: true } } },
        orderBy: { student: { fullName: "asc" } },
      })
    : [];
  const tahfidzEntries = period && selectedHalaqahId
    ? await db.tahfidzEntry.findMany({
        where: {
          semesterId: period.id,
          halaqahId: selectedHalaqahId,
          date: new Date(selectedWeekStartDate + "T00:00:00.000Z"),
        },
        include: { student: { select: { fullName: true } } },
        orderBy: [{ student: { fullName: "asc" } }, { type: "asc" }],
      })
    : [];
  const tahfidzHistory = period && selectedHalaqahId
    ? await db.tahfidzEntry.findMany({
        where: { semesterId: period.id, halaqahId: selectedHalaqahId },
        include: { student: { select: { fullName: true } } },
        orderBy: [{ date: "desc" }, { student: { fullName: "asc" } }, { type: "asc" }],
        take: 20,
      })
    : [];

  return (
    <>
      <section className="mosque-panel relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-slate-950/10 sm:p-10">
        <div className="mosque-art -z-10" aria-hidden />
        <p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-teal-200">{APP_CONFIG.name}</p>
        <h1 className="max-w-[85%] text-3xl font-bold tracking-tight sm:text-5xl">Ruang Pembinaan</h1>
        <p className="mt-5 flex items-center gap-2 text-sm text-slate-100">
          <CalendarDays className="size-4 shrink-0" aria-hidden />{period ? `${period.academicYear.name} · ${semesterLabel[period.name]}` : "Belum ada semester aktif"}
        </p>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <header className="flex items-center gap-3 border-l-4 border-l-amber-500 bg-amber-50/70 p-4 dark:bg-amber-950/20 sm:p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <House className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-amber-800 dark:text-amber-200">Asrama · pembinaan keseharian</p>
            <h2 className="text-lg font-bold">Jurnal Asrama</h2>
          </div>
        </header>
        <div className="space-y-4 p-4 sm:p-6">

        {!period && <p className="mt-4 text-sm text-muted-foreground">Belum ada semester aktif. Hubungi Admin untuk mengaktifkan periode.</p>}
        {period && rooms.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {profile.role === "MUSYRIF" ? "Anda belum ditugaskan ke kamar pada semester aktif." : "Belum ada kamar pada semester aktif."}
          </p>
        )}
        {period && rooms.length > 0 && (
          <DormJournalForm
            key={`${selectedRoomId}:${selectedDate}:${selectedWeekStartDate}`}
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            selectedDate={selectedDate}
            minDate={period.startDate.toISOString().slice(0, 10)}
            maxDate={period.endDate.toISOString().slice(0, 10)}
            weekStartDate={selectedWeekStartDate}
            initialFrequency={frequencyParam === "weekly" ? "weekly" : "daily"}
            students={students.map((e) => e.student)}
            presenceRows={journal?.dailyPresences.map((row) => ({ ...row })) ?? []}
            tahajjudRows={journal?.tahajjudAssessments ?? []}
            activityRows={journal?.activityAttendances ?? []}
            adabRows={weeklyReview?.adabScores ?? []}
            violationRows={weeklyReview?.violations ?? []}
            achievementRows={weeklyReview?.achievements.map((row) => ({
              ...row,
              description: row.description ?? "",
            })) ?? []}
            photos={{
              tahajjud: !!journal?.tahajjudPhotoPath,
              pagi: !!journal?.pagiPhotoPath,
              sore: !!journal?.sorePhotoPath,
              malam: !!journal?.malamPhotoPath,
            }}
            submitted={{
              presence: !!journal?.presenceSubmittedAt,
              tahajjud: !!journal?.tahajjudSubmittedAt,
              pagi: !!journal?.pagiSubmittedAt,
              sore: !!journal?.soreSubmittedAt,
              malam: !!journal?.malamSubmittedAt,
              adab: !!weeklyReview?.adabSubmittedAt,
              violations: !!weeklyReview?.violationsSubmittedAt,
            }}
          />
        )}
        </div>
      </section>
      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <header className="flex items-center gap-3 border-l-4 border-l-teal-600 bg-teal-50/70 p-4 dark:bg-teal-950/20 sm:p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-teal-800 dark:text-teal-200">Al-Quran · ziyadah & pemeliharaan hafalan</p>
            <h2 className="text-lg font-bold">Jurnal Tahfizh</h2>
          </div>
        </header>
        <div className="space-y-4 p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Catat posisi hafalan per juz dan halaman untuk setiap pekan.</p>
        {!period && <p className="mt-4 text-sm text-muted-foreground">Belum ada semester aktif.</p>}
        {period && halaqahs.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {profile.role === "MUSYRIF" ? "Anda belum ditugaskan ke halaqah pada semester aktif." : "Belum ada halaqah pada semester aktif."}
          </p>
        )}
        {period && halaqahs.length > 0 && (
          <TahfidzForm
            key={`${selectedHalaqahId}:${selectedWeekStartDate}`}
            halaqahs={halaqahs}
            selectedHalaqahId={selectedHalaqahId}
            weekStartDate={selectedWeekStartDate}
            students={halaqahStudents.map((enrollment) => enrollment.student)}
            entries={tahfidzEntries.map((entry) => ({
              studentId: entry.studentId,
              type: entry.type,
              lineCount: entry.lineCount,
              juzNumber: entry.juzNumber,
              fromPage: entry.fromPage,
              toPage: entry.toPage,
              fluencyGrade: entry.fluencyGrade,
              assessment: entry.assessment,
              score: entry.score,
              note: entry.note,
            }))}
            history={tahfidzHistory.map((entry) => ({
              studentId: entry.studentId,
              type: entry.type,
              date: entry.date,
              updatedAt: entry.updatedAt,
              lineCount: entry.lineCount,
              juzNumber: entry.juzNumber,
              fromPage: entry.fromPage,
              toPage: entry.toPage,
              fluencyGrade: entry.fluencyGrade,
              assessment: entry.assessment,
              score: entry.score,
              note: entry.note,
              student: entry.student,
            }))}
          />
        )}
        </div>
      </section>
    </>
  );
}
