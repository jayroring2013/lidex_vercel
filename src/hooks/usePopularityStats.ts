import { useEffect, useState } from 'react'

interface PopularityStats {
  min: number
  max: number
  p50: number
  p75: number
  p90: number
  p95: number
  p99: number
}

const CACHE_KEY = 'lidex_popularity_stats'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function usePopularityStats() {
  const [stats, setStats] = useState<PopularityStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem(CACHE_KEY)
    const cachedData = cached ? JSON.parse(cached) : null
    const cachedTime = cached ? localStorage.getItem(`${CACHE_KEY}_time`) : null

    if (cachedData && cachedTime) {
      const age = Date.now() - parseInt(cachedTime)
      if (age < CACHE_DURATION) {
        setStats(cachedData)
        setLoading(false)
        return
      }
    }

    // Fetch from API
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.popularityStats) {
          setStats(data.popularityStats)
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.popularityStats))
          localStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString())
        }
      })
      .catch(err => console.error('Failed to fetch popularity stats:', err))
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}
