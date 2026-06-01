/**
 * Server-side Supabase client that bypasses Row Level Security.
 * USE WITH CARE — only from server-side code (API routes, Server Components).
 * Never import this from a "use client" component or you'll leak the service-role key.
 */

import { createClient } from '@supabase/supabase-js'

let cached: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

  cached = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return cached
}
