import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { APP_CONFIG } from "@/config/constants";
import { getActiveSemester, semesterLabel } from "@/features/academic/period";
import { DormJournalForm } from "@/features/dorm/journal-form";
import { canAccess } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";
import { db } from "@/lib/db";
import { z } from "zod";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_CONFIG.timeZone }).format(new Date());
}

export default async function PembinaanPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  if (!canAccess(profile.role, "pembinaan")) notFound();

  const { room: roomParam, date: dateParam } = await searchParams;
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

  const requestedRoom = typeof roomParam === "string" && z.string().uuid().safeParse(roomParam).success ? roomParam : "";
  const selectedRoomId = rooms.some((r) => r.id === requestedRoom) ? requestedRoom : rooms[0]?.id ?? "";
  const rawDate = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayIso();
  const selectedDate = period && rawDate >= period.startDate.toISOString().slice(0, 10) && rawDate <= period.endDate.toISOString().slice(0, 10)
    ? rawDate
    : period ? (todayIso() >= period.startDate.toISOString().slice(0, 10) && todayIso() <= period.endDate.toISOString().slice(0, 10) ? todayIso() : period.startDate.toISOString().slice(0, 10)) : rawDate;
  const selectedDateObject = new Date(selectedDate + "T00:00:00.000Z");
  const weekStart = new Date(selectedDateObject);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const weekStartDate = weekStart.toISOString().slice(0, 10);

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
              weekStartDate: new Date(weekStartDate + "T00:00:00.000Z"),
            },
          },
          include: { adabScores: true, violations: true },
        })
    : null;

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

      <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold">Jurnal Kegiatan Asrama</h2>
        <p className="mt-1 text-sm text-muted-foreground">Isi kehadiran harian, shalat fardhu, dan foto kegiatan kamar.</p>

        {!period && <p className="mt-4 text-sm text-muted-foreground">Belum ada semester aktif. Hubungi Admin untuk mengaktifkan periode.</p>}
        {period && rooms.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {profile.role === "MUSYRIF" ? "Anda belum ditugaskan ke kamar pada semester aktif." : "Belum ada kamar pada semester aktif."}
          </p>
        )}
        {period && rooms.length > 0 && (
          <DormJournalForm
            key={`${selectedRoomId}:${selectedDate}:${weekStartDate}`}
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            selectedDate={selectedDate}
            minDate={period.startDate.toISOString().slice(0, 10)}
            maxDate={period.endDate.toISOString().slice(0, 10)}
            weekStartDate={weekStartDate}
            students={students.map((e) => e.student)}
            presenceRows={journal?.dailyPresences.map((row) => ({ ...row })) ?? []}
            tahajjudRows={journal?.tahajjudAssessments ?? []}
            activityRows={journal?.activityAttendances ?? []}
            adabRows={weeklyReview?.adabScores ?? []}
            violationRows={weeklyReview?.violations ?? []}
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
      </section>
    </>
  );
}
