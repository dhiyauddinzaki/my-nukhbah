"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/features/auth/session";
import { getSupabaseServerClient } from "@/features/auth/supabase";
import { db } from "@/lib/db";

class InputError extends Error {}

const uuid = z.string().uuid();
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const presenceStatus = z.enum(["H", "S", "I", "A"]);
const activity = z.enum(["PAGI", "SORE", "MALAM"]);
const dailyPayload = z.discriminatedUnion("criterion", [
  z.object({
    criterion: z.literal("presence"),
    roomId: uuid,
    date: dateText,
    entries: z.array(z.object({ studentId: uuid, status: presenceStatus, note: z.string().max(500) })),
  }),
  z.object({
    criterion: z.literal("tahajjud"),
    roomId: uuid,
    date: dateText,
    entries: z.array(z.object({ studentId: uuid, completed: z.boolean() })),
  }),
  z.object({
    criterion: z.literal("activity"),
    roomId: uuid,
    date: dateText,
    activity,
    entries: z.array(z.object({ studentId: uuid, status: presenceStatus })),
  }),
]);
const adabKeys = [
  "haqLinafsih", "haqLisyaikhih", "haqLizamilih",
  "haqLilMakan", "haqLilKitab", "haqLilIlm",
] as const;
const adabFields = {
  haqLinafsih: z.number().int().min(1).max(10),
  haqLinafsihNote: z.string().max(500),
  haqLisyaikhih: z.number().int().min(1).max(10),
  haqLisyaikhihNote: z.string().max(500),
  haqLizamilih: z.number().int().min(1).max(10),
  haqLizamilihNote: z.string().max(500),
  haqLilMakan: z.number().int().min(1).max(10),
  haqLilMakanNote: z.string().max(500),
  haqLilKitab: z.number().int().min(1).max(10),
  haqLilKitabNote: z.string().max(500),
  haqLilIlm: z.number().int().min(1).max(10),
  haqLilIlmNote: z.string().max(500),
};
const adabEntry = z.discriminatedUnion("clear", [
  z.object({ studentId: uuid, clear: z.literal(true) }),
  z.object({ studentId: uuid, clear: z.literal(false), ...adabFields }),
]);
const weeklySchema = z.discriminatedUnion("criterion", [
  z.object({
    criterion: z.literal("adab"),
    roomId: uuid,
    weekStartDate: dateText,
    entries: z.array(adabEntry),
  }),
  z.object({
    criterion: z.literal("violations"),
    roomId: uuid,
    weekStartDate: dateText,
    entries: z.array(z.object({
      studentId: uuid,
      violationType: z.string().trim().min(1).max(160),
      repetitions: z.number().int().min(1).max(1000),
      pointsPerOccurrence: z.number().int().min(0).max(10000),
    })),
  }),
  z.object({
    criterion: z.literal("achievements"),
    roomId: uuid,
    weekStartDate: dateText,
    entries: z.array(z.object({
      studentId: uuid,
      title: z.string().trim().min(1).max(160),
      description: z.string().trim().max(500),
    })).max(200),
  }),
]);

type DailyPayload = z.infer<typeof dailyPayload>;
type WeeklyPayload = z.infer<typeof weeklySchema>;

const photoColumns = {
  tahajjud: "tahajjudPhotoPath",
  pagi: "pagiPhotoPath",
  sore: "sorePhotoPath",
  malam: "malamPhotoPath",
} as const;
type PhotoKey = keyof typeof photoColumns;

function parsePayload<T>(formData: FormData, schema: z.ZodType<T>): T {
  const raw = formData.get("payload");
  if (typeof raw !== "string") throw new InputError("Data jurnal tidak valid.");
  try {
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError("Periksa kembali data jurnal yang dikirim.");
  }
}

function parseDate(value: string) {
  const date = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new InputError("Tanggal tidak valid.");
  }
  return date;
}

function validateRoster<T extends { studentId: string }>(entries: T[], rosterIds: string[]) {
  if (entries.length !== rosterIds.length) throw new InputError("Data harus diisi untuk semua santri di kamar ini.");
  const submittedIds = new Set(entries.map(({ studentId }) => studentId));
  if (submittedIds.size !== entries.length || rosterIds.some((id) => !submittedIds.has(id))) {
    throw new InputError("Daftar santri sudah berubah. Muat ulang halaman sebelum menyimpan.");
  }
}

