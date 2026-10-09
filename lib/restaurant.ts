import { SERVICES, type ServiceKey, type Services } from "@/lib/types";

export type InfosRestaurant = {
  nom: string;
  services: Services;
  /** ouverture[jour][service] : le service a-t-il lieu ce jour-là ? */
  ouverture: Record<ServiceKey, boolean>[];
};

const HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const enMinutes = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/** Vérifie le formulaire « Mon restaurant ». Renvoie les infos propres, ou un message d'erreur. */
export function verifierRestaurant(form: FormData): { ok: true; infos: InfosRestaurant } | { ok: false; erreur: string } {
  const nom = String(form.get("nom") ?? "").trim().replace(/\s+/g, " ");
  if (!nom) return { ok: false, erreur: "Donne un nom à ton restaurant." };
  if (nom.length > 100) return { ok: false, erreur: "Le nom est trop long (100 caractères max)." };

  const services = {} as Services;
  for (const s of SERVICES) {
    const start = String(form.get(`${s}-debut`) ?? "").slice(0, 5);
    const end = String(form.get(`${s}-fin`) ?? "").slice(0, 5);
    const label = s === "midi" ? "du midi" : "du soir";
    if (!HEURE.test(start) || !HEURE.test(end)) return { ok: false, erreur: `Indique les horaires du service ${label}.` };
    if (enMinutes(end) <= enMinutes(start)) {
      return { ok: false, erreur: `Le service ${label} doit finir après son début (et au plus tard à 23:59).` };
    }
    services[s] = { start, end };
  }
  if (enMinutes(services.midi.end) > enMinutes(services.soir.start)) {
    return { ok: false, erreur: "Le service du midi doit finir avant le début du service du soir." };
  }

  const ouverture = Array.from({ length: 7 }, (_, j) => ({
    midi: form.get(`ouvert-${j}-midi`) === "on",
    soir: form.get(`ouvert-${j}-soir`) === "on",
  }));
  if (!ouverture.some((o) => o.midi || o.soir)) {
    return { ok: false, erreur: "Coche au moins un service où ton restaurant est ouvert." };
  }

  return { ok: true, infos: { nom, services, ouverture } };
}
