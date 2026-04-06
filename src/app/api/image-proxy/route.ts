import { NextRequest, NextResponse } from 'next/server'

// Map image hostname → correct Referer to pass hotlink protection
const REFERER_MAP: Record<string, string> = {
  // Docln / Hako domains
  'docln.net':                  'https://docln.net/',
  'i.docln.net':                'https://docln.net/',
  'i2.docln.net':               'https://docln.net/',
  'hako.re':                    'https://docln.net/',
  'i.hako.re':                  'https://docln.net/',
  'hako.vn':                    'https://docln.net/',
  'i.hako.vn':                  'https://docln.net/',
  'hako.vip':                   'https://docln.net/',
  'i.hako.vip':                 'https://docln.net/',
  'i2.hako.vip':                'https://docln.net/',
  // MangaDex
  'mangadex.org':               'https://mangadex.org/',
  'uploads.mangadex.org':       'https://mangadex.org/',
  // MyAnimeList
  'myanimelist.net':            'https://myanimelist.net/',
  'cdn.myanimelist.net':        'https://myanimelist.net/',
  // AniList
  'anilist.co':                 'https://anilist.co/',
  's4.anilist.co':              'https://anilist.co/',
  'img.anili.st':               'https://anilist.co/',
  // Kitsu
  'kitsu.app':                  'https://kitsu.app/',
  'media.kitsu.app':            'https://kitsu.app/',
  // RanobeDB
  'ranobedb.org':               'https://ranobedb.org/',
  'images.ranobedb.org':        'https://ranobedb.org/',
}

function getReferer(hostname: string): string {
  // Exact match first
  if (REFERER_MAP[hostname]) return REFERER_MAP[hostname]
  
  // Partial match (e.g. subdomain.hako.vip)
  for (const [key, val] of Object.entries(REFERER_MAP)) {
    if (hostname.endsWith(key)) return val
  }
  
  // Default: use the image's own origin so hotlink checks pass
  return `https://${hostname}/`
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('Missing url', { status: 400 })

  // Block only localhost and private IPs for security; allow all external image hosts
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
  let hostname: string
  try {
    const parsed = new URL(url)
    hostname = parsed.hostname
    
    if (
      blocked.some(b => hostname === b) || 
      hostname.match(/^10\./) || 
      hostname.match(/^192\.168\./) || 
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return new NextResponse('Domain not allowed', { status: 403 })
    }
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return new NextResponse('Invalid protocol', { status: 400 })
    }
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  try {
    const referer = getReferer(hostname)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer':    referer,
        'Accept':     'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return new NextResponse('Upstream error', { status: res.status })

    const blob  = await res.arrayBuffer()
    const ctype = res.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(blob, {
      headers: {
        'Content-Type':  ctype,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400', // 7 days
      },
    })
  } catch (e: any) {
    return new NextResponse('Proxy error', { status: 502 })
  }
}
