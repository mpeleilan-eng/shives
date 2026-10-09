import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * S'exécute avant chaque page : rafraîchit la session Supabase du patron (cookies)
 * et protège l'espace patron /app. (Vérification rapide : chaque page revérifie aussi côté serveur.)
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

  const { data } = await supabase.auth.getUser();
  const chemin = request.nextUrl.pathname;

  // Espace patron : il faut être connecté
  if (!data.user && (chemin === "/app" || chemin.startsWith("/app/"))) {
    return redirigerAvecCookies(request, response, "/connexion");
  }
  // Déjà connecté : pas besoin de revoir la page de connexion
  if (data.user && chemin === "/connexion") {
    return redirigerAvecCookies(request, response, "/app");
  }
  return response;
}

/** Redirection qui garde les cookies de session éventuellement rafraîchis. */
function redirigerAvecCookies(request: NextRequest, response: NextResponse, vers: string) {
  const redirection = NextResponse.redirect(new URL(vers, request.url));
  response.cookies.getAll().forEach((c) => redirection.cookies.set(c));
  ["cache-control", "expires", "pragma"].forEach((h) => {
    const v = response.headers.get(h);
    if (v) redirection.headers.set(h, v);
  });
  return redirection;
}

export const config = {
  // Toutes les pages sauf les fichiers statiques (images, vidéo, icônes…)
  matcher: ["/((?!_next/static|_next/image|favicon.svg|icon.svg|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)"],
};
