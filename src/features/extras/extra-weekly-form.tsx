"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Check, ChevronDown, LibraryBig, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { fluencyGrades } from "@/features/tahfidz/constants";
import { extraPrograms, ummiLevels } from "./constants";
import { saveExtraWeeklyEntries } from "./actions";
import { formatDate, getIsoWeekValue, getTahfizhIntensifTargetPages, getWeekEnd } from "./week";

type Program = (typeof extraPrograms)[number]["value"];
type Student = { id: string; nis: string; fullName: string };
type Entry = {
  studentId: string;
  program: Program;
  targetPages: number | null;
  pagesCompleted: number | null;
  ummiLevel: string | null;
  fromPage: number | null;
  toPage: number | null;
  fluencyGrade: string | null;
  note: string | null;
};
type HistoryEntry = Entry & {
  weekStartDate: Date;
  student: { fullName: string };
};
type StudentValues = {
  pagesCompleted: string;
  ummiLevel: string;
  fromPage: string;
  toPage: string;
  fluencyGrade: string;
  note: string;
};
type FormValues = Record<string, StudentValues>;

const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary";

function getValues(students: Student[], entries: Entry[], program: Program): FormValues {
  return Object.fromEntries(students.map((student) => {
    const saved = entries.find((entry) => entry.studentId === student.id && entry.program === program);
    return [student.id, {
      pagesCompleted: saved?.pagesCompleted == null ? "" : String(saved.pagesCompleted),
      ummiLevel: saved?.ummiLevel ?? "",
      fromPage: saved?.fromPage == null ? "" : String(saved.fromPage),
      toPage: saved?.toPage == null ? "" : String(saved.toPage),
      fluencyGrade: saved?.fluencyGrade ?? "",
      note: saved?.note ?? "",
    }];
  }));
}

function gradeLabel(grade: string | null) {
  return grade ? `Nilai ${grade}` : "";
}

