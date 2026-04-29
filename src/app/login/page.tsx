'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
  }

  const handleKakaoLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center px-4">

      {/* 로고 영역 */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-orange-500 mb-2">
          🍜YUMMAP
        </h1>
        <p className="text-gray-500 text-lg">
          입맛으로 찾는 맛집 지도
        </p>
      </div>

      {/* 로그인 카드 */}
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
          시작하기
        </h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          나만의 입맛 맛집 지도를 만들어보세요
        </p>

        {/* 카카오 로그인 */}
        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 px-4 rounded-xl mb-3 transition-all"
        >
          <span className="text-xl">💬</span>
          카카오로 시작하기
        </button>

        {/* 구글 로그인 */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-xl border border-gray-200 transition-all"
        >
          <span className="text-xl">🔍</span>
          구글로 시작하기
        </button>

        {loading && (
          <p className="text-center text-gray-400 text-sm mt-4">
            로그인 중...
          </p>
        )}
      </div>

      {/* 하단 문구 */}
      <p className="text-gray-400 text-xs mt-8 text-center">
        로그인 시 서비스 이용약관 및<br />
        개인정보처리방침에 동의합니다
      </p>

    </div>
  )
}
