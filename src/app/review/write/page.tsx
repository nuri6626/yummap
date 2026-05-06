'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ReviewWritePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const storeId = searchParams.get('store_id')
  const storeName = searchParams.get('store_name')

  const [loading, setLoading] = useState(false)
  const [tasteScore, setTasteScore] = useState(3)
  const [portionScore, setPortionScore] = useState(3)
  const [valueScore, setValueScore] = useState(3)
  const [spiciness, setSpiciness] = useState(5)
  const [saltiness, setSaltiness] = useState(5)
  const [content, setContent] = useState('')
  const [menuName, setMenuName] = useState('')

  const ScoreButton = ({ value, current, onClick }: { value: number, current: number, onClick: (v: number) => void }) => (
    <div style={{ display: 'flex', gap: '6px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onClick(n)}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '18px', background: n <= current ? '#FF5A3D' : '#F2F2F2', color: n <= current ? 'white' : '#999', fontWeight: '700', transition: 'all 0.2s' }}>
          {n}
        </button>
      ))}
    </div>
  )

  const SliderRow = ({ label, value, onChange, leftLabel, rightLabel }: {
    label: string, value: number, onChange: (v: number) => void, leftLabel: string, rightLabel: string
  }) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A1A' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#FF5A3D' }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#FF5A3D' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
        <span style={{ fontSize: '11px', color: '#999' }}>{leftLabel}</span>
        <span style={{ fontSize: '11px', color: '#999' }}>{rightLabel}</span>
      </div>
    </div>
  )

  const handleSubmit = async () => {
    if (!content.trim()) { alert('리뷰 내용을 입력해주세요'); return }
    if (!storeId) { alert('가게 정보가 없습니다'); return }
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // 최초 리뷰 여부 확인
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('id')
        .eq('store_id', storeId)

      const isFirstReview = !existingReviews || existingReviews.length === 0

      // 리뷰 저장
      const { error: reviewError } = await supabase.from('reviews').insert({
        user_id: user.id,
        store_id: storeId,
        taste_score: tasteScore,
        portion_score: portionScore,
        value_score: valueScore,
        spiciness_actual: spiciness,
        saltiness_actual: saltiness,
        content: content.trim(),
        photos: [],
        visit_verified: false,
        quality_score: (tasteScore + portionScore + valueScore) / 3,
      })

      if (reviewError) {
        console.error('리뷰 저장 오류:', reviewError)
        alert('리뷰 저장 오류: ' + reviewError.message)
        setLoading(false)
        return
      }

      // stores 테이블 review_count 업데이트
      await supabase.rpc('increment_review_count', { store_id_input: storeId })

      // 최초 리뷰면 배지 부여
      if (isFirstReview) {
        const { data: profile } = await supabase
          .from('user_taste_profile')
          .select('badges')
          .eq('user_id', user.id)
          .single()

        const currentBadges = profile?.badges || []
        const newBadge = {
          id: 'first_review',
          name: '최초 등록자',
          emoji: '🥇',
          store: storeName,
          earned_at: new Date().toISOString()
        }

        if (!currentBadges.find((b: any) => b.id === 'first_review' && b.store === storeName)) {
          await supabase
            .from('user_taste_profile')
            .update({ badges: [...currentBadges, newBadge] })
            .eq('user_id', user.id)

          alert(`🥇 축하합니다! "${storeName}" 최초 리뷰 등록자 배지를 획득했습니다!`)
        }
      }

      alert('리뷰가 등록되었습니다! 🎉')
      router.push('/map')

    } catch (err) {
      console.error(err)
      alert('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFF5F3', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'white', borderBottom: '1px solid #F2F2F2', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>←</button>
        <img src="/yum2.png" alt="yummap" style={{ height: '28px' }} />
        <span style={{ fontSize: '16px', fontWeight: '800', color: '#1A1A1A' }}>리뷰 작성</span>
      </div>

      <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>

        {/* 가게 이름 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🏪</span>
            <div>
              <p style={{ fontSize: '12px', color: '#999', margin: '0 0 2px' }}>리뷰 작성 중인 가게</p>
              <p style={{ fontSize: '18px', fontWeight: '900', color: '#FF5A3D', margin: 0 }}>
                {storeName || '가게 이름 없음'}
              </p>
            </div>
          </div>
        </div>

        {/* 메뉴 이름 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 10px' }}>🍽️ 드신 메뉴</p>
          <input
            type="text"
            placeholder="예: 짬뽕, 탕수육..."
            value={menuName}
            onChange={e => setMenuName(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #F2F2F2', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* 점수 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 16px' }}>⭐ 점수 평가</p>

          <div style={{ marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px', fontWeight: '600' }}>맛</p>
            <ScoreButton value={tasteScore} current={tasteScore} onClick={setTasteScore} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px', fontWeight: '600' }}>양</p>
            <ScoreButton value={portionScore} current={portionScore} onClick={setPortionScore} />
          </div>

          <div>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px', fontWeight: '600' }}>가성비</p>
            <ScoreButton value={valueScore} current={valueScore} onClick={setValueScore} />
          </div>
        </div>

        {/* 맵기/짠기 슬라이더 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 16px' }}>🌶️ 맛 특성</p>
          <SliderRow label="맵기" value={spiciness} onChange={setSpiciness} leftLabel="안매움" rightLabel="매우 매움" />
          <SliderRow label="짠기" value={saltiness} onChange={setSaltiness} leftLabel="싱거움" rightLabel="매우 짬" />
        </div>

        {/* 리뷰 내용 */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 10px' }}>✍️ 리뷰 내용</p>
          <textarea
            placeholder="맛, 분위기, 서비스 등 자유롭게 작성해주세요..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #F2F2F2', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: '1.6' }}
          />
          <p style={{ fontSize: '12px', color: '#bbb', margin: '6px 0 0', textAlign: 'right' }}>{content.length}자</p>
        </div>

        {/* 제출 버튼 */}
        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', background: loading ? '#ccc' : 'linear-gradient(135deg, #FF5A3D, #FF8560)', color: 'white', border: 'none', borderRadius: '16px', padding: '16px', fontSize: '16px', fontWeight: '800', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(255,90,61,0.3)', marginBottom: '32px' }}>
          {loading ? '등록 중...' : '리뷰 등록하기 🎉'}
        </button>
      </div>
    </div>
  )
}
