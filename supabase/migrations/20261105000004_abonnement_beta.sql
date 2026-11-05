-- Lancement : statut « beta » = resto fondateur, accès gratuit activé à la main par le créateur de Shives.
-- (Le patron ne peut toujours pas modifier son abonnement lui-même : droits SQL de l'étape 3.)

alter table public.restaurants drop constraint if exists restaurants_abonnement_check;
alter table public.restaurants
  add constraint restaurants_abonnement_check
  check (abonnement in ('essai', 'beta', 'solo', 'equipe', 'inactif'));
