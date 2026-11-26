import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2, CircleAlert } from "lucide-react";
import { APP_CONFIG } from "@/config/constants";
import { getActiveSemester, semesterLabel } from "@/features/academic/period";
import { canAccess } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { tahfidzTypes } from "@/features/tahfidz/constants";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_CONFIG.timeZone }).format(new Date());
}

export default async function AsramaPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  if (!canAccess(profile.role, "asrama")) notFound();

  const { date: dateParam, view } = await searchParams;
  const selectedView = typeof view === "string" ? view : "kelengkapan";
  const period = await getActiveSemester();
  const rawDate = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayIso();
  const selectedDate = period && rawDate >= period.startDate.toISOString().slice(0, 10) && rawDate <= period.endDate.toISOString().slice(0, 10)
    ? rawDate
    : period ? (todayIso() >= period.startDate.toISOString().slice(0, 10) && todayIso() <= period.endDate.toISOString().slice(0, 10) ? todayIso() : period.startDate.toISOString().slice(0, 10)) : rawDate;
  const weekStart = new Date(selectedDate + "T00:00:00.000Z");
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const formatDate = (date: Date) => new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  const canSeeSensitiveRecaps = profile.role === "ADMIN" || profile.role === "KEPALA_ASRAMA";

  const rooms = period
    ? await db.room.findMany({
        where: {
          semesterId: period.id,
          ...(profile.role === "MUSYRIF" ? { supervisorId: profile.id } : {}),
        },
        include: {
          supervisor: { select: { displayName: true } },
          _count: { select: { enrollments: true } },
          dormJournals: {
            where: { date: new Date(selectedDate + "T00:00:00.000Z") },
            select: {
              id: true,
              updatedAt: true,
              presenceSubmittedAt: true,
              tahajjudSubmittedAt: true,
              pagiSubmittedAt: true,
              soreSubmittedAt: true,
              malamSubmittedAt: true,
            },
          },
        },
        orderBy: { name: "asc" },
      })
    : [];
  const [absences, violations] = period && canSeeSensitiveRecaps
    ? await Promise.all([
        db.dormDailyPresence.findMany({
          where: {
            status: { not: "H" },
            journal: { semesterId: period.id, date: new Date(selectedDate + "T00:00:00.000Z") },
          },
          include: { student: { select: { id: true, nis: true, fullName: true } }, journal: { include: { room: { select: { name: true } } } } },
          orderBy: [{ status: "asc" }, { student: { fullName: "asc" } }],
        }),
        db.dormViolation.findMany({
          where: {
            review: {
              semesterId: period.id,
              weekStartDate: weekStart,
            },
          },
          include: {
            student: { select: { id: true, nis: true, fullName: true } },
            review: { include: { room: { select: { name: true } } } },
          },
          orderBy: [{ student: { fullName: "asc" } }, { violationType: "asc" }],
        }),
      ])
    : [[], []];
  const halaqahs = period
    ? await db.halaqah.findMany({
        where: {
          semesterId: period.id,
          ...(profile.role === "MUSYRIF" ? { teacherId: profile.id } : {}),
        },
        include: {
          teacher: { select: { displayName: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { name: "asc" },
      })
    : [];
  const tahfidzEntries = period
    ? await db.tahfidzEntry.findMany({
        where: {
          semesterId: period.id,
          date: weekStart,
          ...(profile.role === "MUSYRIF"
            ? { halaqah: { teacherId: profile.id } }
            : {}),
        },
        include: {
          halaqah: { select: { name: true } },
          student: { select: { fullName: true } },
        },
        orderBy: [{ halaqah: { name: "asc" } }, { student: { fullName: "asc" } }, { type: "asc" }],
      })
    : [];

  return (
    <>
      <section className="mosque-panel relative isolate overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-slate-950/10 sm:p-10">
        <div className="mosque-art -z-10" aria-hidden />
        <p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-teal-200">{APP_CONFIG.name}</p>
        <h1 className="max-w-[85%] text-3xl font-bold tracking-tight sm:text-5xl">Rekap Asrama</h1>
        <p className="mt-5 flex items-center gap-2 text-sm text-slate-100">
          <CalendarDays className="size-4 shrink-0" aria-hidden />{period ? `${period.academicYear.name} · ${semesterLabel[period.name]}` : "Belum ada semester aktif"}
        </p>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Kelengkapan jurnal harian</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pantau pengisian jurnal kegiatan asrama per kamar.</p>
          </div>
          {period && (
            <form action="/asrama" method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="view" value={selectedView} />
              <label className="grid gap-1 text-sm font-semibold">
                Tanggal
                <input type="date" name="date" defaultValue={selectedDate}
                  min={period.startDate.toISOString().slice(0, 10)} max={period.endDate.toISOString().slice(0, 10)}
                  className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary" />
              </label>
              <Button type="submit" variant="outline">Tampilkan</Button>
            </form>
          )}
        </div>

        <nav aria-label="Rekap asrama" className="flex flex-wrap gap-2">
          <Button asChild variant={selectedView === "kelengkapan" ? undefined : "outline"}>
            <Link href={`/asrama?date=${selectedDate}&view=kelengkapan`}>Kelengkapan jurnal</Link>
          </Button>
          {canSeeSensitiveRecaps && (
            <>
              <Button asChild variant={selectedView === "izin" ? undefined : "outline"}>
                <Link href={`/asrama?date=${selectedDate}&view=izin`}>Daftar Izin</Link>
              </Button>
              <Button asChild variant={selectedView === "pelanggaran" ? undefined : "outline"}>
                <Link href={`/asrama?date=${selectedDate}&view=pelanggaran`}>Pelanggaran pekan ini</Link>
              </Button>
            </>
          )}
          <Button asChild variant={selectedView === "tahfidz" ? undefined : "outline"}>
            <Link href={`/asrama?date=${selectedDate}&view=tahfidz`}>Jurnal Tahfidz</Link>
          </Button>
        </nav>

        {!period && <p className="mt-4 text-sm text-muted-foreground">Belum ada semester aktif.</p>}
        {period && selectedView === "izin" && canSeeSensitiveRecaps && (
          <div className="mt-4">
            <h3 className="font-bold">Daftar Izin · {selectedDate}</h3>
            {absences.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Tidak ada santri berstatus S, I, atau A pada tanggal ini.</p> : (
              <ul className="mt-2 divide-y divide-border">
                {absences.map((entry) => (
                  <li key={`${entry.journalId}:${entry.studentId}`} className="py-3">
                    <p className="font-semibold">{entry.student.fullName} <span className="text-xs font-normal text-muted-foreground">· {entry.student.nis}</span></p>
                    <p className="text-sm text-muted-foreground">Kamar {entry.journal.room.name} · Status {entry.status}{entry.note ? ` · ${entry.note}` : ""}</p>
                    {profile.role !== "KEPALA_ASRAMA" && (
                      <Link className="text-sm font-semibold text-primary underline" href={`/portfolio?studentId=${entry.student.id}&month=${selectedDate.slice(0, 7)}`}>Lihat portfolio santri</Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {period && selectedView === "pelanggaran" && canSeeSensitiveRecaps && (
          <div className="mt-4">
            <h3 className="font-bold">Pelanggaran pekan {weekStart.toISOString().slice(0, 10)}</h3>
            {violations.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Belum ada pelanggaran yang dicatat pada pekan ini.</p> : (
              <>
                <ul className="mt-2 divide-y divide-border">
                  {violations.map((entry) => (
                    <li key={entry.id} className="py-3">
                      <p className="font-semibold">{entry.student.fullName} <span className="text-xs font-normal text-muted-foreground">· {entry.student.nis}</span></p>
                      <p className="text-sm text-muted-foreground">
                        Kamar {entry.review.room.name} · {entry.violationType} · {entry.repetitions} × {entry.pointsPerOccurrence} = {entry.repetitions * entry.pointsPerOccurrence} poin
                      </p>
                      {profile.role !== "KEPALA_ASRAMA" && (
                        <Link className="text-sm font-semibold text-primary underline" href={`/portfolio?studentId=${entry.student.id}&month=${selectedDate.slice(0, 7)}`}>Lihat portfolio santri</Link>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-bold">Total poin periode ini: {violations.reduce((sum, item) => sum + item.repetitions * item.pointsPerOccurrence, 0)}</p>
              </>
            )}
          </div>
        )}

        {period && selectedView === "tahfidz" && (
          <div className="mt-4">
            <h3 className="font-bold">Jurnal Tahfizh · Pekan {formatDate(weekStart)} – {formatDate(weekEnd)}</h3>
            {halaqahs.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Belum ada halaqah dalam cakupan akses.</p> : (
              <ul className="mt-3 divide-y divide-border">
                {halaqahs.map((halaqah) => {
                  const rows = tahfidzEntries.filter((entry) => entry.halaqahId === halaqah.id);
                  return (
                    <li key={halaqah.id} className="py-4">
                      <p className="font-semibold">{halaqah.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {halaqah.teacher?.displayName ?? "Belum ada guru pengampu"} · {halaqah._count.enrollments} santri
                      </p>
                      {rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Belum ada jurnal Tahfizh pada pekan ini.</p> : (
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                          {rows.map((entry) => (
                            <li key={entry.id} className="rounded-xl border border-border p-3 text-sm">
                              <p className="font-semibold">{entry.student.fullName}</p>
                              <p className="text-muted-foreground">
                                {tahfidzTypes.find((type) => type.value === entry.type)?.label ?? entry.type} · Juz {entry.juzNumber ?? "—"} · Hal {entry.fromPage ?? "—"}–{entry.toPage ?? "—"} ·
                                {entry.lineCount ? ` ${entry.lineCount} baris · ` : ""}
                                {entry.fluencyGrade ? `Nilai ${entry.fluencyGrade} · ` : ""}
                                {entry.score != null ? `Nilai ${entry.score} · ` : ""}
                                {entry.assessment}
                                {entry.note ? ` · ${entry.note}` : ""}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {period && selectedView === "kelengkapan" && rooms.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Belum ada kamar untuk ditampilkan.</p>}
        {period && selectedView === "kelengkapan" && rooms.length > 0 && (
          <ul className="mt-4 divide-y divide-border">
            {rooms.map((room) => {
              const journal = room.dormJournals[0];
              const sent = journal
                ? [journal.tahajjudSubmittedAt, journal.pagiSubmittedAt, journal.soreSubmittedAt, journal.malamSubmittedAt].filter(Boolean).length
                : 0;
              const progress = Math.round(sent / 4 * 100);
              return (
                <li key={room.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div>
                    <p className="font-semibold">{room.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {room.supervisor?.displayName ?? "Belum ada musyrif"} · {room._count.enrollments} santri
                    </p>
                    {journal && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {sent} dari 4 laporan terkirim · {progress}%
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {sent === 4 ? (
                      <><CheckCircle2 className="size-4 text-emerald-600" aria-hidden /><span className="text-emerald-700 dark:text-emerald-400">Lengkap</span></>
                    ) : (
                      <><CircleAlert className="size-4 text-amber-600" aria-hidden /><span className="text-amber-700 dark:text-amber-400">{sent ? "Sebagian" : "Belum terisi"}</span></>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
