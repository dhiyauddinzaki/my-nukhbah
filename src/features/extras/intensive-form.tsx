"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Check, ChevronDown, RotateCcw, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { fluencyGrades } from "@/features/tahfidz/constants";
import { intensiveEntryTypes } from "./constants";
import { saveIntensiveWeeklyEntries } from "./program-actions";

type IntensiveType = (typeof intensiveEntryTypes)[number]["value"];
type Student = { id: string; nis: string; fullName: string };
type TasmiScore = { juzNumber: number; grade: "A" | "B" | "C" | "D" };
type Entry = {
  id: string;
  studentId: string;
  type: IntensiveType;
  pagesCompleted: number | null;
  juzNumber: number | null;
  fromPage: number | null;
  toPage: number | null;
  isMurajaahWeek: boolean;
  jadid: boolean | null;
  qadim: boolean | null;
  note: string | null;
  tasmiScores: TasmiScore[];
};
type RowValue = {
  clear: boolean;
  pagesCompleted: string;
  juzNumber: string;
  fromPage: string;
  toPage: string;
  isMurajaahWeek: boolean;
  jadid: boolean;
  qadim: boolean;
  tasmiScores: Record<number, "A" | "B" | "C" | "D">;
  note: string;
};
type Values = Record<string, RowValue>;

const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-amber-600";
const emptyRow = (): RowValue => ({
  clear: false,
  pagesCompleted: "",
  juzNumber: "",
  fromPage: "",
  toPage: "",
  isMurajaahWeek: false,
  jadid: false,
  qadim: false,
  tasmiScores: {},
  note: "",
});

function getValues(students: Student[], entries: Entry[], type: IntensiveType): Values {
  return Object.fromEntries(students.map((student) => {
    const saved = entries.find((entry) => entry.studentId === student.id && entry.type === type);
    return [student.id, saved ? {
      ...emptyRow(),
      pagesCompleted: saved.pagesCompleted == null ? "" : String(saved.pagesCompleted),
      juzNumber: saved.juzNumber == null ? "" : String(saved.juzNumber),
      fromPage: saved.fromPage == null ? "" : String(saved.fromPage),
      toPage: saved.toPage == null ? "" : String(saved.toPage),
      isMurajaahWeek: saved.isMurajaahWeek,
      jadid: saved.jadid ?? false,
      qadim: saved.qadim ?? false,
      tasmiScores: Object.fromEntries(saved.tasmiScores.map((score) => [score.juzNumber, score.grade])),
      note: saved.note ?? "",
    } : emptyRow()];
  }));
}

function GradeButtons({ value, onChange, label }: {
  value?: "A" | "B" | "C" | "D";
  onChange: (grade: "A" | "B" | "C" | "D") => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {fluencyGrades.map((grade) => (
        <button key={grade} type="button" aria-pressed={value === grade} onClick={() => onChange(grade)}
          className={`min-h-10 min-w-10 rounded-lg border px-3 text-sm font-bold transition ${value === grade ? "border-amber-700 bg-amber-700 text-white" : "border-border bg-background hover:bg-amber-50 dark:hover:bg-amber-950/30"}`}>
          {grade}
        </button>
      ))}
    </div>
  );
}

