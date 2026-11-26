"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/constants";
import { tahfidzAssessments, tahfidzTypes } from "./constants";
import { saveTahfidzEntries } from "./actions";

type Student = { id: string; nis: string; fullName: string };
type Entry = {
  studentId: string;
  type: string;
  fromSurah: string | null;
  fromAyat: number | null;
  toSurah: string | null;
  toAyat: number | null;
  lineCount: number | null;
  juzNumber: number | null;
  assessment: string;
  score: number | null;
  note: string | null;
};
type HistoryEntry = Entry & { date: Date; updatedAt: Date };

const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary";

export function TahfidzForm({
  halaqahs,
  selectedHalaqahId,
  selectedDate,
  minDate,
  maxDate,
  students,
  entries,
  history,
}: {
  halaqahs: { id: string; name: string }[];
  selectedHalaqahId: string;
  selectedDate: string;
  minDate: string;
  maxDate: string;
  students: Student[];
  entries: Entry[];
  history: HistoryEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeType, setActiveType] = useState<"ZIYADAH" | "MURAJAAH" | "JUZIYYAH">("ZIYADAH");
  const [result, setResult] = useState<{ ok: boolean; message: string }>();
  const [formValues, setFormValues] = useState<Record<string, Record<string, string | number | null>>>(() =>
    Object.fromEntries(students.map((student) => {
      const saved = entries.find((entry) => entry.studentId === student.id && entry.type === activeType);
      return [student.id, {
        fromSurah: saved?.fromSurah ?? "",
        fromAyat: saved?.fromAyat ?? "",
        toSurah: saved?.toSurah ?? "",
        toAyat: saved?.toAyat ?? "",
        lineCount: saved?.lineCount ?? APP_CONFIG.defaultZiyadahTarget,
        juzNumber: saved?.juzNumber ?? "",
        assessment: saved?.assessment ?? "BELUM_DINILAI",
        score: saved?.score ?? "",
        note: saved?.note ?? "",
      }];
    })),
  );

  function setValue(studentId: string, key: string, value: string | number) {
    setFormValues((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [key]: value },
    }));
  }

  function switchType(type: "ZIYADAH" | "MURAJAAH" | "JUZIYYAH") {
    setActiveType(type);
    setFormValues(Object.fromEntries(students.map((student) => {
      const saved = entries.find((entry) => entry.studentId === student.id && entry.type === type);
      return [student.id, {
        fromSurah: saved?.fromSurah ?? "",
        fromAyat: saved?.fromAyat ?? "",
        toSurah: saved?.toSurah ?? "",
        toAyat: saved?.toAyat ?? "",
        lineCount: saved?.lineCount ?? (type === "ZIYADAH" ? APP_CONFIG.defaultZiyadahTarget : ""),
        juzNumber: saved?.juzNumber ?? "",
        assessment: saved?.assessment ?? "BELUM_DINILAI",
        score: saved?.score ?? "",
        note: saved?.note ?? "",
      }];
    })));
  }

  return (
    <div className="space-y-5">
      <form action="/pembinaan" method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="tab" value="tahfidz" />
        <label className="grid gap-1 text-sm font-semibold">
          Halaqah
          <select name="halaqah" defaultValue={selectedHalaqahId} className={fieldClass}>
            {halaqahs.map((halaqah) => <option key={halaqah.id} value={halaqah.id}>{halaqah.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Tanggal
          <input type="date" name="date" defaultValue={selectedDate} min={minDate} max={maxDate} className={fieldClass} required />
        </label>
        <Button type="submit" variant="outline">Tampilkan</Button>
      </form>

      {students.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Belum ada santri yang ditempatkan di halaqah ini.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Jenis Tahfidz">
            {tahfidzTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                role="tab"
                aria-selected={activeType === type.value}
                onClick={() => switchType(type.value)}
                className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${activeType === type.value ? "border-primary bg-primary text-white" : "border-border bg-card hover:bg-muted"}`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            const payload = {
              halaqahId: selectedHalaqahId,
              date: selectedDate,
              type: activeType,
              entries: students.map((student) => {
                const value = formValues[student.id];
                return {
                  studentId: student.id,
                  fromSurah: String(value.fromSurah ?? "") || undefined,
                  fromAyat: value.fromAyat === "" || value.fromAyat == null ? undefined : Number(value.fromAyat),
                  toSurah: String(value.toSurah ?? "") || undefined,
                  toAyat: value.toAyat === "" || value.toAyat == null ? undefined : Number(value.toAyat),
                  lineCount: activeType === "ZIYADAH" ? Number(value.lineCount) : undefined,
                  juzNumber: activeType === "JUZIYYAH" && value.juzNumber !== "" ? Number(value.juzNumber) : undefined,
                  assessment: String(value.assessment),
                  score: value.score === "" || value.score == null ? undefined : Number(value.score),
                  note: String(value.note ?? "") || undefined,
                };
              }),
            };
            const data = new FormData(event.currentTarget);
            data.set("payload", JSON.stringify(payload));
            startTransition(async () => {
              setResult(undefined);
              try {
                setResult(await saveTahfidzEntries(data));
                router.refresh();
              } catch {
                setResult({ ok: false, message: "Sambungan terputus. Muat ulang sebelum mencoba kembali." });
              }
            });
          }}>
            <div className="space-y-3">
              {students.map((student) => {
                const value = formValues[student.id];
                return (
                  <article key={student.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <p className="font-semibold">{student.fullName}</p>
                    <p className="text-xs text-muted-foreground">NIS {student.nis}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {activeType !== "JUZIYYAH" && (
                        <>
                          <label className="grid gap-1 text-sm font-semibold">
                            Dari surah
                            <input className={fieldClass} maxLength={80} value={String(value.fromSurah ?? "")}
                              onChange={(event) => setValue(student.id, "fromSurah", event.target.value)} />
                          </label>
                          <label className="grid gap-1 text-sm font-semibold">
                            Ayat
                            <input type="number" min={1} className={fieldClass} value={value.fromAyat ?? ""}
                              onChange={(event) => setValue(student.id, "fromAyat", event.target.value)} />
                          </label>
                          <label className="grid gap-1 text-sm font-semibold">
                            Sampai surah
                            <input className={fieldClass} maxLength={80} value={String(value.toSurah ?? "")}
                              onChange={(event) => setValue(student.id, "toSurah", event.target.value)} />
                          </label>
                          <label className="grid gap-1 text-sm font-semibold">
                            Ayat
                            <input type="number" min={1} className={fieldClass} value={value.toAyat ?? ""}
                              onChange={(event) => setValue(student.id, "toAyat", event.target.value)} />
                          </label>
                        </>
                      )}
                      {activeType === "ZIYADAH" && (
                        <label className="grid gap-1 text-sm font-semibold">
                          Jumlah baris
                          <input type="number" min={1} required className={fieldClass} value={value.lineCount ?? ""}
                            onChange={(event) => setValue(student.id, "lineCount", event.target.value)} />
                        </label>
                      )}
                      {activeType === "JUZIYYAH" && (
                        <label className="grid gap-1 text-sm font-semibold">
                          Juz
                          <input type="number" min={1} max={30} required className={fieldClass} value={value.juzNumber ?? ""}
                            onChange={(event) => setValue(student.id, "juzNumber", event.target.value)} />
                        </label>
                      )}
                      {activeType === "JUZIYYAH" && (
                        <label className="grid gap-1 text-sm font-semibold">
                          Nilai (0–100)
                          <input type="number" min={0} max={100} className={fieldClass} value={value.score ?? ""}
                            onChange={(event) => setValue(student.id, "score", event.target.value)} />
                        </label>
                      )}
                      <label className="grid gap-1 text-sm font-semibold">
                        Penilaian
                        <select className={fieldClass} value={String(value.assessment)} onChange={(event) => setValue(student.id, "assessment", event.target.value)}>
                          {tahfidzAssessments.map((assessment) => <option key={assessment.value} value={assessment.value}>{assessment.label}</option>)}
                        </select>
                      </label>
                      {value.assessment === "PERLU_ULANG" && (
                        <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
                          Keterangan wajib
                          <input required maxLength={500} className={fieldClass} value={String(value.note ?? "")}
                            onChange={(event) => setValue(student.id, "note", event.target.value)} />
                        </label>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : `Simpan ${tahfidzTypes.find((item) => item.value === activeType)?.label}`}</Button>
            {result && <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-muted-foreground" : "text-sm text-red-700 dark:text-red-300"}>{result.message}</p>}
          </form>
        </>
      )}

      {history.length > 0 && (
        <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <summary className="cursor-pointer font-bold">Riwayat 20 jurnal terakhir</summary>
          <ul className="mt-3 divide-y divide-border">
            {history.map((entry) => (
              <li key={`${entry.studentId}:${entry.date.toISOString()}:${entry.type}`} className="py-3 text-sm">
                <p className="font-semibold">{entry.date.toISOString().slice(0, 10)} · {tahfidzTypes.find((item) => item.value === entry.type)?.label}</p>
                <p className="text-muted-foreground">
                  {entry.lineCount ? `${entry.lineCount} baris · ` : ""}
                  {entry.juzNumber ? `Juz ${entry.juzNumber} · ` : ""}
                  {entry.fromSurah ? `${entry.fromSurah}${entry.fromAyat ? `:${entry.fromAyat}` : ""}` : ""}
                  {entry.toSurah ? ` – ${entry.toSurah}${entry.toAyat ? `:${entry.toAyat}` : ""}` : ""}
                  {entry.score != null ? ` · Nilai ${entry.score}` : ""}
                  {` · ${tahfidzAssessments.find((item) => item.value === entry.assessment)?.label ?? entry.assessment}`}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