async function getRoomScope(roomId: string, date: Date, allowOutOfRangeDate = false) {
  const profile = await getActiveProfile();
  if (!profile || !["ADMIN", "MUSYRIF"].includes(profile.role)) {
    throw new InputError("Akses tidak tersedia.");
  }

  const semester = await db.semester.findFirst({
    where: { isActive: true, closedAt: null, academicYear: { isActive: true } },
    select: { id: true, academicYearId: true, startDate: true, endDate: true },
  });
  if (!semester) throw new InputError("Belum ada semester aktif.");
  if (!allowOutOfRangeDate && (date < semester.startDate || date > semester.endDate)) {
    throw new InputError("Tanggal harus berada dalam rentang semester aktif.");
  }

  const room = await db.room.findFirst({
    where: {
      id: roomId,
      semesterId: semester.id,
      ...(profile.role === "MUSYRIF" ? { supervisorId: profile.id } : {}),
    },
    select: { id: true },
  });
  if (!room) throw new InputError("Kamar tidak ditemukan atau bukan kamar yang Anda ampu.");

  const enrollments = await db.enrollment.findMany({
    where: { semesterId: semester.id, roomId: room.id },
    select: { studentId: true },
  });
  if (enrollments.length === 0) throw new InputError("Belum ada santri di kamar ini.");
  return { profile, semester, room, rosterIds: enrollments.map(({ studentId }) => studentId) };
}

async function getOrCreateJournal(
  scope: Awaited<ReturnType<typeof getRoomScope>>,
  date: Date,
) {
  return db.dormJournal.upsert({
    where: {
      semesterId_roomId_date: {
        semesterId: scope.semester.id,
        roomId: scope.room.id,
        date,
      },
    },
    create: {
      academicYearId: scope.semester.academicYearId,
      semesterId: scope.semester.id,
      roomId: scope.room.id,
      date,
      createdById: scope.profile.id,
      updatedById: scope.profile.id,
    },
    update: { updatedById: scope.profile.id },
    select: { id: true },
  });
}

async function savePhoto(formData: FormData, journalId: string, key: PhotoKey) {
  const file = formData.get("photo");
  const removePhoto = formData.get("removePhoto") === "true";
  const column = photoColumns[key];
  const current = await db.dormJournal.findUnique({
    where: { id: journalId },
    select: { [column]: true },
  });
  const currentPath = current?.[column] as string | null | undefined;

  if (!removePhoto && (!(file instanceof File) || file.size === 0)) return currentPath ?? null;
  const client = await getSupabaseServerClient(true);
  if (!client) throw new InputError("Layanan penyimpanan foto belum dikonfigurasi.");

  if (removePhoto) {
    if (!currentPath) return null;
    const { error } = await client.storage.from("mutabaah").remove([currentPath]);
    if (error) throw new InputError("Foto belum dapat dihapus dari penyimpanan.");
    return null;
  }
  if (!(file instanceof File) || file.size === 0) return currentPath ?? null;
  if (file.size > 5 * 1024 * 1024) throw new InputError("Ukuran foto maksimal 5 MB.");
  if (!file.type.startsWith("image/")) throw new InputError("File harus berupa gambar.");

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
  const path = `dorm-journals/${journalId}/${key}${extension ? `.${extension}` : ""}`;
  const { error } = await client.storage.from("mutabaah").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw new InputError("Foto belum dapat diunggah. Periksa bucket dan policy Storage.");
  return path;
}

async function updatePhotoAndTimestamp(
  formData: FormData,
  journalId: string,
  key: PhotoKey,
  submittedAtColumn: "tahajjudSubmittedAt" | "pagiSubmittedAt" | "soreSubmittedAt" | "malamSubmittedAt",
  updatedById: string,
) {
  const path = await savePhoto(formData, journalId, key);
  await db.dormJournal.update({
    where: { id: journalId },
    data: {
      [photoColumns[key]]: path,
      [submittedAtColumn]: new Date(),
      updatedById,
    },
  });
}

