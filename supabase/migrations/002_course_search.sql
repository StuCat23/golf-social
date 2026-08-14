-- =========================================================
-- 002_course_search.sql
-- Supports the course search / "near me" list:
--   - nearby_courses(): PostGIS distance query, callable via
--     supabase.rpc() directly from the client (courses are
--     publicly readable, so no auth required to call this).
--   - pg_trgm + GIN index: makes ILIKE name search fast and
--     typo-tolerant instead of doing a sequential scan.
-- =========================================================

create extension if not exists pg_trgm;

create index if not exists courses_name_trgm_idx
  on public.courses using gin (name gin_trgm_ops);

-- Returns courses within `radius_meters` of (lat, lng), nearest first.
-- SQL (not plpgsql) and STABLE so Postgres can optimize/inline it.
create or replace function public.nearby_courses(
  lat double precision,
  lng double precision,
  radius_meters integer default 40000  -- ~25 miles default
)
returns table (
  id uuid,
  name text,
  city text,
  state text,
  hole_count smallint,
  distance_meters double precision
)
language sql
stable
as $$
  select
    c.id,
    c.name,
    c.city,
    c.state,
    c.hole_count,
    ST_Distance(c.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) as distance_meters
  from public.courses c
  where ST_DWithin(
    c.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius_meters
  )
  order by distance_meters asc
  limit 25;
$$;