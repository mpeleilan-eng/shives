-- Étape 9 : on garde dans la demande le jour, le service et le poste concernés,
-- pour que l'historique reste lisible même quand le créneau est retiré ou donné à un remplaçant.

alter table public.demandes
  add column jour    smallint check (jour between 0 and 6),
  add column service text check (service in ('midi', 'soir')),
  add column poste   text check (poste in ('cuisine', 'salle', 'plonge'));

-- Une seule demande en attente par créneau
create unique index demandes_une_en_attente_par_creneau
  on public.demandes (creneau_id) where statut = 'en_attente';

create index on public.demandes (statut);
