import type { Alerte } from "@/lib/planning";

const STYLE: Record<Alerte["niveau"], { classe: string; icone: string }> = {
  manque: { classe: "bg-bad-bg text-bad", icone: "!" },
  regle: { classe: "bg-cuisine-bg text-cuisine", icone: "⚠" },
  info: { classe: "bg-surface text-muted border border-line", icone: "i" },
};

export function ListeAlertes({ alertes }: { alertes: Alerte[] }) {
  if (!alertes.length) {
    return <p className="m-0 rounded-xl bg-ok-bg px-3.5 py-3 font-semibold text-ok">Tout est bon : effectifs complets, règles et contrats respectés.</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label="Alertes">
      {alertes.map((a, i) => (
        <li key={i} className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-[15px] ${STYLE[a.niveau].classe}`}>
          <span aria-hidden="true" className="w-4 shrink-0 text-center font-display font-extrabold">{STYLE[a.niveau].icone}</span>
          <span>{a.texte}</span>
        </li>
      ))}
    </ul>
  );
}
