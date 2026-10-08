import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase "admin" avec la clé service_role : il ignore la RLS.
 * SERVEUR UNIQUEMENT (routes API). `import "server-only"` fait échouer la compilation
 * si ce fichier est importé par erreur dans un composant navigateur.
 * À utiliser seulement après avoir vérifié les droits soi-même (ex. token_acces d'un employé).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variables Supabase manquantes (voir .env.example)");
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
