'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) alert('구글 로그인 오류: ' + error.message)
    } catch (err) {
      alert('오류: ' + err)
    } finally {
      setLoading(false)
    }
  }

  const handleKakaoLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) alert('카카오 로그인 오류: ' + error.message)
    } catch (err) {
      alert('오류: ' + err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ══ 로고 영역 — yum1.png 고정 ══ */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 56,
          animation: 'fadeUp 0.5s ease both',
        }}
      >
        <img
          src="/yum1.png"
          alt="YumMap"
          style={{
            width: 200,
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto 20px',
          }}
        />
        <p
          style={{
            fontSize: 14,
            color: '#555',
            fontWeight: 500,
            margin: '0 0 4px',
            letterSpacing: '-0.2px',
          }}
        >
          입맛으로 찾는 맛집 지도
        </p>
        <p style={{ fontSize: 12, color: '#bbb', margin: 0, letterSpacing: '0.3px' }}>
          Where Your Taste Belongs
        </p>
      </div>

      {/* ══ 로그인 카드 ══ */}
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          animation: 'fadeUp 0.5s 0.1s ease both',
        }}
      >
        {/* 타이틀 */}
        <p
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#111',
            textAlign: 'center',
            marginBottom: 6,
            letterSpacing: '-0.5px',
          }}
        >
          시작하기
        </p>
        <p
          style={{
            fontSize: 13,
            color: '#999',
            textAlign: 'center',
            marginBottom: 32,
            letterSpacing: '-0.2px',
          }}
        >
          나만의 입맛 맛집 지도를 만들어보세요
        </p>

        {/* 카카오 로그인 */}
        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: '#FEE500',
            color: '#111',
            fontWeight: 800,
            fontSize: 15,
            padding: '15px',
            borderRadius: 14,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 10,
            letterSpacing: '-0.3px',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s, transform 0.1s',
          }}
          onMouseDown={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#111">
            <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.6 5.07 4 6.52L5 21l4.3-2.8c.88.2 1.78.3 2.7.3 5.52 0 10-3.48 10-7.7C22 6.48 17.52 3 12 3z" />
          </svg>
          카카오로 시작하기
        </button>

        {/* 구글 로그인 */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: '#fff',
            color: '#111',
            fontWeight: 700,
            fontSize: 15,
            padding: '15px',
            borderRadius: 14,
            border: '1.5px solid #E0E0E0',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 10,
            letterSpacing: '-0.3px',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s, transform 0.1s',
          }}
          onMouseDown={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          {/* Google SVG 로고 */}
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.5 29.2 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.5 7.1 29 5 24 5 12.4 5 3 14.4 3 26s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"/>
            <path fill="#34A853" d="M6.3 15.9l6.6 4.8C14.5 17.2 19 14 24 14c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.5 7.1 29 5 24 5 16.3 5 9.7 9.6 6.3 15.9z"/>
            <path fill="#FBBC05" d="M24 47c5.1 0 9.8-1.9 13.3-5l-6.1-5.2C29.2 38.3 26.7 39 24 39c-5.2 0-9.5-3.5-11.2-8.2l-6.5 5C9.5 43 16.3 47 24 47z"/>
            <path fill="#EA4335" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.1 5.2C36.2 40.7 45 34 45 26c0-1.2-.1-2.4-.4-3.5z"/>
          </svg>
          구글로 시작하기
        </button>

        {/* 로딩 인디케이터 */}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 16,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                border: '2px solid #F0F0F0',
                borderTop: '2px solid #111',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: 13, color: '#999', fontWeight: 500 }}>로그인 중...</span>
          </div>
        )}
      </div>

      {/* ══ 구분선 ══ */}
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '36px 0 28px',
          animation: 'fadeUp 0.5s 0.2s ease both',
        }}
      >
        <div style={{ flex: 1, height: 1, background: '#F0F0F0' }} />
        <span style={{ fontSize: 11, color: '#ccc', fontWeight: 500, whiteSpace: 'nowrap' }}>
          YumMap과 함께라면
        </span>
        <div style={{ flex: 1, height: 1, background: '#F0F0F0' }} />
      </div>

      {/* ══ 특징 소개 — 흑백 카드 ══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          width: '100%',
          maxWidth: 360,
          animation: 'fadeUp 0.5s 0.25s ease both',
        }}
      >
        {[
          { icon: '🎯', title: '입맛 매칭', desc: '나의 맛 성향 분석' },
          { icon: '🗺️', title: '맛집 지도', desc: '가까운 맛집 탐색' },
          { icon: '👥', title: '커뮤니티', desc: '맛집 리뷰 공유' },
          { icon: '🌍', title: '글로벌', desc: '일본·해외 맛집' },
        ].map(item => (
          <div
            key={item.title}
            style={{
              background: '#FAFAFA',
              border: '1px solid #F0F0F0',
              borderRadius: 14,
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#111', margin: 0, letterSpacing: '-0.3px' }}>
              {item.title}
            </p>
            <p style={{ fontSize: 11, color: '#999', margin: 0, lineHeight: 1.4 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* ══ 약관 안내 ══ */}
      <p
        style={{
          color: '#ccc',
          fontSize: 11,
          textAlign: 'center',
          marginTop: 32,
          lineHeight: 1.7,
          letterSpacing: '-0.1px',
          animation: 'fadeUp 0.5s 0.3s ease both',
        }}
      >
        로그인 시 서비스 이용약관 및<br />개인정보처리방침에 동의합니다
      </p>
    </div>
  )
}
