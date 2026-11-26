"use server";

import { IntensiveEntryType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { APP_CONFIG } from "@/config/constants";
import { getActiveProfile } from "@/features/auth/session";
import { db } from "@/lib/db";
import { getWeekEnd } from "./week";

class InputError extends Error {}

const uuid = z.uuid();
const dateText = z.iso.date();
const grades = z.enum(["A", "B", "C", "D"]);
const intensiveTypes = z.enum(["ZIYADAH", "MURAJAAH", "TASMI"]);
const ummiTypes = z.enum(["LEARNING", "EXAM"]);
const ummiStages = z.enum(["JILID_1", "JILID_2", "JILID_3", "GHARIB", "TAJWID", "AL_QURAN"]);

const intensivePayloadSchema = z.object({
  groupId: uuid,
  weekStartDate: dateText,
  type: intensiveTypes,
  entries: z.array(z.object({
    studentId: uuid,
    clear: z.boolean(),
    pagesCompleted: z.number().int().min(0).max(APP_CONFIG.defaultIntensiveWeeklyTargetPages).optional(),
    juzNumber: z.number().int().min(1).max(30).optional(),
    fromPage: z.number().int().min(1).optional(),
    toPage: z.number().int().min(1).optional(),
    isMurajaahWeek: z.boolean().optional(),
    jadid: z.boolean().optional(),
    qadim: z.boolean().optional(),
    tasmiScores: z.array(z.object({ juzNumber: z.number().int().min(1).max(30), grade: grades })).max(30).optional(),
    note: z.string().trim().max(500).optional(),
  })),
});

const ummiPayloadSchema = z.object({
  groupId: uuid,
  weekStartDate: dateText,
  type: ummiTypes,
  entries: z.array(z.object({
    studentId: uuid,
    clear: z.boolean(),
    stage: ummiStages.optional(),
    fromPage: z.number().int().min(1).optional(),
    toPage: z.number().int().min(1).optional(),
    grade: grades.optional(),
    note: z.string().trim().max(500).optional(),
  })),
});

function parseWeekStart(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || date.getUTCDay() !== 1) {
    throw new InputError("Awal pekan jurnal harus berupa tanggal Senin yang valid.");
  }
  return date;
}

async function getGroupScope(
  profile: NonNullable<Awaited<ReturnType<typeof getActiveProfile>>>,
  groupId: string,
  program: "TAHFIZH_INTENSIF" | "TAHSIN_UMMI",
  weekStartDate: Date,
) {
  if (!["ADMIN", "MUSYRIF"].includes(profile.role)) throw new InputError("Akses tidak tersedia.");
  const semester = await db.semester.findFirst({
    where: { isActive: true, closedAt: null, academicYear: { isActive: true } },
    select: { id: true, academicYearId: true, startDate: true, endDate: true },
  });
  if (!semester) throw new InputError("Belum ada semester aktif.");

  const weekEndDate = getWeekEnd(weekStartDate);
  if (weekEndDate < semester.startDate || weekStartDate > semester.endDate) {
    throw new InputError("Pekan jurnal harus beririsan dengan semester aktif.");
  }

  const group = await db.extraHalaqah.findFirst({
    where: {
      id: groupId,
      semesterId: semester.id,
      program,
      ...(profile.role === "MUSYRIF" ? { teacherId: profile.id } : {}),
    },
    select: { id: true },
  });
  if (!group) throw new InputError("Halaqah ekstra tidak ditemukan atau bukan halaqah yang Anda ampu.");

  const assignments = await db.extraStudentAssignment.findMany({
    where: { semesterId: semester.id, groupId: group.id, program },
    select: { studentId: true },
  });
  if (assignments.length === 0) throw new InputError("Belum ada santri pada halaqah ekstra ini.");
  return { semester, group, studentIds: assignments.map(({ studentId }) => studentId) };
}

function validateRoster(entries: { studentId: string }[], rosterIds: string[]) {
  const ids = new Set(entries.map(({ studentId }) => studentId));
  if (entries.length !== rosterIds.length || ids.size !== entries.length || rosterIds.some((id) => !ids.has(id))) {
    throw new InputError("Daftar santri sudah berubah. Muat ulang halaman sebelum menyimpan.");
  }
}

