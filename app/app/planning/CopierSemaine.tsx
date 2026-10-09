"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bouton, Message, styleChamp } from "@/components/ui";
import { titreSemaine } from "@/lib/dates";
import { dupliquerSemaine } from "./actions";

/** Semaine vide : « Copier une autre semaine » (choix dans la liste des semaines existantes). */
export function CopierDepuis({ cible, semaines }: { cible: string; semaines: string[] }) {
  const [source, setSource] = useState(semaines[0] ?? "");
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();
  if (!semaines.length) return null;

  return (
    <div className="flex w-full max-w-sm flex-col gap-2 border-t border-line pt-4">
      <span className="text-sm font-semibold text-muted">ou reprendre une semaine déjà faite</span>
      <div className="flex gap-2">
        <select value={source} onChange={(e) => setSource(e.target.value)} className={styleChamp} aria-label="Semaine à copier">
          {semaines.map((s) => <option key={s} value={s}>{titreSemaine(s)}</option>)}
        </select>
        <Bouton
          variante="secondaire"
          disabled={enCours || !source}
          className="shrink-0 px-4! py-2! text-sm!"
          onClick={() => startTransition(async () => {
            const r = await dupliquerSemaine(source, cible);
            if (r.erreur) setErreur(r.erreur);
          })}
        >
          {enCours ? "Copie…" : "Copier"}
        </Bouton>
      </div>
      {erreur && <Message type="erreur">{erreur}</Message>}
    </div>
  );
}

/** Semaine remplie : « Dupliquer vers la semaine suivante ». */
export function DupliquerVers({ source, cible, cibleExiste }: { source: string; cible: string; cibleExiste: boolean }) {
  const router = useRouter();
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string>();

  function dupliquer() {
    const question = cibleExiste
      ? `La ${titreSemaine(cible).toLowerCase()} existe déjà : elle sera remplacée par cette copie (en brouillon). Continuer ?`
      : `Copier ce planning sur la ${titreSemaine(cible).toLowerCase()} ?`;
    if (!confirm(question)) return;
    startTransition(async () => {
      const r = await dupliquerSemaine(source, cible);
      if (r.erreur) setErreur(r.erreur);
      else router.push(`/app/planning/${cible}`);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Bouton variante="secondaire" onClick={dupliquer} disabled={enCours}>
        {enCours ? "Copie…" : "Dupliquer vers la semaine suivante"}
      </Bouton>
      {erreur && <Message type="erreur">{erreur}</Message>}
    </div>
  );
}
