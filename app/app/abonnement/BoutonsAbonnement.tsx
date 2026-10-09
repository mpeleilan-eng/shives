"use client";

import { useState, useTransition } from "react";
import { Bouton, Message } from "@/components/ui";
import type { Offre } from "@/lib/abonnement";
import { choisirOffre, gererAbonnement } from "./actions";

export function BoutonOffre({ offre, label, principal }: { offre: Offre; label: string; principal?: boolean }) {
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();
  return (
    <div className="flex flex-col gap-2">
      <Bouton
        variante={principal ? "primaire" : "secondaire"}
        disabled={enCours}
        onClick={() => startTransition(async () => {
          const r = await choisirOffre(offre);
          if (r?.erreur) setErreur(r.erreur);
        })}
      >
        {enCours ? "Ouverture du paiement…" : label}
      </Bouton>
      {erreur && <Message type="erreur">{erreur}</Message>}
    </div>
  );
}

export function BoutonGerer() {
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();
  return (
    <div className="flex flex-col gap-2">
      <Bouton
        variante="secondaire"
        disabled={enCours}
        onClick={() => startTransition(async () => {
          const r = await gererAbonnement();
          if (r?.erreur) setErreur(r.erreur);
        })}
      >
        {enCours ? "Ouverture…" : "Gérer mon abonnement"}
      </Bouton>
      <span className="text-xs text-muted">Changer d&apos;offre, de carte, voir les factures ou résilier.</span>
      {erreur && <Message type="erreur">{erreur}</Message>}
    </div>
  );
}
