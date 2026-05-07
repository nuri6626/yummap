'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* ── 동그라미 척도 UI ── */
function CircleScale({
  label, emoji, value, onChange
}: {
  label: string; emoji: string; value: number; onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span style={{ fontSize: '18px' }}>{emoji}</span>
        <span style={{ fontWeight: '700', color: '#333', fontSize: '14px' }}>{label}</span>
        <span style={{
          marginLeft: 'auto', background: '#FF5A3D', color: 'white',
          borderRadius: '12px', padding: '2px 10px', fontSize: '13px', fontWeight: '700'
        }}>{value}</span>
      </div>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => onChange(n)} style={{
            width: '28px', height: '28px', borderRadius: '50%', border: 'none',
            cursor: 'pointer', fontSize: '11px', fontWeight: '700',
            background: value === n
              ? (n <= 3 ? '#4CAF50' : n <= 6 ? '#FF9800' : '#FF5A3D')
              : '#f0f0f0',
            color: value === n ? 'white' : '#aaa',
            transform: value === n ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.15s',
          }}>{n}</button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: '#aaa' }}>약함</span>
        <span style={{ fontSize: '10px', color: '#aaa' }}>보통</span>
        <span style={{ fontSize: '10px', color: '#aaa' }}>강함</span>
      </div>
    </div>
  )
}

/* ── 섹션 카드 ── */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'white', borderRadius: '20px', padding: '20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px'
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: '#333' }}>{title}</h3>
      {children}
    </div>
  )
}

