"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/features/auth/session";
import { getSupabaseServerClient } from "@/features/auth/supabase";
import { db } from "@/lib/db";
import { dormSessions, prayers, prayerStatuses } from "./constants";

class InputError extends Error {}

const uuid = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sessionValues = dormSessions.map((s) => s.value) as [string, ...string[]];
const prayerValues = prayers.map((p) => p.value) as [string, ...string[]];
const statusValues = prayerStatuses.map((s) => s.value) as [string, ...string[]];

const payloadSchema = z.object({
  roomId: uuid,
  date: dateSchema,
  attendance: z.array(z.object({
    studentId: uuid,
    session: z.enum(sessionValues),
    present: z.boolean(),
  })),
  prayers: z.array(z.object({
    studentId: uuid,
    prayer: z.enum(prayerValues),
    status: z.enum(statusValues),
  })),
});

type Payload = z.infer<typeof payloadSchema>;

const photoFields = ["pagiPhoto", "sorePhoto", "malamPhoto"] as const;
type PhotoField = (typeof photoFields)[number];
const photoColumn: Record<PhotoField, "pagiPhotoPath" | "sorePhotoPath" | "malamPhotoPath"> = {
  pagiPhoto: "pagiPhotoPath",
  sorePhoto: "sorePhotoPath",
  malamPhoto: "malamPhotoPath",
};

async function uploadPhoto(file: File, journalId: string, field: PhotoField) {
  if (!file.size) return null;
  if (file.size > 5 * 1024 * 1024) throw new InputError("Ukuran foto maksimal 5 MB.");
  if (!file.type.startsWith("image/")) throw new InputError("File foto harus berupa gambar.");

  const client = await getSupabaseServerClient(true);
  if (!client) throw new InputError("Layanan penyimpanan belum dikonfigurasi.");

  const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const path = `dorm-journals/${journalId}/${field}${ext ? "." + ext : ""}`;
  const { error } = await client.storage.from("mutabaah").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new InputError("Foto belum dapat diunggah. Pastikan bucket storage \"mutabaah\" tersedia.");
  return path;
}

export async function saveDormJournal(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const profile = await getActiveProfile();
  if (!profile || (profile.role !== "ADMIN" && profile.role !== "MUSYRIF")) {
    return { ok: false, message: "Akses tidak tersedia." };
  }

  const raw = formData.get("payload");
  if (typeof raw !== "string") return { ok: false, message: "Data jurnal tidak valid." };
  let parsedPayload: Payload;
  try {
    parsedPayload = payloadSchema.parse(JSON.parse(raw));
  } catch {
    return { ok: false, message: "Periksa kembali data jurnal yang dikirim." };
  }

  const date = new Date(parsedPayload.date + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime())) return { ok: false, message: "Tanggal jurnal tidak valid." };

  try {
    const journal = await db.$transaction(async (tx) => {
      const semester = await tx.semester.findFirst({
        where: { isActive: true, closedAt: null, academicYear: { isActive: true } },
        select: { id: true, academicYearId: true, startDate: true, endDate: true },
      });
      if (!semester) throw new InputError("Belum ada semester aktif.");
      if (date < semester.startDate || date > semester.endDate) {
        throw new InputError("Tanggal jurnal harus berada dalam rentang semester aktif.");
      }

      const room = await tx.room.findFirst({
        where: { id: parsedPayload.roomId, semesterId: semester.id },
        select: { id: true, supervisorId: true },
      });
      if (!room) throw new InputError("Kamar tidak ditemukan pada semester aktif.");
      if (profile.role === "MUSYRIF" && room.supervisorId !== profile.id) {
        throw new InputError("Anda hanya dapat mengisi jurnal untuk kamar yang Anda ampu.");
      }

      const enrollments = await tx.enrollment.findMany({
        where: { semesterId: semester.id, roomId: room.id },
        select: { studentId: true },
      });
      const studentIds = new Set(enrollments.map((e) => e.studentId));
      if (studentIds.size === 0) throw new InputError("Belum ada santri di kamar ini.");

      const attendanceKeys = new Set<string>();
      for (const row of parsedPayload.attendance) {
        if (!studentIds.has(row.studentId)) throw new InputError("Ada santri yang tidak terdaftar di kamar ini.");
        const key = `${row.studentId}:${row.session}`;
        if (attendanceKeys.has(key)) throw new InputError("Data kehadiran duplikat ditemukan.");
        attendanceKeys.add(key);
      }
      const prayerKeys = new Set<string>();
      for (const row of parsedPayload.prayers) {
        if (!studentIds.has(row.studentId)) throw new InputError("Ada santri yang tidak terdaftar di kamar ini.");
        const key = `${row.studentId}:${row.prayer}`;
        if (prayerKeys.has(key)) throw new InputError("Data shalat duplikat ditemukan.");
        prayerKeys.add(key);
      }
      for (const studentId of studentIds) {
        for (const session of sessionValues) {
          if (!attendanceKeys.has(`${studentId}:${session}`)) throw new InputError("Data kehadiran belum lengkap.");
        }
        for (const prayer of prayerValues) {
          if (!prayerKeys.has(`${studentId}:${prayer}`)) throw new InputError("Data shalat belum lengkap.");
        }
      }

      const existing = await tx.dormJournal.findUnique({
        where: { semesterId_roomId_date: { semesterId: semester.id, roomId: room.id, date } },
        select: { id: true },
      });

      const journal = existing
        ? await tx.dormJournal.update({
            where: { id: existing.id },
            data: { updatedById: profile.id },
            select: { id: true },
          })
        : await tx.dormJournal.create({
            data: {
              academicYearId: semester.academicYearId,
              semesterId: semester.id,
              roomId: room.id,
              date,
              createdById: profile.id,
              updatedById: profile.id,
            },
            select: { id: true },
          });

      await tx.dormAttendance.deleteMany({ where: { journalId: journal.id } });
      await tx.prayerAttendance.deleteMany({ where: { journalId: journal.id } });
      await tx.dormAttendance.createMany({
        data: parsedPayload.attendance.map((row) => ({
          journalId: journal.id,
          studentId: row.studentId,
          session: row.session as never,
          present: row.present,
        })),
      });
      await tx.prayerAttendance.createMany({
        data: parsedPayload.prayers.map((row) => ({
          journalId: journal.id,
          studentId: row.studentId,
          prayer: row.prayer as never,
          status: row.status as never,
        })),
      });
      return journal;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const photoData: Partial<Record<"pagiPhotoPath" | "sorePhotoPath" | "malamPhotoPath", string>> = {};
    for (const field of photoFields) {
      const file = formData.get(field);
      if (file instanceof File && file.size > 0) {
        const path = await uploadPhoto(file, journal.id, field);
        if (path) photoData[photoColumn[field]] = path;
      }
    }
    if (Object.keys(photoData).length > 0) {
      await db.dormJournal.update({ where: { id: journal.id }, data: photoData });
    }

    revalidatePath("/", "layout");
    return { ok: true, message: "Jurnal asrama berhasil disimpan." };
  } catch (error) {
    if (error instanceof InputError) return { ok: false, message: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003" || error.code === "P2025") {
        return { ok: false, message: "Data kamar atau santri sudah berubah. Muat ulang halaman." };
      }
      if (error.code === "P2034") return { ok: false, message: "Ada pembaruan bersamaan. Coba lagi." };
    }
    console.error("Gagal menyimpan jurnal asrama:", error);
    return { ok: false, message: "Jurnal belum tersimpan. Coba lagi atau hubungi admin teknis." };
  }
}
