"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Check, ChevronDown, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { fluencyGrades, tahfidzTypes } from "./constants";
import { saveTahfidzEntries } from "./actions";

type Student = { id: string; nis: string; fullName: string };
type Entry = {
  studentId: string;
  type: string;
  lineCount: number | null;
  juzNumber: number | null;
  fromPage: number | null;
  toPage: number | null;
  fluencyGrade: string | null;
  assessment: string;
  score: number | null;
  note: string | null;
};
type HistoryEntry = Entry & { date: Date; updatedAt: Date; student: { fullName: string } };
type ValueMap = Record<string, string | number | null>;

const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary";

function getValues(students: Student[], entries: Entry[], type: string) {
  return Object.fromEntries(students.map((student) => {
    const saved = entries.find((entry) => entry.studentId === student.id && entry.type === type);
    return [student.id, {
      juzNumber: saved?.juzNumber ?? "",
      fromPage: saved?.fromPage ?? "",
      toPage: saved?.toPage ?? "",
      lineCount: saved?.lineCount ?? (type === "ZIYADAH" ? APP_CONFIG.defaultZiyadahTarget : ""),
      fluencyGrade: saved?.fluencyGrade ?? "",
      score: saved?.score ?? "",
      note: saved?.note ?? "",
    }];
  })) as Record<string, ValueMap>;
}

function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00.000Z`) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getWeekEnd(weekStartDate: string) {
  const end = new Date(`${weekStartDate}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return end.toISOString().slice(0, 10);
}

