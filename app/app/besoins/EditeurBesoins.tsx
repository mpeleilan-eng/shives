"use client";

import { useState, useTransition } from "react";
import { Bouton, Carte, Message } from "@/components/ui";
import { heuresNecessaires, MAX_PAR_POSTE, type Effectifs, type GrilleBesoins } from "@/lib/besoins";
import { formatHeures } from "@/lib/employe";
import { JOURS, NOM_POSTE, NOM_SERVICE, PAUSES_POSSIBLES, POSTES, SERVICES, type Poste, type Regles, type ServiceKey, type Services } from "@/lib/types";
import { enregistrerBesoins, type EtatBesoins } from "./actions";

const COULEUR: Record<Poste, string> = {
  cuisine: "text-cuisine bg-cuisine-bg",
  salle: "text-salle bg-salle-bg",
  plonge: "text-plonge bg-plonge-bg",
};

function Compteur({ valeur, min, max, onChange, label, couleur = "" }: {
  valeur: number; min: number; max: number; onChange: (v: number) => void; label: string; couleur?: string;
}) {
  const bouton = "grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-line bg-surface text-lg font-bold leading-none disabled:cursor-not-allowed disabled:opacity-30";
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <button type="button" className={bouton} disabled={valeur <= min} onClick={() => onChange(valeur - 1)} aria-label={`${label} : moins`}>−</button>
      <span className={`min-w-8 rounded-md px-1 py-0.5 text-center font-display text-lg font-bold tabular-nums ${couleur}`} aria-live="polite">{valeur}</span>
      <button type="button" className={bouton} disabled={valeur >= max} onClick={() => onChange(valeur + 1)} aria-label={`${label} : plus`}>+</button>
    </div>
  );
}

type Props = {
  grilleInitiale: GrilleBesoins;
  ouverture: Record<ServiceKey, boolean>[];
  services: Services;
  duree: Record<ServiceKey, number>;
  reglesInitiales: Regles;
  heuresContrats: number;
};

