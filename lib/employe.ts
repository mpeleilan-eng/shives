import { POSTES_EMPLOYE, type PosteEmploye } from "@/lib/types";

export type InfosEmploye = {
  nom: string;
  poste: PosteEmploye;
  contrat_heures: number;
  telephone: string;
  indispos: number[];
};

/** Vérifie le formulaire employé. Renvoie les infos propres, ou un message d'erreur. */
export function verifierEmploye(form: FormData): { ok: true; infos: InfosEmploye } | { ok: false; erreur: string } {
  const nom = String(form.get("nom") ?? "").trim().replace(/\s+/g, " ");
  if (!nom) return { ok: false, erreur: "Indique le nom de l'employé." };
  if (nom.length > 60) return { ok: false, erreur: "Le nom est trop long (60 caractères max)." };

  const poste = String(form.get("poste") ?? "") as PosteEmploye;
  if (!POSTES_EMPLOYE.includes(poste)) return { ok: false, erreur: "Choisis un poste." };

  const brut = String(form.get("contrat_heures") ?? "").trim().replace(",", ".").replace(/\s*h$/i, "");
  const contrat_heures = Number(brut);
  if (!brut || !Number.isFinite(contrat_heures) || contrat_heures < 0 || contrat_heures > 60) {
    return { ok: false, erreur: "Les heures au contrat doivent être entre 0 et 60." };
  }
  if (Math.round(contrat_heures * 2) !== contrat_heures * 2) {
    return { ok: false, erreur: "Les heures au contrat vont de demi-heure en demi-heure (ex. 24,5)." };
  }

  const telephone = String(form.get("telephone") ?? "").trim().replace(/\s+/g, " ");
  if (telephone && (!/^[\d\s+().-]+$/.test(telephone) || telephone.replace(/\D/g, "").length < 9 || telephone.length > 30)) {
    return { ok: false, erreur: "Ce numéro de téléphone ne semble pas valide." };
  }

  const indispos = [0, 1, 2, 3, 4, 5, 6].filter((j) => form.get(`indispo-${j}`) === "on");
  if (indispos.length === 7) return { ok: false, erreur: "L'employé ne peut pas être indisponible toute la semaine." };

  return { ok: true, infos: { nom, poste, contrat_heures, telephone, indispos } };
}

/** "35" → "35 h", "24.5" → "24 h 30" */
export function formatHeures(h: number) {
  const entier = Math.floor(h);
  const minutes = Math.round((h - entier) * 60);
  return minutes ? `${entier} h ${String(minutes).padStart(2, "0")}` : `${entier} h`;
}
