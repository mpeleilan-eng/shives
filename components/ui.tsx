import type { ComponentProps, ReactNode } from "react";

// Petits composants d'interface réutilisés dans l'espace patron (style du site vitrine).

const BASE_BOUTON =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-bold text-base cursor-pointer border-2 border-transparent disabled:opacity-60 disabled:cursor-wait no-underline";

export const styleBouton = {
  primaire: `${BASE_BOUTON} bg-blue text-on-blue hover:brightness-110`,
  secondaire: `${BASE_BOUTON} border-line! bg-surface text-ink hover:bg-bg`,
  soleil: `${BASE_BOUTON} bg-sun text-sun-ink hover:brightness-105`,
  lien: "font-semibold text-blue underline-offset-4 hover:underline cursor-pointer",
};

export function Bouton({ variante = "primaire", className = "", ...props }: ComponentProps<"button"> & { variante?: keyof typeof styleBouton }) {
  return <button className={`${styleBouton[variante]} ${className}`} {...props} />;
}

export const styleChamp =
  "w-full min-w-0 rounded-xl border border-line bg-bg px-3 py-2.5 text-ink text-base placeholder:text-muted/70";

export function Champ({ label, aide, children }: { label: string; aide?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-bold">
      {label}
      {children}
      {aide && <span className="text-xs font-medium text-muted">{aide}</span>}
    </label>
  );
}

export function Carte({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-[22px] border border-line bg-surface p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function Message({ type, children }: { type: "ok" | "erreur"; children: ReactNode }) {
  const style = type === "ok" ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad";
  return (
    <p role={type === "ok" ? "status" : "alert"} className={`m-0 rounded-xl px-3.5 py-3 text-[15px] ${style}`}>
      {children}
    </p>
  );
}
