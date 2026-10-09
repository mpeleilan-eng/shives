import { NOM_POSTE, type PosteEmploye } from "@/lib/types";

// Couleurs par poste : cuisine orange, salle bleu, plonge vert, polyvalent neutre.
export const COULEUR_POSTE: Record<PosteEmploye, string> = {
  cuisine: "bg-cuisine-bg text-cuisine",
  salle: "bg-salle-bg text-salle",
  plonge: "bg-plonge-bg text-plonge",
  polyvalent: "bg-bg text-muted border border-line",
};

export function PastillePoste({ poste, className = "" }: { poste: PosteEmploye; className?: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${COULEUR_POSTE[poste]} ${className}`}>
      {NOM_POSTE[poste]}
    </span>
  );
}
