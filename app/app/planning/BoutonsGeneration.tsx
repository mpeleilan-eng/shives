"use client";

import { useState, useTransition } from "react";
import { Bouton, Message } from "@/components/ui";
import { genererSemaine } from "./actions";

export function BoutonsGeneration({ dateLundi, existe }: { dateLundi: string; existe: boolean }) {
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();

  function lancer(autreProposition: boolean) {
    if (existe && !confirm("La proposition actuelle et tes modifications seront remplacées. Continuer ?")) return;
    setErreur(undefined);
    startTransition(async () => {
      const r = await genererSemaine(dateLundi, autreProposition);
      if (r.erreur) setErreur(r.erreur);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {existe ? (
          <Bouton variante="secondaire" onClick={() => lancer(true)} disabled={enCours}>
            {enCours ? "Calcul…" : "↻ Autre proposition"}
          </Bouton>
        ) : (
          <Bouton variante="soleil" onClick={() => lancer(false)} disabled={enCours} className="w-full text-lg sm:w-auto">
            {enCours ? "Calcul du planning…" : "Générer la semaine"}
          </Bouton>
        )}
      </div>
      {erreur && <Message type="erreur">{erreur}</Message>}
    </div>
  );
}
