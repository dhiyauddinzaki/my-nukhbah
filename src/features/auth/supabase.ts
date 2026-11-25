import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

export async function getSupabaseServerClient(writable = false) {
  const store = await cookies();
  const config = getSupabaseConfig();
  if (!config) return null;

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (updates) => {
        if (writable) updates.forEach(({ name, value, options }) => store.set(name, value, options));
      },
    },
  });
}
