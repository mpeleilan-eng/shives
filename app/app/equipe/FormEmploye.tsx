"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Bouton, Carte, Champ, Message, styleChamp } from "@/components/ui";
import { COULEUR_POSTE } from "@/components/Poste";
import { JOURS_COURTS, NOM_POSTE, POSTES_EMPLOYE, type Employe } from "@/lib/types";
import { enregistrerEmploye, type EtatEmploye } from "./actions";

const CONTRATS_RAPIDES = [35, 24, 20];

export function FormEmploye({ employe }: { employe?: Employe }) {
  const [etat, action, enCours] = useActionState(enregistrerEmploye.bind(null, employe?.id ?? null), {} as EtatEmploye);
  const [contrat, setContrat] = useState(String(employe?.contrat_heures ?? 35).replace(".", ","));

  // Envoi "à la main" : avec <form action>, React viderait les champs même en cas d'erreur
  function envoyer(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    startTransition(() => action(form));
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5">
      <Carte className="flex flex-col gap-5">
        <Champ label="Nom">
          <input name="nom" required maxLength={60} defaultValue={employe?.nom} className={styleChamp} placeholder="Léa" autoComplete="off" />
        </Champ>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-bold">Poste</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {POSTES_EMPLOYE.map((p) => (
              <label key={p} className="cursor-pointer">
                <input type="radio" name="poste" value={p} defaultChecked={(employe?.poste ?? "cuisine") === p} className="peer sr-only" />
                <span className={`block rounded-xl border-2 border-transparent py-2.5 text-center font-bold opacity-55 peer-checked:border-current peer-checked:opacity-100 peer-focus-visible:outline-3 peer-focus-visible:outline-blue ${COULEUR_POSTE[p]}`}>
                  {NOM_POSTE[p]}
                </span>
              </label>
            ))}
          </div>
          <span className="text-xs font-medium text-muted">Polyvalent : peut être placé en cuisine, en salle ou à la plonge.</span>
        </fieldset>

        <Champ label="Heures au contrat (par semaine)">
          <div className="flex flex-wrap items-center gap-2">
            <input
              name="contrat_heures"
              inputMode="decimal"
              required
              value={contrat}
              onChange={(e) => setContrat(e.target.value)}
              className={`${styleChamp} w-24!`}
            />
            <span className="font-semibold text-muted">h</span>
            {CONTRATS_RAPIDES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setContrat(String(h))}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-bold ${contrat === String(h) ? "border-blue bg-blue-soft text-blue" : "border-line text-muted"}`}
              >
                {h} h
              </button>
            ))}
          </div>
        </Champ>

        <Champ label="Téléphone" aide="Facultatif. Pour retrouver le numéro en cas de remplacement.">
          <input name="telephone" type="tel" inputMode="tel" autoComplete="off" maxLength={30} defaultValue={employe?.telephone} className={styleChamp} placeholder="06 12 34 56 78" />
        </Champ>

        <fieldset>
          <legend className="text-sm font-bold">Jours où il ne peut jamais travailler</legend>
          <p className="mb-2 mt-0.5 text-xs font-medium text-muted">Ex. cours le mercredi, deuxième emploi le lundi.</p>
          <div className="grid grid-cols-7 gap-1.5">
            {JOURS_COURTS.map((j, jour) => (
              <label key={j} className="cursor-pointer">
                <input type="checkbox" name={`indispo-${jour}`} defaultChecked={employe?.indispos.includes(jour)} className="peer sr-only" />
                <span className="block rounded-lg border-2 border-line py-2 text-center text-xs font-bold text-muted peer-checked:border-bad peer-checked:bg-bad-bg peer-checked:text-bad peer-checked:line-through peer-focus-visible:outline-3 peer-focus-visible:outline-blue">
                  {j}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Carte>

      {etat.erreur && <Message type="erreur">{etat.erreur}</Message>}
      <Bouton type="submit" disabled={enCours} className="w-full sm:w-auto sm:self-start">
        {enCours ? "Enregistrement…" : employe ? "Enregistrer" : "Ajouter à l'équipe"}
      </Bouton>
    </form>
  );
}
