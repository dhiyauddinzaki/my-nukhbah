"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Check, ChevronDown, ClipboardCheck, CopyCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fluencyGrades } from "@/features/tahfidz/constants";
import { ummiEntryTypes, ummiLevels } from "./constants";
import { saveUmmiWeeklyEntries } from "./program-actions";

type UmmiType = (typeof ummiEntryTypes)[number]["value"];
type Stage = (typeof ummiLevels)[number]["value"];
type Grade = (typeof fluencyGrades)[number];
type Student = { id: string; nis: string; fullName: string };
type Entry = {
  id: string;
  studentId: string;
  type: UmmiType;
  stage: Stage | null;
  fromPage: number | null;
  toPage: number | null;
  grade: Grade | null;
  note: string | null;
};
type RowValue = {
  clear: boolean;
  stage: string;
  fromPage: string;
  toPage: string;
  grade: string;
  note: string;
};
type Values = Record<string, RowValue>;
type SharedLearning = Omit<RowValue, "clear" | "note">;

const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-sky-600";
const emptyRow = (): RowValue => ({ clear: false, stage: "", fromPage: "", toPage: "", grade: "", note: "" });

function getValues(students: Student[], entries: Entry[], type: UmmiType): Values {
  return Object.fromEntries(students.map((student) => {
    const saved = entries.find((entry) => entry.studentId === student.id && entry.type === type);
    return [student.id, saved ? {
      clear: false,
      stage: saved.stage ?? "",
      fromPage: saved.fromPage == null ? "" : String(saved.fromPage),
      toPage: saved.toPage == null ? "" : String(saved.toPage),
      grade: saved.grade ?? "",
      note: saved.note ?? "",
    } : emptyRow()];
  }));
}

function GradeButtons({ value, onChange, label }: {
  value: string;
  onChange: (grade: Grade) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {fluencyGrades.map((grade) => (
        <button key={grade} type="button" aria-pressed={value === grade} onClick={() => onChange(grade)}
          className={`min-h-10 min-w-10 rounded-lg border px-3 text-sm font-bold transition ${value === grade ? "border-sky-700 bg-sky-700 text-white" : "border-border bg-background hover:bg-sky-50 dark:hover:bg-sky-950/30"}`}>
          {grade}
        </button>
      ))}
    </div>
  );
}

