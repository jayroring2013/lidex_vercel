import { useEffect, useState } from 'react'

export function useRealtime(seriesId?: number) {
  const [voteCount, setVoteCount] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const eventSource = new EventSource('/api/realtime')

    eventSource.onopen = () => {
      console.log('🔌 Connected to realtime stream')
      setConnected(true)
    }

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'vote:created') {
        // Increment vote count when new vote arrives
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
  }, [])

  return { voteCount, connected }
}
