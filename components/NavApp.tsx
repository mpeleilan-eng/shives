"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/app", label: "Accueil" },
  { href: "/app/equipe", label: "Équipe" },
  { href: "/app/besoins", label: "Besoins" },
  { href: "/app/restaurant", label: "Restaurant" },
];

/** Onglets de l'espace patron. L'onglet de la page en cours est souligné. */
export function NavApp() {
  const chemin = usePathname();
  return (
    <nav aria-label="Espace patron" className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2">
      {LIENS.map((l) => {
        const actif = l.href === "/app" ? chemin === "/app" : chemin.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={actif ? "page" : undefined}
            className={`whitespace-nowrap border-b-[3px] px-3 pb-2 pt-1 text-sm font-bold no-underline ${actif ? "border-blue text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
