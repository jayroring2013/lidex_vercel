// migrate-novel-covers.js
// Migrates light novel cover images from external URLs to Supabase Storage
// Run via GitHub Codespaces: https://codespaces.new/<your-github-username>/<your-repo>

import supabase from '@/lib/supabaseClient'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getExtFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i);
    if (match) return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  } catch {}
  return 'jpg'; // default fallback
}

function getExtFromContentType(contentType) {
  if (!contentType) return 'jpg';
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  return map[contentType.split(';')[0].trim()] || 'jpg';
}

async function migrateSeriesCovers() {
  console.log('📦 Fetching novel series with cover_url...');

  const { data: rows, error } = await supabase
    .from('series')
    .select('id, slug, cover_url')
    .eq('item_type', 'novel')
    .not('cover_url', 'is', null);

  if (error) {
    console.error('❌ Error fetching series:', error.message);
    return;
  }

  console.log(`Found ${rows.length} novel series with cover_url`);
  console.log(`Processing in batches of ${BATCH_SIZE}...\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Skip if already a Supabase Storage URL
    if (row.cover_url.includes('supabase.co/storage')) {
      console.log(`⏭️  [${i + 1}/${rows.length}] Series #${row.id} "${row.slug}" — already on Supabase Storage`);
      skipped++;
      continue;
    }

    try {
      console.log(`⬇️  [${i + 1}/${rows.length}] Downloading cover for Series #${row.id} "${row.slug}"...`);
      console.log(`    URL: ${row.cover_url}`);

      const response = await fetch(row.cover_url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: new URL(row.cover_url).origin,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const ext = getExtFromContentType(contentType) || getExtFromUrl(row.cover_url);
      const buffer = Buffer.from(await response.arrayBuffer());

      if (buffer.length < 1000) {
        throw new Error(`Image too small (${buffer.length} bytes), likely an error page`);
      }

      // File path in storage: covers/{id}.jpg
      const filePath = `covers/${row.id}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, buffer, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Update the series table
      const { error: updateError } = await supabase
        .from('series')
        .update({ cover_url: publicUrl })
        .eq('id', row.id);

      if (updateError) throw updateError;

      console.log(`✅ Series #${row.id} "${row.slug}" → ${publicUrl} (${(buffer.length / 1024).toFixed(1)}KB)`);
      success++;
    } catch (err) {
      console.error(`❌ Series #${row.id} "${row.slug}" — ${err.message}`);
      failed++;
    }

    // Delay between requests
    if (i < rows.length - 1) await sleep(DELAY_MS);
  }

  console.log('\n═══════════════════════════════════');
  console.log(`Series covers done: ✅ ${success} success, ❌ ${failed} failed, ⏭️ ${skipped} skipped`);
  console.log('═══════════════════════════════════\n');

  return { success, failed, skipped };
}

async function migrateVolumeCovers() {
  console.log('📦 Fetching novel volume covers...');

  // Get all series IDs for novels
  const { data: novelSeries, error: seriesError } = await supabase
    .from('series')
    .select('id')
    .eq('item_type', 'novel');

  if (seriesError) {
    console.error('❌ Error fetching novel series:', seriesError.message);
    return;
  }

  const seriesIds = novelSeries.map((s) => s.id);

  const { data: rows, error } = await supabase
    .from('volumes')
    .select('id, series_id, volume_number, cover_url')
    .in('series_id', seriesIds)
    .not('cover_url', 'is', null);

  if (error) {
    console.error('❌ Error fetching volumes:', error.message);
    return;
  }

  console.log(`Found ${rows.length} novel volumes with cover_url\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Skip if already on Supabase Storage
    if (row.cover_url.includes('supabase.co/storage')) {
      console.log(
        `⏭️  [${i + 1}/${rows.length}] Volume #${row.id} (Series ${row.series_id}, Vol ${row.volume_number ?? '?'}) — already on Supabase Storage`
      );
      skipped++;
      continue;
    }

    try {
      console.log(
        `⬇️  [${i + 1}/${rows.length}] Downloading Volume #${row.id} (Series ${row.series_id}, Vol ${row.volume_number ?? '?'})...`
      );
      console.log(`    URL: ${row.cover_url}`);

      const response = await fetch(row.cover_url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: new URL(row.cover_url).origin,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const ext = getExtFromContentType(contentType) || getExtFromUrl(row.cover_url);
      const buffer = Buffer.from(await response.arrayBuffer());

      if (buffer.length < 1000) {
        throw new Error(`Image too small (${buffer.length} bytes), likely an error page`);
      }

      // File path: volumes/{series_id}/{volume_number}.jpg
      const volLabel = row.volume_number != null ? `vol-${row.volume_number}` : `id-${row.id}`;
      const filePath = `volumes/${row.series_id}/${volLabel}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, buffer, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('volumes')
        .update({ cover_url: publicUrl })
        .eq('id', row.id);

      if (updateError) throw updateError;

      console.log(
        `✅ Volume #${row.id} (Vol ${row.volume_number ?? '?'}) → ${publicUrl} (${(buffer.length / 1024).toFixed(1)}KB)`
      );
      success++;
    } catch (err) {
      console.error(
        `❌ Volume #${row.id} (Series ${row.series_id}, Vol ${row.volume_number ?? '?'}) — ${err.message}`
      );
      failed++;
    }

    if (i < rows.length - 1) await sleep(DELAY_MS);
  }

  console.log('\n═══════════════════════════════════');
  console.log(`Volume covers done: ✅ ${success} success, ❌ ${failed} failed, ⏭️ ${skipped} skipped`);
  console.log('═══════════════════════════════════\n');

  return { success, failed, skipped };
}

// ──── MAIN ────────────────────────────────────────────────
async function main() {
  console.log('🚀 LiDex Novel Cover Migration to Supabase Storage');
  console.log('===================================================\n');

  // Step 1: Migrate series covers
  const seriesResult = await migrateSeriesCovers();

  // Step 2: Migrate volume covers
  const volumeResult = await migrateVolumeCovers();

  // Summary
  console.log('🏁 ALL DONE');
  console.log(`   Series covers:  ✅ ${seriesResult.success} | ❌ ${seriesResult.failed} | ⏭️ ${seriesResult.skipped}`);
  console.log(`   Volume covers:  ✅ ${volumeResult.success} | ❌ ${volumeResult.failed} | ⏭️ ${volumeResult.skipped}`);
}

main().catch(console.error);
