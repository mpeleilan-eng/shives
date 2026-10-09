"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { GrillePlanning } from "@/components/planning/GrillePlanning";
import { ListeAlertes } from "@/components/planning/ListeAlertes";
import { COULEUR_POSTE } from "@/components/Poste";
import { Bouton, Message } from "@/components/ui";
import { formatHeures } from "@/lib/employe";
import { numeroDuJour } from "@/lib/dates";
import {
  calculerEtat, creneauxJournee, remplacerJournee,
  type BesoinJour, type ChoixJournee, type Creneau,
} from "@/lib/planning";
import { JOURS, NOM_POSTE, NOM_SERVICE, POSTES, SERVICES, type Employe, type Poste, type Regles, type ServiceKey, type Services } from "@/lib/types";
import { modifierJournee } from "@/app/app/planning/actions";

type Props = {
  dateLundi: string;
  employes: Employe[];
  creneauxInitiaux: Creneau[];
  besoins: BesoinJour[];
  regles: Regles;
  services: Services;
};

export function EditeurPlanning({ dateLundi, employes, creneauxInitiaux, besoins, regles, services }: Props) {
  const [creneaux, setCreneaux] = useState(creneauxInitiaux);
  const [selection, setSelection] = useState<{ employeId: string; jour: number } | null>(null);
  const [erreur, setErreur] = useState<string>();
  const [enCours, startTransition] = useTransition();

  // Recalcul en direct à chaque modification
  const etat = useMemo(() => calculerEtat(creneaux, besoins, employes, regles), [creneaux, besoins, employes, regles]);
  const nbManques = etat.alertes.filter((a) => a.niveau === "manque").length;

  function changerJournee(employeId: string, jour: number, choix: ChoixJournee) {
    const avant = creneaux;
    setCreneaux(remplacerJournee(creneaux, employeId, jour, creneauxJournee(employeId, jour, choix, services, regles.pauseMinutes)));
    setErreur(undefined);
    startTransition(async () => {
      const r = await modifierJournee(dateLundi, employeId, jour, choix);
      if (r.erreur) {
        setCreneaux(avant); // on annule l'affichage si l'enregistrement a échoué
        setErreur(r.erreur);
      }
    });
  }

  const employe = selection && employes.find((e) => e.id === selection.employeId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${nbManques ? "bg-bad-bg text-bad" : "bg-ok-bg text-ok"}`}>
          {nbManques ? `${nbManques} ${nbManques > 1 ? "manques" : "manque"}` : "Effectifs complets"}
        </span>
        <span className="text-sm text-muted">{enCours ? "Enregistrement…" : "Touche une case pour la modifier."}</span>
      </div>
      {erreur && <Message type="erreur">{erreur}</Message>}

      <GrillePlanning
        dateLundi={dateLundi}
        employes={employes}
        creneaux={creneaux}
        etat={etat}
        services={services}
        selection={selection}
        onCellule={(employeId, jour) => setSelection({ employeId, jour })}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Alertes</h2>
        <ListeAlertes alertes={etat.alertes} />
      </section>

      {employe && selection && (
        <PanneauCase
          employe={employe}
          jour={selection.jour}
          dateLundi={dateLundi}
          creneaux={creneaux}
          etat={etat}
          services={services}
          onChanger={(choix) => changerJournee(employe.id, selection.jour, choix)}
          onFermer={() => setSelection(null)}
        />
      )}
    </div>
  );
}

// ───────────────────── Panneau d'une case (bas de l'écran) ─────────────────────

function PanneauCase({ employe, jour, dateLundi, creneaux, etat, services, onChanger, onFermer }: {
  employe: Employe;
  jour: number;
  dateLundi: string;
  creneaux: Creneau[];
  etat: ReturnType<typeof calculerEtat>;
  services: Services;
  onChanger: (choix: ChoixJournee) => void;
  onFermer: () => void;
}) {
  // Échap ferme le panneau
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const siens = creneaux.filter((c) => c.employe_id === employe.id && c.jour === jour);
  const choixActuel: ChoixJournee = siens.map((c) => ({ service: c.service, poste: c.poste }));
  const minutes = etat.minutesParEmploye[employe.id] ?? 0;
  const alertesPerso = etat.alertes.filter((a) => a.niveau !== "manque" && a.texte.startsWith(employe.nom));

  /** Poste proposé par défaut : le sien, ou pour un polyvalent le poste où il manque le plus de monde. */
  function posteParDefaut(s: ServiceKey): Poste {
    if (employe.poste !== "polyvalent") return employe.poste;
    const eff = etat.effectifs[jour][s].parPoste;
    return [...POSTES].sort((a, b) => (eff[b].besoin - eff[b].present) - (eff[a].besoin - eff[a].present))[0];
  }
  function basculer(s: ServiceKey) {
    const place = choixActuel.some((c) => c.service === s);
    onChanger(place ? choixActuel.filter((c) => c.service !== s) : [...choixActuel, { service: s, poste: posteParDefaut(s) }]);
  }
  function changerPoste(s: ServiceKey, p: Poste) {
    onChanger(choixActuel.map((c) => (c.service === s ? { ...c, poste: p } : c)));
  }

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/30" onClick={onFermer} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${employe.nom}, ${JOURS[jour]}`}
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-h-[85dvh] max-w-xl flex-col gap-4 overflow-y-auto rounded-t-[22px] border border-line bg-surface p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-card sm:bottom-4 sm:rounded-[22px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold">{employe.nom}</h2>
            <p className="m-0 text-sm text-muted">
              {JOURS[jour]} {numeroDuJour(dateLundi, jour)} · {formatHeures(minutes / 60)} sur {formatHeures(Number(employe.contrat_heures))} cette semaine
            </p>
          </div>
          <button type="button" onClick={onFermer} className="cursor-pointer rounded-full px-2 text-2xl leading-none text-muted hover:text-ink" aria-label="Fermer">×</button>
        </div>

        {employe.indispos.includes(jour) && (
          <Message type="erreur">{employe.nom} a indiqué ne jamais pouvoir travailler le {JOURS[jour].toLowerCase()}.</Message>
        )}

        {SERVICES.map((s) => {
          const eff = etat.effectifs[jour][s];
          const choix = choixActuel.find((c) => c.service === s);
          const creneau = siens.find((c) => c.service === s);
          const manques = POSTES.filter((p) => eff.parPoste[p].present < eff.parPoste[p].besoin);
          return (
            <div key={s} className="flex flex-col gap-2 rounded-2xl border border-line p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold">{NOM_SERVICE[s]}</span>{" "}
                  <span className="text-sm text-muted tabular-nums">
                    {creneau ? `${creneau.debut} – ${creneau.fin}` : `${services[s].start} – ${services[s].end}`}
                  </span>
                  {eff.ouvert && (
                    <span className={`block text-xs font-semibold ${eff.present < eff.besoin ? "text-bad" : "text-ok"}`}>
                      {eff.present}/{eff.besoin} présents
                      {manques.length > 0 && ` · manque ${manques.map((p) => NOM_POSTE[p].toLowerCase()).join(", ")}`}
                    </span>
                  )}
                </div>
                {eff.ouvert || choix ? (
                  <Bouton variante={choix ? "secondaire" : "primaire"} onClick={() => basculer(s)} className="shrink-0 px-4! py-2! text-sm!">
                    {choix ? "Retirer" : "Placer"}
                  </Bouton>
                ) : (
                  <span className="text-sm font-semibold text-muted">Fermé</span>
                )}
              </div>
              {choix && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Poste">
                  {(employe.poste === "polyvalent" ? POSTES : [choix.poste]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={choix.poste === p}
                      onClick={() => changerPoste(s, p)}
                      disabled={employe.poste !== "polyvalent"}
                      className={`rounded-full border-2 px-3 py-1 text-xs font-bold enabled:cursor-pointer ${COULEUR_POSTE[p]} ${choix.poste === p ? "border-current" : "border-transparent opacity-50"}`}
                    >
                      {NOM_POSTE[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {alertesPerso.length > 0 && <ListeAlertes alertes={alertesPerso} />}

        <Bouton onClick={onFermer} className="w-full">Terminé</Bouton>
      </div>
    </>
  );
}
