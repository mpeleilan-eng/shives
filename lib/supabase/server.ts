import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase côté serveur (pages, routes, actions) avec la session du patron connecté.
 * Clé publique : la sécurité RLS s'applique. À recréer à chaque requête.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis une page serveur : impossible d'écrire les cookies ici.
            // Pas grave, proxy.ts rafraîchit la session à chaque requête.
          }
        },
      },
    },
  );
}
