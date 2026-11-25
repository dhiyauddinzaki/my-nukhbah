import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, CircleAlert } from "lucide-react";
import { APP_CONFIG } from "@/config/constants";
import { getActiveSemester, semesterLabel } from "@/features/academic/period";
import { canAccess } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_CONFIG.timeZone }).format(new Date());
}

export default async function AsramaPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  if (!canAccess(profile.role, "asrama")) notFound();

  const { date: dateParam } = await searchParams;
  const period = await getActiveSemester();
  const rawDate = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayIso();
  const selectedDate = period && rawDate >= period.startDate.toISOString().slice(0, 10) && rawDate <= period.endDate.toISOString().slice(0, 10)
    ? rawDate
    : period ? (todayIso() >= period.startDate.toISOString().slice(0, 10) && todayIso() <= period.endDate.toISOString().slice(0, 10) ? todayIso() : period.startDate.toISOString().slice(0, 10)) : rawDate;

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
            select: { id: true, updatedAt: true, pagiPhotoPath: true, sorePhotoPath: true, malamPhotoPath: true, _count: { select: { attendances: true, prayers: true } } },
          },
        },
        orderBy: { name: "asc" },
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

        {!period && <p className="mt-4 text-sm text-muted-foreground">Belum ada semester aktif.</p>}
        {period && rooms.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Belum ada kamar untuk ditampilkan.</p>}
        {period && rooms.length > 0 && (
          <ul className="mt-4 divide-y divide-border">
            {rooms.map((room) => {
              const journal = room.dormJournals[0];
              const complete = !!journal && room._count.enrollments > 0;
              return (
                <li key={room.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div>
                    <p className="font-semibold">{room.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {room.supervisor?.displayName ?? "Belum ada musyrif"} · {room._count.enrollments} santri
                    </p>
                    {journal && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Diperbarui {journal.updatedAt.toLocaleString("id-ID")} · {journal._count.attendances} kehadiran · {journal._count.prayers} data shalat
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {complete ? (
                      <><CheckCircle2 className="size-4 text-emerald-600" aria-hidden /><span className="text-emerald-700 dark:text-emerald-400">Terisi</span></>
                    ) : (
                      <><CircleAlert className="size-4 text-amber-600" aria-hidden /><span className="text-amber-700 dark:text-amber-400">Belum terisi</span></>
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
