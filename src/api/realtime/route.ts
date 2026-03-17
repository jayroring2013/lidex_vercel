import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'  // ← ADD THIS IMPORT
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Send initial connection message
      send({ type: 'connected', time: new Date().toISOString() })

      // Listen to Supabase Realtime changes
      const channel = supabase
        .channel('realtime-votes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'novel_votes' },
          (payload) => {
            send({
              type: 'vote:created',
              data: payload.new,
              timestamp: new Date().toISOString()
            })
          }
        )
        .subscribe()

      // Keep connection alive
      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', time: new Date().toISOString() })
      }, 30000)

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        supabase.removeChannel(channel)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
