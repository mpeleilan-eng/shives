"use client";

import { useState, useTransition } from "react";
import { Bouton, Message } from "@/components/ui";
import { publierSemaine } from "./actions";

export function BoutonPublier({ dateLundi, publiee, nbManques }: { dateLundi: string; publiee: boolean; nbManques: number }) {
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();

  function changer(publier: boolean) {
    if (publier && nbManques > 0 && !confirm(`Il reste ${nbManques} ${nbManques > 1 ? "manques" : "manque"}. Publier quand même ?`)) return;
    if (!publier && !confirm("L'équipe ne verra plus cette semaine sur son lien. Continuer ?")) return;
    setErreur(undefined);
    startTransition(async () => {
      const r = await publierSemaine(dateLundi, publier);
      if (r.erreur) setErreur(r.erreur);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {publiee ? (
        <button type="button" onClick={() => changer(false)} disabled={enCours} className="cursor-pointer self-start text-sm font-semibold text-muted underline-offset-4 hover:underline">
          {enCours ? "…" : "Repasser en brouillon"}
        </button>
      ) : (
        <Bouton onClick={() => changer(true)} disabled={enCours} className="w-full sm:w-auto">
          {enCours ? "Publication…" : "Publier la semaine"}
        </Bouton>
      )}
      {erreur && <Message type="erreur">{erreur}</Message>}
    </div>
  );
}
