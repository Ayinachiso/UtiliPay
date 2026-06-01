import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * In-memory request serializer. Replaces Supabase's default `navigator.locks`
 * based Web Lock, which is designed to coordinate auth across multiple browser
 * tabs but tends to deadlock in dev with React Strict Mode + HMR + Next.js
 * Fast Refresh (all three of which cause repeated mounts that try to "steal"
 * the lock from each other).
 *
 * This queue serializes auth requests within THIS tab only. For a development
 * MVP that is more than sufficient and avoids the "Lock broken by another
 * request with the 'steal' option" cascade entirely.
 *
 * In production we would swap back to navigator.locks via the default, but
 * for the hackathon this is safer.
 */
let authQueue: Promise<unknown> = Promise.resolve()

function inMemoryLock<R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  const next = authQueue.then(() => fn())
  // Keep the queue alive even if a task rejects; we still want subsequent
  // tasks to run, just not chain on the rejection.
  authQueue = next.catch(() => undefined)
  return next
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: inMemoryLock,
  },
})