export function EditeurBesoins({ grilleInitiale, ouverture, services, duree, reglesInitiales, heuresContrats }: Props) {
  const [grille, setGrille] = useState(grilleInitiale);
  const [regles, setRegles] = useState(reglesInitiales);
  const [modifie, setModifie] = useState(false);
  const [etat, setEtat] = useState<EtatBesoins>({});
  const [enCours, startTransition] = useTransition();
  const [copie, setCopie] = useState<string | null>(null);

  function changerEffectif(jour: number, s: ServiceKey, p: Poste, v: number) {
    setGrille((g) => g.map((l, j) => (j === jour ? { ...l, [s]: { ...l[s], [p]: v } } : l)));
    setModifie(true);
  }
  function changerRegle<K extends keyof Regles>(cle: K, v: Regles[K]) {
    setRegles((r) => ({ ...r, [cle]: v }));
    setModifie(true);
  }
  /** Copie les effectifs d'un jour sur tous les autres jours (services ouverts seulement). */
  function copierSurLaSemaine(jour: number) {
    const modele = grille[jour];
    setGrille((g) => g.map((l, j) => {
      const copieService = (s: ServiceKey): Effectifs => (ouverture[j][s] && ouverture[jour][s] ? { ...modele[s] } : l[s]);
      return { midi: copieService("midi"), soir: copieService("soir") };
    }));
    setModifie(true);
    setCopie(`${JOURS[jour]} copié sur les autres jours ouverts.`);
  }
  function enregistrer() {
    setCopie(null);
    startTransition(async () => {
      const resultat = await enregistrerBesoins({ grille, regles });
      setEtat(resultat);
      if (resultat.enregistre) setModifie(false);
    });
  }

  const besoinHeures = heuresNecessaires(grille, ouverture, duree);
  const ecart = heuresContrats - besoinHeures;
  const enMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const coupure = enMin(services.soir.start) - enMin(services.midi.end);

  return (
    <div className="flex flex-col gap-5">
      {/* ── Besoins par jour ── */}
      <div className="flex flex-col gap-3">
        {JOURS.map((nomJour, jour) => {
          const ferme = !ouverture[jour].midi && !ouverture[jour].soir;
          return (
            <Carte key={nomJour} className={`flex flex-col gap-3 p-4! ${ferme ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-bold">{nomJour}</h2>
                {ferme ? (
                  <span className="text-sm font-semibold text-muted">Fermé</span>
                ) : (
                  <button type="button" onClick={() => copierSurLaSemaine(jour)} className="cursor-pointer text-sm font-semibold text-blue hover:underline">
                    Copier sur toute la semaine
                  </button>
                )}
              </div>
              {!ferme && SERVICES.map((s) => (
                <div key={s} className="flex flex-col gap-2 border-t border-line pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">{NOM_SERVICE[s]}</span>
                    <span className="text-xs font-semibold text-muted tabular-nums">{services[s].start} – {services[s].end}</span>
                  </div>
                  {ouverture[jour][s] ? (
                    <div className="grid grid-cols-3 gap-2">
                      {POSTES.map((p) => (
                        <div key={p} className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${COULEUR[p].split(" ")[0]}`}>{NOM_POSTE[p]}</span>
                          <Compteur
                            label={`${nomJour} ${NOM_SERVICE[s]} ${NOM_POSTE[p]}`}
                            valeur={grille[jour][s][p]}
                            min={0}
                            max={MAX_PAR_POSTE}
                            couleur={grille[jour][s][p] > 0 ? COULEUR[p] : "text-muted"}
                            onChange={(v) => changerEffectif(jour, s, p, v)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted">Service fermé (modifiable dans « Restaurant »)</span>
                  )}
                </div>
              ))}
            </Carte>
          );
        })}
      </div>

      {/* ── Règles ── */}
      <Carte className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Règles</h2>
        {([
          ["maxJours", "Jours de travail max par semaine", 1, 7, ""],
          ["maxHeuresJour", "Heures max par jour", 1, 24, " h"],
          ["reposMin", "Repos minimum entre deux journées", 0, 24, " h"],
        ] as const).map(([cle, label, min, max]) => (
          <div key={cle} className="flex items-center justify-between gap-3">
            <span className="font-semibold">{label}</span>
            <Compteur label={label} valeur={regles[cle]} min={min} max={max} onChange={(v) => changerRegle(cle, v)} />
          </div>
        ))}

        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="font-semibold">Compléter les contrats</span>
            <span className="text-sm text-muted">Ajoute des services en renfort pour que chacun fasse ses heures.</span>
          </span>
          <input type="checkbox" className="peer sr-only" checked={regles.completerContrats} onChange={(e) => changerRegle("completerContrats", e.target.checked)} />
          <span className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:bg-blue peer-checked:after:translate-x-5 peer-focus-visible:outline-3 peer-focus-visible:outline-blue" aria-hidden="true" />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">Pause pour qui fait midi + soir</legend>
          <div className="flex flex-wrap gap-2">
            {PAUSES_POSSIBLES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={regles.pauseMinutes === m}
                onClick={() => changerRegle("pauseMinutes", m)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-bold ${regles.pauseMinutes === m ? "border-blue bg-blue-soft text-blue" : "border-line text-muted"}`}
              >
                {m === 0 ? "Aucune" : m === 60 ? "1 h" : `${m} min`}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted">
            {coupure >= regles.pauseMinutes
              ? `Ton resto ferme ${formatHeures(coupure / 60)} entre midi et soir : la pause est déjà comprise.`
              : `Placée entre le midi et le soir, et retirée des heures comptées. La loi impose au moins 20 min dès 6 h de travail.`}
          </span>
        </fieldset>
      </Carte>

      {/* ── Barre du bas : bilan + enregistrer ── */}
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur-md">
        <p className="m-0 text-sm">
          Besoins : <b className="tabular-nums">{formatHeures(besoinHeures)}</b> par semaine · Contrats de l&apos;équipe : <b className="tabular-nums">{formatHeures(heuresContrats)}</b>
          {besoinHeures > 0 && (
            <span className={ecart < 0 ? "text-bad" : "text-muted"}>
              {" "}· {ecart < 0 ? `il manque ${formatHeures(-ecart)}` : `${formatHeures(ecart)} de marge`}
            </span>
          )}
        </p>
        {etat.erreur && <Message type="erreur">{etat.erreur}</Message>}
        {copie && <Message type="ok">{copie}</Message>}
        <div className="flex items-center gap-3">
          <Bouton type="button" onClick={enregistrer} disabled={enCours || !modifie} className="flex-1 sm:flex-none">
            {enCours ? "Enregistrement…" : modifie ? "Enregistrer" : "Enregistré ✓"}
          </Bouton>
          {modifie && !enCours && <span className="text-sm font-semibold text-cuisine">Modifications non enregistrées</span>}
        </div>
      </div>
    </div>
  );
}
