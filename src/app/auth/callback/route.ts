import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/features/auth/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = request.nextUrl.searchParams.get("next");
  if (!code || destination !== "/reset-password") {
    return NextResponse.redirect(new URL("/login?reset=invalid", request.url));
  }

  const config = getSupabaseConfig();
  if (!config) return NextResponse.redirect(new URL("/login?reset=unavailable", request.url));

  const response = NextResponse.redirect(new URL(destination, request.url));
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (updates) => {
        updates.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Tautan reset kata sandi gagal diverifikasi:", error);
    return NextResponse.redirect(new URL("/login?reset=expired", request.url));
  }
  return response;
}
