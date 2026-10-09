// OUTIL DE DÉVELOPPEMENT : fabrique un lien de connexion sans envoyer d'e-mail
// (utile quand la limite d'e-mails de Supabase est atteinte).
// Utilise la clé secrète de .env.local : ne marche que sur ton PC, jamais en ligne.
//
// Usage : npm run lien -- ton@email.fr                              (site local)
//         npm run lien -- ton@email.fr https://shives.vercel.app    (site en ligne, pour TON compte)

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const siteDemande = process.argv[3];
if (!email) {
  console.error("Indique l'e-mail : npm run lien -- ton@email.fr");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
const site = (siteDemande || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
if (!url || !cle) {
  console.error("Variables Supabase manquantes dans .env.local");
  process.exit(1);
}
if (!/^(http:\/\/(localhost|127\.0\.0\.1)(:\d+)?|https:\/\/[a-z0-9-]+\.vercel\.app)$/.test(site)) {
  console.error("Adresse refusée : http://localhost… ou https://….vercel.app uniquement.");
  process.exit(1);
}

const supabase = createClient(url, cle, { auth: { persistSession: false } });
const { data, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error("Impossible de créer le lien :", error.message);
  process.exit(1);
}

const lien = `${site}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=/app`;
console.log("\nOuvre ce lien dans ton navigateur (valable une fois, quelques minutes) :\n");
console.log(lien + "\n");
