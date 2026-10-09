// Types partagés, calqués sur les tables Supabase (supabase/migrations).

export type ServiceKey = "midi" | "soir";
export type Poste = "cuisine" | "salle" | "plonge";
export type PosteEmploye = Poste | "polyvalent";

export const SERVICES: ServiceKey[] = ["midi", "soir"];
export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const NOM_SERVICE: Record<ServiceKey, string> = { midi: "Midi", soir: "Soir" };

export type Horaires = { start: string; end: string };
export type Services = Record<ServiceKey, Horaires>;

export type Regles = {
  maxJours: number;
  maxHeuresJour: number;
  reposMin: number;
  completerContrats: boolean;
  /** Pause (en minutes) pour qui fait midi + soir le même jour. Gérée autour du moteur, pas dedans. */
  pauseMinutes: number;
};

export const REGLES_PAR_DEFAUT: Regles = {
  maxJours: 5,
  maxHeuresJour: 11,
  reposMin: 11,
  completerContrats: true,
  pauseMinutes: 30,
};

export const PAUSES_POSSIBLES = [0, 20, 30, 60];
export const POSTES: Poste[] = ["cuisine", "salle", "plonge"];

export type Restaurant = {
  id: string;
  owner_id: string;
  nom: string;
  services: Services;
  regles: Regles;
  abonnement: "essai" | "solo" | "equipe" | "inactif";
  stripe_customer_id: string | null;
  created_at: string;
};

export const POSTES_EMPLOYE: PosteEmploye[] = ["cuisine", "salle", "plonge", "polyvalent"];
export const NOM_POSTE: Record<PosteEmploye, string> = {
  cuisine: "Cuisine",
  salle: "Salle",
  plonge: "Plonge",
  polyvalent: "Polyvalent",
};

export type Employe = {
  id: string;
  restaurant_id: string;
  nom: string;
  poste: PosteEmploye;
  contrat_heures: number;
  telephone: string;
  indispos: number[];
  token_acces: string;
  actif: boolean;
  created_at: string;
};

export type Besoin = {
  id: string;
  restaurant_id: string;
  jour: number;
  service: ServiceKey;
  cuisine: number;
  salle: number;
  plonge: number;
  ouvert: boolean;
};
