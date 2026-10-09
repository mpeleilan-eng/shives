-- Étape 3 : toutes les tables du planning + sécurité RLS.
-- Principe : un patron (utilisateur connecté) ne voit et ne modifie QUE les données de ses restaurants.
-- Les employés n'ont pas de compte : leur page passe par une route serveur qui vérifie token_acces.

-- ─────────────────────────────── Tables ───────────────────────────────

create table public.restaurants (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nom                 text not null check (char_length(nom) between 1 and 100),
  -- horaires des services, ex. {"midi":{"start":"11:00","end":"15:00"},"soir":{"start":"18:30","end":"23:00"}}
  services            jsonb not null default '{"midi":{"start":"11:00","end":"15:00"},"soir":{"start":"18:30","end":"23:00"}}',
  -- règles du moteur de planning
  regles              jsonb not null default '{"maxJours":5,"maxHeuresJour":11,"reposMin":11,"completerContrats":true}',
  abonnement          text not null default 'essai' check (abonnement in ('essai', 'solo', 'equipe', 'inactif')),
  stripe_customer_id  text unique,
  created_at          timestamptz not null default now()
);
create index on public.restaurants (owner_id);

create table public.besoins (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  jour           smallint not null check (jour between 0 and 6),          -- 0 = lundi … 6 = dimanche
  service        text not null check (service in ('midi', 'soir')),
  cuisine        int not null default 0 check (cuisine between 0 and 30),
  salle          int not null default 0 check (salle between 0 and 30),
  plonge         int not null default 0 check (plonge between 0 and 30),
  ouvert         boolean not null default true,
  unique (restaurant_id, jour, service)
);

create table public.employes (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  nom            text not null check (char_length(nom) between 1 and 60),
  poste          text not null check (poste in ('cuisine', 'salle', 'plonge', 'polyvalent')),
  contrat_heures numeric(4, 1) not null default 35 check (contrat_heures between 0 and 60),
  telephone      text not null default '' check (char_length(telephone) <= 30),
  indispos       int[] not null default '{}' check (indispos <@ array[0, 1, 2, 3, 4, 5, 6]),
  token_acces    uuid not null unique default gen_random_uuid(),
  actif          boolean not null default true,
  created_at     timestamptz not null default now()
);
create index on public.employes (restaurant_id);

create table public.semaines (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  date_lundi     date not null check (extract(isodow from date_lundi) = 1),
  seed           int not null default 1,
  statut         text not null default 'brouillon' check (statut in ('brouillon', 'publiee')),
  created_at     timestamptz not null default now(),
  unique (restaurant_id, date_lundi)
);

create table public.creneaux (
  id          uuid primary key default gen_random_uuid(),
  semaine_id  uuid not null references public.semaines (id) on delete cascade,
  employe_id  uuid not null references public.employes (id) on delete cascade,
  jour        smallint not null check (jour between 0 and 6),
  service     text not null check (service in ('midi', 'soir')),
  poste       text not null check (poste in ('cuisine', 'salle', 'plonge')),
  debut       time not null,
  fin         time not null,
  check (fin > debut),
  unique (semaine_id, employe_id, jour, service)
);
create index on public.creneaux (semaine_id);
create index on public.creneaux (employe_id);

create table public.demandes (
  id             uuid primary key default gen_random_uuid(),
  semaine_id     uuid not null references public.semaines (id) on delete cascade,
  employe_id     uuid not null references public.employes (id) on delete cascade,
  creneau_id     uuid references public.creneaux (id) on delete set null,
  type           text not null default 'absence' check (type in ('absence', 'echange')),
  message        text not null default '' check (char_length(message) <= 300),
  statut         text not null default 'en_attente' check (statut in ('en_attente', 'acceptee', 'refusee')),
  remplacant_id  uuid references public.employes (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index on public.demandes (semaine_id);
create index on public.demandes (employe_id);

-- ─────────────────────── Fonctions d'aide pour la RLS ───────────────────────
-- "security definer" : elles lisent les tables sans repasser par la RLS (évite les boucles),
-- mais ne renvoient que vrai/faux pour l'utilisateur connecté.

create function public.est_mon_restaurant(rid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.restaurants r where r.id = rid and r.owner_id = auth.uid());
$$;

create function public.est_ma_semaine(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.semaines s join public.restaurants r on r.id = s.restaurant_id
    where s.id = sid and r.owner_id = auth.uid()
  );
$$;

-- L'employé appartient au même restaurant que la semaine (empêche de mélanger deux restaurants)
create function public.employe_de_la_semaine(eid uuid, sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.employes e join public.semaines s on s.restaurant_id = e.restaurant_id
    where e.id = eid and s.id = sid
  );
$$;

revoke all on function public.est_mon_restaurant(uuid), public.est_ma_semaine(uuid), public.employe_de_la_semaine(uuid, uuid) from public, anon;
grant execute on function public.est_mon_restaurant(uuid), public.est_ma_semaine(uuid), public.employe_de_la_semaine(uuid, uuid) to authenticated;

-- ─────────────────────────────── Droits ───────────────────────────────
-- Personne d'anonyme n'accède à ces tables (la page employé passe par le serveur).
revoke all on public.restaurants, public.besoins, public.employes, public.semaines, public.creneaux, public.demandes from anon;

-- Le patron ne peut PAS modifier son abonnement ni son id Stripe lui-même (seul le webhook Stripe, côté serveur, le fait).
revoke insert, update on public.restaurants from authenticated;
grant insert (nom, services, regles) on public.restaurants to authenticated;
grant update (nom, services, regles) on public.restaurants to authenticated;

-- token_acces est généré par la base ; le patron peut le lire (pour partager le lien) mais pas le choisir.
revoke insert, update on public.employes from authenticated;
grant insert (restaurant_id, nom, poste, contrat_heures, telephone, indispos, actif) on public.employes to authenticated;
grant update (nom, poste, contrat_heures, telephone, indispos, actif) on public.employes to authenticated;

-- ─────────────────────────────── RLS ───────────────────────────────
alter table public.restaurants enable row level security;
alter table public.besoins     enable row level security;
alter table public.employes    enable row level security;
alter table public.semaines    enable row level security;
alter table public.creneaux    enable row level security;
alter table public.demandes    enable row level security;

create policy "patron : ses restaurants" on public.restaurants for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "patron : besoins de ses restaurants" on public.besoins for all to authenticated
  using (public.est_mon_restaurant(restaurant_id))
  with check (public.est_mon_restaurant(restaurant_id));

create policy "patron : employés de ses restaurants" on public.employes for all to authenticated
  using (public.est_mon_restaurant(restaurant_id))
  with check (public.est_mon_restaurant(restaurant_id));

create policy "patron : semaines de ses restaurants" on public.semaines for all to authenticated
  using (public.est_mon_restaurant(restaurant_id))
  with check (public.est_mon_restaurant(restaurant_id));

create policy "patron : créneaux de ses semaines" on public.creneaux for all to authenticated
  using (public.est_ma_semaine(semaine_id))
  with check (public.est_ma_semaine(semaine_id) and public.employe_de_la_semaine(employe_id, semaine_id));

create policy "patron : demandes de ses semaines" on public.demandes for all to authenticated
  using (public.est_ma_semaine(semaine_id))
  with check (
    public.est_ma_semaine(semaine_id)
    and public.employe_de_la_semaine(employe_id, semaine_id)
    and (remplacant_id is null or public.employe_de_la_semaine(remplacant_id, semaine_id))
  );
