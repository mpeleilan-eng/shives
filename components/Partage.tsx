"use client";

import { useState } from "react";
import { styleBouton } from "@/components/ui";
import { lienWhatsApp, messagePlanning } from "@/lib/partage";

export function BoutonCopier({ texte, label = "Copier le lien", className = "" }: { texte: string; label?: string; className?: string }) {
  const [copie, setCopie] = useState(false);
  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      window.prompt("Copie ce lien :", texte); // vieux navigateurs
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }
  return (
    <button type="button" onClick={copier} className={`${styleBouton.secondaire} px-3.5! py-2! text-sm! ${className}`}>
      {copie ? "Copié ✓" : label}
    </button>
  );
}

export function BoutonWhatsApp({ telephone, message, label = "WhatsApp", className = "" }: {
  telephone: string; message: string; label?: string; className?: string;
}) {
  return (
    <a
      href={lienWhatsApp(telephone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styleBouton.primaire} bg-[#1F7A4D]! text-white! px-3.5! py-2! text-sm! ${className}`}
    >
      {label}
    </a>
  );
}

export type LigneEnvoi = { id: string; nom: string; telephone: string; lien: string };

/** Liste « Prévenir l'équipe » : un bouton WhatsApp et un bouton copier par employé. */
export function PartageEquipe({ restaurant, lignes }: { restaurant: string; lignes: LigneEnvoi[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {lignes.map((l) => (
        <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5">
          <span className="font-bold">{l.nom}</span>
          <div className="flex gap-2">
            <BoutonCopier texte={l.lien} label="Copier" />
            <BoutonWhatsApp telephone={l.telephone} message={messagePlanning(l.nom, restaurant, l.lien)} />
          </div>
        </li>
      ))}
    </ul>
  );
}
