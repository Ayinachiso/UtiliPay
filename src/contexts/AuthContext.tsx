'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'

export type AuthMember = {
  id: string
  user_id: string
  community_id: string
  unit_id: string | null
  role: 'admin' | 'resident'
  full_name: string
  email: string | null
  phone: string | null
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  members: AuthMember[]
  adminMember: AuthMember | null
  residentMember: AuthMember | null
  loading: boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Supabase's auth client uses a Web Lock for request coordination.
 * In dev (Strict Mode + HMR) this can abort in-flight queries, surfacing as
 * either an AbortError or "Lock broken by another request with the 'steal' option."
 * Both are harmless: the next attempt always succeeds. Detect + ignore + retry.
 */
function isBenignAbortMessage(message: string | undefined): boolean {
  if (!message) return false
  return /AbortError/i.test(message) || /Lock broken/i.test(message)
}

function isBenignAbortError(err: unknown): boolean {
  if (err instanceof Error) return isBenignAbortMessage(err.message)
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return isBenignAbortMessage(String((err as { message: unknown }).message))
  }
  return false
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Fetch member rows for the given user, retrying on benign abort.
 * Returns:
 *   AuthMember[] — success (possibly empty)
 *   null        — gave up after retries; caller should keep existing state
 */
async function fetchMembers(
  userId: string,
  retries = 3
): Promise<AuthMember[] | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, user_id, community_id, unit_id, role, full_name, email, phone')
        .eq('user_id', userId)

      if (!error) return (data ?? []) as AuthMember[]

      if (isBenignAbortMessage(error.message)) {
        if (attempt < retries) {
          await sleep(180 * (attempt + 1))
          continue
        }
        return null
      }

      console.error('[AuthContext] fetchMembers failed:', error.message)
      return []
    } catch (err) {
      if (isBenignAbortError(err)) {
        if (attempt < retries) {
          await sleep(180 * (attempt + 1))
          continue
        }
        return null
      }
      console.error('[AuthContext] fetchMembers threw:', err)
      return []
    }
  }
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [members, setMembers] = useState<AuthMember[]>([])
  const [loading, setLoading] = useState(true)

  const adminMember = members.find((m) => m.role === 'admin') ?? null
  const residentMember = members.find((m) => m.role === 'resident') ?? null

  const syncFromSession = async (nextSession: Session | null) => {
    setSession(nextSession)
    setUser(nextSession?.user ?? null)

    if (!nextSession?.user) {
      setMembers([])
      setLoading(false)
      return
    }

    const rows = await fetchMembers(nextSession.user.id)
    if (rows === null) {
      setLoading(false)
      return
    }
    setMembers(rows)
    setLoading(false)
  }

  const refresh = async () => {
    if (!user) return
    const rows = await fetchMembers(user.id)
    if (rows !== null) setMembers(rows)
  }

  useEffect(() => {
    let active = true

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!active) return
        await syncFromSession(session)
      } catch (err) {
        if (!active) return
        if (!isBenignAbortError(err)) {
          console.error('[AuthContext] init failed:', err)
        }
        setLoading(false)
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      // Wrap the async work so a benign abort here never surfaces as an
      // unhandled rejection in the dev runtime overlay.
      syncFromSession(nextSession).catch((err) => {
        if (!isBenignAbortError(err)) {
          console.error('[AuthContext] onAuthStateChange handler failed:', err)
        }
      })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      if (!isBenignAbortError(err)) {
        console.error('[AuthContext] signOut failed:', err)
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        members,
        adminMember,
        residentMember,
        loading,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
