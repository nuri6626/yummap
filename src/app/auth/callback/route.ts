import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 로그인한 유저 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // 온보딩 완료 여부 확인 (nickname이 있으면 완료된 것)
        const { data: profile } = await supabase
          .from('user_taste_profile')
          .select('nickname')
          .eq('user_id', user.id)
          .single()

        if (profile?.nickname) {
          // 온보딩 완료 → 맵으로 이동
          return NextResponse.redirect(new URL('/map', requestUrl.origin))
        } else {
          // 온보딩 미완료 → 온보딩으로 이동
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
        }
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin))
}
