"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveProfile } from "@/features/auth/session";
import { getSupabaseAdminClient } from "@/features/auth/supabase-admin";
import { db } from "@/lib/db";

export type PortfolioMediaState = { ok: boolean; message: string };
const assetSchema = z.object({
  kind: z.enum(["studentPortrait", "profileSignature"]),
  targetId: z.uuid(),
});
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadPortfolioMedia(
  _previousState: PortfolioMediaState,
  formData: FormData,
): Promise<PortfolioMediaState> {
  const profile = await getActiveProfile();
  if (profile?.role !== "ADMIN") return { ok: false, message: "Hanya Admin yang dapat mengelola foto dan tanda tangan." };

  const parsed = assetSchema.safeParse({
    kind: formData.get("kind"),
    targetId: formData.get("targetId"),
  });
  if (!parsed.success) return { ok: false, message: "Pilihan berkas tidak valid." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pilih foto sebelum menyimpan." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "Ukuran gambar maksimal 5 MB." };
  if (!acceptedTypes.has(file.type)) return { ok: false, message: "Gunakan format JPG, PNG, atau WebP." };

  const target = parsed.data.kind === "studentPortrait"
    ? await db.student.findUnique({ where: { id: parsed.data.targetId }, select: { id: true } })
    : await db.profile.findFirst({
        where: {
          id: parsed.data.targetId,
          isActive: true,
          role: { in: ["MUSYRIF", "KEPALA_ASRAMA"] },
        },
        select: { id: true },
      });
  if (!target) return { ok: false, message: "Data santri atau staf tidak ditemukan / tidak aktif." };

  const storage = getSupabaseAdminClient();
  if (!storage) return { ok: false, message: "Penyimpanan media belum dikonfigurasi di server." };
  const path = parsed.data.kind === "studentPortrait"
    ? `portfolio/students/${target.id}/portrait`
    : `portfolio/signatures/${target.id}/signature`;
  const { error: uploadError } = await storage.storage.from("mutabaah").upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (uploadError) {
    console.error("Gagal mengunggah media portfolio:", uploadError);
    return { ok: false, message: "Gambar belum dapat diunggah. Periksa bucket Storage dan coba lagi." };
  }

  try {
    if (parsed.data.kind === "studentPortrait") {
      await db.student.update({ where: { id: target.id }, data: { portraitPath: path } });
    } else {
      await db.profile.update({ where: { id: target.id }, data: { signaturePath: path } });
    }
  } catch (error) {
    console.error("Gagal menyimpan referensi media portfolio:", error);
    return { ok: false, message: "Gambar sudah terunggah, tetapi belum tertaut ke data. Hubungi Admin teknis." };
  }

  revalidatePath("/admin/master");
  revalidatePath("/portfolio");
  return { ok: true, message: "Gambar portfolio berhasil disimpan." };
}
