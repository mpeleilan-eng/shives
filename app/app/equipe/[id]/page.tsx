import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { lienEmploye, messagePlanning } from "@/lib/partage";
import type { Employe } from "@/lib/types";
import { Bouton, Carte, Message, styleBouton } from "@/components/ui";
import { BoutonCopier, BoutonWhatsApp } from "@/components/Partage";
import { FormEmploye } from "../FormEmploye";
import { changerActif, nouveauLien } from "../actions";

export const metadata: Metadata = { title: "Modifier un employé · Shives" };

export default async function PageEmploye({ params, searchParams }: PageProps<"/app/equipe/[id]">) {
  const { id } = await params;
  const { lien } = await searchParams;
  const restaurant = await getRestaurant();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // La RLS ne renvoie l'employé que s'il appartient à un restaurant du patron
  const { supabase } = await getPatron();
  const { data } = await supabase.from("employes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const employe = data as Employe;
  const lienPerso = lienEmploye(employe.token_acces);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/app/equipe" className="text-sm font-semibold text-muted no-underline hover:text-ink">← Équipe</Link>
      <h1 className="text-3xl font-extrabold sm:text-4xl">{employe.nom}</h1>
      {!employe.actif && (
        <p className="m-0 rounded-xl bg-bad-bg px-3.5 py-3 text-bad">Retiré de l&apos;équipe : n&apos;apparaît plus dans les nouveaux plannings.</p>
      )}
      <FormEmploye employe={employe} />

      {employe.actif && (
        <Carte className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-bold">Lien personnel</h2>
            <p className="m-0 text-sm text-muted">{employe.nom} ouvre ce lien sur son téléphone pour voir son planning publié. Pas de compte, pas d&apos;appli.</p>
          </div>
          {lien === "nouveau" && <Message type="ok">Nouveau lien créé : l&apos;ancien ne marche plus. Envoie le nouveau.</Message>}
          <code className="block overflow-x-auto whitespace-nowrap rounded-xl bg-bg px-3 py-2 text-sm">{lienPerso}</code>
          <div className="flex flex-wrap gap-2">
            <BoutonCopier texte={lienPerso} />
            <BoutonWhatsApp telephone={employe.telephone} message={messagePlanning(employe.nom, restaurant?.nom ?? "", lienPerso)} />
            <a href={lienPerso} target="_blank" rel="noopener noreferrer" className={`${styleBouton.lien} self-center text-sm`}>Voir sa page</a>
          </div>
          <form action={nouveauLien.bind(null, employe.id)}>
            <button type="submit" className="cursor-pointer text-sm font-semibold text-muted underline-offset-4 hover:underline">
              Lien partagé par erreur ? Créer un nouveau lien
            </button>
          </form>
        </Carte>
      )}

      <form action={changerActif.bind(null, employe.id, !employe.actif)} className="border-t border-line pt-5">
        {employe.actif ? (
          <>
            <Bouton variante="secondaire" type="submit" className="w-full text-bad! sm:w-auto">Retirer de l&apos;équipe</Bouton>
            <p className="mt-2 text-sm text-muted">Ses anciens plannings restent dans l&apos;historique. Tu pourras le réactiver.</p>
          </>
        ) : (
          <Bouton variante="secondaire" type="submit" className="w-full sm:w-auto">Réintégrer dans l&apos;équipe</Bouton>
        )}
      </form>
    </div>
  );
}
