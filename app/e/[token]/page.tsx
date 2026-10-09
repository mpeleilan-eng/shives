import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { employeParToken, semainesPubliees } from "@/lib/acces-employe";
import { lundiDe, aujourdhuiParis, numeroDuJour, titreSemaine, ajouterJours } from "@/lib/dates";
import { formatHeures } from "@/lib/employe";
import { toMin } from "@/lib/planning-engine";
import { JOURS, NOM_POSTE, NOM_SERVICE } from "@/lib/types";
import { COULEUR_POSTE } from "@/components/Poste";
import { BoutonAbsence } from "./BoutonAbsence";

// Page privée : jamais indexée, jamais mise en cache, aucun lien qui transmettrait l'adresse
export const metadata: Metadata = {
  title: "Mon planning · Shives",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PlanningEmploye({ params }: PageProps<"/e/[token]">) {
  const { token } = await params;
  const acces = await employeParToken(token);
  if (!acces) notFound();

  const aujourdhui = aujourdhuiParis();
  const semaines = await semainesPubliees(acces, lundiDe(aujourdhui));
  const { employe, restaurant } = acces;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <span className="font-display text-xl font-extrabold tracking-[-0.03em]">
          Shives<span className="text-sun">.</span>
        </span>
        <h1 className="text-3xl font-extrabold">Bonjour {employe.nom}</h1>
        <p className="m-0 text-muted">Ton planning chez <b className="text-ink">{restaurant.nom}</b></p>
      </header>

      {semaines.length === 0 && (
        <p className="m-0 rounded-[18px] border-2 border-dashed border-line px-5 py-8 text-center text-muted">
          Pas encore de planning publié. Ton responsable te préviendra.
        </p>
      )}

      {semaines.map((s) => {
        const minutes = s.creneaux.reduce((t, c) => t + toMin(c.fin) - toMin(c.debut), 0);
        return (
          <section key={s.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold">{titreSemaine(s.date_lundi)}</h2>
              <span className="text-sm font-bold text-muted tabular-nums">{formatHeures(minutes / 60)}</span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {JOURS.map((nomJour, j) => {
                const date = ajouterJours(s.date_lundi, j);
                const siens = s.creneaux.filter((c) => c.jour === j).sort((a, b) => a.debut.localeCompare(b.debut));
                // Absences acceptées : le service n'est plus dans son planning
                const liberes = s.demandes.filter((d) => d.jour === j && d.statut === "acceptee" && !siens.some((c) => c.id === d.creneau_id));
                const estAujourdhui = date === aujourdhui;
                const passe = date < aujourdhui;
                return (
                  <li
                    key={j}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${estAujourdhui ? "border-blue border-2 bg-surface" : "border-line bg-surface"} ${passe ? "opacity-50" : ""}`}
                  >
                    <div className="w-14 shrink-0 pt-1">
                      <span className="block text-sm font-bold">{nomJour.slice(0, 3)}.</span>
                      <span className="block font-display text-2xl font-extrabold leading-none">{numeroDuJour(s.date_lundi, j)}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      {siens.map((c) => {
                        const demande = [...s.demandes].reverse().find((d) => d.creneau_id === c.id);
                        return (
                          <div key={c.service} className="flex flex-col gap-1.5">
                            <div className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${COULEUR_POSTE[c.poste]}`}>
                              <span className="font-bold">
                                {NOM_SERVICE[c.service]}
                                {c.poste !== employe.poste && <span className="font-semibold"> · {NOM_POSTE[c.poste]}</span>}
                              </span>
                              <span className="text-sm font-semibold tabular-nums">{c.debut.replace(":", "h")} – {c.fin.replace(":", "h")}</span>
                            </div>
                            {demande?.statut === "en_attente" ? (
                              <span className="text-sm font-semibold text-cuisine">Demande envoyée, en attente de réponse</span>
                            ) : demande?.statut === "refusee" ? (
                              <span className="text-sm font-semibold text-bad">Ton responsable compte sur toi : tu restes au planning.</span>
                            ) : !passe ? (
                              <BoutonAbsence token={token} creneauId={c.id} libelle={`${nomJour.toLowerCase()} ${NOM_SERVICE[c.service].toLowerCase()}`} />
                            ) : null}
                          </div>
                        );
                      })}
                      {liberes.map((d) => (
                        <span key={d.id} className="rounded-lg bg-ok-bg px-2.5 py-1.5 text-sm font-semibold text-ok">
                          {d.service ? NOM_SERVICE[d.service] : "Service"} : absence acceptée{d.remplacant ? `, ${d.remplacant} te remplace` : ""}
                        </span>
                      ))}
                      {siens.length > 1 && <span className="text-xs text-muted">Pause entre les deux services</span>}
                      {!siens.length && !liberes.length && <span className="pt-2 font-semibold text-muted">Repos</span>}
                    </div>
                    {estAujourdhui && <span className="sr-only">(aujourd&apos;hui)</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="m-0 text-center text-xs text-muted">Ce lien est personnel : ne le partage pas.</p>
    </main>
  );
}
