import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSupabaseServerClient } from "./supabase";

export const getActiveProfile = cache(async () => {
  const client = await getSupabaseServerClient();
  if (!client) return null;

  const { data, error } = await client.auth.getClaims();
  const id = data?.claims?.sub;
  if (error || !id) return null;

  const profile = await db.profile.findUnique({ where: { id } });
  return profile?.isActive ? profile : null;
});

export async function requireProfile() {
  const profile = await getActiveProfile();
  if (!profile) redirect("/login");
  return profile;
}
