import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'connected', time: new Date().toISOString() })

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

      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', time: new Date().toISOString() })
      }, 30000)

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
