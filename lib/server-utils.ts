// 📁 lib/server-utils.ts - Solo per Server Components
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getServerUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {
          // Non necessario per lettura
        },
        remove() {
          // Non necessario per lettura
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
