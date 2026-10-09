"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cheminSur, siteUrl } from "@/lib/site-url";

export type EtatConnexion =
  | { etape: "email"; erreur?: string }
  | { etape: "code"; email: string; erreur?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 1) Envoie l'e-mail avec le lien magique (et le code à 6 chiffres). Crée le compte s'il n'existe pas. */
export async function envoyerLien(_: EtatConnexion, form: FormData): Promise<EtatConnexion> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { etape: "email", erreur: "Cette adresse e-mail ne semble pas valide." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${siteUrl()}/auth/confirm?next=/app` },
  });
  if (error) {
    console.error("signInWithOtp:", error.message);
    const tropDeDemandes = error.status === 429 || /rate limit/i.test(error.message);
    return {
      etape: "email",
      erreur: tropDeDemandes
        ? "Trop de demandes d'e-mail. Attends quelques minutes puis réessaie."
        : "Impossible d'envoyer l'e-mail. Réessaie dans un instant.",
    };
  }
  return { etape: "code", email };
}

/** 2) Variante sans cliquer le lien : le patron tape le code à 6 chiffres reçu par e-mail. */
export async function verifierCode(etat: EtatConnexion, form: FormData): Promise<EtatConnexion> {
  if (etat.etape !== "code") return { etape: "email" };
  const token = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(token)) return { ...etat, erreur: "Le code contient 6 chiffres." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: etat.email, token, type: "email" });
  if (error) return { ...etat, erreur: "Code incorrect ou expiré. Demande un nouvel e-mail." };
  redirect(cheminSur(String(form.get("next") ?? "")));
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
