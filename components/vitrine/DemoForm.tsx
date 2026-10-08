"use client";

import { useRef, useState, type FormEvent } from "react";
import { TAILLES, verifierDemande } from "@/lib/demo";

type Etat = { type: "pret" } | { type: "envoi" } | { type: "erreur"; message: string } | { type: "envoye"; prenom: string };

export function DemoForm() {
  const [etat, setEtat] = useState<Etat>({ type: "pret" });
  const formRef = useRef<HTMLFormElement>(null);

  async function envoyer(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const donnees = Object.fromEntries(new FormData(ev.currentTarget));

    // Vérification immédiate dans le navigateur (la route serveur revérifie de toute façon)
    const verif = verifierDemande(donnees);
    if (!verif.ok) {
      setEtat({ type: "erreur", message: verif.erreur });
      const vide = (["prenom", "restaurant", "contact"] as const).find((c) => !String(donnees[c] ?? "").trim());
      if (vide) formRef.current?.querySelector<HTMLInputElement>(`[name="${vide}"]`)?.focus();
      return;
    }

    setEtat({ type: "envoi" });
    try {
      const rep = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees),
      });
      const json = await rep.json().catch(() => ({}));
      if (!rep.ok) throw new Error(json.erreur || "L'envoi a échoué.");
      setEtat({ type: "envoye", prenom: verif.demande.prenom });
    } catch (e) {
      setEtat({ type: "erreur", message: e instanceof Error ? e.message : "L'envoi a échoué. Réessaie dans un instant." });
    }
  }

  if (etat.type === "envoye") {
    return (
      <div className="demo" role="status" style={{ display: "grid", background: "var(--surface)", color: "var(--ink)", borderRadius: 22, padding: 24 }}>
        <div className="merci">
          <span className="pill ok" style={{ alignSelf: "flex-start" }}>Demande envoyée</span>
          <h3>Merci {etat.prenom}, c&apos;est noté !</h3>
          <p>On te recontacte sous 48 h pour préparer ta démo avec tes vrais horaires.</p>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} className="demo" onSubmit={envoyer} noValidate>
      <label>
        Ton prénom
        <input name="prenom" autoComplete="given-name" required maxLength={60} />
      </label>
      <label>
        Ton restaurant
        <input name="restaurant" required maxLength={100} />
      </label>
      <label>
        Ville
        <input name="ville" autoComplete="address-level2" maxLength={80} />
      </label>
      <label>
        Nombre de salariés
        <select name="taille" defaultValue="6 à 10">
          {TAILLES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <label className="full">
        Téléphone ou e-mail
        <input name="contact" autoComplete="email" required maxLength={120} />
      </label>
      {/* Champ piège invisible : les robots le remplissent, les humains non */}
      <label className="piege" aria-hidden="true">
        Site web
        <input name="site" tabIndex={-1} autoComplete="off" />
      </label>
      <button className="btn primary full" type="submit" disabled={etat.type === "envoi"}>
        {etat.type === "envoi" ? "Envoi…" : "Demander ma démo"}
      </button>
      {etat.type === "erreur" && (
        <p className="form-msg err" role="alert">{etat.message}</p>
      )}
    </form>
  );
}
