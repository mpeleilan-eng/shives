import { NextResponse } from "next/server";
import { employeParToken } from "@/lib/acces-employe";
import { ajouterJours, aujourdhuiParis } from "@/lib/dates";

/**
 * POST /api/employe/absence : « Je ne peux pas venir », depuis le lien personnel de l'employé.
 * Pas de compte : on vérifie le token, puis que le créneau est bien À LUI, dans une semaine publiée, pas encore passé.
 */
export async function POST(request: Request) {
  const corps = await request.json().catch(() => null) as { token?: unknown; creneauId?: unknown; message?: unknown } | null;
  const token = typeof corps?.token === "string" ? corps.token : "";
  const creneauId = typeof corps?.creneauId === "string" ? corps.creneauId : "";
  const message = typeof corps?.message === "string" ? corps.message.trim().slice(0, 300) : "";

  const acces = await employeParToken(token);
  if (!acces) return NextResponse.json({ erreur: "Ce lien ne marche plus." }, { status: 403 });
  const { admin, employe, restaurant } = acces;

  const { data: creneau } = await admin
    .from("creneaux")
    .select("id, jour, service, poste, semaine:semaine_id(id, date_lundi, statut, restaurant_id)")
    .eq("id", creneauId)
    .eq("employe_id", employe.id)
    .maybeSingle();
  const semaine = creneau?.semaine as unknown as { id: string; date_lundi: string; statut: string; restaurant_id: string } | null;
  if (!creneau || !semaine || semaine.restaurant_id !== restaurant.id || semaine.statut !== "publiee") {
    return NextResponse.json({ erreur: "Ce service n'est plus dans ton planning." }, { status: 404 });
  }
  if (ajouterJours(semaine.date_lundi, creneau.jour) < aujourdhuiParis()) {
    return NextResponse.json({ erreur: "Ce service est déjà passé." }, { status: 400 });
  }

  // Garde-fou contre les abus : pas plus de 5 demandes en attente par employé
  const { count } = await admin
    .from("demandes").select("id", { count: "exact", head: true })
    .eq("employe_id", employe.id).eq("statut", "en_attente");
  if ((count ?? 0) >= 5) {
    return NextResponse.json({ erreur: "Tu as déjà 5 demandes en attente. Appelle ton responsable." }, { status: 429 });
  }

  const { error } = await admin.from("demandes").insert({
    semaine_id: semaine.id,
    employe_id: employe.id,
    creneau_id: creneau.id,
    jour: creneau.jour,
    service: creneau.service,
    poste: creneau.poste,
    type: "absence",
    message,
  });
  if (error) {
    // Index unique : une seule demande en attente par créneau
    if (error.code === "23505") return NextResponse.json({ ok: true }, { status: 200 });
    console.error("demande absence:", error.message);
    return NextResponse.json({ erreur: "L'envoi a échoué. Réessaie." }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
