"use client";

import { useState, useTransition } from "react";
import { Bouton, Message } from "@/components/ui";
import { PastillePoste } from "@/components/Poste";
import type { PosteEmploye } from "@/lib/types";
import { refuserDemande, validerDemande } from "./actions";

type Candidat = { id: string; nom: string; poste: PosteEmploye; restant: string; problemes: string[] };

export function ChoixRemplacant({ demandeId, remplacants }: { demandeId: string; remplacants: Candidat[] }) {
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();

  function agir(action: () => Promise<{ erreur?: string }>, question?: string) {
    if (question && !confirm(question)) return;
    setErreur(undefined);
    startTransition(async () => {
      const r = await action();
      if (r.erreur) setErreur(r.erreur);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Remplaçants possibles</span>
        {remplacants.length === 0 ? (
          <p className="m-0 text-sm text-muted">Personne de disponible à ce poste ce jour-là.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {remplacants.map((r, i) => (
              <li key={r.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${i === 0 && !r.problemes.length ? "border-blue bg-blue-soft/40" : "border-line"}`}>
                <div className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-2 font-bold">
                    {r.nom} <PastillePoste poste={r.poste} />
                    {i === 0 && !r.problemes.length && <span className="text-xs font-bold text-blue">Conseillé</span>}
                  </span>
                  <span className="text-xs text-muted">{r.restant}</span>
                  {r.problemes.map((p) => <span key={p} className="text-xs font-semibold text-cuisine">⚠ {p}</span>)}
                </div>
                <Bouton
                  variante={i === 0 && !r.problemes.length ? "primaire" : "secondaire"}
                  disabled={enCours}
                  onClick={() => agir(() => validerDemande(demandeId, r.id), r.problemes.length ? `${r.nom} : ${r.problemes.join(", ")}. Valider quand même ?` : undefined)}
                  className="shrink-0 px-4! py-2! text-sm!"
                >
                  Choisir
                </Bouton>
              </li>
            ))}
          </ul>
        )}
      </div>
      {erreur && <Message type="erreur">{erreur}</Message>}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <button type="button" disabled={enCours} onClick={() => agir(() => validerDemande(demandeId, null), "Accepter l'absence sans remplaçant ? Le service sera en sous-effectif.")} className="cursor-pointer text-muted underline-offset-4 hover:underline">
          Accepter sans remplaçant
        </button>
        <button type="button" disabled={enCours} onClick={() => agir(() => refuserDemande(demandeId), "Refuser ? L'employé reste au planning et le verra sur son lien.")} className="cursor-pointer text-bad underline-offset-4 hover:underline">
          Refuser
        </button>
        {enCours && <span className="text-muted">Enregistrement…</span>}
      </div>
    </div>
  );
}
