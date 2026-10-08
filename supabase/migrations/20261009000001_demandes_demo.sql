-- Étape 2 : demandes de démo envoyées depuis la page d'accueil.
-- Fermée au public : RLS activée SANS aucune règle, donc ni lecture ni écriture
-- avec la clé publique. Seule la route serveur /api/demo (clé service_role) y écrit.

create table if not exists public.demandes_demo (
  id          uuid primary key default gen_random_uuid(),
  prenom      text not null check (char_length(prenom) between 1 and 60),
  restaurant  text not null check (char_length(restaurant) between 1 and 100),
  ville       text not null default '' check (char_length(ville) <= 80),
  taille      text not null check (taille in ('1 à 5', '6 à 10', '11 à 15', 'Plus de 15')),
  contact     text not null check (char_length(contact) between 1 and 120),
  created_at  timestamptz not null default now()
);

alter table public.demandes_demo enable row level security;

-- Ceinture et bretelles : on retire aussi les droits par défaut des rôles publics.
revoke all on public.demandes_demo from anon, authenticated;
