import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { adabCriteria } from "@/features/dorm/constants";
import { requireProfile } from "@/features/auth/session";
import { db } from "@/lib/db";

const card = "space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm";

function isMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
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
  const requestedMonth = typeof params.month === "string" && isMonth(params.month) ? params.month : new Date().toISOString().slice(0, 7);
  const [yearText, monthText] = requestedMonth.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0));
  const period = await db.semester.findFirst({
    where: { isActive: true, closedAt: null, academicYear: { isActive: true } },
    select: { id: true, academicYear: { select: { name: true } } },
  });

  const enrollments = period
    ? await db.enrollment.findMany({
        where: {
          semesterId: period.id,
          ...(profile.role === "MUSYRIF" ? { room: { supervisorId: profile.id } } : {}),
        },
        include: { student: { select: { id: true, nis: true, fullName: true } }, room: { select: { name: true } } },
        orderBy: { student: { fullName: "asc" } },
      })
    : [];
  const selectedStudentId = typeof params.studentId === "string" ? params.studentId : "";
  const selectedEnrollment = enrollments.find((enrollment) => enrollment.studentId === selectedStudentId) ?? enrollments[0];
  const selectedStudent = selectedEnrollment?.student;

  const [absences, weeklyReviews] = selectedStudent && period
    ? await Promise.all([
        db.dormDailyPresence.findMany({
          where: {
            studentId: selectedStudent.id,
            status: { not: "H" },
            journal: {
              semesterId: period.id,
              date: { gte: monthStart, lte: monthEnd },
            },
          },
          include: { journal: { include: { room: { select: { name: true } } } } },
          orderBy: { journal: { date: "desc" } },
        }),
        db.dormWeeklyReview.findMany({
          where: {
            semesterId: period.id,
            weekStartDate: {
              gte: new Date(Date.UTC(year, monthNumber - 1, -6)),
              lte: monthEnd,
            },
          },
          include: {
            room: { select: { name: true } },
            adabScores: { where: { studentId: selectedStudent.id } },
            violations: { where: { studentId: selectedStudent.id } },
          },
          orderBy: { weekStartDate: "desc" },
        }),
      ])
    : [[], []];

  const totalPoints = weeklyReviews.flatMap((review) => review.violations)
    .reduce((sum, item) => sum + item.repetitions * item.pointsPerOccurrence, 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio Santri</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ringkasan kehadiran, penilaian adab, dan pelanggaran · {period?.academicYear.name ?? "Belum ada semester aktif"}.
        </p>
      </header>

      <section className={card}>
        {!period && <p className="text-sm text-muted-foreground">Belum ada semester aktif.</p>}
        {period && enrollments.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada santri dalam cakupan akses Anda di semester aktif.</p>}
        {period && enrollments.length > 0 && (
          <form action="/portfolio" method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="grid gap-1 text-sm font-semibold">
              Santri
              <select name="studentId" defaultValue={selectedStudent?.id} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm">
                {enrollments.map(({ student, room }) => (
                  <option key={student.id} value={student.id}>{student.fullName} · {room?.name ?? "Belum ada kamar"}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Bulan
              <input type="month" name="month" defaultValue={requestedMonth} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm" />
            </label>
            <Button type="submit" variant="outline">Tampilkan</Button>
          </form>
        )}
      </section>

      {selectedStudent && (
        <>
          <section className={card}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">{selectedStudent.fullName}</h2>
                <p className="text-sm text-muted-foreground">NIS {selectedStudent.nis} · Kamar {selectedEnrollment.room?.name ?? "Belum ada kamar"}</p>
              </div>
              <p className="rounded-full bg-muted px-3 py-1 text-sm font-bold">{totalPoints} poin pelanggaran</p>
            </div>
          </section>

          <section className={card}>
            <h2 className="text-lg font-bold">Daftar Izin · {requestedMonth}</h2>
            {absences.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada catatan selain Hadir pada bulan ini.</p> : (
              <ul className="divide-y divide-border">
                {absences.map((entry) => (
                  <li key={`${entry.journalId}:${entry.studentId}`} className="py-3">
                    <p className="font-semibold">{entry.journal.date.toISOString().slice(0, 10)} · {entry.status}</p>
                    <p className="text-sm text-muted-foreground">Kamar {entry.journal.room.name}{entry.note ? ` · ${entry.note}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className="text-lg font-bold">Penilaian Adab · Huquq Sittah</h2>
            {weeklyReviews.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada penilaian pada bulan ini.</p> : (
              <ul className="space-y-3">
                {weeklyReviews.map((review) => {
                  const score = review.adabScores[0];
                  if (!score) return null;
                  return (
                    <li key={review.id} className="rounded-xl border border-border p-3">
                      <p className="font-semibold">Pekan {review.weekStartDate.toISOString().slice(0, 10)} · Kamar {review.room.name}</p>
                      <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                        {adabCriteria.map(({ key, label }) => (
                          <li key={key} className="rounded-lg bg-muted p-2">
                            <span className="font-semibold">{label}: {score[key]}</span>
                            {score[`${key}Note` as keyof typeof score] && (
                              <span className="block text-muted-foreground">{score[`${key}Note` as keyof typeof score]}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className="text-lg font-bold">Pelanggaran · {requestedMonth}</h2>
            {weeklyReviews.every((review) => review.violations.length === 0)
              ? <p className="text-sm text-muted-foreground">Tidak ada pelanggaran yang tercatat pada bulan ini.</p>
              : (
                <ul className="divide-y divide-border">
                  {weeklyReviews.flatMap((review) => review.violations.map((violation) => (
                    <li key={violation.id} className="py-3">
                      <p className="font-semibold">{violation.violationType}</p>
                      <p className="text-sm text-muted-foreground">
                        Pekan {review.weekStartDate.toISOString().slice(0, 10)} · {violation.repetitions} × {violation.pointsPerOccurrence} = {violation.repetitions * violation.pointsPerOccurrence} poin
                      </p>
                    </li>
                  )))}
                </ul>
              )}
          </section>
        </>
      )}
    </div>
  );
}
