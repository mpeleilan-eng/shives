"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { Bouton, Carte, Champ, Message, styleChamp } from "@/components/ui";
import { JOURS_COURTS, NOM_SERVICE, SERVICES, type ServiceKey, type Services } from "@/lib/types";
import { enregistrerRestaurant, type EtatRestaurant } from "./actions";

type Props = {
  nom: string;
  services: Services;
  ouverture: Record<ServiceKey, boolean>[];
  creation: boolean;
};

export function FormRestaurant({ nom, services, ouverture, creation }: Props) {
  const [etat, action, enCours] = useActionState(enregistrerRestaurant, {} as EtatRestaurant);

  // Envoi "à la main" : avec <form action>, React viderait les champs même en cas d'erreur
  function envoyer(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    startTransition(() => action(form));
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-5">
      <Carte className="flex flex-col gap-4">
        <Champ label="Nom du restaurant">
          <input name="nom" required maxLength={100} defaultValue={nom} className={styleChamp} placeholder="Crêperie du Port" />
        </Champ>
      </Carte>

      <Carte className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">Horaires des services</h2>
          <p className="m-0 text-sm text-muted">De l&apos;arrivée de l&apos;équipe à la fin du service.</p>
        </div>
        {SERVICES.map((s) => (
          <fieldset key={s} className="grid grid-cols-[4rem_1fr_1fr] items-end gap-3">
            <legend className="sr-only">Service {NOM_SERVICE[s]}</legend>
            <span className="pb-3 font-bold">{NOM_SERVICE[s]}</span>
            <Champ label="Début">
              <input type="time" name={`${s}-debut`} required defaultValue={services[s].start} className={styleChamp} />
            </Champ>
            <Champ label="Fin">
              <input type="time" name={`${s}-fin`} required defaultValue={services[s].end} className={styleChamp} />
            </Champ>
          </fieldset>
        ))}
      </Carte>

      <Carte className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">Jours d&apos;ouverture</h2>
          <p className="m-0 text-sm text-muted">Touche un service pour l&apos;ouvrir ou le fermer.</p>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {JOURS_COURTS.map((j, jour) => (
            <div key={j} className="flex flex-col items-stretch gap-1.5">
              <span className="text-center text-xs font-bold text-muted">{j}</span>
              {SERVICES.map((s) => (
                <label key={s} className="cursor-pointer">
                  <input type="checkbox" name={`ouvert-${jour}-${s}`} defaultChecked={ouverture[jour][s]} className="peer sr-only" />
                  <span className="block rounded-lg border-2 border-dashed border-line py-2 text-center text-[11px] font-bold text-muted line-through peer-checked:border-solid peer-checked:border-blue peer-checked:bg-blue-soft peer-checked:text-blue peer-checked:no-underline peer-focus-visible:outline-3 peer-focus-visible:outline-blue">
                    {NOM_SERVICE[s]}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </Carte>

      {etat.erreur && <Message type="erreur">{etat.erreur}</Message>}
      {etat.enregistre && !enCours && <Message type="ok">C&apos;est enregistré.</Message>}
      <Bouton type="submit" disabled={enCours} className="w-full sm:w-auto sm:self-start">
        {enCours ? "Enregistrement…" : creation ? "Créer mon restaurant" : "Enregistrer"}
      </Bouton>
    </form>
  );
}