export async function saveIntensiveWeeklyEntries(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const profile = await getActiveProfile();
  const raw = formData.get("payload");
  if (!profile || typeof raw !== "string") return { ok: false, message: "Data jurnal tidak valid atau akses tidak tersedia." };

  try {
    const payload = intensivePayloadSchema.parse(JSON.parse(raw));
    const weekStartDate = parseWeekStart(payload.weekStartDate);
    const scope = await getGroupScope(profile, payload.groupId, "TAHFIZH_INTENSIF", weekStartDate);
    validateRoster(payload.entries, scope.studentIds);
    for (const entry of payload.entries) {
      if (entry.clear) continue;
      if (payload.type === IntensiveEntryType.ZIYADAH) {
        const isMurajaahWeek = entry.isMurajaahWeek === true;
        if (!isMurajaahWeek && entry.pagesCompleted === undefined) {
          throw new InputError("Jumlah halaman Ziyadah wajib diisi untuk setiap santri.");
        }
        if (!isMurajaahWeek && entry.pagesCompleted! > 0
          && (entry.juzNumber === undefined || entry.fromPage === undefined || entry.toPage === undefined)) {
          throw new InputError("Juz dan rentang halaman wajib diisi jika ada capaian Ziyadah.");
        }
        if (entry.fromPage !== undefined && entry.toPage !== undefined && entry.toPage < entry.fromPage) {
          throw new InputError("Halaman akhir harus sama dengan atau lebih besar dari halaman awal.");
        }
      } else if (payload.type === IntensiveEntryType.MURAJAAH) {
        if (entry.jadid === undefined || entry.qadim === undefined) {
          throw new InputError("Pilih status Murajaah Jadid dan Qadim untuk setiap santri.");
        }
      } else {
        const scores = entry.tasmiScores ?? [];
        if (scores.length === 0 || new Set(scores.map(({ juzNumber }) => juzNumber)).size !== scores.length) {
          throw new InputError("Pilih sedikitnya satu juz Tasmi' tanpa pengulangan.");
        }
      }
    }

    await db.$transaction(async (tx) => {
      await tx.tahfizhIntensiveEntry.deleteMany({
        where: {
          semesterId: scope.semester.id,
          groupId: scope.group.id,
          weekStartDate,
          type: payload.type,
        },
      });
      for (const entry of payload.entries) {
        if (entry.clear) continue;
        const scores = payload.type === "TASMI" ? entry.tasmiScores ?? [] : [];
        await tx.tahfizhIntensiveEntry.create({
          data: {
            academicYearId: scope.semester.academicYearId,
            semesterId: scope.semester.id,
            groupId: scope.group.id,
            studentId: entry.studentId,
            weekStartDate,
            type: payload.type,
            pagesCompleted: payload.type === "ZIYADAH" && !entry.isMurajaahWeek ? entry.pagesCompleted ?? null : null,
            juzNumber: payload.type === "ZIYADAH" && !entry.isMurajaahWeek ? entry.juzNumber ?? null : null,
            fromPage: payload.type === "ZIYADAH" && !entry.isMurajaahWeek ? entry.fromPage ?? null : null,
            toPage: payload.type === "ZIYADAH" && !entry.isMurajaahWeek ? entry.toPage ?? null : null,
            isMurajaahWeek: payload.type === "ZIYADAH" && entry.isMurajaahWeek === true,
            jadid: payload.type === "MURAJAAH" ? entry.jadid : null,
            qadim: payload.type === "MURAJAAH" ? entry.qadim : null,
            note: entry.note || null,
            createdById: profile.id,
            updatedById: profile.id,
            tasmiScores: { create: scores },
          },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/ekstra");
    revalidatePath("/asrama");
    revalidatePath("/portfolio");
    return { ok: true, message: "Laporan Tahfizh Intensif berhasil disimpan." };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, message: "Periksa kembali data jurnal yang dikirim." };
    if (error instanceof InputError) return { ok: false, message: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { ok: false, message: "Ada pembaruan bersamaan. Muat ulang dan coba lagi." };
    }
    console.error("Gagal menyimpan jurnal Tahfizh Intensif:", error);
    return { ok: false, message: "Laporan belum tersimpan. Coba lagi atau hubungi admin teknis." };
  }
}

export async function saveUmmiWeeklyEntries(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const profile = await getActiveProfile();
  const raw = formData.get("payload");
  if (!profile || typeof raw !== "string") return { ok: false, message: "Data jurnal tidak valid atau akses tidak tersedia." };

  try {
    const payload = ummiPayloadSchema.parse(JSON.parse(raw));
    const weekStartDate = parseWeekStart(payload.weekStartDate);
    const scope = await getGroupScope(profile, payload.groupId, "TAHSIN_UMMI", weekStartDate);
    validateRoster(payload.entries, scope.studentIds);
    for (const entry of payload.entries) {
      if (entry.clear) continue;
      if (!entry.stage || !entry.grade) throw new InputError("Jenjang dan nilai wajib diisi untuk setiap santri.");
      if (payload.type === "LEARNING") {
        if (entry.fromPage === undefined || entry.toPage === undefined) {
          throw new InputError("Rentang halaman pembelajaran wajib diisi.");
        }
        if (entry.toPage < entry.fromPage) {
          throw new InputError("Halaman akhir harus sama dengan atau lebih besar dari halaman awal.");
        }
        if (entry.grade !== "A" && !entry.note?.trim()) {
          throw new InputError("Catatan wajib diisi jika nilai pembelajaran selain A.");
        }
      }
    }

    await db.$transaction(async (tx) => {
      await tx.ummiWeeklyEntry.deleteMany({
        where: {
          semesterId: scope.semester.id,
          groupId: scope.group.id,
          weekStartDate,
          type: payload.type,
        },
      });
      const entries = payload.entries.filter((entry) => !entry.clear);
      if (entries.length > 0) {
        await tx.ummiWeeklyEntry.createMany({
          data: entries.map((entry) => ({
          academicYearId: scope.semester.academicYearId,
          semesterId: scope.semester.id,
          groupId: scope.group.id,
          studentId: entry.studentId,
          weekStartDate,
          type: payload.type,
          stage: entry.stage!,
          fromPage: payload.type === "LEARNING" ? entry.fromPage! : null,
          toPage: payload.type === "LEARNING" ? entry.toPage! : null,
          grade: entry.grade!,
          note: entry.note?.trim() || null,
          createdById: profile.id,
          updatedById: profile.id,
        })),
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/ekstra");
    revalidatePath("/asrama");
    revalidatePath("/portfolio");
    return { ok: true, message: "Laporan Tahsin UMMI berhasil disimpan." };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, message: "Periksa kembali data jurnal yang dikirim." };
    if (error instanceof InputError) return { ok: false, message: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { ok: false, message: "Ada pembaruan bersamaan. Muat ulang dan coba lagi." };
    }
    console.error("Gagal menyimpan jurnal Tahsin UMMI:", error);
    return { ok: false, message: "Laporan belum tersimpan. Coba lagi atau hubungi admin teknis." };
  }
}
