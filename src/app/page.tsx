import { redirect } from "next/navigation";
import { home } from "@/features/auth/permissions";
import { requireProfile } from "@/features/auth/session";

export default async function Index({
  searchParams,
}: {
  searchParams: Promise<{ keluar?: string }>;
}) {
  const profile = await requireProfile();
  const { keluar } = await searchParams;
  redirect(keluar === "gagal" ? `${home[profile.role]}?keluar=gagal` : home[profile.role]);
}
