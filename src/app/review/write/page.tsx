'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TEXTURE_TAGS = ['바삭', '촉촉', '쫄깃', '부드러움', '아삭', '진함', '담백', '느끼함', '고소함', '신선함']
const SITUATION_TAGS = ['해장', '데이트', '혼밥', '회식', '가족', '친구', '기념일', '야식', '점심', '브런치']

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
  const [menuName, setMenuName] = useState('')
  const [content, setContent] = useState('')
  const [wantToGoBack, setWantToGoBack] = useState<boolean | null>(null)
  const [starScore, setStarScore] = useState(0)
  const [photos, setPhotos] = useState<string[]>([])

  // 맛 프로필 슬라이더 6개
  const [tasteScore, setTasteScore] = useState(5)
  const [portionScore, setPortionScore] = useState(5)
  const [valueScore, setValueScore] = useState(5)
  const [spiciness, setSpiciness] = useState(5)
  const [saltiness, setSaltiness] = useState(5)
  const [sweetness, setSweetness] = useState(5)

  // 태그
  const [textureTags, setTextureTags] = useState<string[]>([])
  const [situationTags, setSituationTags] = useState<string[]>([])

  // 비교 좌표 (미식가용)
  const [compareMenu1, setCompareMenu1] = useState('')
  const [compareMenu2, setCompareMenu2] = useState('')

  const toggleTextureTag = (tag: string) => {
    setTextureTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 3 ? [...prev, tag] : prev
    )
  }

  const toggleSituationTag = (tag: string) => {
    setSituationTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || photos.length >= 3) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const file of Array.from(files)) {
      if (photos.length >= 3) break
      const ext = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('review-photos')
        .upload(fileName, file)
      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('review-photos')
          .getPublicUrl(data.path)
        setPhotos(prev => [...prev, urlData.publicUrl])
      }
    }
  }

  const handleSubmit = async () => {
    if (!storeId) { alert('가게 정보가 없습니다. 지도에서 가게를 선택해주세요'); return }
    if (starScore === 0 && wantToGoBack === null) {
      alert('별점 또는 "다시 갈래요" 여부를 선택해주세요'); return
    }
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId)
      let realStoreId = storeId

      if (!isUUID) {
        const { data: existing } = await supabase
          .from('stores').select('id').eq('kakao_id', storeId).single()
        if (existing) {
          realStoreId = existing.id
        } else {
          const { data: newStore, error: insertError } = await supabase
            .from('stores').insert({
              kakao_id: storeId, name: storeName, category: storeCategory,
              address: storeAddress,
              latitude: storeLat ? parseFloat(storeLat) : null,
              longitude: storeLng ? parseFloat(storeLng) : null,
              phone: storePhone, review_count: 0,
            }).select('id').single()
          if (insertError || !newStore) {
            alert('가게 등록 오류: ' + insertError?.message)
            setLoading(false); return
          }
          realStoreId = newStore.id
        }
      }

      const { data: existingReviews } = await supabase
        .from('reviews').select('id').eq('store_id', realStoreId)
      const isFirstReview = !existingReviews || existingReviews.length === 0

      const { error: reviewError } = await supabase.from('reviews').insert({
        user_id: user.id,
        store_id: realStoreId,
        taste_score: tasteScore,
        portion_score: portionScore,
        value_score: valueScore,
        spiciness_actual: spiciness,
        saltiness_actual: saltiness,
        content: content.trim() || null,
        photos: photos,
        visit_verified: false,
        quality_score: (tasteScore + portionScore + valueScore) / 3,
        // 추가 필드
        sweetness_score: sweetness,
        texture_tags: textureTags,
        situation_tags: situationTags,
        menu_name: menuName.trim() || null,
        want_to_go_back: wantToGoBack,
        star_score: starScore || null,
        compare_menus: [compareMenu1, compareMenu2].filter(Boolean),
      })

      if (reviewError) {
        alert('리뷰 저장 오류: ' + reviewError.message)
        setLoading(false); return
      }

      await supabase.rpc('increment_review_count', { store_id_input: realStoreId })

      if (isFirstReview) {
        const { data: profile } = await supabase
          .from('user_taste_profile').select('badges').eq('user_id', user.id).single()
        const currentBadges = profile?.badges || []
        const newBadge = {
          id: 'first_review', name: '최초 등록자', emoji: '🥇',
          store: storeName, earned_at: new Date().toISOString(),
        }
        if (!currentBadges.find((b: any) => b.id === 'first_review' && b.store === storeName)) {
          await supabase.from('user_taste_profile')
            .update({ badges: [...currentBadges, newBadge] }).eq('user_id', user.id)
          alert(`🥇 "${storeName}" 최초 리뷰 등록자 배지 획득!`)
        }
      }

      alert('리뷰가 등록되었습니다! 🎉')
      router.push('/map')
    } catch (err) {
      console.error(err); alert('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const SliderRow = ({ label, value, onChange, left, right, emoji }: {
    label: string; value: number; onChange: (v: number) => void
    left: string; right: string; emoji: string
  }) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#1A1A1A' }}>
          {emoji} {label}
        </span>
        <span style={{ fontSize: '13px', fontWeight: '800', color: '#FF5A3D' }}>{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#FF5A3D' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
        <span style={{ fontSize: '10px', color: '#bbb' }}>{left}</span>
        <span style={{ fontSize: '10px', color: '#bbb' }}>{right}</span>
      </div>
    </div>
  )

  const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{
      background: 'white', borderRadius: '16px', padding: '16px',
      marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <p style={{ fontSize: '14px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 14px' }}>
        {title}
      </p>
      {children}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F8', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>

      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', background: 'white',
        borderBottom: '1px solid #F2F2F2',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}>←</button>
        <img src="/yum2.png" alt="yummap" style={{ height: '26px' }} />
        <span style={{ fontSize: '15px', fontWeight: '800', color: '#1A1A1A' }}>리뷰 작성</span>
      </div>

      <div style={{ padding: '14px 16px', maxWidth: '520px', margin: '0 auto' }}>

        {/* 가게 정보 */}
        <div style={{
          background: 'linear-gradient(135deg,#FF5A3D,#FF8560)',
          borderRadius: '16px', padding: '16px', marginBottom: '12px', color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🏪</span>
            <div>
              <p style={{ fontSize: '11px', opacity: 0.8, margin: '0 0 2px' }}>리뷰 작성 중인 가게</p>
              <p style={{ fontSize: '17px', fontWeight: '900', margin: 0 }}>
                {storeName || '지도에서 가게를 선택해주세요'}
              </p>
              {storeAddress && (
                <p style={{ fontSize: '11px', opacity: 0.75, margin: '2px 0 0' }}>📍 {storeAddress}</p>
              )}
            </div>
          </div>
        </div>

        {/* 드신 메뉴 */}
        <SectionCard title="🍽️ 드신 메뉴">
          <input type="text" placeholder="예: 짬뽕, 탕수육, 된장찌개..."
            value={menuName} onChange={e => setMenuName(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: '1.5px solid #F2F2F2', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box'
            }} />
        </SectionCard>

        {/* 📸 사진 업로드 (선택) */}
        <SectionCard title="📸 음식 사진 (선택, 최대 3장)">
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {photos.map((url, i) => (
              <div key={i} style={{ position: 'relative', width: '80px', height: '80px' }}>
                <img src={url} style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' }} />
                <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                  style={{
                    position: 'absolute', top: '-6px', right: '-6px',
                    background: '#1A1A1A', color: 'white', border: 'none',
                    borderRadius: '50%', width: '20px', height: '20px',
                    fontSize: '11px', cursor: 'pointer', fontWeight: '700'
                  }}>✕</button>
              </div>
            ))}
            {photos.length < 3 && (
              <label style={{
                width: '80px', height: '80px', borderRadius: '10px',
                border: '2px dashed #E0E0E0', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexDirection: 'column', gap: '4px'
              }}>
                <span style={{ fontSize: '24px' }}>+</span>
                <span style={{ fontSize: '10px', color: '#999' }}>사진 추가</span>
                <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
        </SectionCard>

        {/* ⭐ 별점 + 다시 갈래요 */}
        <SectionCard title="⭐ 별점 & 재방문 의사">
          {/* 별점 */}
          <div style={{ marginBottom: '14px' }}>
            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px' }}>별점 (선택)</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setStarScore(starScore === n ? 0 : n)}
                  style={{
                    fontSize: '28px', background: 'none', border: 'none',
                    cursor: 'pointer', opacity: n <= starScore ? 1 : 0.25,
                    transition: 'opacity 0.15s', padding: '0'
                  }}>⭐</button>
              ))}
              {starScore > 0 && (
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#FF5A3D', alignSelf: 'center', marginLeft: '4px' }}>
                  {starScore}.0
                </span>
              )}
            </div>
          </div>

          {/* 다시 갈래요 */}
          <div>
            <p style={{ fontSize: '12px', color: '#999', margin: '0 0 8px' }}>다시 갈래요? (필수)</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { value: true, label: '🙋 또 갈래요!', color: '#34C759' },
                { value: false, label: '🙅 글쎄요...', color: '#FF3B30' },
              ].map(item => (
                <button key={String(item.value)}
                  onClick={() => setWantToGoBack(item.value)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                    cursor: 'pointer', fontSize: '14px', fontWeight: '700',
                    background: wantToGoBack === item.value ? item.color : '#F2F2F2',
                    color: wantToGoBack === item.value ? 'white' : '#666',
                    transition: 'all 0.15s',
                    boxShadow: wantToGoBack === item.value ? `0 3px 10px ${item.color}44` : 'none',
                  }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* 🎚️ 맛 프로필 슬라이더 6개 */}
        <SectionCard title="🎚️ 맛 프로필 (10초 컷)">
          <SliderRow label="맛" value={tasteScore} onChange={setTasteScore} left="별로" right="최고" emoji="😋" />
          <SliderRow label="양" value={portionScore} onChange={setPortionScore} left="적음" right="많음" emoji="🍚" />
          <SliderRow label="가성비" value={valueScore} onChange={setValueScore} left="별로" right="최고" emoji="💰" />
          <SliderRow label="맵기" value={spiciness} onChange={setSpiciness} left="안매움" right="매우 매움" emoji="🌶️" />
          <SliderRow label="짠기" value={saltiness} onChange={setSaltiness} left="싱거움" right="매우 짬" emoji="🧂" />
          <SliderRow label="단기" value={sweetness} onChange={setSweetness} left="안달콤" right="매우 달콤" emoji="🍯" />
        </SectionCard>

        {/* 🧩 식감 태그 (3개까지) */}
        <SectionCard title="🧩 식감 태그 (최대 3개)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TEXTURE_TAGS.map(tag => {
              const selected = textureTags.includes(tag)
              const disabled = !selected && textureTags.length >= 3
              return (
                <button key={tag} onClick={() => toggleTextureTag(tag)}
                  disabled={disabled}
                  style={{
                    padding: '7px 14px', borderRadius: '20px', border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '13px', fontWeight: '600',
                    background: selected ? '#FF5A3D' : disabled ? '#F8F8F8' : '#F2F2F2',
                    color: selected ? 'white' : disabled ? '#ccc' : '#555',
                    transition: 'all 0.15s',
                  }}>
                  {tag}
                </button>
              )
            })}
          </div>
          {textureTags.length > 0 && (
            <p style={{ fontSize: '12px', color: '#FF5A3D', margin: '8px 0 0', fontWeight: '600' }}>
              선택됨: {textureTags.join(', ')}
            </p>
          )}
        </SectionCard>

        {/* 🎭 상황 태그 */}
        <SectionCard title="🎭 상황 태그">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {SITUATION_TAGS.map(tag => {
              const selected = situationTags.includes(tag)
              return (
                <button key={tag} onClick={() => toggleSituationTag(tag)}
                  style={{
                    padding: '7px 14px', borderRadius: '20px', border: 'none',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    background: selected ? '#4A90E2' : '#F2F2F2',
                    color: selected ? 'white' : '#555',
                    transition: 'all 0.15s',
                  }}>
                  {tag}
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* 🔬 비교 좌표 (미식가용, 선택) */}
        <SectionCard title="🔬 비교 좌표 (미식가용, 선택)">
          <p style={{ fontSize: '12px', color: '#999', margin: '0 0 10px', lineHeight: '1.5' }}>
            이 가게와 비교되는 메뉴나 가게를 적어보세요
          </p>
          <input type="text" placeholder="비교 1 (예: 홍콩반점 짜장면보다 더 달콤)"
            value={compareMenu1} onChange={e => setCompareMenu1(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: '1.5px solid #F2F2F2', fontSize: '13px',
              outline: 'none', boxSizing: 'border-box', marginBottom: '8px'
            }} />
          <input type="text" placeholder="비교 2 (예: 동네 분식집 떡볶이보다 덜 맵)"
            value={compareMenu2} onChange={e => setCompareMenu2(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              border: '1.5px solid #F2F2F2', fontSize: '13px',
              outline: 'none', boxSizing: 'border-box'
            }} />
        </SectionCard>

        {/* ✍️ 자유 리뷰 (선택) */}
        <SectionCard title="✍️ 자유 리뷰 (선택)">
          <textarea
            placeholder={`자유롭게 작성해주세요!\n\n예시:\n- 분위기는 어땠나요?\n- 특별히 맛있었던 점은?\n- 아쉬웠던 점은?\n- 추천 메뉴가 있나요?`}
            value={content} onChange={e => setContent(e.target.value)}
            rows={6}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: '1.5px solid #F2F2F2', fontSize: '14px',
              outline: 'none', resize: 'none',
              boxSizing: 'border-box', lineHeight: '1.7', color: '#333'
            }} />
          <p style={{ fontSize: '12px', color: '#bbb', margin: '4px 0 0', textAlign: 'right' }}>
            {content.length}자
          </p>
        </SectionCard>

        {/* 등록 버튼 */}
        <button onClick={handleSubmit} disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#ccc' : 'linear-gradient(135deg,#FF5A3D,#FF8560)',
            color: 'white', border: 'none', borderRadius: '16px',
            padding: '16px', fontSize: '16px', fontWeight: '800',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(255,90,61,0.3)',
            marginBottom: '40px'
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
