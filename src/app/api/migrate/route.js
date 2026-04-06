import supabase from '@/lib/supabaseClient'

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'novel-covers';
const BATCH_SIZE = 10; // images per request (keep under Vercel 10s limit)

function getExtFromUrl(url) {
  try {
    const match = new URL(url).pathname.match(/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i);
    if (match) return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  } catch {}
  return 'jpg';
}

function getExtFromContentType(contentType) {
  if (!contentType) return 'jpg';
  const map = {
    'image/jpeg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  };
  return map[contentType?.split(';')[0].trim()] || 'jpg';
}

async function migrateBatch(rows, type) {
  const results = [];

  for (const row of rows) {
    const label = type === 'series'
      ? `Series #${row.id} "${row.slug}"`
      : `Volume #${row.id} (Vol ${row.volume_number ?? '?'})`;

    // Skip if already migrated
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          Referer: new URL(row.cover_url).origin,
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get('content-type') || '';
      const ext = getExtFromContentType(contentType) || getExtFromUrl(row.cover_url);
      const buffer = Buffer.from(await response.arrayBuffer());

      if (buffer.length < 1000) throw new Error(`Image too small (${buffer.length}B), likely error page`);

      const filePath = type === 'series'
        ? `covers/${row.id}.${ext}`
        : `volumes/${row.series_id}/vol-${row.volume_number ?? row.id}.${ext}`;

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
        id: row.id, label, status: 'ok',
        newUrl: publicUrl,
        size: `${(buffer.length / 1024).toFixed(1)}KB`,
      });
    } catch (err) {
      results.push({ id: row.id, label, status: 'failed', error: err.message });
    }
  }

  return results;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'series'; // 'series' or 'vols'
  const dryRun = searchParams.get('dry') === '1';

  try {
    let rows, totalRemaining, tableLabel;

    if (type === 'vols') {
      // Get novel series IDs
      const { data: novelSeries } = await supabase
        .from('series')
        .select('id')
        .eq('item_type', 'novel');

      const seriesIds = novelSeries?.map((s) => s.id) || [];

      // Count remaining
      const { count: total } = await supabase
        .from('volumes')
        .select('*', { count: 'exact', head: true })
        .in('series_id', seriesIds)
        .not('cover_url', 'is', null)
        .not('cover_url', 'ilike', '%supabase.co/storage%');

      // Fetch batch (oldest first — those not yet migrated)
      const { data } = await supabase
        .from('volumes')
        .select('id, series_id, volume_number, cover_url')
        .in('series_id', seriesIds)
        .not('cover_url', 'is', null)
        .not('cover_url', 'ilike', '%supabase.co/storage%')
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      rows = data || [];
      totalRemaining = total || 0;
      tableLabel = 'volume';
    } else {
      // Count remaining series covers
      const { count: total } = await supabase
        .from('series')
        .select('*', { count: 'exact', head: true })
        .eq('item_type', 'novel')
        .not('cover_url', 'is', null)
        .not('cover_url', 'ilike', '%supabase.co/storage%');

      // Fetch batch
      const { data } = await supabase
        .from('series')
        .select('id, slug, cover_url')
        .eq('item_type', 'novel')
        .not('cover_url', 'is', null)
        .not('cover_url', 'ilike', '%supabase.co/storage%')
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      rows = data || [];
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
      summary: {
        processed: results.length,
        migrated: ok,
        failed,
        skipped,
        remaining: newRemaining,
      },
      message: newRemaining > 0
        ? `✅ ${ok} migrated this batch. ${newRemaining} remaining — call again to continue.`
        : `🎉 All ${tableLabel} covers migrated!`,
    });
  } catch (err) {
    return Response.json(
      { error: true, message: err.message },
      { status: 500 }
    );
  }
}
