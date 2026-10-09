"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Bouton, Champ, Message, styleBouton, styleChamp } from "@/components/ui";
import { envoyerLien, verifierCode, type EtatConnexion } from "./actions";

export function FormConnexion({ erreurLien }: { erreurLien?: boolean }) {
  // Une seule "machine" : on choisit l'action selon l'étape en cours
  const [etat, action, enCours] = useActionState(
    (precedent: EtatConnexion, form: FormData) =>
      form.get("intention") === "code" ? verifierCode(precedent, form) : envoyerLien(precedent, form),
    { etape: "email" } as EtatConnexion,
  );
  const [recommencer, setRecommencer] = useState(false);
  const etape = recommencer ? "email" : etat.etape;

  // Envoi "à la main" : avec <form action>, React viderait les champs même en cas d'erreur
  function envoyer(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    setRecommencer(false);
    startTransition(() => action(form));
  }

  if (etape === "code" && etat.etape === "code") {
    return (
      <form onSubmit={envoyer} className="flex flex-col gap-4">
        <input type="hidden" name="intention" value="code" />
        <input type="hidden" name="next" value="/app" />
        <Message type="ok">
          E-mail envoyé à <b>{etat.email}</b>. Ouvre-le et clique sur le lien, depuis cet appareil.
        </Message>
        {/* Le code à 6 chiffres n'apparaît que si le modèle d'e-mail Supabase contient {{ .Token }} */}
        <details open={Boolean(etat.erreur)} className="rounded-xl border border-line px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-muted">Tu as reçu un code à la place ?</summary>
          <div className="mt-3 flex flex-col gap-3">
            <Champ label="Code reçu par e-mail">
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]*"
                maxLength={12}
                className={`${styleChamp} text-center text-2xl tracking-[0.3em] font-bold`}
                placeholder="123456"
              />
            </Champ>
            {etat.erreur && <Message type="erreur">{etat.erreur}</Message>}
            <Bouton type="submit" disabled={enCours}>{enCours ? "Vérification…" : "Me connecter"}</Bouton>
          </div>
        </details>
        <button type="button" className={styleBouton.lien} onClick={() => setRecommencer(true)}>
          Changer d&apos;adresse ou renvoyer l&apos;e-mail
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4">
      <input type="hidden" name="intention" value="email" />
      {erreurLien && !etat.erreur && (
        <Message type="erreur">Ce lien a expiré ou a déjà servi. Demande un nouvel e-mail.</Message>
      )}
      <Champ label="Ton adresse e-mail" aide="Pas de mot de passe : on t'envoie un lien pour te connecter.">
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className={styleChamp}
          placeholder="toi@monresto.fr"
          defaultValue={etat.etape === "code" ? etat.email : undefined}
        />
      </Champ>
      {etat.etape === "email" && etat.erreur && <Message type="erreur">{etat.erreur}</Message>}
      <Bouton type="submit" disabled={enCours}>{enCours ? "Envoi…" : "Recevoir mon lien de connexion"}</Bouton>
    </form>
  );
}
