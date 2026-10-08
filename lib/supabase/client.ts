import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase pour le navigateur (composants "use client"). Utilise seulement la clé publique. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
