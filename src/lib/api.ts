const API_BASE = '/api'

export async function fetchSeries(id?: number, options?: any) {
  const url = id
    ? `${API_BASE}/series/${id}`
    : `${API_BASE}/series?${new URLSearchParams(options as any)}`

  const res = await fetch(url, {
    cache: 'no-store'
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch')
  }

  return res.json()
}

export async function fetchVoteCount(seriesId: number) {  // ✅ Accept number
  const res = await fetch(`${API_BASE}/votes?seriesId=${seriesId}`)

  if (!res.ok) throw new Error('Failed to fetch votes')

  return res.json()
}

export async function submitVote(seriesId: number) {  // ✅ Accept number
  const res = await fetch(`${API_BASE}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novel_id: seriesId }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to submit vote')
  }

  return res.json()
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`, {
    cache: 'no-store'
  })

  if (!res.ok) throw new Error('Failed to fetch stats')

  return res.json()
}
