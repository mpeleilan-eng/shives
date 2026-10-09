import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPatron, getRestaurant } from "@/lib/session";
import { lundiDe, aujourdhuiParis, titreSemaine } from "@/lib/dates";
import { formatHeures } from "@/lib/employe";
import { toMin } from "@/lib/planning-engine";

export const metadata: Metadata = { title: "Historique · Shives" };

type LigneSemaine = {
  id: string;
  date_lundi: string;
  statut: "brouillon" | "publiee";
  creneaux: { employe_id: string; debut: string; fin: string }[];
  demandes: { statut: string }[];
};

export default async function PageHistorique() {
  const { supabase } = await getPatron();
  const restaurant = await getRestaurant();
  if (!restaurant) redirect("/app/restaurant");

  const { data } = await supabase
    .from("semaines")
    .select("id, date_lundi, statut, creneaux(employe_id, debut, fin), demandes(statut)")
    .eq("restaurant_id", restaurant.id)
    .order("date_lundi", { ascending: false })
    .limit(52);
  const semaines = (data ?? []) as LigneSemaine[];
  const cetteSemaine = lundiDe(aujourdhuiParis());

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Historique</h1>
        <p className="m-0 text-muted">Toutes tes semaines. Ouvre-en une pour la revoir ou la dupliquer.</p>
      </div>

      {semaines.length === 0 ? (
        <p className="m-0 rounded-[18px] border-2 border-dashed border-line px-5 py-8 text-center text-muted">
          Aucune semaine pour l&apos;instant. <Link href="/app/planning" className="font-semibold text-blue">Génère ta première semaine</Link>
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {semaines.map((s) => {
            const minutes = s.creneaux.reduce((t, c) => t + toMin(c.fin) - toMin(c.debut), 0);
            const personnes = new Set(s.creneaux.map((c) => c.employe_id)).size;
            const absences = s.demandes.filter((d) => d.statut === "acceptee").length;
            const quand = s.date_lundi === cetteSemaine ? "Cette semaine" : s.date_lundi > cetteSemaine ? "À venir" : null;
            return (
              <li key={s.id}>
                <Link
                  href={`/app/planning/${s.date_lundi}`}
                  className="flex items-center justify-between gap-3 rounded-[18px] border border-line bg-surface px-4 py-3.5 no-underline hover:border-blue"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 font-bold">
                      {titreSemaine(s.date_lundi)}
                      {quand && <span className="rounded-full bg-blue-soft px-2 py-0.5 text-xs font-bold text-blue">{quand}</span>}
                    </span>
                    <span className="text-sm text-muted">
                      {personnes} {personnes > 1 ? "personnes" : "personne"} · {formatHeures(minutes / 60)}
                      {absences > 0 && ` · ${absences} ${absences > 1 ? "absences" : "absence"}`}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${s.statut === "publiee" ? "bg-ok-bg text-ok" : "bg-bg text-muted border border-line"}`}>
                    {s.statut === "publiee" ? "Publiée" : "Brouillon"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
