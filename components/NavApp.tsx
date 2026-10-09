"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const LIENS = [
  { href: "/app", label: "Accueil" },
  { href: "/app/planning", label: "Planning" },
  { href: "/app/demandes", label: "Demandes" },
  { href: "/app/historique", label: "Historique" },
  { href: "/app/equipe", label: "Équipe" },
  { href: "/app/besoins", label: "Besoins" },
  { href: "/app/restaurant", label: "Restaurant" },
  { href: "/app/abonnement", label: "Abonnement" },
];

// Vrai dans le navigateur, faux pendant le rendu serveur et la première hydratation
const rienAEcouter = () => () => {};
function useDansLeNavigateur() {
  return useSyncExternalStore(rienAEcouter, () => true, () => false);
}

/**
 * Onglets de l'espace patron. L'onglet de la page en cours est souligné.
 * L'onglet actif n'est calculé que dans le navigateur : après une redirection, l'adresse vue par
 * le serveur peut différer de celle du navigateur (sinon erreur d'hydratation React).
 */
export function NavApp({ demandesEnAttente = 0 }: { demandesEnAttente?: number }) {
  const navigateur = useDansLeNavigateur();
  const cheminActuel = usePathname();
  const chemin = navigateur ? cheminActuel : "";
  return (
    <nav aria-label="Espace patron" className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2">
      {LIENS.map((l) => {
        const actif = l.href === "/app" ? chemin === "/app" : chemin.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={actif ? "page" : undefined}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-[3px] px-3 pb-2 pt-1 text-sm font-bold no-underline ${actif ? "border-blue text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {l.label}
            {l.href === "/app/demandes" && demandesEnAttente > 0 && (
              <span className="rounded-full bg-bad px-1.5 text-xs leading-5 text-white" aria-label={`${demandesEnAttente} en attente`}>
                {demandesEnAttente}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
