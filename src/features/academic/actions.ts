"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/features/auth/session";
import { db } from "@/lib/db";

class InputError extends Error {}

const uuid = z.uuid();
const optionalId = z.union([uuid, z.literal("")]).transform((value) => value || null);
const groupName = z.string().trim().min(1).max(80);
const commands = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("year"),
    name: z.string().trim().regex(/^\d{4}\/\d{4}$/),
    startDate: z.iso.date(),
    oddEnd: z.iso.date(),
    endDate: z.iso.date(),
  }),
  z.object({ operation: z.literal("activate"), semesterId: uuid }),
  z.object({
    operation: z.literal("student"),
    studentId: optionalId,
    nis: z.string().trim().min(1).max(32),
    fullName: z.string().trim().min(1).max(120),
  }),
  z.object({
    operation: z.literal("group"),
    semesterId: uuid,
    groupId: optionalId,
    kind: z.enum(["classroom", "room", "halaqah"]),
    name: groupName,
    staffId: optionalId,
  }),
  z.object({
    operation: z.literal("enroll"),
    semesterId: uuid,
    studentId: uuid,
    classroomId: optionalId,
    roomId: optionalId,
    halaqahId: optionalId,
  }),
]);

type Command = z.infer<typeof commands>;
type Transaction = Prisma.TransactionClient;

async function createYear(tx: Transaction, input: Extract<Command, { operation: "year" }>) {
  const [startYear, endYear] = input.name.split("/").map(Number);
  const [startDate, oddEnd, endDate] = [input.startDate, input.oddEnd, input.endDate].map((date) => new Date(date));
  if (
    endYear !== startYear + 1 ||
    startDate.getUTCFullYear() !== startYear ||
    endDate.getUTCFullYear() !== endYear ||
    startDate > oddEnd || oddEnd >= endDate
  ) {
    throw new InputError("Periksa urutan tanggal dan nama tahun ajaran, misalnya 2026/2027.");
  }

  const overlap = await tx.academicYear.findFirst({
    where: { startDate: { lte: endDate }, endDate: { gte: startDate } },
    select: { id: true },
  });
  if (overlap) throw new InputError("Rentang tanggal bertumpang tindih dengan tahun ajaran lain.");

  const evenStart = new Date(oddEnd);
  evenStart.setUTCDate(evenStart.getUTCDate() + 1);
  await tx.academicYear.create({
    data: {
      name: input.name,
      startDate,
      endDate,
      semesters: {
        create: [
          { name: "GANJIL", startDate, endDate: oddEnd },
          { name: "GENAP", startDate: evenStart, endDate },
        ],
      },
    },
  });
}

async function activateFirstSemester(tx: Transaction, semesterId: string) {
  const [semester, activeYear, activeSemester] = await Promise.all([
    tx.semester.findUnique({ where: { id: semesterId } }),
    tx.academicYear.findFirst({ where: { isActive: true } }),
    tx.semester.findFirst({ where: { OR: [{ isActive: true }, { closedAt: { not: null } }] } }),
  ]);
  if (!semester || activeYear || activeSemester || semester.closedAt) {
    throw new InputError("Aktivasi awal hanya tersedia sebelum ada periode aktif atau arsip.");
  }

  await tx.academicYear.update({ where: { id: semester.academicYearId }, data: { isActive: true } });
  await tx.semester.update({ where: { id: semester.id }, data: { isActive: true } });
}

async function saveGroup(tx: Transaction, input: Extract<Command, { operation: "group" }>) {
  const { semesterId, groupId, staffId, name, kind } = input;
  if (staffId && kind !== "classroom") {
    const staff = await tx.profile.findFirst({ where: { id: staffId, role: "MUSYRIF", isActive: true } });
    if (!staff) throw new InputError("Pilih Musyrif / Guru Pengampu Quran yang aktif.");
  }
  const where = groupId ? { semesterId_id: { semesterId, id: groupId } } : null;

  switch (kind) {
    case "classroom":
      if (where) await tx.classroom.update({ where, data: { name } });
      else await tx.classroom.create({ data: { semesterId, name } });
      break;
    case "room":
      if (where) await tx.room.update({ where, data: { name, supervisorId: staffId } });
      else await tx.room.create({ data: { semesterId, name, supervisorId: staffId } });
      break;
    case "halaqah":
      if (where) await tx.halaqah.update({ where, data: { name, teacherId: staffId } });
      else await tx.halaqah.create({ data: { semesterId, name, teacherId: staffId } });
      break;
  }
}

async function applyCommand(tx: Transaction, input: Command) {
  switch (input.operation) {
    case "year":
      return createYear(tx, input);
    case "activate":
      return activateFirstSemester(tx, input.semesterId);
    case "student": {
      const { studentId, nis, fullName } = input;
      if (studentId) await tx.student.update({ where: { id: studentId }, data: { nis, fullName } });
      else await tx.student.create({ data: { nis, fullName } });
      return;
    }
  }

  const semester = await tx.semester.findFirst({
    where: { id: input.semesterId, isActive: true, closedAt: null, academicYear: { isActive: true } },
    select: { id: true, academicYearId: true },
  });
  if (!semester) throw new InputError("Perubahan penempatan dan kelompok hanya tersedia di semester aktif.");

  if (input.operation === "group") return saveGroup(tx, input);

  const { studentId, classroomId, roomId, halaqahId } = input;
  const assignment = { classroomId, roomId, halaqahId };
  await tx.enrollment.upsert({
    where: { semesterId_studentId: { semesterId: semester.id, studentId } },
    create: { semesterId: semester.id, academicYearId: semester.academicYearId, studentId, ...assignment },
    update: assignment,
  });
}

export async function saveMasterData(data: FormData): Promise<{ ok: boolean; message: string }> {
  const profile = await getActiveProfile();
  if (profile?.role !== "ADMIN") return { ok: false, message: "Akses hanya untuk Admin." };

  const parsed = commands.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { ok: false, message: "Periksa isian yang kosong, terlalu panjang, atau tidak valid." };

  try {
    await db.$transaction((tx) => applyCommand(tx, parsed.data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (error instanceof InputError) return { ok: false, message: error.message };
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { ok: false, message: "Data sudah ada. Cek NIS, nama kelompok, atau status periode." };
      if (error.code === "P2003" || error.code === "P2025") {
        return { ok: false, message: "Data sudah berubah atau pilihan berasal dari semester lain. Muat ulang halaman." };
      }
      if (error.code === "P2034") return { ok: false, message: "Ada pembaruan bersamaan. Muat ulang halaman dan coba lagi." };
    }
    console.error("Gagal menyimpan master data:", error);
    return { ok: false, message: "Data belum tersimpan. Coba lagi atau hubungi admin teknis." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Data berhasil disimpan." };
}
