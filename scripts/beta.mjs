// Bêta « restos fondateurs » : activer ou retirer l'accès gratuit d'un resto.
// Utilise la clé secrète de .env.local : à lancer uniquement sur ton PC.
//
//   npm run beta                         → liste des restos et de leur accès
//   npm run beta -- patron@resto.fr      → active l'accès gratuit (bêta) pour ce patron
//   npm run beta -- patron@resto.fr non  → retire l'accès gratuit (retour à « essai »)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !cle) {
  console.error("Variables Supabase manquantes dans .env.local");
  process.exit(1);
}
const supabase = createClient(url, cle, { auth: { persistSession: false } });

// Tous les comptes patrons (id → e-mail)
const emails = new Map();
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error("Lecture des comptes impossible :", error.message); process.exit(1); }
  data.users.forEach((u) => emails.set(u.id, u.email));
  if (data.users.length < 1000) break;
}

const { data: restos, error } = await supabase.from("restaurants").select("id, nom, owner_id, abonnement, created_at").order("created_at");
if (error) { console.error("Lecture des restaurants impossible :", error.message); process.exit(1); }

const NOMS = { essai: "sans accès", beta: "FONDATEUR (gratuit)", solo: "Solo (payant)", equipe: "Équipe (payant)", inactif: "arrêté" };
const email = (process.argv[2] || "").trim().toLowerCase();

if (!email) {
  console.log(`\n${restos.length} restaurant(s) :\n`);
  for (const r of restos) console.log(`  • ${r.nom.padEnd(28)} ${String(emails.get(r.owner_id) ?? "?").padEnd(32)} ${NOMS[r.abonnement] ?? r.abonnement}`);
  console.log(`\nFondateurs : ${restos.filter((r) => r.abonnement === "beta").length}\n`);
  process.exit(0);
}

const ownerId = [...emails].find(([, e]) => e?.toLowerCase() === email)?.[0];
if (!ownerId) { console.error(`Aucun compte avec l'adresse ${email}. Le patron doit d'abord se connecter une fois sur Shives.`); process.exit(1); }
const sesRestos = restos.filter((r) => r.owner_id === ownerId);
if (!sesRestos.length) { console.error(`${email} n'a pas encore créé son restaurant.`); process.exit(1); }

const retirer = ["non", "retirer", "stop"].includes((process.argv[3] || "").toLowerCase());
const valeur = retirer ? "essai" : "beta";
for (const r of sesRestos) {
  if (!retirer && (r.abonnement === "solo" || r.abonnement === "equipe")) {
    console.log(`  • ${r.nom} : déjà abonné (${NOMS[r.abonnement]}), rien à changer.`);
    continue;
  }
  const { error: e } = await supabase.from("restaurants").update({ abonnement: valeur }).eq("id", r.id);
  if (e) { console.error(`  • ${r.nom} : erreur ${e.message}`); continue; }
  console.log(`  ✓ ${r.nom} : ${retirer ? "accès gratuit retiré" : "accès gratuit activé (resto fondateur)"}`);
}
