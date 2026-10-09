import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { employeParToken, semainesPubliees } from "@/lib/acces-employe";
import { lundiDe, aujourdhuiParis, numeroDuJour, titreSemaine, ajouterJours } from "@/lib/dates";
import { formatHeures } from "@/lib/employe";
import { toMin } from "@/lib/planning-engine";
import { JOURS, NOM_POSTE, NOM_SERVICE } from "@/lib/types";
import { COULEUR_POSTE } from "@/components/Poste";

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
                const estAujourdhui = date === aujourdhui;
                const passe = date < aujourdhui;
                return (
                  <li
                    key={j}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${estAujourdhui ? "border-blue border-2 bg-surface" : "border-line bg-surface"} ${passe ? "opacity-50" : ""}`}
                  >
                    <div className="w-14 shrink-0">
                      <span className="block text-sm font-bold">{nomJour.slice(0, 3)}.</span>
                      <span className="block font-display text-2xl font-extrabold leading-none">{numeroDuJour(s.date_lundi, j)}</span>
                    </div>
                    {siens.length ? (
                      <div className="flex flex-1 flex-col gap-1">
                        {siens.map((c) => (
                          <div key={c.service} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${COULEUR_POSTE[c.poste]}`}>
                            <span className="font-bold">{NOM_SERVICE[c.service]}</span>
                            <span className="text-sm font-semibold tabular-nums">{c.debut.replace(":", "h")} – {c.fin.replace(":", "h")}</span>
                          </div>
                        ))}
                        {siens.length > 1 && <span className="text-xs text-muted">Pause entre les deux services</span>}
                        {siens.some((c) => c.poste !== employe.poste) && (
                          <span className="text-xs text-muted">Poste : {siens.map((c) => NOM_POSTE[c.poste]).join(" puis ")}</span>
                        )}
                      </div>
                    ) : (
                      <span className="flex-1 font-semibold text-muted">Repos</span>
                    )}
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
