-- ============================================================
-- LiDex — RLS Public Read Policies
-- Run this in: Supabase Dashboard → SQL Editor → New query
--
-- These tables are PUBLIC read (no auth needed).
-- All data is non-sensitive community/analytics data.
-- Write operations are protected separately (no anon INSERT/UPDATE/DELETE).
-- ============================================================

-- Grant core permissions (Fixes 42501: Permission Denied)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ── publishers ───────────────────────────────────────────────────────────────
ALTER TABLE publishers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_publishers" ON publishers;
CREATE POLICY "anon_select_publishers"
  ON publishers FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── series ───────────────────────────────────────────────────────────────────
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_series" ON series;
CREATE POLICY "anon_select_series"
  ON series FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── anime_meta ───────────────────────────────────────────────────────────────
ALTER TABLE anime_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_anime_meta" ON anime_meta;
CREATE POLICY "anon_select_anime_meta"
  ON anime_meta FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── manga_meta ───────────────────────────────────────────────────────────────
ALTER TABLE manga_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_manga_meta" ON manga_meta;
CREATE POLICY "anon_select_manga_meta"
  ON manga_meta FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── novel_meta ───────────────────────────────────────────────────────────────
ALTER TABLE novel_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_novel_meta" ON novel_meta;
CREATE POLICY "anon_select_novel_meta"
  ON novel_meta FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── volumes ──────────────────────────────────────────────────────────────────
ALTER TABLE volumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_volumes" ON volumes;
CREATE POLICY "anon_select_volumes"
  ON volumes FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── series_links ─────────────────────────────────────────────────────────────
ALTER TABLE series_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_series_links" ON series_links;
CREATE POLICY "anon_select_series_links"
  ON series_links FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── adaptations ──────────────────────────────────────────────────────────────
ALTER TABLE adaptations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_adaptations" ON adaptations;
CREATE POLICY "anon_select_adaptations"
  ON adaptations FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── episodes ─────────────────────────────────────────────────────────────────
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_episodes" ON episodes;
CREATE POLICY "anon_select_episodes"
  ON episodes FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── stat_snapshots ───────────────────────────────────────────────────────────
ALTER TABLE stat_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_stat_snapshots" ON stat_snapshots;
CREATE POLICY "anon_select_stat_snapshots"
  ON stat_snapshots FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── voting_periods (future — no data yet) ────────────────────────────────────
ALTER TABLE voting_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_voting_periods" ON voting_periods;
CREATE POLICY "anon_select_voting_periods"
  ON voting_periods FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── voting_results (future — no data yet) ────────────────────────────────────
ALTER TABLE voting_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_voting_results" ON voting_results;
CREATE POLICY "anon_select_voting_results"
  ON voting_results FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── mangadex_ref (future — no data yet) ──────────────────────────────────────
ALTER TABLE mangadex_ref ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mangadex_ref" ON mangadex_ref;
CREATE POLICY "anon_select_mangadex_ref"
  ON mangadex_ref FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- Quick verify — run after applying policies:
-- SELECT schemaname, tablename, policyname, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
-- ============================================================
