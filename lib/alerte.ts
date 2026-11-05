import "server-only";
import type { DemandeDemo } from "@/lib/demo";

/**
 * E-mail d'alerte au créateur de Shives (via l'API Brevo) pour chaque demande de démo ou d'accès.
 * Variables : BREVO_API_KEY, ALERTE_EMAIL (qui reçoit), ALERTE_EXPEDITEUR (adresse validée dans Brevo).
 * Si elles manquent, on n'envoie rien (la demande reste enregistrée dans Supabase).
 */
export async function alerterNouvelleDemande(demande: DemandeDemo, origine: "démo" | "accès bêta") {
  const cle = process.env.BREVO_API_KEY;
  const destinataire = process.env.ALERTE_EMAIL;
  const expediteur = process.env.ALERTE_EXPEDITEUR;
  if (!cle || !destinataire || !expediteur) {
    console.warn("Alerte e-mail non configurée (BREVO_API_KEY / ALERTE_EMAIL / ALERTE_EXPEDITEUR)");
    return;
  }

  const contact = demande.contact;
  const estEmail = contact.includes("@");
  const lienContact = estEmail ? `mailto:${contact}` : `tel:${contact.replace(/[^\d+]/g, "")}`;
  const lignes: [string, string][] = [
    ["Prénom", demande.prenom],
    ["Restaurant", demande.restaurant],
    ["Ville", demande.ville || "—"],
    ["Salariés", demande.taille],
    ["Contact", contact],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:16px;color:#141A26">
      <h2 style="margin:0 0 12px">Nouvelle demande ${origine === "démo" ? "de démo" : "d'accès gratuit"} 🎉</h2>
      <table style="border-collapse:collapse">
        ${lignes.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5B6676">${k}</td><td style="padding:4px 0"><b>${echapper(v)}</b></td></tr>`).join("")}
      </table>
      <p style="margin:20px 0"><a href="${echapper(lienContact)}" style="background:#1F4FC9;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">${estEmail ? "Répondre par e-mail" : "Appeler maintenant"}</a></p>
      <p style="color:#5B6676;font-size:13px">Conseil : rappelle dans l'heure, c'est là que ça marche le mieux.</p>
    </div>`;

  try {
    const rep = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": cle, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "Shives", email: expediteur },
        to: [{ email: destinataire }],
        ...(estEmail ? { replyTo: { email: contact, name: demande.prenom } } : {}),
        subject: `Shives · ${origine === "démo" ? "Demande de démo" : "Demande d'accès"} : ${demande.restaurant} (${demande.ville || "ville ?"})`,
        htmlContent: html,
      }),
    });
    if (!rep.ok) console.error("Alerte Brevo refusée :", rep.status, await rep.text());
  } catch (e) {
    console.error("Alerte Brevo :", e instanceof Error ? e.message : e);
  }
}

function echapper(texte: string) {
  return texte.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
