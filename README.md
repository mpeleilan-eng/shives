# Shives.

**Le planning des petits restaurants indépendants, fait en un clic.**

Shives crée le planning de la semaine d'une crêperie, d'un bistrot ou d'une pizzeria (1 à 15 salariés) en respectant les contrats, les repos et les besoins de chaque service. Chaque employé reçoit un lien personnel pour voir son planning sur son téléphone, sans appli ni compte.

---

## Ce que fait Shives

| Pour le patron | Pour l'employé |
| --- | --- |
| Créer son restaurant (horaires midi/soir, jours d'ouverture) | Ouvrir son lien personnel, sans compte |
| Ajouter son équipe (poste, heures au contrat, indisponibilités) | Voir sa semaine jour par jour, ses heures |
| Régler les besoins par service et les règles (jours max, repos, pause…) | « Je ne peux pas venir » en un clic |
| **Générer la semaine**, demander une autre proposition | Savoir si l'absence est acceptée et qui le remplace |
| Ajuster à la main en touchant une case, alertes en direct | |
| Publier et envoyer les liens par WhatsApp | |
| Valider une absence avec le remplaçant conseillé | |
| Revoir et dupliquer les semaines passées | |
| S'abonner (Solo 19 €, Équipe 39 €, 1er mois offert) | |

## Technologies

- **Next.js 16** (App Router, TypeScript) et **Tailwind CSS 4**
- **Supabase** : base de données Postgres, connexion par lien magique, sécurité RLS
- **Stripe** : abonnements (Checkout, portail client, webhook)
- **Vercel** : hébergement, relié à GitHub
- **Vitest** : tests automatiques

## Organisation du code

```
app/
  page.tsx                  Site vitrine (page d'accueil) + formulaire de démo
  api/demo/                 Enregistre une demande de démo
  connexion/                Connexion par lien magique
  auth/confirm/             Arrivée depuis le lien de l'e-mail
  app/                      Espace patron (protégé)
    planning/[date]/        Génération, ajustement, publication d'une semaine
    demandes/               Absences et remplacements
    equipe/  besoins/  restaurant/  historique/  abonnement/
  e/[token]/                Page de l'employé (lien personnel)
  api/employe/absence/      « Je ne peux pas venir » (vérifie le lien)
  api/stripe/webhook/       Stripe → activation de l'abonnement
lib/
  planning-engine.ts        Moteur de planning (fonction pure generatePlanning)
  planning.ts               Autour du moteur : pause, effectifs, alertes, remplaçants
  supabase/                 Clients navigateur / serveur / admin (serveur uniquement)
supabase/migrations/        Fichiers SQL de la base, à lancer dans l'ordre
tests/                      Tests Vitest
proxy.ts                    Protège /app et rafraîchit la session
```

## Sécurité

- **RLS partout** : un patron ne voit que les données de ses restaurants.
- Le patron ne peut pas modifier lui-même son abonnement ni le lien secret d'un employé.
- La clé `service_role` (Supabase) n'est utilisée **que côté serveur**, jamais dans le navigateur.
- La page employé vérifie le lien personnel côté serveur et ne montre que **ses** créneaux des semaines **publiées**. Un lien peut être renouvelé si besoin.
- Le webhook Stripe vérifie la signature de chaque message.

---

## Installer Shives sur son ordinateur

### 1. Prérequis
- [Node.js](https://nodejs.org) version 22 ou plus
- Un projet [Supabase](https://supabase.com) (gratuit)
- Un compte [Stripe](https://stripe.com) en mode test (pour l'abonnement)

> Sous Windows, si PowerShell bloque `npm`, utilise `npm.cmd` à la place.

### 2. Récupérer le code et installer
```bash
git clone https://github.com/mpeleilan-eng/shives.git
cd shives
npm install
```

### 3. Préparer la base Supabase
Dans Supabase, **SQL Editor**, lance **dans l'ordre** les fichiers de `supabase/migrations/` :
1. `20261009000001_demandes_demo.sql`
2. `20261009000002_planning.sql`
3. `20261009000003_demandes_details.sql`

Puis dans **Authentication → URL Configuration** :
- Site URL : `http://localhost:3000`
- Redirect URLs : `http://localhost:3000/**`

### 4. Les variables d'environnement
Copie `.env.example` en `.env.local` et remplis les valeurs :

| Variable | Où la trouver |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → clé publique (anon / publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → clé secrète (service_role / secret) — **jamais côté navigateur** |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en local, l'adresse Vercel en ligne |
| `STRIPE_SECRET_KEY` | Stripe → Développeurs → Clés API (`sk_test_…`) |
| `STRIPE_PRICE_SOLO` / `STRIPE_PRICE_EQUIPE` | Stripe → Catalogue de produits → identifiant du prix (`price_…`) |
| `STRIPE_WEBHOOK_SECRET` | En local : affiché par `stripe listen` ; en ligne : Stripe → Webhooks (`whsec_…`) |

`.env.local` ne doit **jamais** être envoyé sur GitHub (il est déjà ignoré).

### 5. Lancer
```bash
npm run dev
```
Puis ouvre http://localhost:3000

Pour tester l'abonnement en local, laisse tourner dans un autre terminal :
```bash
stripe listen --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted --forward-to localhost:3000/api/stripe/webhook
```
Carte de test : `4242 4242 4242 4242`, une date future, n'importe quel CVC.

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Lance le site en local |
| `npm test` | Lance les tests (moteur, alertes, validations…) |
| `npm run lint` | Vérifie la qualité du code |
| `npm run build` | Vérifie que tout compile, comme sur Vercel |
| `npm run lien -- ton@email.fr` | **Local uniquement** : lien de connexion sans e-mail (si la limite d'e-mails de Supabase est atteinte) |

## Mettre en ligne (Vercel)

1. Sur [vercel.com](https://vercel.com), **Add New → Project**, importe le repo GitHub `shives`.
2. Dans **Environment Variables**, ajoute les mêmes variables que `.env.local`, avec :
   - `NEXT_PUBLIC_SITE_URL` = l'adresse Vercel (ex. `https://shives.vercel.app`)
   - `STRIPE_WEBHOOK_SECRET` = le secret du webhook créé dans Stripe pour l'adresse Vercel
3. **Deploy**. Ensuite, chaque `git push` sur `main` met le site à jour tout seul.
4. Dans Supabase (URL Configuration) : Site URL = l'adresse Vercel, et ajoute `https://ton-adresse.vercel.app/**` aux Redirect URLs.
5. Dans Stripe → Webhooks : ajoute l'endpoint `https://ton-adresse.vercel.app/api/stripe/webhook` avec les 4 événements ci-dessus.

## Avant d'accueillir de vrais clients

- [ ] Brancher un service d'e-mails (ex. Resend) dans Supabase → Authentication → SMTP : l'envoi gratuit de Supabase est limité à quelques e-mails par heure.
- [ ] Puis personnaliser le modèle d'e-mail « Magic Link » (lien qui marche sur tous les téléphones, avec `token_hash`).
- [ ] Activer le compte Stripe et passer aux clés **live** (nouvelles variables + nouveau webhook).
- [ ] Mentions légales, CGV et politique de confidentialité (RGPD : numéros de téléphone des employés).
- [ ] Nom de domaine (ex. `shives.fr`) dans Vercel.

## Hors V1 (idées pour la suite)
Envoi de SMS, export pour la paie, prévision d'affluence selon la météo, plusieurs restaurants par compte.