export function ExtraWeeklyForm({
  halaqahs,
  selectedHalaqahId,
  weekStartDate,
  semesterStartDate,
  semesterEndDate,
  students,
  entries,
  history,
}: {
  halaqahs: { id: string; name: string }[];
  selectedHalaqahId: string;
  weekStartDate: string;
  semesterStartDate: string;
  semesterEndDate: string;
  students: Student[];
  entries: Entry[];
  history: HistoryEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeProgram, setActiveProgram] = useState<Program>("TAHFIZH_INTENSIF");
  const [values, setValues] = useState<FormValues>(() => getValues(students, entries, "TAHFIZH_INTENSIF"));
  const [result, setResult] = useState<{ ok: boolean; message: string }>();
  const weekStart = new Date(`${weekStartDate}T00:00:00.000Z`);
  const weekEnd = getWeekEnd(weekStart);
  const targetPages = getTahfizhIntensifTargetPages(
    weekStart,
    new Date(`${semesterStartDate}T00:00:00.000Z`),
    new Date(`${semesterEndDate}T00:00:00.000Z`),
  );
  const completedEntries = entries.filter((entry) => entry.program === activeProgram).length;
  const completionPercent = students.length ? Math.round(completedEntries / students.length * 100) : 0;
  const completedPrograms = extraPrograms.filter(({ value }) => (
    students.length > 0 && students.every((student) => entries.some((entry) => entry.studentId === student.id && entry.program === value))
  )).length;
  const ActiveIcon = activeProgram === "TAHFIZH_INTENSIF" ? BookOpenCheck : LibraryBig;
  const activeProgramLabel = extraPrograms.find(({ value }) => value === activeProgram)?.label ?? "Ekstra";

  useEffect(() => {
    setValues(getValues(students, entries, activeProgram));
  }, [students, entries, activeProgram]);

  function setValue(studentId: string, key: keyof StudentValues, value: string) {
    setValues((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [key]: value },
    }));
  }

  function changeProgram(program: Program) {
    setActiveProgram(program);
    setValues(getValues(students, entries, program));
    setResult(undefined);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const invalidField = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(":invalid");
    if (invalidField) {
      invalidField.closest("details")?.setAttribute("open", "");
      invalidField.focus();
      invalidField.reportValidity();
      return;
    }

    const payload = {
      halaqahId: selectedHalaqahId,
      weekStartDate,
      program: activeProgram,
      entries: students.map((student) => {
        const value = values[student.id];
        return activeProgram === "TAHFIZH_INTENSIF"
          ? { studentId: student.id, pagesCompleted: Number(value.pagesCompleted), note: value.note || undefined }
          : {
              studentId: student.id,
              ummiLevel: value.ummiLevel,
              fromPage: Number(value.fromPage),
              toPage: Number(value.toPage),
              fluencyGrade: value.fluencyGrade,
              note: value.note || undefined,
            };
      }),
    };
    const data = new FormData();
    data.set("payload", JSON.stringify(payload));
    startTransition(async () => {
      setResult(undefined);
      try {
        const response = await saveExtraWeeklyEntries(data);
        setResult(response);
        if (response.ok) router.refresh();
      } catch {
        setResult({ ok: false, message: "Sambungan terputus. Muat ulang sebelum mencoba kembali." });
      }
    });
  }

  return (
    <div className="space-y-5">
      <form action="/ekstra" method="get" className="grid gap-3 rounded-2xl border border-teal-900/10 bg-teal-50/60 p-4 dark:bg-teal-950/20 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-semibold">
          Halaqah
          <select name="halaqah" defaultValue={selectedHalaqahId} className={fieldClass}>
            {halaqahs.map((halaqah) => <option key={halaqah.id} value={halaqah.id}>{halaqah.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Pekan
          <input type="week" name="week" defaultValue={getIsoWeekValue(weekStart)} className={fieldClass} required />
        </label>
        <Button type="submit" variant="outline">Tampilkan</Button>
        <p className="text-xs text-muted-foreground sm:col-span-3">
          Pekan {formatDate(weekStart)} – {formatDate(weekEnd)}
        </p>
      </form>

      <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-card shadow-sm">
        <header className="flex items-start gap-3 border-l-4 border-l-teal-600 bg-teal-50/60 p-4 dark:bg-teal-950/20 sm:p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-teal-800 dark:text-teal-200">Laporan Ekstra</p>
            <h2 className="mt-1 text-xl font-bold">{completedPrograms}/{extraPrograms.length} program lengkap</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {completedEntries}/{students.length} santri tercatat untuk {activeProgramLabel} pekan ini.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-teal-900/10 dark:bg-teal-100/10">
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
          {completedPrograms === extraPrograms.length && students.length > 0 && (
            <Check className="mt-1 size-5 shrink-0 text-emerald-600" aria-label="Laporan lengkap" />
          )}
        </header>
      </section>

      {students.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Belum ada santri di halaqah ini.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Program ekstra">
            {extraPrograms.map((program) => {
              const active = activeProgram === program.value;
              const complete = students.every((student) => entries.some((entry) => entry.studentId === student.id && entry.program === program.value));
              const Icon = program.value === "TAHFIZH_INTENSIF" ? BookOpenCheck : LibraryBig;
              return (
                <button
                  key={program.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => changeProgram(program.value)}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${active ? "border-teal-700 bg-teal-700 text-white shadow-sm" : "border-border bg-card text-muted-foreground hover:bg-teal-50 dark:hover:bg-teal-950/30"}`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {program.label}
                  {complete && <Check className="size-3.5" aria-label="Lengkap" />}
                </button>
              );
            })}
          </div>

          <form noValidate className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              {students.map((student, index) => {
                const value = values[student.id];
                const saved = entries.some((entry) => entry.studentId === student.id && entry.program === activeProgram);
                return (
                  <details key={student.id} className="group overflow-hidden rounded-2xl border border-teal-900/10 bg-card shadow-sm">
                    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 border-l-4 border-l-teal-500 px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{student.fullName}</span>
                        <span className="block text-xs text-muted-foreground">NIS {student.nis}{saved ? " · Sudah tersimpan" : ""}</span>
                      </span>
                      <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground">
                        <span className="group-open:hidden">Isi</span><span className="hidden group-open:inline">Tutup</span>
                      </span>
                      <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="grid gap-3 border-t border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {activeProgram === "TAHFIZH_INTENSIF" ? (
                        <>
                          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Halaman dicapai pekan ini
                            <input
                              type="number"
                              min={0}
                              max={1000}
                              required
                              className={fieldClass}
                              value={value.pagesCompleted}
                              onChange={(event) => setValue(student.id, "pagesCompleted", event.target.value)}
                            />
                          </label>
                          <p className="self-end pb-3 text-sm text-muted-foreground sm:col-span-1">
                            Target: {targetPages} halaman · {APP_CONFIG.defaultTahfizhIntensifTarget} halaman/hari
                          </p>
                        </>
                      ) : (
                        <>
                          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Level UMMI
                            <select
                              required
                              className={fieldClass}
                              value={value.ummiLevel}
                              onChange={(event) => setValue(student.id, "ummiLevel", event.target.value)}
                            >
                              <option value="" disabled>Pilih level</option>
                              {ummiLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Dari halaman
                            <input type="number" min={1} required className={fieldClass} value={value.fromPage}
                              onChange={(event) => setValue(student.id, "fromPage", event.target.value)} />
                          </label>
                          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Sampai halaman
                            <input type="number" min={1} required className={fieldClass} value={value.toPage}
                              onChange={(event) => setValue(student.id, "toPage", event.target.value)} />
                          </label>
                          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Nilai kelancaran
                            <select required className={fieldClass} value={value.fluencyGrade}
                              onChange={(event) => setValue(student.id, "fluencyGrade", event.target.value)}>
                              <option value="" disabled>Pilih nilai</option>
                              {fluencyGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                            </select>
                          </label>
                        </>
                      )}
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:col-span-2 lg:col-span-3">
                        Catatan (opsional)
                        <input maxLength={500} className={fieldClass} value={value.note}
                          onChange={(event) => setValue(student.id, "note", event.target.value)} />
                      </label>
                    </div>
                  </details>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : `Simpan ${activeProgramLabel}`}</Button>
              <span className="text-xs text-muted-foreground">Penyimpanan dilakukan per program untuk seluruh santri halaqah.</span>
            </div>
            {result && <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-red-700 dark:text-red-300"}>{result.message}</p>}
          </form>
        </>
      )}

      {history.length > 0 && (
        <details className="rounded-2xl border border-border bg-card shadow-sm">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-bold [&::-webkit-details-marker]:hidden">
            Riwayat jurnal ekstra <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          </summary>
          <ul className="divide-y divide-border border-t border-border px-4">
            {history.map((entry) => {
              const programLabel = extraPrograms.find(({ value }) => value === entry.program)?.label ?? entry.program;
              const levelLabel = ummiLevels.find(({ value }) => value === entry.ummiLevel)?.label;
              const detail = entry.program === "TAHFIZH_INTENSIF"
                ? `${entry.pagesCompleted ?? 0}/${entry.targetPages ?? 0} halaman`
                : `${levelLabel ?? "Level"} · halaman ${entry.fromPage ?? "—"}–${entry.toPage ?? "—"} · ${gradeLabel(entry.fluencyGrade)}`;
              return (
                <li key={`${entry.studentId}:${entry.weekStartDate.toISOString()}:${entry.program}`} className="py-3 text-sm">
                  <p className="font-semibold">{formatDate(entry.weekStartDate)} · {entry.student.fullName} · {programLabel}</p>
                  <p className="text-muted-foreground">{detail}{entry.note ? ` · ${entry.note}` : ""}</p>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
