// src/app/api/migrate/route.ts
//
// TEMPORARY migration endpoint — DELETE after use!
//
// Usage:
//   GET /api/migrate             → migrate series covers (batch of 10)
//   GET /api/migrate?type=vols   → migrate volume covers (batch of 10)
//   GET /api/migrate?dry=1       → dry run (just count, don't migrate)

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'novel-covers';
const BATCH_SIZE = 10;

// ⚠️ Use SERVICE ROLE key here — NOT the anon key from supabaseClient!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getExtFromUrl(url: string): string {
  try {
    const match = new URL(url).pathname.match(/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i);
    if (match) return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  } catch {}
  return 'jpg';
}

function getExtFromContentType(contentType: string | null): string {
  if (!contentType) return 'jpg';
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  return map[contentType.split(';')[0].trim()] || 'jpg';
}

interface SeriesRow {
  id: number;
  slug: string;
  cover_url: string | null;
}

interface VolumeRow {
  id: number;
  series_id: number;
  volume_number: number | null;
  cover_url: string | null;
}

interface MigrateResult {
  id: number;
  label: string;
  status: 'ok' | 'failed' | 'skipped';
  reason?: string;
  newUrl?: string;
  size?: string;
  error?: string;
}

async function migrateBatch(rows: (SeriesRow | VolumeRow)[], type: string): Promise<MigrateResult[]> {
  const results: MigrateResult[] = [];

  for (const row of rows) {
    const label =
      type === 'series'
        ? `Series #${row.id} "${(row as SeriesRow).slug}"`
        : `Volume #${row.id} (Vol ${(row as VolumeRow).volume_number ?? '?'})`;

    if (row.cover_url && row.cover_url.includes('supabase.co/storage')) {
      results.push({ id: row.id, label, status: 'skipped', reason: 'Already on Supabase Storage' });
      continue;
    }

    if (!row.cover_url) {
      results.push({ id: row.id, label, status: 'skipped', reason: 'No cover_url' });
      continue;
    }

    try {
      const response = await fetch(row.cover_url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          Referer: new URL(row.cover_url).origin,
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type') || '';
      const ext = getExtFromContentType(contentType) || getExtFromUrl(row.cover_url);
      const buffer = Buffer.from(await response.arrayBuffer());

      if (buffer.length < 1000) throw new Error(`Image too small (${buffer.length}B), likely error page`);

      const filePath =
        type === 'series'
          ? `covers/${row.id}.${ext}`
          : `volumes/${(row as VolumeRow).series_id}/vol-${(row as VolumeRow).volume_number ?? row.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, buffer, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const table = type === 'series' ? 'series' : 'volumes';
      const { error: updateError } = await supabase
        .from(table)
        .update({ cover_url: publicUrl })
        .eq('id', row.id);

      if (updateError) throw updateError;

      results.push({
        id: row.id,
        label,
        status: 'ok',
        newUrl: publicUrl,
        size: `${(buffer.length / 1024).toFixed(1)}KB`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: row.id, label, status: 'failed', error: message });
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'series';
  const dryRun = searchParams.get('dry') === '1';

  try {
    let rows: (SeriesRow | VolumeRow)[];
    let totalRemaining: number;
    let tableLabel: string;

    if (type === 'vols') {
      const { data: novelSeries } = await supabase
        .from('series')
        .select('id')
        .eq('item_type', 'novel');

      const seriesIds = novelSeries?.map((s: { id: number }) => s.id) || [];

      const { count: total } = await supabase
        .from('volumes')
        .select('*', { count: 'exact', head: true })
        .in('series_id', seriesIds)
        .not('cover_url', 'is', null)
        .not('cover_url', 'ilike', '%supabase.co/storage%');

      const { data } = await supabase
        .from('volumes')
        .select('id, series_id, volume_number, cover_url')
        .in('series_id', seriesIds)
        .not('cover_url', 'is', null)
        .not('cover_url', 'ilike', '%supabase.co/storage%')
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      rows = (data || []) as VolumeRow[];
      totalRemaining = total || 0;
      tableLabel = 'volume';
    } else {
      const { count: total } = await supabase
        .from('series')
        .select('*', { count: 'exact', head: true })
        .eq('item_type', 'novel')
        .not('cover_url', 'is', null)
        .not('cover_url', 'ilike', '%supabase.co/storage%');

      const { data } = await supabase
        .from('series')
        .select('id, slug, cover_url')
        .eq('item_type', 'novel')
        .not('cover_url', 'is', null)
        .not('cover_url', 'ilike', '%supabase.co/storage%')
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      rows = (data || []) as SeriesRow[];
      totalRemaining = total || 0;
      tableLabel = 'series';
    }

    if (dryRun) {
      return Response.json({
        type,
        remaining: totalRemaining,
        thisBatch: rows.length,
        message: `DRY RUN — ${totalRemaining} ${tableLabel} covers left to migrate`,
        sample: rows.slice(0, 3).map((r) => r.cover_url),
      });
    }

    const results = await migrateBatch(rows, type);

    const ok = results.filter((r) => r.status === 'ok').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const newRemaining = totalRemaining - ok;

    return Response.json({
      type,
      batch: results,
      summary: { processed: results.length, migrated: ok, failed, skipped, remaining: newRemaining },
      message:
        newRemaining > 0
          ? `✅ ${ok} migrated this batch. ${newRemaining} remaining — call again to continue.`
          : `🎉 All ${tableLabel} covers migrated!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: true, message }, { status: 500 });
  }
}
