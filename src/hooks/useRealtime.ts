import { useEffect, useState } from 'react'

export function useRealtime(seriesId?: number) {  // ✅ Accept number or undefined
  const [voteCount, setVoteCount] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!seriesId) return  // ✅ Exit early if no ID

    const eventSource = new EventSource('/api/realtime')

    eventSource.onopen = () => {
      console.log('🔌 Connected to realtime stream')
      setConnected(true)
    }

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'vote:created') {
        setVoteCount(prev => prev + 1)
      }

      console.log('📡 Realtime update:', data)
    }

    eventSource.onerror = (error) => {
      console.error('❌ Realtime connection error:', error)
      setConnected(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [seriesId])  // ✅ Dependency on seriesId

  return { voteCount, connected }
}
