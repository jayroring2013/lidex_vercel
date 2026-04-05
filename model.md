# LiDex Data Model Documentation

> **Last updated**: 2026-04-05
> **Database**: Supabase (PostgreSQL 15+)
> **Migrations**: `001_create_tables.sql` → `002_add_volume_fields.sql` → `003_episode_snapshots.sql`

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Table Reference](#table-reference)
   - [publishers](#1-publishers)
   - [series](#2-series)
   - [anime_meta](#3-anime_meta)
   - [manga_meta](#4-manga_meta)
   - [novel_meta](#5-novel_meta)
   - [volumes](#6-volumes)
   - [series_links](#7-series_links)
   - [adaptations](#8-adaptations)
   - [episodes](#9-episodes)
   - [stat_snapshots](#10-stat_snapshots)
   - [mangadex_ref](#11-mangadex_ref)
   - [voting_periods](#12-voting_periods)
   - [voting_results](#13-voting_results)
4. [Views](#views)
5. [Triggers & Auto-Functions](#triggers--auto-functions)
6. [Data Sources & Sync Scripts](#data-sources--sync-scripts)
7. [What Data Currently Exists](#what-data-currently-exists)

---

## Overview

LiDex is a Vietnamese otaku community analytics platform that tracks **anime**, **manga/manhwa**, and **light novels**. The data model follows a hub-and-spoke design where `series` is the central table, and each content type has its own metadata table (`anime_meta`, `manga_meta`, `novel_meta`) linked via a 1:1 relationship on `series_id`.

The model supports three content pipelines, each with its own sync script:

| Content Type | Sync Script | Primary Data Source | Secondary Source |
|---|---|---|---|
| Anime | `sync_anime.py` | AniList GraphQL API | MAL/Jikan (episodes) |
| Manga/Manhwa | `sync_manga.py` | pb.tana.moe PocketBase API | — |
| Light Novels | `sync_novels.py` | Hako `licensed_books.sql` dump | AniList (optional enrichment) |

---

## Entity Relationship Diagram

```
                              ┌──────────────┐
                              │  publishers  │
                              │──────────────│
                              │ id (PK)      │
                              │ name         │
                              │ name_vi      │
                              │ country      │
                              │ website      │
                              └──────┬───────┘
                                     │
                        ┌────────────┼────────────────┐
                        │            │                │
                        ▼            │                ▼
               ┌─────────────┐      │      ┌─────────────────┐
               │   series    │◄─────┘      │  voting_periods │
               │─────────────│             │─────────────────│
               │ id (PK)     │             │ id (PK)         │
               │ item_type   │             │ month           │
               │ title       │             │ year            │
               │ slug        │             │ label           │
               │ anilist_id  │             └────────┬────────┘
               │ mal_id      │                      │
               │ mangadex_id │                      │
               │ publisher_id│──► publishers         │
               └──┬───┬──┬───┘                      ▼
                  │   │  │                 ┌─────────────────┐
        ┌─────────┘   │  └────────┐       │ voting_results  │
        │             │           │       │─────────────────│
        ▼             ▼           ▼       │ series_id (FK)  │──► series
  ┌───────────┐ ┌───────────┐ ┌────────┐ │ period_id (FK)  │──► voting_periods
  │anime_meta │ │manga_meta │ │novel   │ │ votes           │
  │───────────│ │───────────│ │_meta   │ │ rank            │
  │series_id  │ │series_id  │ │────────│ └─────────────────┘
  │(PK,FK)    │ │(PK,FK)    │ │series_ |
  │format     │ │md_rating  │ │id(PK,  │
  │episodes   │ │md_follows │ │FK)     │
  │mean_score │ │demographic│ │volume_ │
  │popularity │ │vn_licensed│ │count   │
  │trending   │ │original   │ │publish │
  │score_dist │ │_language  │ │er_id   │
  │status_dist│ │vn_publish │ └───┬────┘
  │next_air   │ │er_id      │     │
  └───────────┘ └───────────┘     │
                                    ▼
                            ┌──────────────┐
                            │   volumes    │
                            │──────────────│
                            │ id (PK)      │
                            │ series_id(FK)│──► series
                            │ volume_number│
                            │ price        │
                            │ release_date │
                            │ cover_url    │
                            │ translator   │
                            │ page_count   │
                            └──────────────┘

   series ◄────────────────────────────────────┐
     │                                         │
     ├────► series_links                        │
     │      link_type: anilist, stream,        │
     │                official, trailer,        │
     │                purchase, wiki            │
     │                                         │
     ├────► adaptations                        │
     │      source_id, target_id (both ─► series)
     │      relation_type: ADAPTATION, SOURCE, │
     │                       SEQUEL, etc.      │
     │                                         │
     ├────► episodes                            │
     │      episode_number, title, aired_at,   │
     │      score (MAL), filler, recap          │
     │                                         │
     ├────► stat_snapshots                      │
     │      aired_episode, week_start,         │
     │      payload (JSONB stats per episode)  │
     │                                         │
     └────► mangadex_ref                        │
            mangadex_id (UUID PK)              │
            title_en, md_rating, md_follows    │
```

---

## Table Reference

### 1. `publishers`

Vietnamese publishers that license manga, manhwa, and light novels for the Vietnamese market. Anime studios are NOT stored here — they go in `series.studio` instead.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | `PRIMARY KEY` | Auto-increment ID |
| `name` | `text` | `NOT NULL` | Publisher name (e.g. "IPM", "NXB Kim Dong") |
| `name_vi` | `text` | | Vietnamese name variant |
| `country` | `text` | `NOT NULL DEFAULT 'VN'` | Country code (always VN) |
| `website` | `text` | | Official website URL |

**Unique constraint**: `(name, country)`

**Data sources**:
- `sync_manga.py` — auto-seeds 36 publishers from pb.tana.moe
- `sync_novels.py` — auto-seeds publishers from Hako licensed_books data

**Current data**: ~36 Vietnamese publishers (IPM, NXB Kim Dong, Wings Books, Tre Publishing, etc.)

---

### 2. `series`

The central hub table. Every anime, manga, and light novel has one row here. Content-type-specific details live in their respective `_meta` tables.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | `PRIMARY KEY` | Auto-increment ID |
| `item_type` | `text` | `NOT NULL`, `CHECK ('anime','manga','novel')` | Content type discriminator |
| `title` | `text` | `NOT NULL` | Primary display title (English for anime/manga, Vietnamese for novels) |
| `title_vi` | `text` | | Vietnamese localized title |
| `title_native` | `text` | | Original language title (Japanese romaji or kanji) |
| `title_english` | `text` | | English title |
| `slug` | `text` | `UNIQUE` | URL-safe slug (auto-generated from English title, fallback: `title-{id}`) |
| `cover_url` | `text` | | Cover image URL (AniList, pb.tana.moe CDN) |
| `banner_url` | `text` | | Wide banner image (anime only, from AniList) |
| `description` | `text` | | English/plain description |
| `description_vi` | `text` | | Vietnamese description |
| `status` | `text` | `NOT NULL DEFAULT 'unknown'`, `CHECK (...)` | `ongoing`, `completed`, `cancelled`, `hiatus`, `not_yet_released`, `releasing`, `unknown` |
| `genres` | `text[]` | `NOT NULL DEFAULT '{}'` | Genre tags (e.g. `{'Action','Fantasy','Romance'}`) |
| `tags` | `text[]` | `NOT NULL DEFAULT '{}'` | Detailed tags from AniList (anime only) |
| `source` | `text` | | Original source: `MANGA`, `LIGHT_NOVEL`, `ORIGINAL`, `MANHWA`, `MANHUA`, etc. |
| `author` | `text` | | Author name (manga/novels) |
| `studio` | `text` | | Animation studio name (anime only, e.g. "MAPPA", "Bones") |
| `publisher_id` | `int` | `FK → publishers(id) ON DELETE SET NULL` | Primary Vietnamese publisher |
| `anilist_id` | `int` | `UNIQUE` | AniList database ID (anime + some manga/novels) |
| `mangadex_id` | `uuid` | | MangaDex UUID identifier |
| `mal_id` | `int` | | MyAnimeList ID (anime only) |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Record creation time |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last modified (auto-touched by triggers) |

**Indexes**: `item_type`, `anilist_id`, `mal_id`, `mangadex_id`, `(item_type, status)`, `publisher_id`, `title` (trigram), `title_vi` (trigram), `genres` (GIN), `tags` (GIN)

**Data by source**:

| Field | Anime (AniList) | Manga (pb.tana.moe) | Novels (Hako) |
|---|---|---|---|
| `item_type` | `'anime'` | `'manga'` | `'novel'` |
| `title` | English or romaji | Vietnamese name | Vietnamese name |
| `title_vi` | — | Same as title | Same as title |
| `title_native` | Japanese native | JP name from altTitleNames | — |
| `title_english` | English | EN name from altTitleNames | — |
| `slug` | Auto from English | From pb.tana.moe slug | From series_code |
| `cover_url` | AniList extraLarge | pb.tana.moe CDN | — |
| `banner_url` | AniList banner | — | — |
| `description` | AniList desc (≤2000) | pb.tana.moe desc (HTML stripped) | — |
| `genres` | AniList genres[] | pb.tana.moe genres[] | — |
| `tags` | AniList tags[] (sorted by rank) | `[]` | `[]` |
| `source` | AniList source field | FORMAT_SOURCE map | — |
| `author` | — | Staff with role "nguyên tác"/"author" | — |
| `studio` | Main studio name | — | — |
| `publisher_id` | — | Resolved from releases.publisher | Resolved from publisher name |
| `anilist_id` | AniList ID | — | — |
| `mal_id` | AniList idMal | — | — |

---

### 3. `anime_meta`

1:1 extension of `series` for anime-specific data. Linked via `series_id` (PK = FK). Only exists for rows where `series.item_type = 'anime'`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `series_id` | `int` | `PRIMARY KEY`, `FK → series(id) ON DELETE CASCADE` | 1:1 link to series |
| `format` | `text` | | `TV`, `MOVIE`, `OVA`, `ONA`, `SPECIAL`, `MUSIC`, `TV_SHORT` |
| `episodes` | `int` | | Total episode count |
| `duration_min` | `int` | | Duration per episode in minutes |
| `season` | `text` | `CHECK ('WINTER','SPRING','SUMMER','FALL')` | Anime season |
| `season_year` | `int` | | Broadcast year |
| `mean_score` | `numeric(5,2)` | | AniList mean score (0–100 scale) |
| `average_score` | `numeric(5,2)` | | AniList weighted average score (0–100) |
| `popularity` | `int` | | AniList popularity count (number of users) |
| `favourites` | `int` | | AniList favourites count |
| `trending` | `int` | | AniList trending rank (lower = more trending) |
| `score_distribution` | `jsonb` | | Score breakdown: `{"10":120, "20":450, ..., "100":890}` |
| `status_distribution` | `jsonb` | | Viewer status: `{"CURRENT":5000, "COMPLETED":40000, "PLANNED":2000, ...}` |
| `aired_episodes` | `int` | | Number of episodes aired so far (derived from `nextAiringEpisode`) |
| `next_episode` | `int` | | Next episode number to air (from AniList) |
| `next_airing_at` | `timestamptz` | | Timestamp of next episode airing (ISO string) |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last modified |

**Indexes**: `(season_year, season)`, `format`, `popularity DESC`, `mean_score DESC`, `trending ASC`, `next_airing_at ASC`

**Data source**: `sync_anime.py` — AniList GraphQL API (currently airing anime only, status = RELEASING).

**Sync behavior**: Full upsert on `anilist_id` conflict. Re-runs overwrite all fields including `score_distribution` and `status_distribution`.

---

### 4. `manga_meta`

1:1 extension of `series` for manga/manhwa-specific data. Linked via `series_id` (PK = FK). Only exists where `series.item_type = 'manga'`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `series_id` | `int` | `PRIMARY KEY`, `FK → series(id) ON DELETE CASCADE` | 1:1 link to series |
| `md_rating` | `numeric(4,2)` | | MangaDex Bayesian rating (0–10) |
| `md_follows` | `int` | | MangaDex follow count |
| `md_year` | `int` | | MangaDex release year |
| `md_chapters` | `int` | | MangaDex total chapter count |
| `md_volumes` | `int` | | MangaDex total volume count |
| `last_chapter` | `text` | | Latest chapter identifier |
| `last_volume` | `text` | | Latest volume identifier |
| `demographic` | `text` | `CHECK ('shounen','shoujo','seinen','josei','none')` | Target demographic |
| `content_rating` | `text` | `CHECK ('safe','suggestive','erotica','pornographic')` | MangaDex content rating |
| `original_language` | `text` | `NOT NULL DEFAULT 'ja'` | Source language code: `ja`, `ko`, `zh`, `vi`, `th` |
| `momoka_id` | `text` | `UNIQUE` | Momoka manga tracker ID (future use) |
| `momoka_synced_at` | `timestamptz` | | Last sync timestamp from Momoka |
| `vn_licensed` | `boolean` | `NOT NULL DEFAULT false` | Whether licensed in Vietnam |
| `vn_publisher_id` | `int` | `FK → publishers(id) ON DELETE SET NULL` | Vietnamese publisher reference |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last modified |

**Indexes**: `demographic`, `md_rating DESC NULLS LAST`, `md_follows DESC`

**Data source**: `sync_manga.py` — pb.tana.moe PocketBase API.

**Fields populated by manga sync**:

| Field | Source | Notes |
|---|---|---|
| `demographic` | `demographic.slug` from pb.tana.moe | Only shounen/shoujo/seinen/josei mapped; others → `'none'` |
| `original_language` | `format.slug` mapped via FORMAT_LANG | `manga→ja`, `manhwa→ko`, `manhua→zh`, etc. |
| `vn_licensed` | Always `true` | All manga from pb.tana.moe are VN-licensed by definition |
| `vn_publisher_id` | Resolved from `releases_via_title.publisher` | Vietnamese publisher FK |
| `md_rating`, `md_follows`, etc. | — | **Not available** from pb.tana.moe; would need a separate MangaDex sync |

---

### 5. `novel_meta`

1:1 extension of `series` for light novel-specific data. Linked via `series_id` (PK = FK). Only exists where `series.item_type = 'novel'`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `series_id` | `int` | `PRIMARY KEY`, `FK → series(id) ON DELETE CASCADE` | 1:1 link to series |
| `publisher_id` | `int` | `FK → publishers(id) ON DELETE SET NULL` | Vietnamese publisher reference |
| `volume_count` | `int` | `NOT NULL DEFAULT 0` | Count of non-special volumes (auto-synced by trigger) |
| `is_completed` | `boolean` | `NOT NULL DEFAULT false` | Whether the series is fully published |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last modified |

**Data source**: `sync_novels.py` — Hako `licensed_books.sql` MariaDB dump.

**Auto-behavior**: `volume_count` is automatically recalculated whenever volumes are inserted/updated/deleted via the `fn_sync_volume_count()` trigger. It counts non-special volumes only.

---

### 6. `volumes`

Individual volume/release data for manga and light novels. One series can have many volumes. Each volume tracks pricing, release dates, and cover images.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | `PRIMARY KEY` | Auto-increment ID |
| `series_id` | `int` | `NOT NULL`, `FK → series(id) ON DELETE CASCADE` | Parent series |
| `publisher_id` | `int` | `FK → publishers(id) ON DELETE SET NULL` | Volume-specific publisher (if different from series) |
| `volume_number` | `int` | | Volume number (`NULL` = omnibus/standalone/special) |
| `title` | `text` | | Volume subtitle |
| `isbn` | `text` | | ISBN identifier |
| `cover_url` | `text` | | Volume cover image URL |
| `release_date` | `date` | | Release/publish date |
| `price` | `numeric(10,2)` | | Price amount |
| `currency` | `text` | `NOT NULL DEFAULT 'VND'` | Currency code |
| `is_special` | `boolean` | `NOT NULL DEFAULT false` | Omnibus, artbook, special edition, etc. |
| `is_digital` | `boolean` | `NOT NULL DEFAULT false` | Digital-only release |
| `translator` | `text` | | Vietnamese translator name (novels only) |
| `page_count` | `int` | | Number of pages (novels only) |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Record creation time |

**Unique constraint**: `(series_id, volume_number)` — enforced for upsert deduplication.

**Indexes**: `series_id`, `release_date DESC`, `(series_id) WHERE is_special = false`

**Data by source**:

| Field | Manga (pb.tana.moe) | Novels (Hako) |
|---|---|---|
| `volume_number` | `publications.volume / 10000` | Parsed from volume_code |
| `title` | `publications.name` | — |
| `cover_url` | pb.tana.moe CDN or fallback to series cover | — |
| `release_date` | `books.publishDate` | Parsed from release_date_str |
| `price` | `books.price` | Parsed from price_str |
| `currency` | `'VND'` | `'VND'` |
| `is_special` | `true` if volume < 10000 | `true` if special edition |
| `is_digital` | `release.digital` | — |
| `translator` | — | Parsed from licensed_books |
| `page_count` | — | Parsed from licensed_books |

---

### 7. `series_links`

External links associated with a series — streaming platforms, official sites, purchase links, etc.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigserial` | `PRIMARY KEY` | Auto-increment ID |
| `series_id` | `int` | `NOT NULL`, `FK → series(id) ON DELETE CASCADE` | Parent series |
| `link_type` | `text` | `NOT NULL`, `CHECK (...)` | `purchase`, `stream`, `official`, `wiki`, `anilist`, `trailer` |
| `label` | `text` | `NOT NULL` | Display label (e.g. "Crunchyroll", "YouTube Trailer") |
| `url` | `text` | `NOT NULL` | Full URL |
| `affiliate_code` | `text` | | Affiliate tracking code (future use) |
| `is_active` | `boolean` | `NOT NULL DEFAULT true` | Whether the link is still valid |
| `sort_order` | `int` | | Display order (lower = higher priority) |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Record creation time |

**Unique constraint**: `(series_id, url)`

**Indexes**: `(series_id) WHERE is_active = true`, `link_type`

**Data by source**:

| Source | Link Types | Examples |
|---|---|---|
| Anime (AniList) | `anilist` (sort 1), `trailer` (sort 5), `stream` (sort 3), `official` (sort 10) | Crunchyroll, Muse Asia, Bilibili |
| Manga (pb.tana.moe) | `official` (tana.moe links), `purchase` (other links) | Tana.moe purchase links |
| Novels (Hako) | `purchase`, `official` | Hako.vn purchase links |

---

### 8. `adaptations`

Cross-type relationships between series. Links an anime to its source manga, a manga to its anime adaptation, sequels/prequels, etc. Both `source_id` and `target_id` reference the `series` table.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigserial` | `PRIMARY KEY` | Auto-increment ID |
| `source_id` | `int` | `NOT NULL`, `FK → series(id) ON DELETE CASCADE` | Source series |
| `target_id` | `int` | `NOT NULL`, `FK → series(id) ON DELETE CASCADE` | Target series |
| `relation_type` | `text` | `NOT NULL`, `CHECK (...)` | `ADAPTATION`, `SOURCE`, `ALTERNATIVE`, `SPIN_OFF`, `CHARACTER`, `SEQUEL`, `PREQUEL`, `SIDE_STORY`, `SUMMARY`, `OTHER`, `COMPILATION`, `CONTAINS`, `PARENT` |

**Constraints**: `CHECK (source_id <> target_id)` — no self-references; `UNIQUE (source_id, target_id)`

**Indexes**: `source_id`, `target_id`, `relation_type`

**Data source**: `sync_anime.py` — AniList `relations.edges` (anime-to-anime only currently). Cross-type adaptations (anime ↔ manga) would need a separate matching step.

---

### 9. `episodes`

Per-episode data for anime, sourced from MAL via the Jikan API. Provides episode titles, air dates, scores, and filler/recap flags.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigserial` | `PRIMARY KEY` | Auto-increment ID |
| `series_id` | `int` | `NOT NULL`, `FK → series(id) ON DELETE CASCADE` | Parent anime series |
| `episode_number` | `int` | `NOT NULL` | Episode number (1-based) |
| `title` | `text` | | Episode title (English) |
| `title_japanese` | `text` | | Episode title (Japanese) |
| `aired_at` | `timestamptz` | | When the episode aired |
| `score` | `numeric(4,2)` | | MAL per-episode score (0–10) |
| `filler` | `boolean` | `NOT NULL DEFAULT false` | Filler episode flag |
| `recap` | `boolean` | `NOT NULL DEFAULT false` | Recap episode flag |
| `mal_url` | `text` | | Direct MAL episode URL |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Record creation time |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Last modified |

**Unique constraint**: `(series_id, episode_number)`

**Indexes**: `series_id`, `(series_id, score DESC) WHERE score IS NOT NULL`, `aired_at DESC`

**Data source**: `sync_anime.py --with-episodes` — MAL/Jikan API (`/anime/{mal_id}/episodes`).

**Sync behavior**: Upsert on `(series_id, episode_number)` — re-running overwrites existing data for the same episode. Deduplication within a batch prevents "ON CONFLICT cannot affect row a second time" errors.

---

### 10. `stat_snapshots`

Time-series data capturing statistics at specific points. Originally designed as weekly snapshots, now **episode-based** — each row is tied to a specific aired episode number, so re-running while the same episode is current overwrites the row instead of creating duplicates.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigserial` | `PRIMARY KEY` | Auto-increment ID |
| `series_id` | `int` | `NOT NULL`, `FK → series(id) ON DELETE CASCADE` | Parent series |
| `week_start` | `date` | `NOT NULL` | Monday of the week when the snapshot was taken |
| `aired_episode` | `int` | `NOT NULL DEFAULT 0` | Episode number that was current at sync time |
| `payload` | `jsonb` | `NOT NULL` | Flexible JSON blob of stats (see payload schema below) |

**Unique constraint**: `(series_id, aired_episode)` — one snapshot per episode milestone.

**Indexes**: `(series_id, aired_episode DESC)`, `(series_id, week_start DESC, aired_episode DESC)`

**Payload schema** (anime snapshots):

```json
{
  "mean_score": 72.5,
  "popularity": 185000,
  "favourites": 4200,
  "trending": 12,
  "aired_episodes": 5,
  "current_episode_score": 7.8,
  "score_distribution": {"10": 5, "20": 120, "30": 450, ...},
  "status_distribution": {"CURRENT": 50000, "COMPLETED": 40000, ...}
}
```

**Payload schema** (manga snapshots):

```json
{
  "md_rating": 8.15,
  "md_follows": 125000
}
```

**Data source**: `sync_anime.py --snapshot` — builds from AniList data + MAL episode scores. Also auto-captured weekly by `fn_capture_weekly_snapshots()` via pg_cron (every Monday 02:00 UTC).

**Sync behavior**: Same episode number = overwrite. New episode = new row. Each snapshot is a permanent data milestone.

---

### 11. `mangadex_ref`

Raw reference layer for MangaDex data. Used as an intermediate staging table for matching MangaDex entries to LiDex series. Not directly exposed in the API.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `mangadex_id` | `uuid` | `PRIMARY KEY` | MangaDex UUID |
| `series_id` | `int` | `FK → series(id) ON DELETE SET NULL` | Matched LiDex series (nullable until matched) |
| `title_en` | `text` | `NOT NULL` | English title from MangaDex |
| `title_ja` | `text` | | Japanese title |
| `cover_url` | `text` | | Cover image URL |
| `md_rating` | `numeric(4,2)` | | MangaDex Bayesian rating |
| `md_follows` | `int` | | Follow count |
| `genres` | `text[]` | `NOT NULL DEFAULT '{}'` | Genre tags |
| `demographic` | `text` | | Target demographic |
| `content_rating` | `text` | | Content rating |
| `original_language` | `text` | `NOT NULL DEFAULT 'ja'` | Original language code |
| `fetched_at` | `timestamptz` | `NOT NULL DEFAULT now()` | When this row was fetched |
| `matched_at` | `timestamptz` | | When it was matched to a series |

**Indexes**: `(series_id) WHERE series_id IS NOT NULL`, `title_en` (trigram fuzzy search)

**Data source**: Not yet populated — reserved for a future MangaDex sync script.

---

### 12. `voting_periods`

Defines time windows for community voting on light novels. Each period represents a month/year combination.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | `PRIMARY KEY` | Auto-increment ID |
| `month` | `int` | `NOT NULL`, `CHECK (1–12)` | Month number |
| `year` | `int` | `NOT NULL`, `CHECK (> 2000)` | Year |
| `label` | `text` | | Human-readable label (e.g. "Tháng 3/2026") |

**Unique constraint**: `(month, year)`

**Data source**: Manually created or via a future voting management interface. Not populated by any sync script.

---

### 13. `voting_results`

Community vote counts and rankings for light novels within a voting period.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | `PRIMARY KEY` | Auto-increment ID |
| `series_id` | `int` | `NOT NULL`, `FK → series(id) ON DELETE CASCADE` | Voted series |
| `period_id` | `int` | `NOT NULL`, `FK → voting_periods(id) ON DELETE CASCADE` | Voting period |
| `votes` | `int` | `NOT NULL DEFAULT 0` | Vote count |
| `rank` | `int` | | Rank within the period |

**Unique constraint**: `(series_id, period_id)`

**Indexes**: `series_id`, `period_id`, `rank WHERE rank IS NOT NULL`

**Data source**: Community voting feature (not yet implemented).

---

## Views

### `v_series_full`

Joins `series` with all three meta tables and publishers. Returns one row per series with all metadata flattened into columns prefixed by type (`anime_*`, `manga_*`, `novel_*`). Used as the detail page API endpoint.

**Columns**: All series columns + `publisher_name` + `anime_format`, `anime_episodes`, `anime_mean_score`, ..., `manga_rating`, `manga_demographic`, ..., `novel_volume_count`, `novel_is_completed`

### `v_novel_latest_votes`

Shows the latest voting result for each novel. Joins `voting_results` → `voting_periods` → `series` → `publishers` and picks the most recent period per series. Also fetches the latest volume cover.

### `v_trend_last_12w`

Returns the last 12 weeks of stat_snapshots for trend chart rendering. Flattens the JSONB `payload` into individual columns. Ordered by `series_id` then `aired_episode DESC`. Used for anime popularity/score trend visualization.

---

## Triggers & Auto-Functions

| Trigger | Table | Event | Function | Purpose |
|---|---|---|---|---|
| `trg_anime_touch` | `anime_meta` | INSERT, UPDATE | `fn_touch_series_updated()` | Auto-update `series.updated_at` when anime meta changes |
| `trg_manga_touch` | `manga_meta` | INSERT, UPDATE | `fn_touch_series_updated()` | Auto-update `series.updated_at` when manga meta changes |
| `trg_novel_touch` | `novel_meta` | INSERT, UPDATE | `fn_touch_series_updated()` | Auto-update `series.updated_at` when novel meta changes |
| `trg_volume_count` | `volumes` | INSERT, UPDATE, DELETE | `fn_sync_volume_count()` | Auto-recalculate `novel_meta.volume_count` when volumes change |
| `trg_series_slug` | `series` | INSERT (before) | `fn_generate_slug()` | Auto-generate URL slug from title (with uniqueness check) |

---

## Data Sources & Sync Scripts

### `sync_anime.py`

| Setting | Value |
|---|---|
| Source | AniList GraphQL API (currently airing only) |
| Secondary | MAL/Jikan API (episodes, optional via `--with-episodes`) |
| Default limit | 500 anime (top by popularity) |
| Writes to | `series`, `anime_meta`, `series_links`, `adaptations`, `stat_snapshots`, `episodes` |
| Dedup key | `anilist_id` (series), `series_id` (meta), `series_id,url` (links), `series_id,episode_number` (episodes) |
| CLI flags | `--total N`, `--snapshot`, `--with-episodes` |

### `sync_manga.py`

| Setting | Value |
|---|---|
| Source | pb.tana.moe PocketBase REST API |
| Rate limit | 1.5s between API page fetches |
| Total titles | ~800 manga-filtered titles (from 1,098 total) |
| Total volumes | ~4,800+ volumes with price & release date |
| Publishers | 36 Vietnamese publishers auto-seeded |
| Writes to | `publishers`, `series`, `manga_meta`, `volumes`, `series_links` |
| Dedup key | `name,country` (publishers), `slug` (series), `series_id` (meta), `series_id,volume_number` (volumes) |
| CLI flags | `--dry-run`, `--skip-existing`, `--skip-books`, `--delay N`, `--total N` |

### `sync_novels.py`

| Setting | Value |
|---|---|
| Source | Hako `licensed_books.sql` MariaDB dump file |
| Format | Custom SQL tokenizer (handles MariaDB escaping) |
| Writes to | `publishers`, `series`, `novel_meta`, `volumes`, `series_links` |
| Dedup key | `name,country` (publishers), `slug` (series), `series_id` (meta), `series_id,volume_number` (volumes) |

---

## What Data Currently Exists

### After running `sync_anime.py`

| Table | Approx. Rows | Content |
|---|---|---|
| `series` (item_type='anime') | ~500 | Currently airing anime from AniList |
| `anime_meta` | ~500 | Format, scores, popularity, distributions, airing schedule |
| `series_links` (anime) | ~1,500+ | AniList links, YouTube trailers, streaming platforms (Crunchyroll, etc.) |
| `adaptations` | ~800+ | Anime-to-anime relations (sequels, prequels, spin-offs, sources) |
| `episodes` | ~5,000+ | Per-episode titles, air dates, scores (if `--with-episodes` used) |
| `stat_snapshots` (anime) | ~500 | Episode-based snapshots with score/status distributions |
| `publishers` | 0 | Anime does not populate this table |

### After running `sync_manga.py`

| Table | Approx. Rows | Content |
|---|---|---|
| `publishers` | ~36 | Vietnamese publishers (IPM, Kim Dong, Wings, Tre, etc.) |
| `series` (item_type='manga') | ~800 | Manga/manhwa/manhua licensed in Vietnam |
| `manga_meta` | ~800 | Demographic, original language, VN license info |
| `volumes` | ~4,800+ | Individual volumes with price (VND), release date, cover |
| `series_links` (manga) | ~800+ | Tana.moe official links, purchase links |

### After running `sync_novels.py`

| Table | Approx. Rows | Content |
|---|---|---|
| `publishers` | ~50+ | Vietnamese LN publishers |
| `series` (item_type='novel') | ~300+ | Light novels licensed in Vietnam |
| `novel_meta` | ~300+ | Volume count (auto-calculated), completion status |
| `volumes` | ~4,000+ | LN volumes with price, translator, page count |
| `series_links` (novel) | ~300+ | Hako.vn purchase links |

### Tables with no data (reserved for future use)

| Table | Purpose | Status |
|---|---|---|
| `mangadex_ref` | MangaDex reference layer for matching | Not yet synced — reserved for future `sync_mangadex.py` |
| `voting_periods` | Monthly voting windows | Not yet created — reserved for community voting feature |
| `voting_results` | Vote counts per period | Not yet created — reserved for community voting feature |

### Notable gaps in current data

| Missing Data | Table | Reason | Potential Source |
|---|---|---|---|
| MangaDex ratings/follows | `manga_meta` | pb.tana.moe doesn't have MangaDex data | Future `sync_mangadex.py` |
| MangaDex ID | `series.mangadex_id` | Not available from pb.tana.moe | Future `sync_mangadex.py` |
| Anime season info (finished) | `anime_meta` | Only syncs currently airing (RELEASING) | Extend sync to FINISHED status |
| Manga descriptions | `series.description` | pb.tana.moe descriptions are Vietnamese-only | AniList enrichment or manual |
| Novel descriptions | `series.description` | Hako SQL dump doesn't have descriptions | AniList enrichment or manual |
| Cross-type adaptations | `adaptations` | Only anime→anime from AniList | Would need series matching by title/ID |
| Episode data | `episodes` | Requires `--with-episodes` flag | `sync_anime.py --with-episodes` |
