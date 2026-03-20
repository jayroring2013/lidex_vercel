/**
 * LiDex Score — Composite anime quality metric (0–100)
 *
 * Methodology
 * ───────────
 * Seven signals are combined with weights chosen to reflect what "quality" means
 * to a data analyst: raw score alone is biased by sample size and recency;
 * popularity alone rewards mainstream taste; distribution shape reveals
 * whether a high score is unanimous or inflated by a vocal minority.
 * Viewer engagement (watch/drop behaviour) adds revealed-preference signal
 * that star ratings alone cannot capture.
 *
 * Component weights (sum = 1.0):
 *   A. Community Score      30% — AniList mean_score, percentile-normalised
 *   B. Popularity           18% — higher points = more popular, percentile-normalised
 *   C. Favourites           17% — log-scaled to dampen extreme outliers
 *   D. Score Distribution   13% — shape analysis of rating distribution
 *   E. Viewer Engagement    12% — completion/drop behaviour from status_distribution
 *   F. Anime Status          5% — completed series are fully evaluable
 *   G. Studio Reputation     5% — studio's historical average vs population
 *
 * All components are normalised to [0, 1] before weighting.
 * Final score = sum(weighted components) × 100, clamped to [0, 100].
 *
 * Score Distribution Analysis (Component D)
 * ──────────────────────────────────────────
 * The distribution reveals *how* an anime is scored, not just what the mean is.
 * Two sub-metrics are combined:
 *   1. High-Quality Ratio    — fraction of votes at ≥70 (well-received threshold)
 *   2. Top-Tier Concentration — fraction of votes at ≥90 (excellent threshold)
 *   3. Consensus Index        — 1 - (Gini coefficient of the distribution)
 *      A low Gini means votes are concentrated at the top (consensus quality).
 *      A high Gini means votes are spread or bimodal (divisive / niche).
 *
 * D = 0.40 × high_quality_ratio
 *   + 0.35 × top_tier_concentration
 *   + 0.25 × consensus_index
 */

export interface AnimeMeta {
  mean_score:          number | null
  popularity:          number | null
  favourites:          number | null
  status:              string | null
  score_distribution:  Record<string, number> | string | null
  status_distribution: Record<string, number> | string | null
}

export interface PopulationStats {
  // Percentile breakpoints for mean_score (0–100 scale)
  score: { p25: number; p50: number; p75: number; p90: number; p99: number }
  // Percentile breakpoints for popularity points (higher = more popular)
  pop:   { p10: number; p25: number; p50: number; p75: number; p90: number; min: number; max: number }
  // Percentile breakpoints for log10(favourites)
  fav:   { p25: number; p50: number; p75: number; p90: number; p99: number }
  // Studio → average mean_score across all that studio's anime
  studioAvgScores: Record<string, number>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function parseScoreDist(raw: AnimeMeta['score_distribution']): Record<string, number> {
  if (!raw) return {}
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return {} } }
  return raw as Record<string, number>
}

/**
 * Piecewise-linear interpolation between percentile breakpoints.
 * Converts a raw value to a [0,1] score using the population distribution.
 */
function piecewiseNormalise(
  value: number,
  breakpoints: [number, number][], // [[rawValue, normScore], ...]
): number {
  if (value <= breakpoints[0][0]) return 0
  const last = breakpoints[breakpoints.length - 1]
  if (value >= last[0]) return last[1]
  for (let i = 1; i < breakpoints.length; i++) {
    const [lo, loN] = breakpoints[i - 1]
    const [hi, hiN] = breakpoints[i]
    if (value <= hi) {
      return loN + ((value - lo) / (hi - lo)) * (hiN - loN)
    }
  }
  return last[1]
}

// ── Component A: Community Score ──────────────────────────────────────────────

function scoreComponent(mean_score: number | null, stats: PopulationStats): number {
  if (!mean_score) return 0
  const { p25, p50, p75, p90, p99 } = stats.score
  return piecewiseNormalise(mean_score, [
    [0,   0.00],
    [p25, 0.25],
    [p50, 0.50],
    [p75, 0.75],
    [p90, 0.90],
    [p99, 1.00],
  ])
}

// ── Component B: Popularity ───────────────────────────────────────────────────
// Higher point value = more popular → normalise directly (no inversion)

function popularityComponent(popularity: number | null, stats: PopulationStats): number {
  if (!popularity) return 0
  const { min, max, p10, p25, p50, p75, p90 } = stats.pop
  // Higher value → higher score
  return piecewiseNormalise(popularity, [
    [min, 0.00],
    [p10, 0.10],
    [p25, 0.25],
    [p50, 0.50],
    [p75, 0.75],
    [p90, 0.90],
    [max, 1.00],
  ])
}

// ── Component C: Favourites ───────────────────────────────────────────────────
// Log-scaled to compress extreme outliers (Demon Slayer effect)