export function IntensiveForm({ groupId, weekStartDate, students, entries }: {
  groupId: string;
  weekStartDate: string;
  students: Student[];
  entries: Entry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<IntensiveType>("ZIYADAH");
  const [valuesByType, setValuesByType] = useState<Record<IntensiveType, Values>>(() => ({
    ZIYADAH: getValues(students, entries, "ZIYADAH"),
    MURAJAAH: getValues(students, entries, "MURAJAAH"),
    TASMI: getValues(students, entries, "TASMI"),
  }));
  const [result, setResult] = useState<{ ok: boolean; message: string }>();
  const values = valuesByType[type];
  const savedCount = entries.filter((entry) => entry.type === type).length;
  const progress = students.length ? Math.round(savedCount / students.length * 100) : 0;

  useEffect(() => {
    setValuesByType({
      ZIYADAH: getValues(students, entries, "ZIYADAH"),
      MURAJAAH: getValues(students, entries, "MURAJAAH"),
      TASMI: getValues(students, entries, "TASMI"),
    });
  }, [students, entries]);

  function update(studentId: string, patch: Partial<RowValue>) {
    setValuesByType((current) => ({
      ...current,
      [type]: { ...current[type], [studentId]: { ...current[type][studentId], ...patch, clear: false } },
    }));
  }

  function clearRow(studentId: string) {
    setValuesByType((current) => ({
      ...current,
      [type]: { ...current[type], [studentId]: { ...emptyRow(), clear: true } },
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const invalidStudent = students.find((student) => {
      const row = values[student.id];
      if (!row || row.clear) return false;
      if (type === "ZIYADAH") {
        return !row.isMurajaahWeek && (
          row.pagesCompleted === ""
          || (Number(row.pagesCompleted) > 0 && (!row.juzNumber || !row.fromPage || !row.toPage))
        );
      }
      if (type === "TASMI") return Object.keys(row.tasmiScores).length === 0;
      return false;
    });
    if (invalidStudent) {
      form.querySelector<HTMLElement>(`[data-student-id="${invalidStudent.id}"]`)?.setAttribute("open", "");
      setResult({
        ok: false,
        message: type === "TASMI"
          ? `Pilih juz dan nilai Tasmi' untuk ${invalidStudent.fullName}.`
          : `Lengkapi halaman dan posisi hafalan untuk ${invalidStudent.fullName}.`,
      });
      return;
    }
    const invalidField = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(":invalid");
    if (invalidField) {
      invalidField.closest("details")?.setAttribute("open", "");
      invalidField.focus();
      invalidField.reportValidity();
      return;
    }

    const payload = {
      groupId,
      weekStartDate,
      type,
      entries: students.map((student) => {
        const row = values[student.id];
        return {
          studentId: student.id,
          clear: row.clear,
          ...(type === "ZIYADAH" ? {
            pagesCompleted: row.pagesCompleted === "" ? undefined : Number(row.pagesCompleted),
            juzNumber: row.juzNumber === "" ? undefined : Number(row.juzNumber),
            fromPage: row.fromPage === "" ? undefined : Number(row.fromPage),
            toPage: row.toPage === "" ? undefined : Number(row.toPage),
            isMurajaahWeek: row.isMurajaahWeek,
          } : {}),
          ...(type === "MURAJAAH" ? { jadid: row.jadid, qadim: row.qadim } : {}),
          ...(type === "TASMI" ? {
            tasmiScores: Object.entries(row.tasmiScores).map(([juzNumber, grade]) => ({ juzNumber: Number(juzNumber), grade })),
          } : {}),
          note: row.note || undefined,
        };
      }),
    };
    const data = new FormData();
    data.set("payload", JSON.stringify(payload));
    startTransition(async () => {
      setResult(undefined);
      try {
        const response = await saveIntensiveWeeklyEntries(data);
        setResult(response);
        if (response.ok) router.refresh();
      } catch {
        setResult({ ok: false, message: "Sambungan terputus. Muat ulang sebelum mencoba kembali." });
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-900/15 bg-card shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-l-4 border-l-amber-500 bg-amber-50/70 p-4 dark:bg-amber-950/20">
        <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          <BookOpenCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[.13em] text-amber-800 dark:text-amber-200">Nukhbatul Huffazh</p>
          <h2 className="font-bold">Tahfizh Intensif</h2>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">{progress}% · {savedCount}/{students.length}</span>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Kriteria Tahfizh Intensif">
          {intensiveEntryTypes.map((item) => {
            const active = item.value === type;
            const Icon = item.value === "ZIYADAH" ? BookOpenCheck : item.value === "MURAJAAH" ? RotateCcw : Star;
            const count = entries.filter((entry) => entry.type === item.value).length;
            return (
              <button key={item.value} type="button" role="tab" aria-selected={active} onClick={() => { setType(item.value); setResult(undefined); }}
                className={`flex min-h-12 items-center justify-center gap-1 rounded-xl border px-1.5 text-xs font-bold transition sm:gap-2 sm:px-2 sm:text-sm ${active ? "border-amber-700 bg-amber-700 text-white shadow-sm" : "border-border bg-card text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-950/30"}`}>
                <Icon className="size-4 shrink-0" aria-hidden />{item.label}<span className="hidden sm:inline">· {count}/{students.length}</span>
              </button>
            );
          })}
        </div>

        {students.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada anggota pada halaqah ini.</p> : (
          <form noValidate onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              {students.map((student, index) => {
                const row = values[student.id] ?? emptyRow();
                const saved = entries.some((entry) => entry.studentId === student.id && entry.type === type);
                return (
                  <details key={student.id} data-student-id={student.id} className={`group overflow-hidden rounded-xl border bg-card ${row.clear ? "border-dashed border-muted-foreground/50 opacity-70" : saved ? "border-amber-300 dark:border-amber-800" : "border-border"}`}>
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 border-l-4 border-l-amber-500 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{student.fullName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {row.clear ? "Akan dikosongkan" : saved ? "Tersimpan · bisa ditimpa" : `NIS ${student.nis}`}
                          {type === "TASMI" && saved ? " · ujian Tasmi’" : ""}
                        </span>
                      </span>
                      <span className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"><span className="group-open:hidden">Isi</span><span className="hidden group-open:inline">Tutup</span></span>
                      <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="space-y-4 border-t border-border bg-muted/25 p-3 sm:p-4">
                      {type === "ZIYADAH" && (
                        <>
                          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-amber-900/10 bg-amber-50/60 px-3 text-sm font-semibold dark:bg-amber-950/20">
                            <input type="checkbox" checked={row.isMurajaahWeek} onChange={(event) => update(student.id, { isMurajaahWeek: event.target.checked, pagesCompleted: event.target.checked ? "0" : row.pagesCompleted })} />
                            Tandai pekan Murajaah
                          </label>
                          {!row.isMurajaahWeek && (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Jumlah halaman · target {APP_CONFIG.defaultIntensiveWeeklyTargetPages}
                                <input type="number" min={0} max={APP_CONFIG.defaultIntensiveWeeklyTargetPages} required className={fieldClass} value={row.pagesCompleted} onChange={(event) => update(student.id, { pagesCompleted: event.target.value })} />
                              </label>
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Juz
                                <select className={fieldClass} value={row.juzNumber} onChange={(event) => update(student.id, { juzNumber: event.target.value })}>
                                  <option value="">Pilih juz</option>
                                  {Array.from({ length: 30 }, (_, i) => <option key={i + 1} value={i + 1}>Juz {i + 1}</option>)}
                                </select>
                              </label>
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Hal awal
                                <input type="number" min={1} className={fieldClass} value={row.fromPage} onChange={(event) => update(student.id, { fromPage: event.target.value })} />
                              </label>
                              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Hal akhir
                                <input type="number" min={1} className={fieldClass} value={row.toPage} onChange={(event) => update(student.id, { toPage: event.target.value })} />
                              </label>
                            </div>
                          )}
                        </>
                      )}
                      {type === "MURAJAAH" && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm font-semibold">
                            <input type="checkbox" checked={row.jadid} onChange={(event) => update(student.id, { jadid: event.target.checked })} />Jadid
                          </label>
                          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm font-semibold">
                            <input type="checkbox" checked={row.qadim} onChange={(event) => update(student.id, { qadim: event.target.checked })} />Qadim
                          </label>
                        </div>
                      )}
                      {type === "TASMI" && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pilih juz yang diuji; tetapkan nilai setiap juz</p>
                          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-10">
                            {Array.from({ length: 30 }, (_, i) => {
                              const juz = i + 1;
                              const selected = row.tasmiScores[juz] !== undefined;
                              return (
                                <button key={juz} type="button" aria-pressed={selected}
                                  onClick={() => {
                                    const next = { ...row.tasmiScores };
                                    if (selected) delete next[juz];
                                    else next[juz] = "A";
                                    update(student.id, { tasmiScores: next });
                                  }}
                                  className={`min-h-10 rounded-lg border text-xs font-bold ${selected ? "border-amber-700 bg-amber-700 text-white" : "border-border bg-background"}`}>
                                  Juz {juz}
                                </button>
                              );
                            })}
                          </div>
                          <ul className="space-y-2">
                            {Object.entries(row.tasmiScores).sort(([a], [b]) => Number(a) - Number(b)).map(([juz, grade]) => (
                              <li key={juz} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-2.5">
                                <span className="min-w-12 text-sm font-bold">Juz {juz}</span>
                                <GradeButtons label={`Nilai Juz ${juz}`} value={grade} onChange={(next) => update(student.id, { tasmiScores: { ...row.tasmiScores, [Number(juz)]: next } })} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {type !== "MURAJAAH" && (
                        <label className="grid gap-1 text-sm font-semibold">
                          Catatan Muhaffizh
                          <textarea maxLength={500} rows={2} className={fieldClass} value={row.note} onChange={(event) => update(student.id, { note: event.target.value })} />
                        </label>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" className="gap-2" onClick={() => clearRow(student.id)}><Trash2 className="size-4" aria-hidden />Kosongkan baris</Button>
                        {saved && !row.clear && <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-200"><Check className="size-4" aria-hidden />Data tersimpan akan ditimpa saat disimpan</span>}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending || students.length === 0} className="bg-amber-700 text-white hover:bg-amber-800">
                {pending ? "Menyimpan…" : savedCount ? `Timpa / Simpan ${intensiveEntryTypes.find((item) => item.value === type)?.label}` : `Simpan ${intensiveEntryTypes.find((item) => item.value === type)?.label}`}
              </Button>
              <span className="text-xs text-muted-foreground">Baris yang dikosongkan akan dihapus saat laporan disimpan.</span>
            </div>
            {result && <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-red-700 dark:text-red-300"}>{result.message}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
