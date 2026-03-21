import { createClient } from '@supabase/supabase-js'

// Singleton — one client instance shared across the entire app
// Prevents "Multiple GoTrueClient instances" warning
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default supabase
