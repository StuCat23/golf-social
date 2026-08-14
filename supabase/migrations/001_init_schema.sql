-- =========================================================
-- 001_init_schema.sql
-- Phase 1 schema: courses, profiles, condition reports,
-- and a decay-weighted "conditions right now" score view.
--
-- Written for Supabase Postgres. Run this in the Supabase
-- SQL editor, or save it under supabase/migrations/ and run
-- `supabase db push` if you're using the CLI.
-- =========================================================

-- ---------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------
-- PostGIS for geo queries ("courses near me"). Enable now —
-- adding it later to a live table with data is more painful.
create extension if not exists postgis;

-- gen_random_uuid() for primary keys. Supabase enables
-- pgcrypto by default, but this is a safe no-op if it's already on.
create extension if not exists pgcrypto;


-- ---------------------------------------------------------
-- profiles
-- One row per user, 1:1 with Supabase's built-in auth.users.
-- Keep auth.users untouched; this table holds app-specific fields.
-- ---------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  home_course_id uuid,  -- FK added after courses exists
  created_at    timestamptz not null default now()
);


-- ---------------------------------------------------------
-- courses
-- ---------------------------------------------------------
create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  city        text,
  state       text,
  hole_count  smallint not null default 18,
  lat         double precision not null,
  lng         double precision not null,
  -- Generated geography point, kept in sync with lat/lng automatically.
  -- This is what PostGIS distance queries actually use.
  location    geography(Point, 4326)
              generated always as (
                ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
              ) stored,
  created_at  timestamptz not null default now()
);

-- Spatial index for "courses near me" queries.
create index courses_location_idx on public.courses using gist (location);

-- Now that courses exists, wire up the FK from profiles.
alter table public.profiles
  add constraint profiles_home_course_fk
  foreign key (home_course_id) references public.courses(id) on delete set null;


-- ---------------------------------------------------------
-- condition_reports
-- The core data-collection unit of the whole product.
-- ---------------------------------------------------------
create table public.condition_reports (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- When the round was actually played, per the reporter.
  played_at     timestamptz not null,
  -- Generated column so we can enforce "one report per course per user per day"
  -- without doing timezone math in a constraint.
  played_date   date generated always as ( (played_at at time zone 'utc')::date ) stored,

  -- Core condition fields. 1-5 scale, nullable individually so a report
  -- doesn't have to fill in everything, but at least one must be set
  -- (enforced below) so nobody submits an empty report.
  green_speed     smallint check (green_speed between 1 and 5),
  firmness        smallint check (firmness between 1 and 5),
  bunker_rating   smallint check (bunker_rating between 1 and 5),
  fairway_rating  smallint check (fairway_rating between 1 and 5),
  pace_minutes    smallint check (pace_minutes between 60 and 360),

  weather       jsonb,        -- snapshot at time of play, optional
  photo_url     text,
  notes         text check (char_length(notes) <= 500),

  played_verified boolean not null default false, -- true once round-linking exists (Phase 3)

  created_at    timestamptz not null default now(),

  constraint at_least_one_rating check (
    green_speed is not null or firmness is not null or
    bunker_rating is not null or fairway_rating is not null or
    pace_minutes is not null
  )
);

-- Rate limit: one report per course per user per day.
-- This is your main anti-spam guard for Phase 1.
create unique index condition_reports_one_per_day
  on public.condition_reports (course_id, user_id, played_date);

-- Freshness guard: reject reports claiming a round played more than
-- 24 hours ago, or in the future. This is what keeps the whole feed
-- "as of today" instead of decaying into stale reviews.
create or replace function public.enforce_report_freshness()
returns trigger
language plpgsql
as $$
begin
  if new.played_at > now() then
    raise exception 'played_at cannot be in the future';
  end if;
  if new.played_at < now() - interval '24 hours' then
    raise exception 'played_at must be within the last 24 hours';
  end if;
  return new;
end;
$$;

create trigger condition_reports_freshness_check
  before insert on public.condition_reports
  for each row execute function public.enforce_report_freshness();

-- Common query pattern: latest reports for a course.
create index condition_reports_course_recent_idx
  on public.condition_reports (course_id, played_at desc);


-- ---------------------------------------------------------
-- course_condition_score
-- Decay-weighted rollup: this is the number/summary shown on
-- a course page. Recent reports count far more than older ones.
--
-- Weight uses a simple half-life decay: a report's influence
-- halves every 24 hours. Reports older than ~7 days effectively
-- drop to near-zero weight and stop affecting the score.
-- ---------------------------------------------------------
create or replace view public.course_condition_score as
select
  c.id as course_id,
  c.name as course_name,
  count(r.id) filter (where r.played_at > now() - interval '7 days') as reports_last_7_days,
  max(r.played_at) as most_recent_report_at,

  -- Weighted averages, decayed by recency (half-life = 24h).
  round(
    sum(r.green_speed * power(0.5, extract(epoch from (now() - r.played_at)) / 86400.0))
    filter (where r.green_speed is not null)
    /
    nullif(sum(power(0.5, extract(epoch from (now() - r.played_at)) / 86400.0))
      filter (where r.green_speed is not null), 0)
  , 1) as green_speed_score,

  round(
    sum(r.firmness * power(0.5, extract(epoch from (now() - r.played_at)) / 86400.0))
    filter (where r.firmness is not null)
    /
    nullif(sum(power(0.5, extract(epoch from (now() - r.played_at)) / 86400.0))
      filter (where r.firmness is not null), 0)
  , 1) as firmness_score,

  round(
    sum(r.bunker_rating * power(0.5, extract(epoch from (now() - r.played_at)) / 86400.0))
    filter (where r.bunker_rating is not null)
    /
    nullif(sum(power(0.5, extract(epoch from (now() - r.played_at)) / 86400.0))
      filter (where r.bunker_rating is not null), 0)
  , 1) as bunker_score,

  round(
    sum(r.fairway_rating * power(0.5, extract(epoch from (now() - r.played_at)) / 86400.0))
    filter (where r.fairway_rating is not null)
    /
    nullif(sum(power(0.5, extract(epoch from (now() - r.played_at)) / 86400.0))
      filter (where r.fairway_rating is not null), 0)
  , 1) as fairway_score,

  round(avg(r.pace_minutes) filter (where r.played_at > now() - interval '7 days'), 0) as avg_pace_minutes_last_7_days

from public.courses c
left join public.condition_reports r
  on r.course_id = c.id and r.played_at > now() - interval '7 days'
group by c.id, c.name;

-- Note: this is a plain view (recomputed on every query), which is fine
-- at Phase 1 volume. If course pages get slow at scale, convert this to
-- a materialized view refreshed on a cron (e.g. every 15-30 min) instead.


-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.condition_reports enable row level security;

-- Profiles: anyone can view, only the owner can edit their own.
create policy "profiles are publicly readable"
  on public.profiles for select using (true);
create policy "users can update their own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Courses: publicly readable. Writes come later via an admin/service role
-- (course seeding script), not from end users in Phase 1.
create policy "courses are publicly readable"
  on public.courses for select using (true);

-- Condition reports: publicly readable (that's the whole point),
-- but only the authenticated author can insert as themselves,
-- and only they can edit/delete their own report.
create policy "condition reports are publicly readable"
  on public.condition_reports for select using (true);
create policy "users can insert their own reports"
  on public.condition_reports for insert with check (auth.uid() = user_id);
create policy "users can update their own reports"
  on public.condition_reports for update using (auth.uid() = user_id);
create policy "users can delete their own reports"
  on public.condition_reports for delete using (auth.uid() = user_id);