'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, adminMember, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (!adminMember) {
      // Authed but no admin role on this account. Bounce back to /login with
      // a hint so the login page can show the right error and preselect the
      // correct tab.
      router.push('/login?need=admin')
    }
  }, [user, adminMember, loading, router])

  if (loading || !adminMember) return null
  return <>{children}</>
}