/* ── 리뷰 작성 내부 ── */
function ReviewWriteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  /* 가게 정보 */
  const [storeId,   setStoreId]   = useState(searchParams.get('store_id')   ?? '')
  const [storeName, setStoreName] = useState(searchParams.get('store_name') ?? '')
  const [address,   setAddress]   = useState(searchParams.get('store_address') ?? '')
  const [category,  setCategory]  = useState(searchParams.get('store_category') ?? '')
  const [lat,       setLat]       = useState(searchParams.get('store_lat') ?? '')
  const [lng,       setLng]       = useState(searchParams.get('store_lng') ?? '')
  const [phone,     setPhone]     = useState(searchParams.get('store_phone') ?? '')

  useEffect(() => {
    const id   = searchParams.get('store_id')       ?? ''
    const name = searchParams.get('store_name')     ?? ''
    const addr = searchParams.get('store_address')  ?? ''
    const cat  = searchParams.get('store_category') ?? ''
    const la   = searchParams.get('store_lat')      ?? ''
    const ln   = searchParams.get('store_lng')      ?? ''
    const ph   = searchParams.get('store_phone')    ?? ''
    setStoreId(id); setStoreName(name); setAddress(addr)
    setCategory(cat); setLat(la); setLng(ln); setPhone(ph)
  }, [searchParams])

  /* 리뷰 폼 상태 */
  const [menuName,    setMenuName]    = useState('')
  const [content,     setContent]     = useState('')
  const [oneLineReview, setOneLineReview] = useState('')
  const [starScore,   setStarScore]   = useState(3)
  const [wantToGoBack,setWantToGoBack]= useState<boolean|null>(null)
  const [tasteScore,  setTasteScore]  = useState(5)
  const [portionScore,setPortionScore]= useState(5)
  const [valueScore,  setValueScore]  = useState(5)
  const [spiciness,   setSpiciness]   = useState(5)
  const [saltiness,   setSaltiness]   = useState(5)
  const [sweetness,   setSweetness]   = useState(5)
  const [textureTags, setTextureTags] = useState<string[]>([])
  const [situationTags,setSituationTags]=useState<string[]>([])
  const [compareMenu, setCompareMenu] = useState('')
  const [compareStore,setCompareStore]= useState('')
  const [photos,      setPhotos]      = useState<string[]>([])
  const [uploading,   setUploading]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)

  const TEXTURE_OPTIONS  = ['바삭','쫄깃','촉촉','담백','진한','고소','부드러운','매콤','달콤','새콤']
  const SITUATION_OPTIONS= ['혼밥','데이트','회식','가족','야식','점심','빠른식사','특별한날']

  const toggleTag = (tag:string, list:string[], set:(v:string[])=>void, max:number) => {
    set(list.includes(tag) ? list.filter(t=>t!==tag) : list.length<max ? [...list,tag] : list)
  }

  /* 사진 업로드 */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (photos.length + files.length > 3) { alert('사진은 최대 3장까지 업로드 가능합니다.'); return }
    setUploading(true)
    const urls: string[] = []
    for (const file of files) {
      const ext  = file.name.split('.').pop()
      const path = `reviews/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('review-photos').upload(path, file, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('review-photos').getPublicUrl(path)
        urls.push(publicUrl)
      }
    }
    setPhotos(prev => [...prev, ...urls])
    setUploading(false)
  }

  /* 제출 */
  const handleSubmit = async () => {
    if (!storeName) { alert('가게를 선택해주세요. 위의 버튼을 눌러 지도에서 가게를 선택해주세요.'); return }
    if (!menuName.trim()) { alert('메뉴 이름을 입력해주세요.'); return }
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('로그인이 필요합니다.'); setSubmitting(false); return }

    try {
      /* 가게 ID 확정 */
      let realStoreId = storeId
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId)
      if (!isUUID) {
        const { data: existing } = await supabase.from('stores').select('id').eq('name', storeName).eq('address', address).maybeSingle()
        if (existing) {
          realStoreId = existing.id
        } else {
          const { data: created } = await supabase.from('stores').insert({
            name: storeName, address, category,
            latitude: lat ? parseFloat(lat) : null,
            longitude: lng ? parseFloat(lng) : null,
            phone,
          }).select('id').single()
          if (created) realStoreId = created.id
        }
      }

      const { error } = await supabase.from('reviews').insert({
        user_id: user.id, store_id: realStoreId,
        menu_name: menuName.trim(), content: content.trim() || null,
        one_line_review: oneLineReview.trim() || null,
        star_score: starScore, want_to_go_back: wantToGoBack,
        taste_score: tasteScore, portion_score: portionScore, value_score: valueScore,
        spiciness, saltiness, sweetness,
        texture_tags: textureTags, situation_tags: situationTags,
        compare_menu: compareMenu || null, compare_store: compareStore || null,
        photos: photos.length ? photos : null,
      })

      if (error) throw error

      /* 리뷰 수 증가 + 첫 리뷰 뱃지 */
      await supabase.rpc('increment_review_count', { store_id_input: realStoreId })
      const { data: prev } = await supabase.from('reviews').select('id').eq('user_id', user.id)
      if ((prev?.length ?? 0) === 1) {
        await supabase.from('user_badges').insert({ user_id: user.id, badge_type: 'first_review' }).select()
      }

      alert('리뷰가 등록되었습니다! 🎉')
      router.push('/map')
    } catch (err) {
      console.error(err)
      alert('리뷰 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', paddingBottom: '100px' }}>

      {/* 헤더 */}
      <div style={{
        background: 'white', padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <button onClick={() => router.push('/map')} style={{
          border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', padding: 0
        }}>←</button>
        <h1
          onClick={() => router.push('/map')}
          style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#FF5A3D', cursor: 'pointer' }}
        >🍜 맛지도</h1>
        <span style={{ fontSize: '14px', color: '#666' }}>리뷰 작성</span>
      </div>

      <div style={{ padding: '16px' }}>

        {/* 가게 선택 */}
        <SectionCard title="📍 가게 선택">
          {storeName ? (
            <div style={{
              background: '#fff5f3', borderRadius: '12px', padding: '14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: '#333' }}>{storeName}</p>
                {address && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>{address}</p>}
              </div>
              <a href={`/map?selectMode=true&returnTo=review`} style={{
                padding: '6px 14px', background: '#FF5A3D', color: 'white',
                borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                textDecoration: 'none'
              }}>변경</a>
            </div>
          ) : (
            <a href="/map?selectMode=true&returnTo=review" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '16px', background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)',
              color: 'white', borderRadius: '14px', textDecoration: 'none',
              fontSize: '15px', fontWeight: '700'
            }}>🗺️ 지도에서 가게 선택하기</a>
          )}
        </SectionCard>

        {/* 메뉴 + 한줄평 */}
        <SectionCard title="🍴 메뉴 정보">
          <input
            value={menuName} onChange={e => setMenuName(e.target.value)}
            placeholder="주문한 메뉴 이름 *"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '12px',
              border: '1px solid #eee', fontSize: '14px', marginBottom: '12px',
              boxSizing: 'border-box', outline: 'none'
            }}
          />
          <input
            value={oneLineReview} onChange={e => setOneLineReview(e.target.value)}
            placeholder="한줄평 (예: 여기 돈까스 진짜 맛있음)"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '12px',
              border: '1px solid #eee', fontSize: '14px',
              boxSizing: 'border-box', outline: 'none'
            }}
          />
        </SectionCard>

        {/* 사진 업로드 */}
        <SectionCard title="📷 사진 (최대 3장)">
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {photos.map((url, i) => (
              <div key={i} style={{ position: 'relative', width: '80px', height: '80px' }}>
                <img src={url} alt={`사진${i+1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                <button onClick={() => setPhotos(p => p.filter((_,j)=>j!==i))} style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#FF5A3D', color: 'white', border: 'none',
                  borderRadius: '50%', width: '20px', height: '20px',
                  fontSize: '12px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>×</button>
              </div>
            ))}
            {photos.length < 3 && (
              <label style={{
                width: '80px', height: '80px', borderRadius: '12px',
                border: '2px dashed #ddd', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', flexDirection: 'column', gap: '4px'
              }}>
                <span style={{ fontSize: '24px' }}>{uploading ? '⏳' : '+'}</span>
                <span style={{ fontSize: '10px', color: '#aaa' }}>{uploading ? '업로드 중' : '사진 추가'}</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        </SectionCard>

        {/* 별점 + 재방문 */}
        <SectionCard title="⭐ 별점 & 재방문">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setStarScore(n)} style={{
                fontSize: '32px', background: 'none', border: 'none',
                cursor: 'pointer', opacity: n <= starScore ? 1 : 0.3,
                transform: n <= starScore ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.15s'
              }}>⭐</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => setWantToGoBack(v)} style={{
                padding: '10px 24px', borderRadius: '20px', border: 'none',
                cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                background: wantToGoBack === v ? '#FF5A3D' : '#f5f5f5',
                color: wantToGoBack === v ? 'white' : '#aaa',
              }}>{v ? '✅ 또 갈래요' : '❌ 아니요'}</button>
            ))}
          </div>
        </SectionCard>

        {/* 맛 프로필 */}
        <SectionCard title="🎯 맛 프로필 (1-10)">
          <CircleScale label="맛"    emoji="🍽️" value={tasteScore}   onChange={setTasteScore}/>
          <CircleScale label="양"    emoji="🍱" value={portionScore} onChange={setPortionScore}/>
          <CircleScale label="가성비" emoji="💰" value={valueScore}   onChange={setValueScore}/>
          <CircleScale label="맵기"  emoji="🌶️" value={spiciness}    onChange={setSpiciness}/>
          <CircleScale label="짠기"  emoji="🧂" value={saltiness}    onChange={setSaltiness}/>
          <CircleScale label="단기"  emoji="🍯" value={sweetness}    onChange={setSweetness}/>
        </SectionCard>

        {/* 식감 태그 */}
        <SectionCard title="🫶 식감 (최대 3개)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TEXTURE_OPTIONS.map(t => (
              <button key={t} onClick={() => toggleTag(t, textureTags, setTextureTags, 3)} style={{
                padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                background: textureTags.includes(t) ? '#FF5A3D' : '#f5f5f5',
                color: textureTags.includes(t) ? 'white' : '#666',
                fontWeight: '600', fontSize: '13px'
              }}>{t}</button>
            ))}
          </div>
        </SectionCard>

        {/* 상황 태그 */}
        <SectionCard title="🎪 상황 (최대 2개)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {SITUATION_OPTIONS.map(t => (
              <button key={t} onClick={() => toggleTag(t, situationTags, setSituationTags, 2)} style={{
                padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                background: situationTags.includes(t) ? '#2196F3' : '#f5f5f5',
                color: situationTags.includes(t) ? 'white' : '#666',
                fontWeight: '600', fontSize: '13px'
              }}>{t}</button>
            ))}
          </div>
        </SectionCard>

        {/* 비교 */}
        <SectionCard title="🔄 비교 (선택)">
          <input value={compareMenu} onChange={e => setCompareMenu(e.target.value)}
            placeholder="비교 메뉴 (예: 다른 가게 돈까스)"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '12px',
              border: '1px solid #eee', fontSize: '14px', marginBottom: '10px',
              boxSizing: 'border-box', outline: 'none'
            }}/>
          <input value={compareStore} onChange={e => setCompareStore(e.target.value)}
            placeholder="비교 가게 이름"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '12px',
              border: '1px solid #eee', fontSize: '14px',
              boxSizing: 'border-box', outline: 'none'
            }}/>
        </SectionCard>

        {/* 리뷰 텍스트 */}
        <SectionCard title="✍️ 상세 리뷰 (선택)">
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="자세한 후기를 남겨주세요..."
            rows={4}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '12px',
              border: '1px solid #eee', fontSize: '14px', lineHeight: '1.6',
              resize: 'vertical', boxSizing: 'border-box', outline: 'none'
            }}/>
        </SectionCard>

        {/* 제출 버튼 */}
        <button onClick={handleSubmit} disabled={submitting} style={{
          width: '100%', padding: '18px', borderRadius: '16px', border: 'none',
          background: submitting ? '#ccc' : 'linear-gradient(135deg,#FF5A3D,#FF8C42)',
          color: 'white', fontSize: '16px', fontWeight: '800',
          cursor: submitting ? 'not-allowed' : 'pointer'
        }}>{submitting ? '등록 중...' : '🍴 리뷰 등록하기'}</button>
      </div>

      {/* 바로가기 바 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid #f0f0f0',
        display: 'flex', padding: '8px 0', zIndex: 100
      }}>
        {[
          {icon:'🗺️',label:'지도',path:'/map'},
          {icon:'🍜',label:'MOTD',path:'/feed'},
          {icon:'✍️',label:'리뷰',path:'/review/write'},
          {icon:'🔖',label:'저장',path:'/saved'},
          {icon:'👤',label:'프로필',path:'/profile'},
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)} style={{
            flex: 1, border: 'none', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            cursor: 'pointer', padding: '4px 0'
          }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', color: '#999' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

/* ── 페이지 래퍼 ── */
export default function ReviewWritePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#999' }}>로딩 중...</p>
      </div>
    }>
      <ReviewWriteInner />
    </Suspense>
  )
}
