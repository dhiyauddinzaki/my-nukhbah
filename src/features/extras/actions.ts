"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/features/auth/session";
import { db } from "@/lib/db";
import { getTahfizhIntensifTargetPages, getWeekEnd } from "./week";

class InputError extends Error {}

const uuid = z.string().uuid();
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const entrySchema = z.object({
  studentId: uuid,
  pagesCompleted: z.number().int().min(0).max(1000).optional(),
  ummiLevel: z.enum([
    "PRA_TAHSIN",
    "JILID_1",
    "JILID_2",
    "JILID_3",
    "JILID_4",
    "JILID_5",
    "JILID_6",
    "GHARIB",
    "TAJWID",
    "AL_QURAN",
  ]).optional(),
  fromPage: z.number().int().min(1).optional(),
  toPage: z.number().int().min(1).optional(),
  fluencyGrade: z.enum(["A", "B", "C", "D"]).optional(),
  note: z.string().trim().max(500).optional(),
});
const payloadSchema = z.object({
  halaqahId: uuid,
  weekStartDate: dateText,
  program: z.enum(["TAHFIZH_INTENSIF", "TAHSIN_UMMI"]),
  entries: z.array(entrySchema),
});

function parseDate(value: string) {
  const date = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new InputError("Tanggal pekan tidak valid.");
  }
  return date;
}

export async function saveExtraWeeklyEntries(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const profile = await getActiveProfile();
  if (!profile || !["ADMIN", "MUSYRIF"].includes(profile.role)) {
    return { ok: false, message: "Akses tidak tersedia." };
  }

  const raw = formData.get("payload");
  if (typeof raw !== "string") return { ok: false, message: "Data jurnal ekstra tidak valid." };

  try {
    const payload = payloadSchema.parse(JSON.parse(raw));
    const weekStartDate = parseDate(payload.weekStartDate);
    if (weekStartDate.getUTCDay() !== 1) throw new InputError("Awal pekan jurnal harus hari Senin.");
    const semester = await db.semester.findFirst({
      where: { isActive: true, closedAt: null, academicYear: { isActive: true } },
      select: { id: true, academicYearId: true, startDate: true, endDate: true },
    });
    if (!semester) throw new InputError("Belum ada semester aktif.");

    const weekEndDate = getWeekEnd(weekStartDate);
    if (weekEndDate < semester.startDate || weekStartDate > semester.endDate) {
      throw new InputError("Pekan jurnal harus beririsan dengan semester aktif.");
    }
    const targetPages = getTahfizhIntensifTargetPages(weekStartDate, semester.startDate, semester.endDate);

    const halaqah = await db.halaqah.findFirst({
      where: {
        id: payload.halaqahId,
        semesterId: semester.id,
        ...(profile.role === "MUSYRIF" ? { teacherId: profile.id } : {}),
      },
      select: { id: true },
    });
    if (!halaqah) throw new InputError("Halaqah tidak ditemukan atau bukan halaqah yang Anda ampu.");

    const enrollments = await db.enrollment.findMany({
      where: { semesterId: semester.id, halaqahId: halaqah.id },
      select: { studentId: true },
    });
    const rosterIds = enrollments.map(({ studentId }) => studentId);
    if (rosterIds.length === 0) throw new InputError("Belum ada santri di halaqah ini.");
    if (payload.entries.length !== rosterIds.length) {
      throw new InputError("Data harus diisi untuk semua santri di halaqah.");
    }
    const submittedIds = new Set(payload.entries.map(({ studentId }) => studentId));
    if (submittedIds.size !== payload.entries.length || rosterIds.some((id) => !submittedIds.has(id))) {
      throw new InputError("Daftar santri sudah berubah. Muat ulang halaman.");
    }

    const data = payload.entries.map((entry) => {
      const common = {
        academicYearId: semester.academicYearId,
        semesterId: semester.id,
        halaqahId: halaqah.id,
        studentId: entry.studentId,
        weekStartDate,
        program: payload.program,
        note: entry.note || null,
        createdById: profile.id,
        updatedById: profile.id,
      };
      if (payload.program === "TAHFIZH_INTENSIF") {
        if (entry.pagesCompleted === undefined) {
          throw new InputError("Jumlah halaman Tahfizh Intensif wajib diisi untuk setiap santri.");
        }
        return {
          ...common,
          targetPages,
          pagesCompleted: entry.pagesCompleted,
          ummiLevel: null,
          fromPage: null,
          toPage: null,
          fluencyGrade: null,
        };
      }

      if (!entry.ummiLevel || entry.fromPage === undefined || entry.toPage === undefined || !entry.fluencyGrade) {
        throw new InputError("Level, halaman, dan nilai Tahsin UMMI wajib diisi untuk setiap santri.");
      }
      if (entry.toPage < entry.fromPage) {
        throw new InputError("Halaman akhir harus sama dengan atau lebih besar dari halaman awal.");
      }
      return {
        ...common,
        targetPages: null,
        pagesCompleted: null,
        ummiLevel: entry.ummiLevel,
        fromPage: entry.fromPage,
        toPage: entry.toPage,
        fluencyGrade: entry.fluencyGrade,
      };
    });

    await db.$transaction(async (tx) => {
      await tx.extraWeeklyEntry.deleteMany({
        where: {
          semesterId: semester.id,
          halaqahId: halaqah.id,
          weekStartDate,
          program: payload.program,
        },
      });
      await tx.extraWeeklyEntry.createMany({
        data,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/ekstra");
    return { ok: true, message: "Jurnal Ekstra berhasil disimpan." };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, message: "Periksa kembali kolom dan angka yang dikirim." };
    if (error instanceof InputError) return { ok: false, message: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { ok: false, message: "Ada pembaruan bersamaan. Muat ulang dan coba lagi." };
    }
    console.error("Gagal menyimpan jurnal Ekstra:", error);
    return { ok: false, message: "Jurnal Ekstra belum tersimpan. Coba lagi atau hubungi admin teknis." };
  }
}
