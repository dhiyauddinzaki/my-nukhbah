"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/features/auth/session";
import { db } from "@/lib/db";

class InputError extends Error {}

const uuid = z.string().uuid();
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const entrySchema = z.object({
  studentId: uuid,
  fromSurah: z.string().trim().max(80).optional(),
  fromAyat: z.number().int().min(1).optional(),
  toSurah: z.string().trim().max(80).optional(),
  toAyat: z.number().int().min(1).optional(),
  lineCount: z.number().int().min(1).optional(),
  juzNumber: z.number().int().min(1).max(30).optional(),
  assessment: z.enum(["BELUM_DINILAI", "LANCAR", "PERLU_ULANG", "LULUS"]),
  score: z.number().int().min(0).max(100).optional(),
  note: z.string().trim().max(500).optional(),
});

const payloadSchema = z.object({
  halaqahId: uuid,
  date: dateText,
  type: z.enum(["ZIYADAH", "MURAJAAH", "JUZIYYAH"]),
  entries: z.array(entrySchema),
});

function parseDate(value: string) {
  const date = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new InputError("Tanggal tidak valid.");
  }
  return date;
}

export async function saveTahfidzEntries(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const profile = await getActiveProfile();
  if (!profile || !["ADMIN", "MUSYRIF"].includes(profile.role)) {
    return { ok: false, message: "Akses tidak tersedia." };
  }

  const raw = formData.get("payload");
  if (typeof raw !== "string") return { ok: false, message: "Data tahfidz tidak valid." };

  try {
    const payload = payloadSchema.parse(JSON.parse(raw));
    const date = parseDate(payload.date);
    const semester = await db.semester.findFirst({
      where: { isActive: true, closedAt: null, academicYear: { isActive: true } },
      select: { id: true, academicYearId: true, startDate: true, endDate: true },
    });
    if (!semester) throw new InputError("Belum ada semester aktif.");
    if (date < semester.startDate || date > semester.endDate) {
      throw new InputError("Tanggal jurnal harus berada dalam rentang semester aktif.");
    }

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
    const rosterIds = enrollments.map((entry) => entry.studentId);
    if (rosterIds.length === 0) throw new InputError("Belum ada santri di halaqah ini.");
    if (payload.entries.length !== rosterIds.length) {
      throw new InputError("Data harus diisi untuk semua santri di halaqah.");
    }
    const submittedIds = new Set(payload.entries.map((entry) => entry.studentId));
    if (payload.entries.length !== submittedIds.size || rosterIds.some((id) => !submittedIds.has(id))) {
      throw new InputError("Daftar santri sudah berubah. Muat ulang halaman.");
    }

    for (const entry of payload.entries) {
      if (payload.type === "ZIYADAH" && (!entry.lineCount || entry.lineCount < 1)) {
        throw new InputError("Jumlah baris Ziyadah wajib diisi untuk setiap santri.");
      }
      if (payload.type === "JUZIYYAH" && (!entry.juzNumber || entry.juzNumber < 1 || entry.juzNumber > 30)) {
        throw new InputError("Nomor juz Juziyyah wajib diisi.");
      }
      if (entry.assessment === "PERLU_ULANG" && !entry.note) {
        throw new InputError("Keterangan wajib diisi untuk penilaian Perlu Ulang.");
      }
    }

    await db.$transaction(async (tx) => {
      await tx.tahfidzEntry.deleteMany({
        where: {
          semesterId: semester.id,
          halaqahId: halaqah.id,
          date,
          type: payload.type,
        },
      });
      await tx.tahfidzEntry.createMany({
        data: payload.entries.map((entry) => ({
          academicYearId: semester.academicYearId,
          semesterId: semester.id,
          halaqahId: halaqah.id,
          studentId: entry.studentId,
          date,
          type: payload.type,
          fromSurah: entry.fromSurah || null,
          fromAyat: entry.fromAyat ?? null,
          toSurah: entry.toSurah || null,
          toAyat: entry.toAyat ?? null,
          lineCount: entry.lineCount ?? null,
          juzNumber: entry.juzNumber ?? null,
          assessment: entry.assessment,
          score: entry.score ?? null,
          note: entry.note || null,
          createdById: profile.id,
          updatedById: profile.id,
        })),
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/pembinaan");
    revalidatePath("/asrama");
    revalidatePath("/portfolio");
    return { ok: true, message: "Jurnal Tahfidz berhasil disimpan." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: "Periksa kembali kolom dan angka yang dikirim." };
    }
    if (error instanceof InputError) return { ok: false, message: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2034") return { ok: false, message: "Ada pembaruan bersamaan. Muat ulang dan coba lagi." };
    }
    console.error("Gagal menyimpan jurnal Tahfidz:", error);
    return { ok: false, message: "Jurnal belum tersimpan. Coba lagi atau hubungi admin teknis." };
  }
}