function favouritesComponent(favourites: number | null, stats: PopulationStats): number {
  if (!favourites || favourites <= 0) return 0
  const logVal = Math.log10(favourites + 1)
  const { p25, p50, p75, p90, p99 } = stats.fav
  return piecewiseNormalise(logVal, [
    [0,   0.00],
    [p25, 0.25],
    [p50, 0.50],
    [p75, 0.75],
    [p90, 0.90],
    [p99, 1.00],
  ])
}

// ── Component D: Score Distribution ──────────────────────────────────────────

function distributionComponent(rawDist: AnimeMeta['score_distribution']): number {
  const dist = parseScoreDist(rawDist)
  const buckets = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  const counts  = buckets.map(b => dist[String(b)] ?? 0)
  const total   = counts.reduce((s, c) => s + c, 0)

  if (total === 0) return 0.5 // no distribution data → neutral

  // 1. High-quality ratio: fraction of votes at score ≥ 70
  const highQualityVotes = counts.slice(6).reduce((s, c) => s + c, 0) // indices 6,7,8,9 = 70,80,90,100
  const highQualityRatio = highQualityVotes / total

  // 2. Top-tier concentration: fraction at score ≥ 90
  const topTierVotes = counts[8] + counts[9] // 90 + 100
  const topTierConc  = topTierVotes / total

  // 3. Consensus index: 1 - Gini coefficient
  // A lower Gini (more equal distribution concentrated at top) = higher quality consensus
  // We weight by bucket position so high-score buckets "matter more"
  const weightedCounts = counts.map((c, i) => c * (buckets[i] / 100))
  const weightedTotal  = weightedCounts.reduce((s, c) => s + c, 0)
  // Gini of the weighted distribution
  let giniNum = 0
  for (let i = 0; i < weightedCounts.length; i++) {
    for (let j = 0; j < weightedCounts.length; j++) {
      giniNum += Math.abs(weightedCounts[i] - weightedCounts[j])
    }
  }
  const gini = weightedTotal > 0 ? giniNum / (2 * weightedCounts.length * weightedTotal) : 0.5
  const consensusIndex = 1 - gini

  return clamp01(
    0.40 * highQualityRatio +
    0.35 * topTierConc +
    0.25 * consensusIndex
  )
}

// ── Component E: Viewer Engagement ───────────────────────────────────────────
/**
 * Derived from status_distribution: {"COMPLETED": N, "DROPPED": N, "CURRENT": N,
 *                                    "PAUSED": N, "PLANNING": N}
 *
 * Three sub-signals:
 *   1. Completion Rate  (45%) = COMPLETED / (COMPLETED + DROPPED)
 *      → Of people who committed, what fraction finished? High = compelling.
 *   2. Drop Resistance  (30%) = 1 − (DROPPED / engaged)
 *      where engaged = COMPLETED + DROPPED + CURRENT + PAUSED (excludes PLANNING)
 *      → How resilient is it against abandonment?
 *   3. Enthusiasm Index (25%) = (COMPLETED + CURRENT) / engaged
 *      → Fraction of engaged viewers who are either done or actively watching.
 *        High = strong active engagement; low = many paused/dropped.
 *
 * PLANNING is excluded from denominators — it reflects anticipation, not experience.
 * It contributes indirectly through popularity (Component B).
 */
function parseStatusDist(raw: AnimeMeta['status_distribution']): Record<string, number> {
  if (!raw) return {}
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return {} } }
  return raw as Record<string, number>
}

function viewerEngagementComponent(status_distribution: AnimeMeta['status_distribution']): number {
  const dist = parseStatusDist(status_distribution)

  const completed = dist['COMPLETED'] ?? 0
  const dropped   = dist['DROPPED']   ?? 0
  const current   = dist['CURRENT']   ?? 0
  const paused    = dist['PAUSED']    ?? 0
  // PLANNING excluded — it's anticipation, not revealed quality preference

  const engaged = completed + dropped + current + paused
  if (engaged === 0) return 0.60 // no data → slight above-neutral default

  // 1. Completion rate — out of those who committed, how many finished?
  const committedTotal = completed + dropped
  const completionRate = committedTotal > 0 ? completed / committedTotal : 0.60

  // 2. Drop resistance — fraction of engaged viewers who did NOT drop
  const dropResistance = 1 - (dropped / engaged)

  // 3. Enthusiasm index — fraction actively consuming (done or watching now)
  const enthusiasmIndex = (completed + current) / engaged

  return clamp01(
    0.45 * completionRate  +
    0.30 * dropResistance  +
    0.25 * enthusiasmIndex
  )
}

// ── Component F: Anime Status ──────────────────────────────────────────────────

function statusComponent(status: string | null): number {
  const s = (status || '').toLowerCase()
  // Completed → fully evaluable, no uncertainty discount
  if (s === 'finished' || s === 'completed')    return 1.00
  // Ongoing → still airing, quality unresolved
  if (s === 'releasing' || s === 'ongoing')     return 0.80
  // Hiatus → uncertain continuation
  if (s === 'hiatus')                           return 0.60
  // Not yet released → no data
  if (s === 'not_yet_released' || s === 'upcoming') return 0.40
  // Cancelled / discontinued → penalise
  if (s === 'cancelled' || s === 'discontinued') return 0.30
  return 0.70 // unknown
}

