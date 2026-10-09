"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** « Je ne peux pas venir » : petit formulaire qui s'ouvre sous le service. */
export function BoutonAbsence({ token, creneauId, libelle }: { token: string; creneauId: string; libelle: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string>();

  async function envoyer() {
    setEnvoi(true);
    setErreur(undefined);
    try {
      const rep = await fetch("/api/employe/absence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, creneauId, message }),
      });
      const json = await rep.json().catch(() => ({}));
      if (!rep.ok) throw new Error(json.erreur || "L'envoi a échoué.");
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'envoi a échoué.");
      setEnvoi(false);
    }
  }

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className="cursor-pointer self-start text-sm font-semibold text-bad underline-offset-4 hover:underline">
        Je ne peux pas venir
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-bg p-3">
      <span className="text-sm font-bold">Prévenir que tu ne peux pas venir {libelle} ?</span>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder="Un mot pour ton responsable (facultatif)"
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink"
      />
      {erreur && <p role="alert" className="m-0 rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">{erreur}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={envoyer} disabled={envoi} className="flex-1 cursor-pointer rounded-full bg-bad px-4 py-2.5 font-bold text-white disabled:opacity-60">
          {envoi ? "Envoi…" : "Envoyer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} disabled={envoi} className="cursor-pointer rounded-full border border-line px-4 py-2.5 font-bold">
          Annuler
        </button>
      </div>
    </div>
  );
}