export async function saveDormDailyCriterion(formData: FormData): Promise<{ ok: boolean; message: string }> {
  try {
    const payload = parsePayload(formData, dailyPayload);
    const date = parseDate(payload.date);
    const scope = await getRoomScope(payload.roomId, date);
    const journal = await getOrCreateJournal(scope, date);
    const submittedAt = new Date();

    if (payload.criterion === "presence") {
      validateRoster(payload.entries, scope.rosterIds);
      for (const entry of payload.entries) {
        if (entry.status !== "H" && entry.note.trim().length > 500) {
          throw new InputError("Keterangan maksimal 500 karakter.");
        }
      }
      await db.$transaction([
        db.dormDailyPresence.deleteMany({ where: { journalId: journal.id } }),
        db.dormDailyPresence.createMany({
          data: payload.entries.map((entry) => ({
            journalId: journal.id,
            studentId: entry.studentId,
            status: entry.status,
            note: entry.note.trim() || null,
          })),
        }),
        db.dormJournal.update({
          where: { id: journal.id },
          data: { presenceSubmittedAt: submittedAt, updatedById: scope.profile.id },
        }),
      ]);
    } else if (payload.criterion === "tahajjud") {
      validateRoster(payload.entries, scope.rosterIds);
      await db.$transaction([
        db.dormTahajjudAssessment.deleteMany({ where: { journalId: journal.id } }),
        db.dormTahajjudAssessment.createMany({
          data: payload.entries.map((entry) => ({
            journalId: journal.id,
            studentId: entry.studentId,
            completed: entry.completed,
          })),
        }),
      ]);
      await updatePhotoAndTimestamp(formData, journal.id, "tahajjud", "tahajjudSubmittedAt", scope.profile.id);
    } else {
      validateRoster(payload.entries, scope.rosterIds);
      await db.$transaction([
        db.dormActivityAttendance.deleteMany({
          where: { journalId: journal.id, activity: payload.activity },
        }),
        db.dormActivityAttendance.createMany({
          data: payload.entries.map((entry) => ({
            journalId: journal.id,
            studentId: entry.studentId,
            activity: payload.activity,
            status: entry.status,
          })),
        }),
      ]);
      const photoKey = payload.activity.toLowerCase() as "pagi" | "sore" | "malam";
      const timestampColumn = `${photoKey}SubmittedAt` as "pagiSubmittedAt" | "soreSubmittedAt" | "malamSubmittedAt";
      await updatePhotoAndTimestamp(formData, journal.id, photoKey, timestampColumn, scope.profile.id);
    }

    revalidatePath("/pembinaan");
    revalidatePath("/asrama");
    revalidatePath("/portfolio");
    revalidatePath("/mutamayyizun");
    return { ok: true, message: "Kriteria jurnal berhasil disimpan." };
  } catch (error) {
    if (error instanceof InputError) return { ok: false, message: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { ok: false, message: "Ada penyimpanan bersamaan. Muat ulang dan coba lagi." };
    }
    console.error("Gagal menyimpan kriteria jurnal asrama:", error);
    return { ok: false, message: "Data belum tersimpan. Coba lagi atau hubungi admin teknis." };
  }
}

async function getWeeklyReviewScope(roomId: string, weekStartDate: Date) {
  const scope = await getRoomScope(roomId, weekStartDate, true);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
  if (weekStartDate.getUTCDay() !== 1) throw new InputError("Tanggal awal pekan harus hari Senin.");
  if (weekEndDate < scope.semester.startDate || weekStartDate > scope.semester.endDate) {
    throw new InputError("Pekan harus beririsan dengan semester aktif.");
  }
  return scope;
}

async function getOrCreateWeeklyReview(
  scope: Awaited<ReturnType<typeof getRoomScope>>,
  weekStartDate: Date,
) {
  return db.dormWeeklyReview.upsert({
    where: {
      semesterId_roomId_weekStartDate: {
        semesterId: scope.semester.id,
        roomId: scope.room.id,
        weekStartDate,
      },
    },
    create: {
      academicYearId: scope.semester.academicYearId,
      semesterId: scope.semester.id,
      roomId: scope.room.id,
      weekStartDate,
      createdById: scope.profile.id,
      updatedById: scope.profile.id,
    },
    update: { updatedById: scope.profile.id },
    select: { id: true },
  });
}

