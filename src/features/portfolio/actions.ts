"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/features/auth/session";
import { db } from "@/lib/db";

const narrativeSchema = z.object({
  studentId: z.uuid(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  strengths: z.string().trim().max(1500),
  growthAreas: z.string().trim().max(1500),
  recommendation: z.string().trim().max(1500),
  openingNote: z.string().trim().max(1500),
  developmentNote: z.string().trim().max(1500),
});

export type PortfolioActionState = { ok: boolean; message: string };

export async function savePortfolioNarrative(
  _previousState: PortfolioActionState,
  formData: FormData,
): Promise<PortfolioActionState> {
  const profile = await getActiveProfile();
  if (!profile || !["ADMIN", "MUSYRIF"].includes(profile.role)) {
    return { ok: false, message: "Akses mengubah narasi portfolio tidak tersedia." };
  }

  const parsed = narrativeSchema.safeParse({
    studentId: formData.get("studentId"),
    month: formData.get("month"),
    strengths: formData.get("strengths") ?? "",
    growthAreas: formData.get("growthAreas") ?? "",
    recommendation: formData.get("recommendation") ?? "",
    openingNote: formData.get("openingNote") ?? "",
    developmentNote: formData.get("developmentNote") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Periksa kembali isian narasi (maksimal 1.500 karakter per bagian)." };

  const [yearText, monthText] = parsed.data.month.split("-");
  const monthStart = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  const monthEnd = new Date(Date.UTC(Number(yearText), Number(monthText), 0));
  const period = await db.semester.findFirst({
    where: { isActive: true, closedAt: null, academicYear: { isActive: true } },
    select: { id: true, academicYearId: true, startDate: true, endDate: true },
  });
  if (!period || monthEnd < period.startDate || monthStart > period.endDate) {
    return { ok: false, message: "Narasi hanya dapat disimpan untuk bulan yang beririsan dengan semester aktif." };
  }

  const enrollment = await db.enrollment.findFirst({
    where: {
      semesterId: period.id,
      studentId: parsed.data.studentId,
      ...(profile.role === "MUSYRIF" ? {
        OR: [
          { room: { supervisorId: profile.id } },
          { halaqah: { teacherId: profile.id } },
          {
            student: {
              extraAssignments: {
                some: { semesterId: period.id, group: { teacherId: profile.id } },
              },
            },
          },
        ],
      } : {}),
    },
    select: { studentId: true },
  });
  if (!enrollment) return { ok: false, message: "Santri tidak berada dalam cakupan akses Anda." };

  try {
    await db.portfolioNarrative.upsert({
      where: {
        semesterId_studentId_monthStart: {
          semesterId: period.id,
          studentId: parsed.data.studentId,
          monthStart,
        },
      },
      create: {
        academicYearId: period.academicYearId,
        semesterId: period.id,
        studentId: parsed.data.studentId,
        monthStart,
        strengths: parsed.data.strengths,
        growthAreas: parsed.data.growthAreas,
        recommendation: parsed.data.recommendation,
        openingNote: parsed.data.openingNote,
        developmentNote: parsed.data.developmentNote,
        authorId: profile.id,
      },
      update: {
        strengths: parsed.data.strengths,
        growthAreas: parsed.data.growthAreas,
        recommendation: parsed.data.recommendation,
        openingNote: parsed.data.openingNote,
        developmentNote: parsed.data.developmentNote,
        authorId: profile.id,
      },
    });
  } catch (error) {
    console.error("Gagal menyimpan narasi portfolio:", error);
    return { ok: false, message: "Narasi belum tersimpan. Coba lagi atau hubungi admin teknis." };
  }

  revalidatePath("/portfolio");
  return { ok: true, message: "Narasi portfolio tersimpan." };
}