// ── Component F: Studio Reputation ───────────────────────────────────────────

function studioComponent(studio: string | null, stats: PopulationStats): number {
  if (!studio) return 0.50 // no studio info → neutral
  const avgScore = stats.studioAvgScores[studio]
  if (!avgScore) return 0.50
  // Normalise studio avg score (typically 50–90) to [0,1]
  // Using a simple linear scale: 50 = 0, 90 = 1
  return clamp01((avgScore - 50) / 40)
}

// ── Master Score Function ─────────────────────────────────────────────────────

export interface LiDexScoreBreakdown {
  total:            number  // 0–100, the final score
  community:        number  // Component A (30%), 0–100
  popularity:       number  // Component B (18%), 0–100
  favourites:       number  // Component C (17%), 0–100
  distribution:     number  // Component D (13%), 0–100
  viewerEngagement: number  // Component E (12%), 0–100
  animeStatus:      number  // Component F  (5%), 0–100
  studio:           number  // Component G  (5%), 0–100
}

const WEIGHTS = {
  community:        0.30,
  popularity:       0.18,
  favourites:       0.17,
  distribution:     0.13,
  viewerEngagement: 0.12,
  animeStatus:      0.05,
  studio:           0.05,
}
// Sanity check: 0.30+0.18+0.17+0.13+0.12+0.05+0.05 = 1.00

export function calculateLiDexScore(
  meta:   AnimeMeta,
  studio: string | null,
  stats:  PopulationStats,
): LiDexScoreBreakdown {
  const a = scoreComponent(meta.mean_score, stats)
  const b = popularityComponent(meta.popularity, stats)
  const c = favouritesComponent(meta.favourites, stats)
  const d = distributionComponent(meta.score_distribution)
  const e = viewerEngagementComponent(meta.status_distribution)
  const f = statusComponent(meta.status)
  const g = studioComponent(studio, stats)

  const total = clamp01(
    WEIGHTS.community        * a +
    WEIGHTS.popularity       * b +
    WEIGHTS.favourites       * c +
    WEIGHTS.distribution     * d +
    WEIGHTS.viewerEngagement * e +
    WEIGHTS.animeStatus      * f +
    WEIGHTS.studio           * g
  ) * 100

  return {
    total:            Math.round(total * 10) / 10,
    community:        Math.round(a * 100 * 10) / 10,
    popularity:       Math.round(b * 100 * 10) / 10,
    favourites:       Math.round(c * 100 * 10) / 10,
    distribution:     Math.round(d * 100 * 10) / 10,
    viewerEngagement: Math.round(e * 100 * 10) / 10,
    animeStatus:      Math.round(f * 100 * 10) / 10,
    studio:           Math.round(g * 100 * 10) / 10,
  }
}

// ── Population Stats Builder ──────────────────────────────────────────────────
// Call this once with your full anime_meta dataset to build the stats object.

export function buildPopulationStats(
  rows: Array<{
    mean_score:  number | null
    popularity:  number | null
    favourites:  number | null
    studio:      string | null
  }>
): PopulationStats {
  const pct = (arr: number[], p: number) => {
    const sorted = [...arr].sort((a, b) => a - b)
    const idx = Math.floor((p / 100) * (sorted.length - 1))
    return sorted[idx] ?? 0
  }

  const scores = rows.map(r => r.mean_score).filter((v): v is number => v != null)
  const pops   = rows.map(r => r.popularity).filter((v): v is number => v != null && v > 0)
  const favs   = rows.map(r => r.favourites).filter((v): v is number => v != null && v > 0)
                     .map(v => Math.log10(v + 1))

  // Studio average scores
  const studioSums: Record<string, { sum: number; count: number }> = {}
  for (const r of rows) {
    if (!r.studio || !r.mean_score) continue
    if (!studioSums[r.studio]) studioSums[r.studio] = { sum: 0, count: 0 }
    studioSums[r.studio].sum   += r.mean_score
    studioSums[r.studio].count += 1
  }
  const studioAvgScores: Record<string, number> = {}
  for (const [studio, { sum, count }] of Object.entries(studioSums)) {
    if (count >= 3) studioAvgScores[studio] = sum / count // min 3 anime for reliability
  }

  return {
    score: {
      p25: pct(scores, 25),
      p50: pct(scores, 50),
      p75: pct(scores, 75),
      p90: pct(scores, 90),
      p99: pct(scores, 99),
    },
    pop: {
      min: pct(pops, 0),
      max: pct(pops, 100),
      p10: pct(pops, 10),
      p25: pct(pops, 25),
      p50: pct(pops, 50),
      p75: pct(pops, 75),
      p90: pct(pops, 90),
    },
    fav: {
      p25: pct(favs, 25),
      p50: pct(favs, 50),
      p75: pct(favs, 75),
      p90: pct(favs, 90),
      p99: pct(favs, 99),
    },
    studioAvgScores,
  }
}
