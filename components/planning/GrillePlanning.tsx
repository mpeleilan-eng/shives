import { COULEUR_POSTE, PastillePoste } from "@/components/Poste";
import { formatHeures } from "@/lib/employe";
import { JOURS_COURTS, NOM_SERVICE, SERVICES, type Employe, type Services } from "@/lib/types";
import { numeroDuJour } from "@/lib/dates";
import type { Creneau, EtatPlanning } from "@/lib/planning";

type Props = {
  dateLundi: string;
  employes: Employe[];
  creneaux: Creneau[];
  etat: EtatPlanning;
  services: Services;
  /** Si fourni, chaque case devient un bouton (ajustement à la main). */
  onCellule?: (employeId: string, jour: number) => void;
  selection?: { employeId: string; jour: number } | null;
};

/** Tableau employés × jours, avec les effectifs de chaque service en haut. */
export function GrillePlanning({ dateLundi, employes, creneaux, etat, services, onCellule, selection }: Props) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[640px] border-separate border-spacing-1 tabular-nums">
        <thead>
          <tr>
            <th className="sticky left-0 z-[1] bg-bg" />
            {JOURS_COURTS.map((j, i) => (
              <th key={j} className="px-1 text-center text-xs font-bold text-muted">
                {j} <span className="font-semibold">{numeroDuJour(dateLundi, i)}</span>
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 z-[1] bg-bg pr-1 text-left text-[11px] font-semibold text-muted">Effectifs</th>
            {etat.effectifs.map((jour, i) => {
              const ferme = !jour.midi.ouvert && !jour.soir.ouvert;
              return (
                <td key={i} className="align-top">
                  {ferme ? (
                    <span className="block rounded-md bg-surface py-1 text-center text-[11px] font-semibold text-muted">Fermé</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {SERVICES.filter((s) => jour[s].ouvert).map((s) => {
                        const incomplet = jour[s].present < jour[s].besoin;
                        return (
                          <span
                            key={s}
                            title={`${NOM_SERVICE[s]} : ${jour[s].present} présents pour ${jour[s].besoin} demandés`}
                            className={`block rounded-md px-1 py-0.5 text-center text-[11px] font-bold ${incomplet ? "bg-bad-bg text-bad" : "bg-ok-bg text-ok"}`}
                          >
                            {NOM_SERVICE[s]} {jour[s].present}/{jour[s].besoin}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {employes.map((e) => {
            const minutes = etat.minutesParEmploye[e.id] ?? 0;
            const contrat = Number(e.contrat_heures) * 60;
            const couleurHeures = contrat - minutes >= 30 ? "text-bad" : minutes - contrat >= 30 ? "text-cuisine" : "text-ok";
            return (
              <tr key={e.id}>
                <th className="sticky left-0 z-[1] min-w-24 max-w-32 bg-bg pr-1 text-left align-middle">
                  <span className="block truncate text-sm font-bold">{e.nom}</span>
                  <span className={`block text-[11px] font-bold ${couleurHeures}`}>
                    {formatHeures(minutes / 60)} / {formatHeures(contrat / 60)}
                  </span>
                </th>
                {JOURS_COURTS.map((_, j) => {
                  const siens = creneaux
                    .filter((c) => c.employe_id === e.id && c.jour === j)
                    .sort((a, b) => a.debut.localeCompare(b.debut));
                  const indispo = e.indispos.includes(j);
                  const contenu = siens.length ? (
                        <div className="flex flex-col gap-0.5">
                          {siens.map((c) => {
                            const decale = c.debut !== services[c.service].start || c.fin !== services[c.service].end;
                            return (
                              <span
                                key={c.service}
                                title={`${NOM_SERVICE[c.service]} ${c.debut}–${c.fin} · ${c.poste}`}
                                className={`block rounded-md py-0.5 text-center text-[11px] font-bold leading-tight ${COULEUR_POSTE[c.poste]}`}
                              >
                                {NOM_SERVICE[c.service]}
                                {decale && <span className="block text-[10px] font-semibold opacity-80">{c.debut.replace(":", "h")}</span>}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span
                          className={`block h-6 rounded-md border-2 border-dashed border-line ${indispo ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,var(--line)_4px,var(--line)_6px)]" : ""}`}
                          title={indispo ? "Indisponible" : "Repos"}
                        />
                      );
                  const choisie = selection?.employeId === e.id && selection.jour === j;
                  return (
                    <td key={j} className="align-middle">
                      {onCellule ? (
                        <button
                          type="button"
                          onClick={() => onCellule(e.id, j)}
                          aria-label={`${e.nom}, ${JOURS_COURTS[j]} : modifier`}
                          className={`block w-full cursor-pointer rounded-lg p-0.5 ${choisie ? "outline-3 outline-blue" : "hover:outline-2 hover:outline-line"}`}
                        >
                          {contenu}
                        </button>
                      ) : contenu}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <PastillePoste poste="cuisine" /> <PastillePoste poste="salle" /> <PastillePoste poste="plonge" />
        <span>· heure sous « Soir » = arrivée après la pause · hachuré = indisponible</span>
      </div>
    </div>
  );
}
