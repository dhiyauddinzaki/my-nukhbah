"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { home } from "./permissions";
import { loginSchema, type LoginInput } from "./schema";
import { getSupabaseServerClient } from "./supabase";

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

export async function signOut() {
  const client = await getSupabaseServerClient(true);
  if (client) {
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) redirect("/?keluar=gagal");
  }
  redirect("/login");
}
