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
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg, #FFF5F3 0%, #FFE7DF 50%, #FFF5F3 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'Pretendard, -apple-system, sans-serif' }}>

      {/* 배경 원형 장식 */}
      <div style={{ position:'fixed', top:'-80px', right:'-80px', width:'250px', height:'250px', background:'rgba(255,90,61,0.08)', borderRadius:'50%', zIndex:0 }}/>
      <div style={{ position:'fixed', bottom:'-60px', left:'-60px', width:'200px', height:'200px', background:'rgba(255,133,96,0.08)', borderRadius:'50%', zIndex:0 }}/>

      {/* 로고 영역 */}
      <div style={{ textAlign:'center', marginBottom:'40px', position:'relative', zIndex:1 }}>
        <img src="/yum1.png" alt="yummap" style={{ width:'220px', marginBottom:'16px' }} />
        <p style={{ color:'#FF5A3D', fontSize:'15px', fontWeight:'600', margin:'0 0 4px' }}>
          입맛으로 찾는 맛집 지도
        </p>
        <p style={{ color:'#999', fontSize:'13px', margin:0 }}>
          Where Your Taste Belongs
        </p>
      </div>

      {/* 로그인 카드 */}
      <div style={{ background:'white', borderRadius:'28px', padding:'32px 24px', width:'100%', maxWidth:'360px', boxShadow:'0 8px 32px rgba(255,90,61,0.12)', position:'relative', zIndex:1 }}>
        <h2 style={{ fontSize:'20px', fontWeight:'800', color:'#1A1A1A', textAlign:'center', margin:'0 0 6px' }}>
          시작하기
        </h2>
        <p style={{ color:'#999', fontSize:'13px', textAlign:'center', margin:'0 0 28px' }}>
          나만의 입맛 맛집 지도를 만들어보세요
        </p>

        {/* 카카오 로그인 */}
        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', background:'#FEE500', color:'#1A1A1A', fontWeight:'800', fontSize:'15px', padding:'14px', borderRadius:'16px', border:'none', cursor:'pointer', marginBottom:'10px', boxShadow:'0 4px 12px rgba(254,229,0,0.4)', transition:'all 0.2s' }}
        >
          <span style={{ fontSize:'20px' }}>💬</span>
          카카오로 시작하기
        </button>

        {/* 구글 로그인 */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', background:'white', color:'#1A1A1A', fontWeight:'800', fontSize:'15px', padding:'14px', borderRadius:'16px', border:'2px solid #F2F2F2', cursor:'pointer', marginBottom:'10px', transition:'all 0.2s' }}
        >
          <span style={{ fontSize:'20px' }}>🔍</span>
          구글로 시작하기
        </button>

        {loading && (
          <div style={{ textAlign:'center', marginTop:'12px' }}>
            <p style={{ color:'#FF5A3D', fontSize:'13px', fontWeight:'600' }}>로그인 중...</p>
          </div>
        )}
      </div>

      {/* 하단 문구 */}
      <p style={{ color:'#bbb', fontSize:'12px', textAlign:'center', marginTop:'32px', lineHeight:'1.6', position:'relative', zIndex:1 }}>
        로그인 시 서비스 이용약관 및<br/>개인정보처리방침에 동의합니다
      </p>

      {/* 특징 소개 */}
      <div style={{ display:'flex', gap:'24px', marginTop:'40px', position:'relative', zIndex:1 }}>
        {[
          { icon:'🎯', label:'입맛 매칭' },
          { icon:'🗺️', label:'맛집 지도' },
          { icon:'👥', label:'커뮤니티' },
          { icon:'🌍', label:'글로벌' },
        ].map(item => (
          <div key={item.label} style={{ textAlign:'center' }}>
            <div style={{ fontSize:'24px', marginBottom:'4px' }}>{item.icon}</div>
            <p style={{ fontSize:'11px', color:'#999', fontWeight:'600', margin:0 }}>{item.label}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
