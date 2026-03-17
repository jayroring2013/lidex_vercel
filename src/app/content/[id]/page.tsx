'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchSeries, fetchVoteCount, submitVote } from '@/lib/api'
import { useRealtime } from '@/hooks/useRealtime'
// ... imports

export default function ContentDetail() {
  const params = useParams()
  const [series, setSeries] = useState(null)
  const [voteCount, setVoteCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const realtime = useRealtime(params.id as string)

  useEffect(() => {
    async function loadData() {
      if (!params.id) return

      try {
        const data = await fetchSeries(parseInt(params.id as string))
        setSeries(data)

        const votes = await fetchVoteCount(parseInt(params.id as string))
        setVoteCount(votes.count)
      } catch (error) {
        console.error('Failed to load:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [params.id])

  // Update vote count from realtime
  useEffect(() => {
    if (realtime.voteCount > 0) {
      setVoteCount(prev => prev + realtime.voteCount)
    }
  }, [realtime.voteCount])

  const handleVote = async () => {
    try {
      await submitVote(parseInt(params.id as string))
      setVoteCount(prev => prev + 1)
    } catch (error: any) {
      alert('Failed to vote: ' + error.message)
    }
  }

  // ... rest of component
}
