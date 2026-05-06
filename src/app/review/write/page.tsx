'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ReviewWriteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const storeId = searchParams.get('store_id') || ''
  const storeName = decodeURIComponent(searchParams.get('store_name') || '')
  const storeAddress = decodeURIComponent(searchParams.get('store_address') || '')
  const storeCategory = decodeURIComponent(searchParams.get('store_category') || '')
  const storeLat = searchParams.get('store_lat') || ''
  const storeLng = searchParams.get('store_lng') || ''
  const storePhone = decodeURIComponent(searchParams.get('store_phone') || '')

  const [loading, setLoading] = useState(false)
  const [tasteScore, setTasteScore] = useState(3)
  const [portionScore, setPortionScore] = useState(3)
  const [valueScore, setValueScore] = useState(3)
  const [spiciness, setSpiciness] = useState(5)
  const [saltiness, setSaltiness] = useState(5)
  const [content, setContent] = useState('')
  const [menuName, setMenuName] = useState('')

  const ScoreButton = ({
    value, current, onClick
  }: {
    value: number; current: number; onClick: (v: number) => void
  }) => (
    <div style={{ display: 'flex', gap: '6px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onClick(n)}
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: 'none', cursor: 'pointer', fontSize: '16px',
            fontWeight: '800',
            background: n <= current
              ? 'linear-gradient(135deg,#FF5A3D,#FF8560)'
              : '#F2F2F2',
            color: n <= current ? 'white' : '#999',
            transition: 'all 0.15s',
            boxShadow: n <= current ? '0 2px 8px rgba(255,90,61,0.3)' : 'none',
          }}>
          {n}
        </button>
      ))}
    </div>
  )

  const SliderRow = ({
    label, value, onChange, leftLabel, rightLabel
  }: {
    label: string; value: number; onChange: (v: number) => void
    leftLabel: string; rightLabel: string
  }) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: '800', color: '#FF5A3D' }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#FF5A3D' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: '#bbb' }}>{leftLabel}</span>
        <span style={{ fontSize: '11px', color: '#bbb' }}>{rightLabel}</span>
      </div>
    </div>
  )

  const handleSubmit = async () => {
    if (!content.trim()) { alert('리뷰 내용을 입력해주세요'); return }
    if (!storeId) { alert('가게 정보가 없습니다. 지도에서 가게를 선택해주세요'); return }
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // UUID 여부 확인
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId)
      let realStoreId = storeId

      if (!isUUID) {
        // 카카오 가게 → Supabase에서 kakao_id로 조회 또는 신규 등록
        const { data: existing } = await supabase
          .from('stores')
          .select('id')
          .eq('kakao_id', storeId)
          .single()

        if (existing) {
          realStoreId = existing.id
        } else {
          const { data: newStore, error: insertError } = await supabase
            .from('stores')
            .insert({
              kakao_id: storeId,
              name: storeName,
              category: storeCategory,
              address: storeAddress,
              latitude: storeLat ? parseFloat(storeLat) : null,
              longitude: storeLng ? parseFloat(storeLng) : null,
              phone: storePhone,
              review_count: 0,
            })
            .select('id')
            .single()

          if (insertError || !newStore) {
            alert('가게 등록 오류: ' + insertError?.message)
            setLoading(false)
            return
          }
          realStoreId = newStore.id
        }
      }

      // 최초 리뷰 여부 확인
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('id')
        .eq('store_id', realStoreId)

      const isFirstReview = !existingReviews || existingReviews.length === 0

      // 리뷰 저장
      const { error: reviewError } = await supabase.from('reviews').insert({
        user_id: user.id,
        store_id: realStoreId,
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
        alert('리뷰 저장 오류: ' + reviewError.message)
        setLoading(false)
        return
      }

      // 리뷰 수 증가
      await supabase.rpc('increment_review_count', { store_id_input: realStoreId })

      // 최초 등록 배지
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
          earned_at: new Date().toISOString(),
        }

        const alreadyHas = currentBadges.find(
          (b: any) => b.id === 'first_review' && b.store === storeName
        )

        if (!alreadyHas) {
          await supabase
            .from('user_taste_profile')
            .update({ badges: [...currentBadges, newBadge] })
            .eq('user_id', user.id)

          alert(`🥇 "${storeName}" 최초 리뷰 등록자 배지 획득!`)
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', background: 'white',
        borderBottom: '1px solid #F2F2F2',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>
          ←
        </button>
        <img src="/yum2.png" alt="yummap" style={{ height: '28px' }} />
        <span style={{ fontSize: '16px', fontWeight: '800', color: '#1A1A1A' }}>리뷰 작성</span>
      </div>

      <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>

        {/* 가게 이름 */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '16px',
          marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🏪</span>
            <div>
              <p style={{ fontSize: '12px', color: '#999', margin: '0 0 2px' }}>리뷰 작성 중인 가게</p>
              <p style={{ fontSize: '18px', fontWeight: '900', color: '#FF5A3D', margin: 0 }}>
                {storeName || '지도에서 가게를 선택해주세요'}
              </p>
              {storeAddress && (
                <p style={{ fontSize: '12px', color: '#bbb', margin: '2px 0 0' }}>
                  📍 {storeAddress}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 드신 메뉴 */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '16px',
          marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 10px' }}>
            🍽️ 드신 메뉴
          </p>
          <input type="text" placeholder="예: 짬뽕, 탕수육..."
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: '1.5px solid #F2F2F2', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box'
            }} />
        </div>

        {/* 점수 평가 */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '16px',
          marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 16px' }}>
            ⭐ 점수 평가
          </p>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px', fontWeight: '600' }}>맛</p>
            <ScoreButton value={tasteScore} current={tasteScore} onClick={setTasteScore} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px', fontWeight: '600' }}>양</p>
            <ScoreButton value={portionScore} current={portionScore} onClick={setPortionScore} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px', fontWeight: '600' }}>가성비</p>
            <ScoreButton value={valueScore} current={valueScore} onClick={setValueScore} />
          </div>
        </div>

        {/* 맛 특성 */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '16px',
          marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 16px' }}>
            🌶️ 맛 특성
          </p>
          <SliderRow label="맵기" value={spiciness} onChange={setSpiciness}
            leftLabel="안매움" rightLabel="매우 매움" />
          <SliderRow label="짠기" value={saltiness} onChange={setSaltiness}
            leftLabel="싱거움" rightLabel="매우 짬" />
        </div>

        {/* 리뷰 내용 */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '16px',
          marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: '0 0 10px' }}>
            ✍️ 리뷰 내용
          </p>
          <textarea placeholder="맛, 분위기, 서비스 등 자유롭게 작성해주세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: '1.5px solid #F2F2F2', fontSize: '14px',
              outline: 'none', resize: 'none',
              boxSizing: 'border-box', lineHeight: '1.6'
            }} />
          <p style={{ fontSize: '12px', color: '#bbb', margin: '6px 0 0', textAlign: 'right' }}>
            {content.length}자
          </p>
        </div>

        {/* 등록 버튼 */}
        <button onClick={handleSubmit} disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#ccc' : 'linear-gradient(135deg,#FF5A3D,#FF8560)',
            color: 'white', border: 'none', borderRadius: '16px',
            padding: '16px', fontSize: '16px', fontWeight: '800',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(255,90,61,0.3)',
            marginBottom: '32px'
          }}>
          {loading ? '등록 중...' : '리뷰 등록하기 🎉'}
        </button>
      </div>
    </div>
  )
}

export default function ReviewWritePage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ fontSize: '40px' }}>✍️</div>
        <p style={{ color: '#999', fontSize: '14px' }}>로딩 중...</p>
      </div>
    }>
      <ReviewWriteInner />
    </Suspense>
  )
}
