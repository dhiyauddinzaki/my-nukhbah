"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  adabCriteria,
  dailyActivities,
  presenceStatuses,
  type AdabCriterionKey,
  type PresenceStatusValue,
} from "./constants";
import { saveDormDailyCriterion, saveDormWeeklyCriterion } from "./actions";

type Student = { id: string; nis: string; fullName: string };
type PresenceRow = { studentId: string; status: PresenceStatusValue; note: string | null };
type ActivityRow = { studentId: string; activity: string; status: PresenceStatusValue };
type TahajjudRow = { studentId: string; completed: boolean };
type AdabRow = { studentId: string; [key: string]: string | number | null };
type ViolationRow = {
  id: string;
  studentId: string;
  violationType: string;
  repetitions: number;
  pointsPerOccurrence: number;
};

const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary";
const cardClass = "space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5";
const noteKeys: Record<AdabCriterionKey, string> = {
  haqLinafsih: "haqLinafsihNote",
  haqLisyaikhih: "haqLisyaikhihNote",
  haqLizamilih: "haqLizamilihNote",
  haqLilMakan: "haqLilMakanNote",
  haqLilKitab: "haqLilKitabNote",
  haqLilIlm: "haqLilIlmNote",
};

function PhotoField({ label, saved }: { label: string; saved: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="grid gap-1 text-sm font-semibold">
        {label}
        <input
          type="file"
          name="photo"
          accept="image/*"
          capture="environment"
          className="block min-h-11 w-full text-sm text-muted-foreground file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:font-semibold"
        />
      </label>
      {saved && (
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium sm:pb-2">
          <input type="checkbox" name="removePhoto" value="true" />
          Hapus foto tersimpan
        </label>
      )}
    </div>
  );
}

