/** Adresse publique du site (liens magiques, liens employés). */
export function siteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/** Garde seulement les redirections internes ("/app/…"), jamais vers un autre site. */
export function cheminSur(next: string | null | undefined, defaut = "/app") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : defaut;
}
