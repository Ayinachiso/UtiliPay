'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'

export default function ResidentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, residentMember, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (!residentMember) {
      router.push('/login?need=resident')
    }
  }, [user, residentMember, loading, router])

  if (loading || !residentMember) return null
  return <>{children}</>
}
