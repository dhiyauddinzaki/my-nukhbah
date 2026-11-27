"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { home } from "./permissions";
import { loginSchema, type LoginInput } from "./schema";
import { getSupabaseServerClient } from "./supabase";

export type AuthActionState = { ok: boolean; message: string };

export async function signIn(input: LoginInput) {
  const result = loginSchema.safeParse(input);
  if (!result.success) return { error: "Periksa kembali email dan kata sandi." };

  const client = await getSupabaseServerClient(true);
  if (!client) return { error: "Layanan masuk belum dikonfigurasi." };

  const { data, error } = await client.auth.signInWithPassword(result.data);
  if (error || !data.user) return { error: "Email atau kata sandi tidak dapat diverifikasi." };

  const profile = await db.profile.findUnique({ where: { id: data.user.id } });
  if (!profile?.isActive) {
    await client.auth.signOut({ scope: "local" });
    return { error: "Akun belum memiliki akses aktif. Hubungi admin pesantren." };
  }

  redirect(home[profile.role]);
}

export async function requestPasswordReset(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { ok: false, message: "Masukkan email akun yang valid." };

  const client = await getSupabaseServerClient(true);
  if (!client) return { ok: false, message: "Layanan masuk belum dikonfigurasi." };
  const origin = (await headers()).get("origin");
  if (!origin) return { ok: false, message: "Alamat aplikasi tidak tersedia. Coba lagi dari halaman login." };

  const redirectTo = new URL("/auth/callback?next=/reset-password", origin).toString();
  const { error } = await client.auth.resetPasswordForEmail(parsed.data, { redirectTo });
  if (error) {
    console.error("Permintaan reset kata sandi gagal:", error);
    return { ok: false, message: "Tautan reset belum dapat dikirim. Coba lagi atau hubungi Admin." };
  }

  return {
    ok: true,
    message: "Jika email terdaftar, tautan untuk mengatur ulang kata sandi akan dikirim.",
  };
}

export async function updatePassword(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = z.object({
    password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(256),
    confirmPassword: z.string().min(1, "Ulangi kata sandi."),
  }).refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak sama.",
  }).safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Periksa kembali kata sandi." };

  const client = await getSupabaseServerClient(true);
  if (!client) return { ok: false, message: "Sesi reset tidak tersedia. Minta tautan reset yang baru." };
  const { error } = await client.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("Gagal memperbarui kata sandi:", error);
    return { ok: false, message: "Kata sandi belum dapat diperbarui. Minta tautan reset yang baru." };
  }
  const { error: signOutError } = await client.auth.signOut({ scope: "local" });
  if (signOutError) {
    console.error("Gagal mengakhiri sesi setelah reset kata sandi:", signOutError);
    return { ok: false, message: "Kata sandi berubah, tetapi sesi belum berakhir. Keluar lalu masuk kembali." };
  }
  redirect("/login?passwordUpdated=1");
}

export async function signOut() {
  const client = await getSupabaseServerClient(true);
  if (client) {
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) redirect("/?keluar=gagal");
  }
  redirect("/login");
}
