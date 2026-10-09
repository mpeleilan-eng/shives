import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { cheminSur } from "@/lib/site-url";

/**
 * GET /auth/confirm : arrivée depuis le lien magique de l'e-mail.
 * - ?token_hash=…&type=email : marche même si le lien est ouvert dans un autre navigateur (recommandé)
 * - ?code=… : format par défaut de Supabase (doit être ouvert dans le même navigateur)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = cheminSur(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  return NextResponse.redirect(new URL(ok ? next : "/connexion?erreur=lien", origin));
}
