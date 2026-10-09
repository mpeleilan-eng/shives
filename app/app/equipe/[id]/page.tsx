import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatron } from "@/lib/session";
import type { Employe } from "@/lib/types";
import { Bouton } from "@/components/ui";
import { FormEmploye } from "../FormEmploye";
import { changerActif } from "../actions";

export const metadata: Metadata = { title: "Modifier un employé · Shives" };

export default async function PageEmploye({ params }: PageProps<"/app/equipe/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // La RLS ne renvoie l'employé que s'il appartient à un restaurant du patron
  const { supabase } = await getPatron();
  const { data } = await supabase.from("employes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const employe = data as Employe;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/app/equipe" className="text-sm font-semibold text-muted no-underline hover:text-ink">← Équipe</Link>
      <h1 className="text-3xl font-extrabold sm:text-4xl">{employe.nom}</h1>
      {!employe.actif && (
        <p className="m-0 rounded-xl bg-bad-bg px-3.5 py-3 text-bad">Retiré de l&apos;équipe : n&apos;apparaît plus dans les nouveaux plannings.</p>
      )}
      <FormEmploye employe={employe} />

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
