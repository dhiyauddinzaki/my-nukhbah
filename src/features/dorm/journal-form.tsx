"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveDormJournal } from "./actions";

type Option = { value: string; label: string };
type SessionOption = Option & { hasPhoto: boolean };
type Student = { id: string; nis: string; fullName: string };
type Journal = {
  id: string;
  pagiPhotoPath: string | null;
  sorePhotoPath: string | null;
  malamPhotoPath: string | null;
  attendances: { studentId: string; session: string; present: boolean }[];
  prayers: { studentId: string; prayer: string; status: string }[];
} | null;

const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary";

export function DormJournalForm({ rooms, selectedRoomId, selectedDate, minDate, maxDate, students, journal, sessions, prayers, prayerStatuses }: {
  rooms: { id: string; name: string }[];
  selectedRoomId: string;
  selectedDate: string;
  minDate: string;
  maxDate: string;
  students: Student[];
  journal: Journal;
  sessions: SessionOption[];
  prayers: Option[];
  prayerStatuses: Option[];
}) {
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; message: string }>();
  const [pending, startTransition] = useTransition();

  const initialAttendance = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of journal?.attendances ?? []) map.set(`${row.studentId}:${row.session}`, row.present);
    const state: Record<string, boolean> = {};
    for (const student of students) {
      for (const session of sessions) {
        const key = `${student.id}:${session.value}`;
        state[key] = map.get(key) ?? !journal;
      }
    }
    return state;
  }, [journal, students, sessions]);

  const initialPrayers = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of journal?.prayers ?? []) map.set(`${row.studentId}:${row.prayer}`, row.status);
    const state: Record<string, string> = {};
    for (const student of students) {
      for (const prayer of prayers) {
        const key = `${student.id}:${prayer.value}`;
        state[key] = map.get(key) ?? "MUWAFIQ";
      }
    }
    return state;
  }, [journal, students, prayers]);

  const [attendance, setAttendance] = useState<Record<string, boolean>>(initialAttendance);
  const [prayerState, setPrayerState] = useState<Record<string, string>>(initialPrayers);

  // Reset state when journal/room/date changes by keying the form from parent would be ideal,
  // but we keep it simple: the server re-renders the page on navigation.
  const formKey = `${selectedRoomId}:${selectedDate}:${journal?.id ?? "new"}`;

  return (
    <div className="mt-4 space-y-5" key={formKey}>
      <form action="/pembinaan" method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-semibold">
          Kamar
          <select name="room" defaultValue={selectedRoomId} className={fieldClass}>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Tanggal
          <input type="date" name="date" defaultValue={selectedDate} min={minDate} max={maxDate} className={fieldClass} required />
        </label>
        <Button type="submit" variant="outline">Tampilkan</Button>
      </form>

      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada santri yang ditempatkan di kamar ini.</p>
      ) : (
        <form className="space-y-5" onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const payload = {
            roomId: selectedRoomId,
            date: selectedDate,
            attendance: students.flatMap((student) => sessions.map((session) => ({
              studentId: student.id,
              session: session.value,
              present: !!attendance[`${student.id}:${session.value}`],
            }))),
            prayers: students.flatMap((student) => prayers.map((prayer) => ({
              studentId: student.id,
              prayer: prayer.value,
              status: prayerState[`${student.id}:${prayer.value}`] ?? "MUWAFIQ",
            }))),
          };
          data.set("payload", JSON.stringify(payload));
          startTransition(async () => {
            setResult(undefined);
            try {
              setResult(await saveDormJournal(data));
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
              router.refresh();
            } catch {
              setResult({ ok: false, message: "Sambungan terputus. Muat ulang sebelum mencoba kembali." });
            }
          });
        }}>
          <input type="hidden" name="payload" value="" />

          <div className="flex flex-wrap gap-2">
            {sessions.map((session) => (
              <button key={session.value} type="button" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                onClick={() => {
                  const allPresent = students.every((student) => attendance[`${student.id}:${session.value}`]);
                  setAttendance((prev) => {
                    const next = { ...prev };
                    for (const student of students) next[`${student.id}:${session.value}`] = !allPresent;
                    return next;
                  });
                }}>
                Toggle {session.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {students.map((student) => (
              <article key={student.id} className="rounded-2xl border border-border p-4">
                <p className="font-semibold">{student.fullName}</p>
                <p className="text-xs text-muted-foreground">NIS {student.nis}</p>

                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kehadiran</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {sessions.map((session) => {
                      const key = `${student.id}:${session.value}`;
                      const checked = !!attendance[key];
                      return (
                        <label key={session.value} className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm ${checked ? "border-primary/40 bg-muted" : "border-border"}`}>
                          <input type="checkbox" checked={checked} onChange={(e) => setAttendance((prev) => ({ ...prev, [key]: e.target.checked }))} />
                          {session.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shalat Fardhu</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {prayers.map((prayer) => {
                      const key = `${student.id}:${prayer.value}`;
                      return (
                        <label key={prayer.value} className="grid gap-1 text-xs font-semibold">
                          {prayer.label}
                          <select className={fieldClass} value={prayerState[key] ?? "MUWAFIQ"} onChange={(e) => setPrayerState((prev) => ({ ...prev, [key]: e.target.value }))}>
                            {prayerStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="font-semibold">Foto kegiatan asrama</p>
            <p className="mt-1 text-xs text-muted-foreground">Unggah foto untuk Absen Pagi, Sore, dan Malam bila tersedia (maks. 5 MB).</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {([
                { name: "pagiPhoto", label: "Foto Absen Pagi", existing: journal?.pagiPhotoPath },
                { name: "sorePhoto", label: "Foto Absen Sore", existing: journal?.sorePhotoPath },
                { name: "malamPhoto", label: "Foto Absen Malam", existing: journal?.malamPhotoPath },
              ] as const).map((field) => (
                <label key={field.name} className="grid gap-1 text-sm font-semibold">
                  {field.label}
                  <input type="file" name={field.name} accept="image/*" className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-semibold" />
                  {field.existing && <span className="text-xs font-normal text-muted-foreground">Foto sudah tersimpan. Unggah file baru untuk mengganti.</span>}
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan jurnal"}</Button>
          {result && (
            <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-red-700 dark:text-red-300"}>
              {result.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
