-- LBC Cargo Quest — databasschema
--
-- Kör hela filen i Supabase: Dashboard → SQL Editor → New query → Run.
-- Den är idempotent och kan köras om utan att förstöra befintlig data.

-- ── Tabeller ────────────────────────────────────────────────────────────────

create table if not exists public.scores (
  id            uuid primary key default gen_random_uuid(),
  player_name   text        not null check (char_length(player_name) between 1 and 40),
  score         integer     not null check (score >= 0 and score <= 100000),
  grade         text        not null check (grade in ('S', 'A', 'B', 'C', 'D')),
  submitted_at  timestamptz not null default now()
);

comment on table public.scores is 'Ett inlämnat spelresultat. Läsbart för alla — driver topplistan.';

create table if not exists public.contacts (
  id            uuid        primary key default gen_random_uuid(),
  score_id      uuid        not null references public.scores(id) on delete cascade,
  phone_number  text        not null check (char_length(phone_number) between 6 and 20),
  created_at    timestamptz not null default now()
);

comment on table public.contacts is 'Telefonnummer för vinstdragning. Personuppgift — får bara läsas av inloggad admin.';

create index if not exists scores_submitted_at_idx on public.scores (submitted_at desc);
create index if not exists scores_score_idx        on public.scores (score desc);
create index if not exists contacts_score_id_idx   on public.contacts (score_id);

-- ── Radsäkerhet ─────────────────────────────────────────────────────────────
--
-- Poängen är publik, telefonnumret är det inte. Spelaren måste kunna skriva
-- båda utan att vara inloggad, men bara en autentiserad admin får läsa
-- kontaktuppgifterna.

alter table public.scores   enable row level security;
alter table public.contacts enable row level security;

drop policy if exists "scores_insert_anon"   on public.scores;
drop policy if exists "scores_select_all"    on public.scores;
drop policy if exists "contacts_insert_anon" on public.contacts;
drop policy if exists "contacts_select_auth" on public.contacts;

create policy "scores_insert_anon"
  on public.scores for insert
  to anon, authenticated
  with check (true);

create policy "scores_select_all"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "contacts_insert_anon"
  on public.contacts for insert
  to anon, authenticated
  with check (true);

create policy "contacts_select_auth"
  on public.contacts for select
  to authenticated
  using (true);

-- ── Efter körningen ─────────────────────────────────────────────────────────
--
-- 1. Skapa adminanvändaren: Dashboard → Authentication → Users → Add user.
--    Kryssa i "Auto Confirm User", annars går det inte att logga in.
-- 2. Stäng av självregistrering: Authentication → Providers → Email →
--    slå av "Enable sign ups". Då kan ingen annan skapa ett konto som får
--    läsa telefonnumren.
-- 3. Hämta URL och anon-nyckel under Project Settings → API och lägg in dem
--    som GitHub-secrets, se README-steget i deploy.yml.