export function UmmiForm({ groupId, weekStartDate, students, entries }: {
  groupId: string;
  weekStartDate: string;
  students: Student[];
  entries: Entry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<UmmiType>("LEARNING");
  const [valuesByType, setValuesByType] = useState<Record<UmmiType, Values>>(() => ({
    LEARNING: getValues(students, entries, "LEARNING"),
    EXAM: getValues(students, entries, "EXAM"),
  }));
  const [shared, setShared] = useState<SharedLearning>({ stage: "", fromPage: "", toPage: "", grade: "" });
  const [result, setResult] = useState<{ ok: boolean; message: string }>();
  const values = valuesByType[type];
  const savedCount = entries.filter((entry) => entry.type === type).length;
  const progress = students.length ? Math.round(savedCount / students.length * 100) : 0;

  useEffect(() => {
    setValuesByType({
      LEARNING: getValues(students, entries, "LEARNING"),
      EXAM: getValues(students, entries, "EXAM"),
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

  function applyShared() {
    setValuesByType((current) => ({
      ...current,
      LEARNING: Object.fromEntries(students.map((student) => [
        student.id,
        { ...current.LEARNING[student.id], ...shared, clear: false },
      ])),
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const invalidStudent = students.find((student) => {
      const row = values[student.id];
      return row && !row.clear && (
        row.stage === ""
        || row.grade === ""
        || (type === "LEARNING" && (row.fromPage === "" || row.toPage === "" || (row.grade !== "A" && !row.note.trim())))
      );
    });
    if (invalidStudent) {
      form.querySelector<HTMLElement>(`[data-student-id="${invalidStudent.id}"]`)?.setAttribute("open", "");
      setResult({
        ok: false,
        message: type === "LEARNING" && values[invalidStudent.id].grade !== "A"
          ? `Lengkapi pembelajaran dan catatan wajib untuk ${invalidStudent.fullName}.`
          : `Lengkapi jenjang, halaman, dan nilai untuk ${invalidStudent.fullName}.`,
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
          stage: row.stage || undefined,
          fromPage: type === "LEARNING" && row.fromPage !== "" ? Number(row.fromPage) : undefined,
          toPage: type === "LEARNING" && row.toPage !== "" ? Number(row.toPage) : undefined,
          grade: row.grade || undefined,
          note: row.note || undefined,
        };
      }),
    };
    const data = new FormData();
    data.set("payload", JSON.stringify(payload));
    startTransition(async () => {
      setResult(undefined);
      try {
        const response = await saveUmmiWeeklyEntries(data);
        setResult(response);
        if (response.ok) router.refresh();
      } catch {
        setResult({ ok: false, message: "Sambungan terputus. Muat ulang sebelum mencoba kembali." });
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-900/15 bg-card shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-l-4 border-l-sky-600 bg-sky-50/70 p-4 dark:bg-sky-950/20">
        <span className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100">
          <BookOpenCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[.13em] text-sky-800 dark:text-sky-200">Perbaikan bacaan santri</p>
          <h2 className="font-bold">Tahsin UMMI</h2>
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-900 dark:bg-sky-900/60 dark:text-sky-100">{progress}% · {savedCount}/{students.length}</span>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Kriteria Tahsin UMMI">
          {ummiEntryTypes.map((item) => {
            const active = item.value === type;
            const Icon = item.value === "LEARNING" ? BookOpenCheck : ClipboardCheck;
            const count = entries.filter((entry) => entry.type === item.value).length;
            return (
              <button key={item.value} type="button" role="tab" aria-selected={active} onClick={() => { setType(item.value); setResult(undefined); }}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${active ? "border-sky-700 bg-sky-700 text-white shadow-sm" : "border-border bg-card text-muted-foreground hover:bg-sky-50 dark:hover:bg-sky-950/30"}`}>
                <Icon className="size-4" aria-hidden />{item.label}<span className="hidden sm:inline">· {count}/{students.length}</span>
              </button>
            );
          })}
        </div>

        {students.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada anggota pada halaqah ini.</p> : (
          <form noValidate onSubmit={submit} className="space-y-4">
            {type === "LEARNING" && (
              <section className="grid gap-3 rounded-xl border border-sky-900/10 bg-sky-50/50 p-3 dark:bg-sky-950/15 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Jenjang
                  <select className={fieldClass} value={shared.stage} onChange={(event) => setShared((current) => ({ ...current, stage: event.target.value }))}>
                    <option value="">Pilih jenjang</option>
                    {ummiLevels.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Dari halaman
                  <input type="number" min={1} className={fieldClass} value={shared.fromPage} onChange={(event) => setShared((current) => ({ ...current, fromPage: event.target.value }))} />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Sampai halaman
                  <input type="number" min={1} className={fieldClass} value={shared.toPage} onChange={(event) => setShared((current) => ({ ...current, toPage: event.target.value }))} />
                </label>
                <div className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Nilai
                  <GradeButtons label="Nilai pembelajaran seragam" value={shared.grade} onChange={(grade) => setShared((current) => ({ ...current, grade }))} />
                </div>
                <Button type="button" variant="outline" className="self-end gap-2 border-sky-700 text-sky-800 dark:text-sky-200" onClick={applyShared}>
                  <CopyCheck className="size-4" aria-hidden />Terapkan ke semua
                </Button>
                <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-5">Menyalin jenjang, halaman, dan nilai dari panel ini ke seluruh santri. Catatan tetap diisi masing-masing.</p>
              </section>
            )}

            <div className="space-y-2">
              {students.map((student, index) => {
                const row = values[student.id] ?? emptyRow();
                const saved = entries.some((entry) => entry.studentId === student.id && entry.type === type);
                const needsNote = type === "LEARNING" && row.grade !== "" && row.grade !== "A";
                return (
                  <details key={student.id} data-student-id={student.id} className={`group overflow-hidden rounded-xl border bg-card ${row.clear ? "border-dashed border-muted-foreground/50 opacity-70" : saved ? "border-sky-300 dark:border-sky-800" : "border-border"}`}>
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 border-l-4 border-l-sky-600 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-100">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{student.fullName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {row.clear ? "Akan dikosongkan" : saved ? "Tersimpan · bisa ditimpa" : `NIS ${student.nis}`}
                          {row.stage ? ` · ${ummiLevels.find((level) => level.value === row.stage)?.label ?? row.stage}` : ""}
                        </span>
                      </span>
                      <span className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold"><span className="group-open:hidden">Isi</span><span className="hidden group-open:inline">Tutup</span></span>
                      <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="grid gap-3 border-t border-border bg-muted/25 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Jenjang
                        <select required className={fieldClass} value={row.stage} onChange={(event) => update(student.id, { stage: event.target.value })}>
                          <option value="" disabled>Pilih jenjang</option>
                          {ummiLevels.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      {type === "LEARNING" && (
                        <>
                          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Dari halaman
                            <input type="number" min={1} required className={fieldClass} value={row.fromPage} onChange={(event) => update(student.id, { fromPage: event.target.value })} />
                          </label>
                          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Sampai halaman
                            <input type="number" min={1} required className={fieldClass} value={row.toPage} onChange={(event) => update(student.id, { toPage: event.target.value })} />
                          </label>
                        </>
                      )}
                      <div className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Nilai
                        <GradeButtons label={`Nilai ${student.fullName}`} value={row.grade} onChange={(grade) => update(student.id, { grade })} />
                      </div>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:col-span-2 lg:col-span-3">
                        Catatan {needsNote ? "(wajib untuk nilai selain A)" : "(opsional)"}
                        <textarea maxLength={500} rows={2} required={needsNote} className={fieldClass} value={row.note}
                          onChange={(event) => update(student.id, { note: event.target.value })} />
                      </label>
                      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3">
                        <Button type="button" variant="outline" className="gap-2" onClick={() => clearRow(student.id)}><Trash2 className="size-4" aria-hidden />Kosongkan baris</Button>
                        {saved && !row.clear && <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-800 dark:text-sky-200"><Check className="size-4" aria-hidden />Data tersimpan akan ditimpa saat disimpan</span>}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending || students.length === 0} className="bg-sky-700 text-white hover:bg-sky-800">
                {pending ? "Menyimpan…" : savedCount ? `Timpa / Simpan ${ummiEntryTypes.find((item) => item.value === type)?.label}` : `Simpan ${ummiEntryTypes.find((item) => item.value === type)?.label}`}
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