export async function saveDormWeeklyCriterion(formData: FormData): Promise<{ ok: boolean; message: string }> {
  try {
    const payload = parsePayload(formData, weeklySchema);
    const weekStartDate = parseDate(payload.weekStartDate);
    const scope = await getWeeklyReviewScope(payload.roomId, weekStartDate);
    const review = await getOrCreateWeeklyReview(scope, weekStartDate);
    const submittedAt = new Date();

    if (payload.criterion === "adab") {
      validateRoster(payload.entries, scope.rosterIds);
      for (const entry of payload.entries) {
        if (entry.clear) continue;
        for (const key of adabKeys) {
          if (entry[key] < 8 && !entry[`${key}Note`].trim()) {
            throw new InputError("Keterangan wajib diisi untuk nilai adab di bawah 8.");
          }
        }
      }
      await db.$transaction(async (tx) => {
        await tx.dormWeeklyAdabScore.deleteMany({ where: { reviewId: review.id } });
        const entries = payload.entries.filter((entry) => !entry.clear);
        if (entries.length > 0) {
          await tx.dormWeeklyAdabScore.createMany({
            data: entries.map((entry) => ({
              ...entry,
              haqLinafsihNote: entry.haqLinafsihNote.trim() || null,
              haqLisyaikhihNote: entry.haqLisyaikhihNote.trim() || null,
              haqLizamilihNote: entry.haqLizamilihNote.trim() || null,
              haqLilMakanNote: entry.haqLilMakanNote.trim() || null,
              haqLilKitabNote: entry.haqLilKitabNote.trim() || null,
              haqLilIlmNote: entry.haqLilIlmNote.trim() || null,
              reviewId: review.id,
            })),
          });
        }
        await tx.dormWeeklyReview.update({
          where: { id: review.id },
          data: { adabSubmittedAt: submittedAt, updatedById: scope.profile.id },
        });
      });
    } else if (payload.criterion === "violations") {
      const roster = new Set(scope.rosterIds);
      if (payload.entries.some((entry) => !roster.has(entry.studentId))) {
        throw new InputError("Ada pelanggaran yang terkait santri di luar kamar ini.");
      }
      await db.$transaction([
        db.dormViolation.deleteMany({ where: { reviewId: review.id } }),
        ...(payload.entries.length > 0
          ? [db.dormViolation.createMany({
              data: payload.entries.map((entry) => ({ ...entry, reviewId: review.id })),
            })]
          : []),
        db.dormWeeklyReview.update({
          where: { id: review.id },
          data: { violationsSubmittedAt: submittedAt, updatedById: scope.profile.id },
        }),
      ]);
    } else {
      const roster = new Set(scope.rosterIds);
      if (payload.entries.some((entry) => !roster.has(entry.studentId))) {
        throw new InputError("Ada prestasi yang terkait santri di luar kamar ini.");
      }
      await db.$transaction(async (tx) => {
        await tx.dormAchievement.deleteMany({ where: { reviewId: review.id } });
        if (payload.entries.length > 0) {
          await tx.dormAchievement.createMany({
            data: payload.entries.map((entry) => ({
              reviewId: review.id,
              studentId: entry.studentId,
              title: entry.title,
              description: entry.description || null,
            })),
          });
        }
        await tx.dormWeeklyReview.update({
          where: { id: review.id },
          data: {
            achievementsSubmittedAt: submittedAt,
            updatedById: scope.profile.id,
          },
        });
      });
    }

    revalidatePath("/pembinaan");
    revalidatePath("/asrama");
    revalidatePath("/portfolio");
    revalidatePath("/mutamayyizun");
    return { ok: true, message: "Kriteria pekanan berhasil disimpan." };
  } catch (error) {
    if (error instanceof InputError) return { ok: false, message: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { ok: false, message: "Ada penyimpanan bersamaan. Muat ulang dan coba lagi." };
    }
    console.error("Gagal menyimpan kriteria pekanan:", error);
    return { ok: false, message: "Data belum tersimpan. Coba lagi atau hubungi admin teknis." };
  }
}