function getIsoWeekValue(weekStartDate: string) {
  const date = new Date(`${weekStartDate}T00:00:00.000Z`);
  const thursday = new Date(date);
  thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function TahfidzForm({
  halaqahs,
  selectedHalaqahId,
  weekStartDate,
  students,
  entries,
  history,
}: {
  halaqahs: { id: string; name: string }[];
  selectedHalaqahId: string;
  weekStartDate: string;
  students: Student[];
  entries: Entry[];
  history: HistoryEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeType, setActiveType] = useState<"ZIYADAH" | "MURAJAAH" | "JUZIYYAH">("ZIYADAH");
  const [result, setResult] = useState<{ ok: boolean; message: string }>();
  const [formValues, setFormValues] = useState(() => getValues(students, entries, "ZIYADAH"));
  const [clearedStudents, setClearedStudents] = useState<Set<string>>(new Set());
  const completedTypes = new Set(
    tahfidzTypes
      .filter(({ value }) => students.length > 0 && students.every((student) => entries.some((entry) => entry.studentId === student.id && entry.type === value)))
      .map(({ value }) => value),
  );
  const reportProgress = Math.round(completedTypes.size / tahfidzTypes.length * 100);
  const weekEndDate = getWeekEnd(weekStartDate);
  const weekValue = getIsoWeekValue(weekStartDate);

  function setValue(studentId: string, key: string, value: string) {
    setFormValues((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [key]: value },
    }));
  }

  function switchType(type: "ZIYADAH" | "MURAJAAH" | "JUZIYYAH") {
    setActiveType(type);
    setFormValues(getValues(students, entries, type));
    setClearedStudents(new Set());
    setResult(undefined);
  }

  function clearStudent(studentId: string) {
    setClearedStudents((current) => new Set(current).add(studentId));
    setFormValues((current) => ({
      ...current,
      [studentId]: { juzNumber: "", fromPage: "", toPage: "", lineCount: "", fluencyGrade: "", score: "", note: "" },
    }));
  }

  function restoreStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    if (!student) return;
    setClearedStudents((current) => {
      const next = new Set(current);
      next.delete(studentId);
      return next;
    });
    setFormValues((current) => ({
      ...current,
      ...getValues([student], entries, activeType),
    }));
  }

  const typeIcon = activeType === "MURAJAAH" ? RotateCcw : activeType === "JUZIYYAH" ? Sparkles : BookOpenCheck;
  const TypeIcon = typeIcon;

  return (
    <div className="space-y-5">
      <form action="/pembinaan" method="get" className="grid gap-3 rounded-2xl border border-teal-900/10 bg-teal-50/60 p-4 dark:bg-teal-950/20 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="tab" value="tahfidz" />
        <input type="hidden" name="frequency" value="weekly" />
        <label className="grid gap-1 text-sm font-semibold">
          Halaqah
          <select name="halaqah" defaultValue={selectedHalaqahId} className={fieldClass}>
            {halaqahs.map((halaqah) => <option key={halaqah.id} value={halaqah.id}>{halaqah.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Pekan
          <input type="week" name="week" defaultValue={weekValue} className={fieldClass} required />
        </label>
        <Button type="submit" variant="outline">Tampilkan</Button>
        <p className="text-xs text-muted-foreground sm:col-span-3">
          {formatDate(weekStartDate)} – {formatDate(weekEndDate)}
        </p>
      </form>

      <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-card shadow-sm">
        <div className="flex items-start gap-3 border-l-4 border-l-teal-600 bg-teal-50/60 p-4 dark:bg-teal-950/20 sm:p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
            <BookOpenCheck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-teal-800 dark:text-teal-200">Laporan Jurnal Tahfizh</p>
            <h3 className="mt-1 text-xl font-bold">{reportProgress}% terkirim</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pekan {formatDate(weekStartDate)} – {formatDate(weekEndDate)} · {completedTypes.size} dari {tahfidzTypes.length} kategori tersimpan.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-teal-900/10 dark:bg-teal-100/10">
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${reportProgress}%` }} />
            </div>
          </div>
          {reportProgress === 100 && <Check className="mt-1 size-5 shrink-0 text-emerald-600" aria-label="Laporan lengkap" />}
        </div>
      </section>

      {students.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Belum ada santri yang ditempatkan di halaqah ini.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Jenis Tahfidz">
            {tahfidzTypes.map((type) => {
              const active = activeType === type.value;
              const completed = completedTypes.has(type.value);
              const Icon = type.value === "MURAJAAH" ? RotateCcw : type.value === "JUZIYYAH" ? Sparkles : BookOpenCheck;
              return (
                <button
                  key={type.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchType(type.value)}
                  className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition sm:text-sm ${active ? "border-teal-700 bg-teal-700 text-white shadow-sm" : "border-border bg-card text-muted-foreground hover:bg-teal-50 dark:hover:bg-teal-950/30"}`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {completed && <Check className="size-3.5" aria-hidden />}
                  {type.label}
                </button>
              );
            })}
          </div>

          <form noValidate className="space-y-4" onSubmit={(event) => {
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
              type: activeType,
              entries: students.map((student) => {
                const value = formValues[student.id];
                const clear = clearedStudents.has(student.id);
                return {
                  studentId: student.id,
                  clear,
                  juzNumber: value.juzNumber === "" ? undefined : Number(value.juzNumber),
                  fromPage: value.fromPage === "" ? undefined : Number(value.fromPage),
                  toPage: value.toPage === "" ? undefined : Number(value.toPage),
                  lineCount: activeType === "ZIYADAH" && value.lineCount !== "" ? Number(value.lineCount) : undefined,
                  fluencyGrade: value.fluencyGrade || undefined,
                  assessment: "BELUM_DINILAI",
                  score: activeType === "JUZIYYAH" && value.score !== "" ? Number(value.score) : undefined,
                  note: String(value.note ?? "") || undefined,
                };
              }),
            };
            const data = new FormData(event.currentTarget);
            data.set("payload", JSON.stringify(payload));
            startTransition(async () => {
              setResult(undefined);
              try {
                const response = await saveTahfidzEntries(data);
                setResult(response);
                if (response.ok) router.refresh();
              } catch {
                setResult({ ok: false, message: "Sambungan terputus. Muat ulang sebelum mencoba kembali." });
              }
            });
          }}>
            <div className="space-y-2">
              {students.map((student, index) => {
                const value = formValues[student.id];
                const saved = entries.some((entry) => entry.studentId === student.id && entry.type === activeType);
                const cleared = clearedStudents.has(student.id);
                const currentGrade = String(value?.fluencyGrade ?? "");
                return (
                  <details key={student.id} className="group overflow-hidden rounded-2xl border border-teal-900/10 bg-card shadow-sm">
                    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 border-l-4 border-l-teal-500 px-4 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-200">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{student.fullName}</span>
                        <span className="block text-xs text-muted-foreground">{cleared ? "Akan dikosongkan" : saved ? "Tersimpan · bisa ditimpa" : `NIS ${student.nis}`}</span>
                      </span>
                      <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground">
                        <span className="group-open:hidden">Isi</span><span className="hidden group-open:inline">Tutup</span>
                      </span>
                      <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    {cleared ? (
                      <div className="space-y-3 border-t border-border bg-muted/30 p-4">
                        <p className="text-sm text-muted-foreground">Baris ini akan dikosongkan saat laporan disimpan.</p>
                        <Button type="button" variant="outline" onClick={() => restoreStudent(student.id)}>Pulihkan isian</Button>
                      </div>
                    ) : <div className="grid gap-3 border-t border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Juz
                        <select required className={fieldClass} value={String(value?.juzNumber ?? "")}
                          onChange={(event) => setValue(student.id, "juzNumber", event.target.value)}>
                          <option value="" disabled>Pilih juz</option>
                          {Array.from({ length: 30 }, (_, i) => <option key={i + 1} value={i + 1}>Juz {i + 1}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Dari halaman
                        <input type="number" min={1} required className={fieldClass} value={String(value?.fromPage ?? "")}
                          onChange={(event) => setValue(student.id, "fromPage", event.target.value)} />
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Sampai halaman
                        <input type="number" min={1} required className={fieldClass} value={String(value?.toPage ?? "")}
                          onChange={(event) => setValue(student.id, "toPage", event.target.value)} />
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Jumlah baris
                        <input type="number" min={1} required={activeType === "ZIYADAH"} className={fieldClass}
                          value={String(value?.lineCount ?? "")}
                          onChange={(event) => setValue(student.id, "lineCount", event.target.value)} />
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Nilai kelancaran
                        <select required className={fieldClass} value={currentGrade}
                          onChange={(event) => setValue(student.id, "fluencyGrade", event.target.value)}>
                          <option value="" disabled>Pilih nilai</option>
                          {fluencyGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                        </select>
                      </label>
                      {activeType === "JUZIYYAH" && (
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Nilai ujian (0–100)
                          <input type="number" min={0} max={100} className={fieldClass} value={String(value?.score ?? "")}
                            onChange={(event) => setValue(student.id, "score", event.target.value)} />
                        </label>
                      )}
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:col-span-2 lg:col-span-3">
                        Catatan (opsional)
                        <input maxLength={500} className={fieldClass} value={String(value?.note ?? "")}
                          onChange={(event) => setValue(student.id, "note", event.target.value)} />
                      </label>
                      <Button type="button" variant="outline" className="gap-2 sm:col-span-2 lg:col-span-3" onClick={() => clearStudent(student.id)}>
                        <Trash2 className="size-4" aria-hidden />Kosongkan baris
                      </Button>
                    </div>}
                  </details>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : `Simpan ${tahfidzTypes.find((item) => item.value === activeType)?.label}`}</Button>
              <span className="text-xs text-muted-foreground">Satu penyimpanan untuk seluruh santri pada halaqah ini.</span>
            </div>
            {result && <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-red-700 dark:text-red-300"}>{result.message}</p>}
          </form>
        </>
      )}

      {history.length > 0 && (
        <details className="rounded-2xl border border-border bg-card shadow-sm">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-bold [&::-webkit-details-marker]:hidden">
            Riwayat jurnal halaqah <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          </summary>
          <ul className="divide-y divide-border border-t border-border px-4">
            {history.map((entry) => (
              <li key={`${entry.studentId}:${entry.date.toISOString()}:${entry.type}`} className="py-3 text-sm">
                <p className="font-semibold">{formatDate(entry.date)} · {entry.student.fullName} · {tahfidzTypes.find((item) => item.value === entry.type)?.label}</p>
                <p className="text-muted-foreground">
                  Juz {entry.juzNumber ?? "—"} · Hal {entry.fromPage ?? "—"}–{entry.toPage ?? "—"}
                  {entry.lineCount ? ` · ${entry.lineCount} baris` : ""}
                  {entry.fluencyGrade ? ` · Nilai ${entry.fluencyGrade}` : ""}
                  {entry.score != null ? ` · Ujian ${entry.score}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
