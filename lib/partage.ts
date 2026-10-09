// Liens personnels des employés (sans compte) et messages WhatsApp.

import { siteUrl } from "@/lib/site-url";

export const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function lienEmploye(token: string) {
  return `${siteUrl()}/e/${token}`;
}

/** "06 12 34 56 78" → "33612345678" (format attendu par wa.me). Null si le numéro n'est pas exploitable. */
export function numeroWhatsApp(telephone: string) {
  const chiffres = telephone.replace(/\D/g, "");
  if (telephone.trim().startsWith("+")) return chiffres.length >= 9 ? chiffres : null;
  if (chiffres.startsWith("00")) return chiffres.slice(2);
  if (chiffres.length === 10 && chiffres.startsWith("0")) return `33${chiffres.slice(1)}`;
  return chiffres.length >= 11 ? chiffres : null;
}

/** Lien qui ouvre WhatsApp avec le message déjà écrit (vers le numéro de l'employé s'il est connu). */
export function lienWhatsApp(telephone: string, message: string) {
  const numero = numeroWhatsApp(telephone);
  return `https://wa.me/${numero ?? ""}?text=${encodeURIComponent(message)}`;
}

export function messagePlanning(prenom: string, restaurant: string, lien: string) {
  return `Bonjour ${prenom}, ton planning chez ${restaurant} est prêt : ${lien}\nGarde ce lien, il est personnel.`;
}
