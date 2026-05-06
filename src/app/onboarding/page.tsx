'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CUISINES = ['한식','중식','일식','양식','분식','해산물','고기','카페','디저트','패스트푸드']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true) // 프로필 체크 중
  const [nickname, setNickname] = useState('')
  const [spiceLevel, setSpiceLevel] = useState(5)
  const [pickiness, setPickiness] = useState(5)
  const [stylePref, setStylePref] = useState(5)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])

  // ── 진입 시 프로필 존재 여부 확인 ──
  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_taste_profile')
        .select('id, nickname')
        .eq('user_id', user.id)
        .single()

      if (profile?.nickname) {
        // 이미 프로필 있음 → 지도로 바로 이동
        router.replace('/map')
        return
      }

      // 프로필 없음 → 온보딩 보여줌
      setChecking(false)
    }
    checkProfile()
  }, [])

  const toggleCuisine = (c: string) => {
    setSelectedCuisines(prev =>
      prev.includes(c) ? prev.filter(v => v !== c) : [...prev, c]
    )
  }

  const handleComplete = async () => {
    if (!nickname.trim()) { alert('닉네임을 입력해주세요'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { error } = await supabase
        .from('user_taste_profile')
        .upsert({
          user_id: user.id,
          nickname: nickname.trim(),
          spice_level: spiceLevel,
          pickiness,
          style_pref: stylePref,
          preferred_cuisines: selectedCuisines,
        }, { onConflict: 'user_id' })

      if (error) { alert('저장 오류: ' + error.message); setLoading(false); return }
      router.replace('/map')
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const SliderRow = ({ label, value, onChange, left, right }: {
    label: string; value: number; onChange: (v: number) => void; left: string; right: string
  }) => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: '800', color: '#FF5A3D' }}>{value}/10</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: '#999' }}>{left}</span>
        <span style={{ fontSize: '11px', color: '#999' }}>{right}</span>
      </div>
      <input type="range" min="1" max="10" value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#FF5A3D', height: '4px' }} />
    </div>
  )

  // 프로필 체크 중 로딩 화면
  if (checking) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '12px',
        fontFamily: 'Pretendard, -apple-system, sans-serif'
      }}>
        <div style={{ fontSize: '40px' }}>🍽️</div>
        <p style={{ color: '#999', fontSize: '14px' }}>잠시만요...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F2', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: 'white' }}>
        <img src="/yum2.png" style={{ height: '32px' }} alt="yummap" />
      </div>

      {/* 진행 바 */}
      <div style={{ background: 'white', padding: '12px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#FF5A3D' }}>STEP {step} / 3</span>
          <span style={{ fontSize: '13px', color: '#999' }}>
            {step === 1 ? '닉네임 설정' : step === 2 ? '입맛 설정' : '선호 음식'}
          </span>
        </div>
        <div style={{ background: '#F2F2F2', borderRadius: '99px', height: '6px' }}>
          <div style={{
            background: 'linear-gradient(90deg, #FF5A3D, #FF8560)',
            height: '6px', borderRadius: '99px',
            width: `${(step / 3) * 100}%`, transition: 'width 0.4s'
          }} />
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>

        {/* STEP 1 - 닉네임 */}
        {step === 1 && (
          <div style={{ background: 'white', borderRadius: '24px', padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>👋</div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>
                어떻게 불러드릴까요?
              </h2>
              <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
                맛집 지도에서 사용할 닉네임을 입력해주세요
              </p>
            </div>
            <input
              type="text"
              placeholder="닉네임 입력 (예: 매운맛러버)"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={12}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '14px',
                border: '2px solid #F2F2F2', fontSize: '15px', fontWeight: '600',
                outline: 'none', boxSizing: 'border-box', background: '#FAFAFA'
              }}
              onFocus={e => e.target.style.borderColor = '#FF5A3D'}
              onBlur={e => e.target.style.borderColor = '#F2F2F2'}
            />
            <p style={{ textAlign: 'right', fontSize: '12px', color: '#ccc', marginTop: '6px' }}>
              {nickname.length}/12
            </p>
            <button
              onClick={() => nickname.trim() ? setStep(2) : alert('닉네임을 입력해주세요')}
              style={{
                width: '100%', background: 'linear-gradient(135deg, #FF5A3D, #FF8560)',
                color: 'white', fontWeight: '800', fontSize: '16px', padding: '15px',
                borderRadius: '16px', border: 'none', cursor: 'pointer', marginTop: '8px',
                boxShadow: '0 4px 16px rgba(255,90,61,0.35)'
              }}>
              다음 →
            </button>
          </div>
        )}

        {/* STEP 2 - 입맛 */}
        {step === 2 && (
          <div style={{ background: 'white', borderRadius: '24px', padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌶️</div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>
                입맛을 알려주세요
              </h2>
              <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>슬라이더로 나의 입맛을 설정하세요</p>
            </div>
            <SliderRow label="🌶️ 자극도" value={spiceLevel} onChange={setSpiceLevel} left="순한맛" right="강한맛" />
            <SliderRow label="🎯 입맛 기준" value={pickiness} onChange={setPickiness} left="관대한 입" right="까다로운 입" />
            <SliderRow label="✨ 음식 스타일" value={stylePref} onChange={setStylePref} left="전통/담백" right="트렌디/퓨전" />
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setStep(1)}
                style={{ flex: 1, background: '#F2F2F2', color: '#666', fontWeight: '700', fontSize: '15px', padding: '14px', borderRadius: '16px', border: 'none', cursor: 'pointer' }}>
                ← 이전
              </button>
              <button onClick={() => setStep(3)}
                style={{ flex: 2, background: 'linear-gradient(135deg, #FF5A3D, #FF8560)', color: 'white', fontWeight: '800', fontSize: '15px', padding: '14px', borderRadius: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,90,61,0.35)' }}>
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 - 선호 음식 */}
        {step === 3 && (
          <div style={{ background: 'white', borderRadius: '24px', padding: '28px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍽️</div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 8px' }}>
                좋아하는 음식은?
              </h2>
              <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
                여러 개 선택 가능해요 ({selectedCuisines.length}개 선택됨)
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
              {CUISINES.map(c => (
                <button key={c} onClick={() => toggleCuisine(c)}
                  style={{
                    padding: '10px 18px', borderRadius: '99px', fontSize: '14px',
                    fontWeight: '700', border: 'none', cursor: 'pointer',
                    background: selectedCuisines.includes(c)
                      ? 'linear-gradient(135deg, #FF5A3D, #FF8560)' : '#F2F2F2',
                    color: selectedCuisines.includes(c) ? 'white' : '#666',
                    boxShadow: selectedCuisines.includes(c)
                      ? '0 4px 12px rgba(255,90,61,0.3)' : 'none',
                  }}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(2)}
                style={{ flex: 1, background: '#F2F2F2', color: '#666', fontWeight: '700', fontSize: '15px', padding: '14px', borderRadius: '16px', border: 'none', cursor: 'pointer' }}>
                ← 이전
              </button>
              <button onClick={handleComplete} disabled={loading}
                style={{
                  flex: 2,
                  background: loading ? '#ccc' : 'linear-gradient(135deg, #FF5A3D, #FF8560)',
                  color: 'white', fontWeight: '800', fontSize: '15px', padding: '14px',
                  borderRadius: '16px', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(255,90,61,0.35)'
                }}>
                {loading ? '저장 중...' : '완료! 🎉'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