export function DormJournalForm({
  rooms,
  selectedRoomId,
  selectedDate,
  minDate,
  maxDate,
  weekStartDate,
  students,
  presenceRows,
  tahajjudRows,
  activityRows,
  adabRows,
  violationRows,
  photos,
  submitted,
}: {
  rooms: { id: string; name: string }[];
  selectedRoomId: string;
  selectedDate: string;
  minDate: string;
  maxDate: string;
  weekStartDate: string;
  students: Student[];
  presenceRows: PresenceRow[];
  tahajjudRows: TahajjudRow[];
  activityRows: ActivityRow[];
  adabRows: AdabRow[];
  violationRows: ViolationRow[];
  photos: { tahajjud: boolean; pagi: boolean; sore: boolean; malam: boolean };
  submitted: {
    presence: boolean;
    tahajjud: boolean;
    pagi: boolean;
    sore: boolean;
    malam: boolean;
    adab: boolean;
    violations: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Record<string, { ok: boolean; message: string }>>({});

  const presenceInitial = Object.fromEntries(
    students.map((student) => {
      const saved = presenceRows.find((row) => row.studentId === student.id);
      return [student.id, { status: saved?.status ?? "H", note: saved?.note ?? "" }];
    }),
  ) as Record<string, { status: PresenceStatusValue; note: string }>;
  const [presence, setPresence] = useState(presenceInitial);
  const savedActivity = new Set(activityRows.map((row) => `${row.studentId}:${row.activity}`));
  const activityInitial = Object.fromEntries(
    students.flatMap((student) => dailyActivities.map(({ value }) => {
      const saved = activityRows.find((row) => row.studentId === student.id && row.activity === value);
      return [`${student.id}:${value}`, saved?.status ?? presenceInitial[student.id].status];
    })),
  ) as Record<string, PresenceStatusValue>;
  const [activityStatuses, setActivityStatuses] = useState(activityInitial);
  const [editedActivities, setEditedActivities] = useState<Set<string>>(new Set());

  const tahajjudInitial = Object.fromEntries(
    students.map((student) => [
      student.id,
      tahajjudRows.find((row) => row.studentId === student.id)?.completed === undefined
        ? ""
        : tahajjudRows.find((row) => row.studentId === student.id)?.completed ? "yes" : "no",
    ]),
  ) as Record<string, "yes" | "no" | "">;
  const [tahajjud, setTahajjud] = useState(tahajjudInitial);

  const adabInitial = Object.fromEntries(students.map((student) => {
    const saved = adabRows.find((row) => row.studentId === student.id);
    return [student.id, Object.fromEntries(adabCriteria.flatMap(({ key }) => [
      [key, saved?.[key] ?? ""],
      [noteKeys[key], saved?.[noteKeys[key]] ?? ""],
    ]))];
  })) as Record<string, Record<string, number | string | null>>;
  const [adab, setAdab] = useState(adabInitial);
  const [violations, setViolations] = useState(violationRows.map((row) => ({ ...row })));

  async function save(
    form: HTMLFormElement,
    payload: Record<string, unknown>,
    action: typeof saveDormDailyCriterion | typeof saveDormWeeklyCriterion,
    key: string,
  ) {
    const data = new FormData(form);
    data.set("payload", JSON.stringify(payload));
    startTransition(async () => {
      setMessages((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      try {
        const result = await action(data);
        setMessages((current) => ({ ...current, [key]: result }));
        if (result.ok) router.refresh();
      } catch {
        setMessages((current) => ({
          ...current,
          [key]: { ok: false, message: "Sambungan terputus. Muat ulang sebelum mencoba kembali." },
        }));
      }
    });
  }

  function message(key: string) {
    const result = messages[key];
    if (!result) return null;
    return (
      <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-red-700 dark:text-red-300"}>
        {result.message}
      </p>
    );
  }

  function saveDailyForm(
    event: React.FormEvent<HTMLFormElement>,
    criterion: Record<string, unknown>,
    key: string,
  ) {
    event.preventDefault();
    void save(event.currentTarget, {
      roomId: selectedRoomId,
      date: selectedDate,
      ...criterion,
    }, saveDormDailyCriterion, key);
  }

  function saveWeeklyForm(
    event: React.FormEvent<HTMLFormElement>,
    criterion: Record<string, unknown>,
    key: string,
  ) {
    event.preventDefault();
    void save(event.currentTarget, {
      roomId: selectedRoomId,
      weekStartDate,
      ...criterion,
    }, saveDormWeeklyCriterion, key);
  }

  const progressCount = [submitted.tahajjud, submitted.pagi, submitted.sore, submitted.malam].filter(Boolean).length;
  const progress = Math.round(progressCount / 4 * 100);
  const weekEndDate = new Date(weekStartDate + "T00:00:00.000Z");
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);

  return (
    <div className="mt-4 space-y-5">
      <form action="/pembinaan" method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-semibold">
          Kamar
          <select name="room" defaultValue={selectedRoomId} className={fieldClass}>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Tanggal harian
          <input type="date" name="date" defaultValue={selectedDate} min={minDate} max={maxDate} className={fieldClass} required />
        </label>
        <Button type="submit" variant="outline">Tampilkan</Button>
      </form>

      <section className={cardClass} aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold">Laporan kegiatan hari ini</h3>
            <p className="text-sm text-muted-foreground">Empat kartu kegiatan dikirim satu per satu.</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-bold">{progress}% terkirim</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{progressCount} dari 4 laporan kegiatan tersimpan.</p>
      </section>

      {students.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Belum ada santri yang ditempatkan di kamar ini.</p>
      ) : (
        <>
          <section className={cardClass}>
            <div>
              <h3 className="font-bold">Kehadiran santri hari ini</h3>
              <p className="text-sm text-muted-foreground">Keterangan opsional untuk santri yang tidak hadir. Data ini masuk Daftar Izin.</p>
            </div>
            <form onSubmit={(event) => saveDailyForm(event, {
              criterion: "presence",
              entries: students.map((student) => ({
                studentId: student.id,
                status: presence[student.id].status,
                note: presence[student.id].note,
              })),
            }, "presence")} className="space-y-4">
              <div className="space-y-3">
                {students.map((student) => (
                  <article key={student.id} className="rounded-xl border border-border p-3">
                    <p className="font-semibold">{student.fullName} <span className="text-xs font-normal text-muted-foreground">· {student.nis}</span></p>
                    <label className="mt-2 grid gap-1 text-sm font-medium">
                      Kehadiran
                      <select
                        className={fieldClass}
                        value={presence[student.id].status}
                        onChange={(event) => {
                          const status = event.target.value as PresenceStatusValue;
                          setPresence((current) => ({ ...current, [student.id]: { ...current[student.id], status } }));
                          setActivityStatuses((current) => {
                            const next = { ...current };
                            for (const { value } of dailyActivities) {
                              const key = `${student.id}:${value}`;
                              if (!savedActivity.has(key) && !editedActivities.has(key)) next[key] = status;
                            }
                            return next;
                          });
                        }}
                      >
                        {presenceStatuses.map(({ value, label }) => <option key={value} value={value}>[{value}] {label}</option>)}
                      </select>
                    </label>
                    {presence[student.id].status !== "H" && (
                      <label className="mt-2 grid gap-1 text-sm font-medium">
                        Keterangan (opsional)
                        <input
                          className={fieldClass}
                          maxLength={500}
                          value={presence[student.id].note}
                          onChange={(event) => setPresence((current) => ({
                            ...current,
                            [student.id]: { ...current[student.id], note: event.target.value },
                          }))}
                        />
                      </label>
                    )}
                  </article>
                ))}
              </div>
              <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan kehadiran"}</Button>
              {message("presence")}
            </form>
          </section>

          <section className={cardClass}>
            <div>
              <h3 className="font-bold">Tahajjud</h3>
              <p className="text-sm text-muted-foreground">Isi Ya/Tidak per santri dan lampirkan satu foto kegiatan.</p>
            </div>
            <form onSubmit={(event) => saveDailyForm(event, {
              criterion: "tahajjud",
              entries: students.map((student) => ({ studentId: student.id, completed: tahajjud[student.id] === "yes" })),
            }, "tahajjud")} className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {students.map((student) => (
                  <label key={student.id} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border p-3">
                    <span className="text-sm font-semibold">{student.fullName}</span>
                    <select required className={`${fieldClass} max-w-32`} value={tahajjud[student.id]}
                      onChange={(event) => setTahajjud((current) => ({ ...current, [student.id]: event.target.value as "yes" | "no" | "" }))}>
                      <option value="" disabled>Pilih</option>
                      <option value="yes">Ya</option><option value="no">Tidak</option>
                    </select>
                  </label>
                ))}
              </div>
              <PhotoField label="Foto Tahajjud · upload atau buka kamera" saved={photos.tahajjud} />
              <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Kirim laporan Tahajjud"}</Button>
              {message("tahajjud")}
            </form>
          </section>

          {dailyActivities.map(({ value, label, photoLabel }) => (
            <section key={value} className={cardClass}>
              <div>
                <h3 className="font-bold">{label}</h3>
                <p className="text-sm text-muted-foreground">Status awal mengikuti kehadiran utama dan dapat diubah.</p>
              </div>
              <form onSubmit={(event) => saveDailyForm(event, {
                criterion: "activity",
                activity: value,
                entries: students.map((student) => ({
                  studentId: student.id,
                  status: activityStatuses[`${student.id}:${value}`],
                })),
              }, value.toLowerCase())} className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {students.map((student) => {
                    const key = `${student.id}:${value}`;
                    return (
                      <label key={student.id} className="grid gap-1 rounded-xl border border-border p-3 text-sm font-semibold">
                        {student.fullName}
                        <select className={fieldClass} value={activityStatuses[key]} onChange={(event) => {
                          setEditedActivities((current) => new Set(current).add(key));
                          setActivityStatuses((current) => ({ ...current, [key]: event.target.value as PresenceStatusValue }));
                        }}>
                          {presenceStatuses.map(({ value: status, label: statusLabel }) => <option key={status} value={status}>[{status}] {statusLabel}</option>)}
                        </select>
                      </label>
                    );
                  })}
                </div>
                <PhotoField label={`${photoLabel} · upload atau buka kamera`} saved={photos[value.toLowerCase() as "pagi" | "sore" | "malam"]} />
                <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : `Kirim ${label}`}</Button>
                {message(value.toLowerCase())}
              </form>
            </section>
          ))}

          <section className={cardClass}>
            <div>
              <h3 className="font-bold">Penilaian Adab · Huquq Sittah</h3>
              <p className="text-sm text-muted-foreground">
                Pekan {weekStartDate} sampai {weekEndDate.toISOString().slice(0, 10)} · nilai 1–10; nilai di bawah 8 wajib diberi keterangan.
              </p>
            </div>
            <form onSubmit={(event) => saveWeeklyForm(event, {
              criterion: "adab",
              entries: students.map((student) => ({
                studentId: student.id,
                ...Object.fromEntries(adabCriteria.flatMap(({ key }) => [
                  [key, Number(adab[student.id][key])],
                  [noteKeys[key], String(adab[student.id][noteKeys[key]] ?? "")],
                ])),
              })),
            }, "adab")} className="space-y-4">
              {students.map((student) => (
                <article key={student.id} className="rounded-xl border border-border p-3">
                  <p className="mb-3 font-semibold">{student.fullName}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {adabCriteria.map(({ key, label }) => {
                      const noteKey = noteKeys[key];
                      const rawScore = adab[student.id][key] ?? "";
                      const score = rawScore === "" ? undefined : Number(rawScore);
                      return (
                        <div key={key} className="grid gap-1">
                          <label className="grid gap-1 text-sm font-medium">
                            {label}
                            <input type="number" min={1} max={10} required className={fieldClass}
                              value={rawScore}
                              onChange={(event) => setAdab((current) => ({
                                ...current,
                                [student.id]: { ...current[student.id], [key]: Number(event.target.value) },
                              }))} />
                          </label>
                          {score !== undefined && score < 8 && (
                            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                              Keterangan wajib
                              <input required maxLength={500} className={fieldClass}
                                value={String(adab[student.id][noteKey] ?? "")}
                                onChange={(event) => setAdab((current) => ({
                                  ...current,
                                  [student.id]: { ...current[student.id], [noteKey]: event.target.value },
                                }))} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
              <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan penilaian pekanan"}</Button>
              {message("adab")}
            </form>
          </section>

          <section className={cardClass}>
            <div>
              <h3 className="font-bold">Poin Pelanggaran</h3>
              <p className="text-sm text-muted-foreground">Total poin dihitung dari pengulangan × poin per kejadian.</p>
            </div>
            <form onSubmit={(event) => saveWeeklyForm(event, {
              criterion: "violations",
              entries: violations.filter((row) => row.violationType.trim()).map((row) => ({
                studentId: row.studentId,
                violationType: row.violationType.trim(),
                repetitions: Number(row.repetitions),
                pointsPerOccurrence: Number(row.pointsPerOccurrence),
              })),
            }, "violations")} className="space-y-4">
              <div className="space-y-3">
                {violations.map((row, index) => (
                  <article key={row.id} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-semibold">
                      Santri
                      <select className={fieldClass} required value={row.studentId}
                        onChange={(event) => setViolations((current) => current.map((item, i) => i === index ? { ...item, studentId: event.target.value } : item))}>
                        {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-semibold">
                      Jenis pelanggaran
                      <input className={fieldClass} required maxLength={160} value={row.violationType}
                        onChange={(event) => setViolations((current) => current.map((item, i) => i === index ? { ...item, violationType: event.target.value } : item))} />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold">
                      Pengulangan
                      <input type="number" min={1} max={1000} required className={fieldClass} value={row.repetitions}
                        onChange={(event) => setViolations((current) => current.map((item, i) => i === index ? { ...item, repetitions: Number(event.target.value) } : item))} />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold">
                      Poin per kejadian
                      <input type="number" min={0} max={10000} required className={fieldClass} value={row.pointsPerOccurrence}
                        onChange={(event) => setViolations((current) => current.map((item, i) => i === index ? { ...item, pointsPerOccurrence: Number(event.target.value) } : item))} />
                      <span className="text-xs font-normal text-muted-foreground">Total: {row.repetitions * row.pointsPerOccurrence} poin</span>
                    </label>
                    <Button type="button" variant="outline" className="sm:col-span-2" onClick={() => setViolations((current) => current.filter((_, i) => i !== index))}>
                      Hapus pelanggaran ini
                    </Button>
                  </article>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setViolations((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    studentId: students[0]?.id ?? "",
                    violationType: "",
                    repetitions: 1,
                    pointsPerOccurrence: 0,
                  },
                ])}>Tambah Pelanggaran Baru</Button>
                <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan pelanggaran pekanan"}</Button>
              </div>
              {message("violations")}
            </form>
          </section>
        </>
      )}
    </div>
  );
}
