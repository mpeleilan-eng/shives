import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * S'exécute avant chaque page : rafraîchit la session Supabase du patron (cookies).
 * La protection des pages /app sera ajoutée à l'étape 3.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response; // Supabase pas encore configuré

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Toutes les pages sauf les fichiers statiques (images, vidéo, icônes…)
  matcher: ["/((?!_next/static|_next/image|favicon.svg|icon.svg|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)"],
};
