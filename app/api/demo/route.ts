import { NextResponse } from "next/server";
import { verifierDemande } from "@/lib/demo";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/demo : enregistre une demande de démo.
 * La table demandes_demo est fermée au public (RLS sans règle) :
 * seule cette route serveur peut y écrire, avec la clé service_role.
 */
export async function POST(request: Request) {
  const corps = await request.json().catch(() => null);

  // Champ piège rempli = robot. On fait semblant que tout va bien.
  if (corps && typeof corps === "object" && "site" in corps && String(corps.site).trim()) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const verif = verifierDemande(corps);
  if (!verif.ok) return NextResponse.json({ erreur: verif.erreur }, { status: 400 });

  const { error } = await createAdminClient().from("demandes_demo").insert(verif.demande);
  if (error) {
    console.error("demandes_demo insert:", error.message);
    return NextResponse.json({ erreur: "L'envoi a échoué. Réessaie dans un instant." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
