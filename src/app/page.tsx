import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-orange-50">
      <div className="max-w-md mx-auto px-4 py-8">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-orange-500">
            🍜YUMMAP
          </h1>
          <div className="text-sm text-gray-500">
            {user.email}
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            로그인 성공!
          </h2>
          <p className="text-gray-500 text-sm">
            얌맵에 오신 것을 환영합니다
          </p>
        </div>

      </div>
    </div>
  )
}
