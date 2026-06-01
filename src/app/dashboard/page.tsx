'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: member } = await supabase
        .from('members')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (member?.role === 'admin') {
        router.push('/admin')
        return
      }

      router.push('/resident')
    }

    run()
  }, [router])

  return (
    <div className="p-6">
        <div className="flex items-center gap-3">
          <img src="/images/utilipay_logo.png" alt="UtiliPay Logo" className="w-20 h-20" />
        </div>
      Loading dashboard…
    </div>
  )
}