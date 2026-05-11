'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface StoreCandidate {
  id?: string
  name: string
  category: string | null
  address: string | null
  phone: string | null
  latitude?: number | null
  longitude?: number | null
  isNew?: boolean
}

function isValidUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

const supabase = createClient()

/* =========================================================
   DotSlider
   ========================================================= */
function DotSlider({
  label, emoji, value, onChange, color = '#111',
}: {
  label: string
  emoji: string
  value: number
  onChange: (v: number) => void
  color?: string
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{emoji}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{label}</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>
          {value}
          <span style={{ fontSize: 12, color: '#C7C7C7' }}>/5</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(d => (
          <button
            key={d}
            onClick={() => onChange(d)}
            style={{
              flex: 1, height: 8, borderRadius: 4, border: 'none',
              cursor: 'pointer',
              background: d <= value ? '#111' : '#EFEFEF',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 10, color: '#C7C7C7' }}>낮음</span>
        <span style={{ fontSize: 10, color: '#C7C7C7' }}>높음</span>
      </div>
    </div>
  )
}

/* =========================================================
   WriteContent
   ========================================================= */
function WriteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [storeQuery, setStoreQuery] = useState('')
  const [dbResults, setDbResults] = useState<StoreCandidate[]>([])
  const [naverResults, setNaverResults] = useState<StoreCandidate[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedStore, setSelectedStore] = useState<StoreCandidate | null>(null)
  const [registeringStore, setRegisteringStore] = useState(false)

  const [menuName, setMenuName] = useState('')
  const [menuPrice, setMenuPrice] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [starRating, setStarRating] = useState(0)
  const [revisit, setRevisit] = useState<boolean | null>(null)
  const [tasteME, setTasteME] = useState(3)
  const [tasteAmount, setTasteAmount] = useState(3)
  const [tasteSpicy, setTasteSpicy] = useState(3)
  const [tasteSalty, setTasteSalty] = useState(3)
  const [tasteSweet, setTasteSweet] = useState(3)
  const [desiredPrice, setDesiredPrice] = useState('')
  const [textureTags, setTextureTags] = useState<string[]>([])
  const [situationTags, setSituationTags] = useState<string[]>([])
  const [oneLineReview, setOneLineReview] = useState('')
  const [content, setContent] = useState('')
  const [customTag, setCustomTag] = useState('')
  const [customTags, setCustomTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const TEXTURE_OPTIONS = [
    '바삭함', '쫄깃함', '부드러움', '촉촉함', '담백함',
    '진한맛', '깔끔함', '풍부함', '아삭함', '짭조름함',
  ]
  const SITUATION_OPTIONS = [
    '혼밥', '데이트', '가족', '회식', '빠른식사',
    '특별한날', '건강식', '야식', '점심', '저녁',
  ]
  const totalSteps = 9

  const STEP_TITLES = [
    '', '어디서 드셨나요?', '메뉴 정보', '사진 추가',
    '별점 & 재방문', '맛 평가', '적정 가격',
    '식감 태그', '상황 태그', '리뷰 작성',
  ]

  const STAR_LABELS = ['별점을 선택해주세요', '별로에요 😞', '그냥 그래요 😐', '괜찮아요 🙂', '맛있어요 😋', '최고예요! 🔥']

  useEffect(() => {
    const storeId = searchParams.get('storeId')
    const storeName = searchParams.get('storeName')
    if (storeId && storeName) {
      setSelectedStore({
        id: storeId,
        name: decodeURIComponent(storeName),
        category: null, address: null, phone: null,
      })
      setStep(2)
    }
  }, [searchParams])

  /* ── 가게 검색 ── */
  async function handleStoreSearch(q: string) {
    setStoreQuery(q)
    if (!q.trim()) { setDbResults([]); setNaverResults([]); return }
    setSearching(true)
    try {
      const { data: dbData } = await supabase
        .from('stores')
        .select('id,name,category,address,phone,latitude,longitude')
        .or(`name.ilike.%${q}%,address.ilike.%${q}%`)
        .limit(5)
      setDbResults((dbData || []).map((s: StoreCandidate) => ({ ...s, isNew: false })))

      const res = await fetch(`/api/search-store?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setNaverResults(
        (data.items || []).map((item: StoreCandidate) => ({ ...item, isNew: true, id: undefined }))
      )
    } catch (e) {
      console.error('검색 오류:', e)
    } finally {
      setSearching(false)
    }
  }

  /* ── 가게 선택 ── */
  async function handleSelectStore(store: StoreCandidate) {
    if (!store.isNew) {
      setSelectedStore(store)
      setDbResults([]); setNaverResults([]); setStoreQuery('')
      setStep(2); return
    }
    setRegisteringStore(true)
    try {
      let lat: number | null = null, lng: number | null = null
      if (store.latitude && store.longitude) {
        const coordRes = await fetch(`/api/convert-coords?mx=${store.longitude}&my=${store.latitude}`)
        const coord = await coordRes.json()
        lat = coord.lat; lng = coord.lng
      }
      const { data: newStore, error } = await supabase
        .from('stores')
        .insert({
          name: store.name, category: store.category,
          address: store.address, phone: store.phone,
          latitude: lat, longitude: lng,
        })
        .select().single()
      if (error) {
        const { data: existing } = await supabase
          .from('stores').select('*').eq('name', store.name).maybeSingle()
        if (existing) setSelectedStore({ ...existing, isNew: false })
      } else if (newStore) {
        setSelectedStore({ ...newStore, isNew: false })
      }
      setDbResults([]); setNaverResults([]); setStoreQuery('')
      setStep(2)
    } catch (e) {
      console.error('가게 등록 오류:', e)
    } finally {
      setRegisteringStore(false)
    }
  }

  /* ── 사진 ── */
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const newFiles = [...photos, ...files].slice(0, 5)
    setPhotos(newFiles)
    setPhotoPreviews(newFiles.map(f => URL.createObjectURL(f)))
  }

  function removePhoto(i: number) {
    const nf = photos.filter((_, j) => j !== i)
    setPhotos(nf)
    setPhotoPreviews(nf.map(f => URL.createObjectURL(f)))
  }

  /* ── 태그 토글 ── */
  function toggleTag(
    tag: string,
    arr: string[],
    setArr: (a: string[]) => void,
    max: number
  ) {
    if (arr.includes(tag)) setArr(arr.filter(t => t !== tag))
    else if (arr.length < max) setArr([...arr, tag])
  }

  /* ── 제출 ── */
  async function handleSubmit() {
    if (!selectedStore || !oneLineReview.trim()) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let storeId = selectedStore.id
      if (!storeId || !isValidUUID(storeId)) {
        const { data: found } = await supabase
          .from('stores').select('id').eq('name', selectedStore.name).maybeSingle()
        storeId = found?.id
      }
      if (!storeId) { alert('가게 정보를 다시 확인해주세요.'); return }

      const uploadedUrls: string[] = []
      for (const photo of photos) {
        const ext = photo.name.split('.').pop()
        const path = `reviews/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('review-photos').upload(path, photo)
        if (!upErr) {
          const { data: urlData } = supabase.storage
            .from('review-photos').getPublicUrl(path)
          if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl)
        }
      }

      const allTags = [...textureTags, ...situationTags, ...customTags]
      const { error: revErr } = await supabase.from('reviews').insert({
        user_id: user.id,
        store_id: storeId,
        menu_name: menuName || null,
        menu_price: menuPrice ? parseInt(menuPrice) : null,
        one_line_review: oneLineReview,
        content: content || null,
        total_rating: starRating,
        revisit,
        taste_me: tasteME,
        taste_amount: tasteAmount,
        taste_spicy: tasteSpicy,
        taste_salty: tasteSalty,
        taste_sweet: tasteSweet,
        desired_price: desiredPrice ? parseInt(desiredPrice) : null,
        photos: uploadedUrls.length > 0 ? uploadedUrls : null,
        tags: allTags.length > 0 ? allTags : null,
      })

      if (revErr) {
        console.error('리뷰 저장 오류:', JSON.stringify(revErr))
        alert(`리뷰 저장 실패: ${revErr.message || revErr.code}`)
        return
      }
      setSubmitted(true)
    } catch (e) {
      console.error('제출 오류:', e)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── 완료 화면 ── */
  if (submitted) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#fff',
        padding: 32, textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        {/* 로고 */}
        <img
          src="/yum2.png" alt="YumMap"
          style={{ height: 32, objectFit: 'contain', marginBottom: 40, cursor: 'pointer' }}
          onClick={() => router.push('/feed')}
        />

        {/* 체크 아이콘 */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, marginBottom: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}>✓</div>

        <h2 style={{
          margin: '0 0 8px', fontSize: 24,
          fontWeight: 800, color: '#111', letterSpacing: -0.5,
        }}>
          리뷰 등록 완료!
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#8E8E8E', lineHeight: 1.6 }}>
          소중한 맛집 후기를 공유해줘서 고마워요 🍽️
        </p>

        {/* 요약 카드 */}
        <div style={{
          width: '100%', maxWidth: 320,
          background: '#F9F9F9', borderRadius: 16,
          padding: '18px 20px', marginBottom: 32,
          textAlign: 'left',
        }}>
          {selectedStore && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111' }}>
                  {selectedStore.name}
                </p>
                {menuName && (
                  <p style={{ margin: 0, fontSize: 12, color: '#8E8E8E' }}>
                    {menuName}
                    {starRating > 0 && ` · ${'★'.repeat(starRating)}`}
                  </p>
                )}
              </div>
            </div>
          )}
          {oneLineReview && (
            <p style={{
              margin: 0, fontSize: 13, color: '#555',
              fontStyle: 'italic', lineHeight: 1.5,
              borderTop: '1px solid #EFEFEF', paddingTop: 10,
            }}>
              "{oneLineReview}"
            </p>
          )}
        </div>

        <button
          onClick={() => router.push('/feed')}
          style={{
            width: '100%', maxWidth: 320, padding: '16px',
            background: '#111', color: '#fff', border: 'none',
            borderRadius: 12, fontWeight: 700, fontSize: 15,
            cursor: 'pointer', marginBottom: 10,
          }}
        >
          피드 보러가기
        </button>
        <button
          onClick={() => router.push('/map')}
          style={{
            width: '100%', maxWidth: 320, padding: '16px',
            background: '#fff', color: '#111',
            border: '1.5px solid #DBDBDB',
            borderRadius: 12, fontWeight: 600, fontSize: 15,
            cursor: 'pointer',
          }}
        >
          지도에서 보기
        </button>
      </div>
    )
  }

  const canNext =
    step === 1 ? !!selectedStore :
    step === 9 ? !!oneLineReview.trim() :
    true

  /* ── 렌더 ── */
  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      background: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* ── 헤더 ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff', borderBottom: '1px solid #EFEFEF',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', height: 54, gap: 10,
      }}>
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
          style={{
            border: 'none', background: 'none',
            fontSize: 20, cursor: 'pointer',
            color: '#111', padding: '4px 8px 4px 0',
            display: 'flex', alignItems: 'center',
          }}
        >
          ←
        </button>

        <img
          src="/yum2.png" alt="YumMap"
          style={{ height: 24, objectFit: 'contain', cursor: 'pointer' }}
          onClick={() => router.push('/feed')}
        />

        <span style={{ flex: 1 }} />

        {/* 스텝 인디케이터 */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} style={{
              width: i + 1 === step ? 16 : 6,
              height: 6, borderRadius: 3,
              background: i + 1 <= step ? '#111' : '#EFEFEF',
              transition: 'all 0.25s ease',
            }} />
          ))}
        </div>
      </header>

      {/* ── 진행 바 ── */}
      <div style={{ height: 2, background: '#F0F0F0' }}>
        <div style={{
          height: '100%', background: '#111',
          width: `${(step / totalSteps) * 100}%`,
          transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>

      {/* ── 스텝 타이틀 ── */}
      <div style={{ padding: '28px 20px 0' }}>
        <p style={{
          margin: '0 0 6px', fontSize: 11,
          color: '#C7C7C7', fontWeight: 700, letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>
          Step {step} / {totalSteps}
        </p>
        <h2 style={{
          margin: '0 0 24px', fontSize: 22,
          fontWeight: 800, color: '#111', letterSpacing: -0.5,
        }}>
          {STEP_TITLES[step]}
        </h2>
      </div>

      {/* ── 콘텐츠 ── */}
      <div style={{ padding: '0 20px 140px' }}>

        {/* ─────────── STEP 1: 가게 선택 ─────────── */}
        {step === 1 && (
          <div>
            {/* 선택된 가게 배지 */}
            {selectedStore && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: '#F9F9F9',
                borderRadius: 14, marginBottom: 16,
                border: '1.5px solid #DBDBDB',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#111',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: '#fff', flexShrink: 0,
                }}>
                  ✓
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111' }}>
                    {selectedStore.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#8E8E8E' }}>
                    {selectedStore.address || '주소 없음'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStore(null)}
                  style={{
                    border: 'none', background: '#EFEFEF', color: '#8E8E8E',
                    cursor: 'pointer', fontSize: 13, width: 28, height: 28,
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* 검색 입력 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#FAFAFA', borderRadius: 14,
              border: '1.5px solid #DBDBDB',
              padding: '0 14px', marginBottom: 12,
            }}>
              <span style={{ fontSize: 16, color: '#C7C7C7' }}>🔍</span>
              <input
                value={storeQuery}
                onChange={e => handleStoreSearch(e.target.value)}
                placeholder="가게 이름 또는 주소 검색"
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  padding: '14px 0', fontSize: 15, outline: 'none', color: '#111',
                }}
              />
              {searching && (
                <span style={{ fontSize: 12, color: '#C7C7C7', whiteSpace: 'nowrap' }}>검색중…</span>
              )}
            </div>

            {/* 등록 중 */}
            {registeringStore && (
              <div style={{
                textAlign: 'center', padding: '14px',
                background: '#F9F9F9', borderRadius: 12,
                marginBottom: 12, color: '#555',
                fontWeight: 600, fontSize: 14,
              }}>
                가게 등록 중… ⏳
              </div>
            )}

            {/* DB 결과 */}
            {dbResults.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{
                  margin: '0 0 10px', fontSize: 11,
                  fontWeight: 700, color: '#8E8E8E', letterSpacing: 1,
                }}>
                  등록된 가게
                </p>
                {dbResults.map((s, i) => (
                  <button key={i} onClick={() => handleSelectStore(s)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 14px', border: '1.5px solid #EFEFEF',
                    borderRadius: 14, background: '#fff', cursor: 'pointer',
                    marginBottom: 8, textAlign: 'left',
                  }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: '#F5F5F5',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 20, flexShrink: 0,
                    }}>
                      🏪
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>
                        {s.name}
                      </p>
                      <p style={{
                        margin: 0, fontSize: 12, color: '#8E8E8E',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {[s.category, s.address].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span style={{ fontSize: 18, color: '#C7C7C7', flexShrink: 0 }}>›</span>
                  </button>
                ))}
              </div>
            )}

            {/* 네이버 결과 */}
            {naverResults.length > 0 && (
              <div>
                <p style={{
                  margin: '0 0 10px', fontSize: 11,
                  fontWeight: 700, color: '#8E8E8E', letterSpacing: 1,
                }}>
                  검색 결과 (선택 시 자동 등록)
                </p>
                {naverResults.map((s, i) => (
                  <button key={i} onClick={() => handleSelectStore(s)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 14px', border: '1.5px dashed #DBDBDB',
                    borderRadius: 14, background: '#FAFAFA', cursor: 'pointer',
                    marginBottom: 8, textAlign: 'left',
                  }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: '#EFEFEF',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 20, flexShrink: 0,
                    }}>
                      🔍
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>
                          {s.name}
                        </p>
                        <span style={{
                          fontSize: 10, background: '#111', color: '#fff',
                          padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                        }}>
                          NEW
                        </span>
                      </div>
                      <p style={{
                        margin: 0, fontSize: 12, color: '#8E8E8E',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {[s.category, s.address].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span style={{ fontSize: 18, color: '#C7C7C7', flexShrink: 0 }}>›</span>
                  </button>
                ))}
              </div>
            )}

            {storeQuery && !searching && dbResults.length === 0 && naverResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#C7C7C7' }}>
                <p style={{ fontSize: 36, margin: '0 0 10px' }}>🔍</p>
                <p style={{ fontSize: 14, margin: 0, color: '#8E8E8E' }}>검색 결과가 없어요</p>
                <p style={{ fontSize: 12, margin: '6px 0 0' }}>다른 키워드로 검색해보세요</p>
              </div>
            )}
          </div>
        )}

        {/* ─────────── STEP 2: 메뉴 정보 ─────────── */}
        {step === 2 && (
          <div>
            {selectedStore && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', background: '#F5F5F5',
                borderRadius: 12, marginBottom: 28,
              }}>
                <span style={{ fontSize: 18 }}>📍</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>
                    {selectedStore.name}
                  </p>
                  {selectedStore.address && (
                    <p style={{ margin: 0, fontSize: 12, color: '#8E8E8E' }}>
                      {selectedStore.address}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: 13,
                fontWeight: 700, color: '#111', marginBottom: 8,
              }}>
                메뉴 이름
              </label>
              <input
                value={menuName}
                onChange={e => setMenuName(e.target.value)}
                placeholder="예: 마르게리따 피자"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  border: '1.5px solid #EFEFEF', fontSize: 15, outline: 'none',
                  boxSizing: 'border-box', color: '#111', background: '#FAFAFA',
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: 13,
                fontWeight: 700, color: '#111', marginBottom: 8,
              }}>
                메뉴 가격
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  value={menuPrice}
                  onChange={e => setMenuPrice(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="15000"
                  type="text" inputMode="numeric"
                  style={{
                    width: '100%', padding: '14px 48px 14px 16px',
                    borderRadius: 12, border: '1.5px solid #EFEFEF',
                    fontSize: 15, outline: 'none', boxSizing: 'border-box',
                    color: '#111', background: '#FAFAFA',
                  }}
                />
                <span style={{
                  position: 'absolute', right: 16, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 14, color: '#8E8E8E', fontWeight: 600,
                }}>
                  원
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─────────── STEP 3: 사진 ─────────── */}
        {step === 3 && (
          <div>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8E8E8E' }}>
              최대 5장 · 첫 번째 사진이 대표 이미지예요
            </p>

            {photos.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6, marginBottom: 12,
              }}>
                {photoPreviews.map((src, i) => (
                  <div key={i} style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: i === 0 ? 14 : 10,
                    overflow: 'hidden',
                    boxShadow: i === 0 ? '0 2px 12px rgba(0,0,0,0.1)' : 'none',
                  }}>
                    <img
                      src={src}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      alt=""
                    />
                    {i === 0 && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(0,0,0,0.5)', padding: '5px',
                        textAlign: 'center', fontSize: 10,
                        color: '#fff', fontWeight: 700, letterSpacing: 0.5,
                      }}>
                        대표
                      </div>
                    )}
                    <button
                      onClick={() => removePhoto(i)}
                      style={{
                        position: 'absolute', top: 5, right: 5,
                        background: 'rgba(0,0,0,0.55)', color: '#fff',
                        border: 'none', borderRadius: '50%',
                        width: 22, height: 22, cursor: 'pointer',
                        fontSize: 11, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {photos.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      aspectRatio: '1', border: '1.5px dashed #DBDBDB',
                      borderRadius: 10, background: '#FAFAFA',
                      cursor: 'pointer', display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 22, color: '#C7C7C7' }}>+</span>
                    <span style={{ fontSize: 10, color: '#C7C7C7' }}>추가</span>
                  </button>
                )}
              </div>
            )}

            {photos.length === 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', padding: '40px 20px',
                  border: '1.5px dashed #DBDBDB', borderRadius: 16,
                  background: '#FAFAFA', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 44 }}>📷</span>
                <span style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>
                  사진을 추가해주세요
                </span>
                <span style={{ fontSize: 12, color: '#C7C7C7' }}>
                  탭해서 갤러리에서 선택
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file" accept="image/*" multiple
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />

            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                marginTop: 8, width: '100%', padding: '14px',
                border: '1.5px solid #EFEFEF', borderRadius: 12,
                background: '#fff', color: '#8E8E8E',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              사진 없이 계속하기
            </button>
          </div>
        )}

        {/* ─────────── STEP 4: 별점 & 재방문 ─────────── */}
        {step === 4 && (
          <div>
            <div style={{
              textAlign: 'center', paddingBottom: 28,
              borderBottom: '1px solid #F0F0F0', marginBottom: 28,
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s} onClick={() => setStarRating(s)}
                    style={{
                      border: 'none', background: 'none', cursor: 'pointer', padding: 4,
                      fontSize: 42,
                      opacity: s <= starRating ? 1 : 0.2,
                      transform: s <= starRating ? 'scale(1.08)' : 'scale(1)',
                      transition: 'all 0.15s',
                    }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111' }}>
                {STAR_LABELS[starRating]}
              </p>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#111' }}>
              또 방문하고 싶으신가요?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { v: true, icon: '😍', label: '또 갈게요!' },
                { v: false, icon: '😅', label: '글쎄요…' },
              ].map(opt => (
                <button
                  key={String(opt.v)}
                  onClick={() => setRevisit(opt.v)}
                  style={{
                    flex: 1, padding: '20px 16px', borderRadius: 14,
                    border: `2px solid ${revisit === opt.v ? '#111' : '#EFEFEF'}`,
                    background: revisit === opt.v ? '#111' : '#FAFAFA',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 32 }}>{opt.icon}</span>
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: revisit === opt.v ? '#fff' : '#8E8E8E',
                  }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─────────── STEP 5: 맛 평가 ─────────── */}
        {step === 5 && (
          <div>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#8E8E8E' }}>
              솔직하게 평가해주세요!
            </p>
            <DotSlider label="간 (나에게)" emoji="🧂" value={tasteME} onChange={setTasteME} />
            <DotSlider label="양" emoji="🍱" value={tasteAmount} onChange={setTasteAmount} />
            <DotSlider label="매운맛" emoji="🌶️" value={tasteSpicy} onChange={setTasteSpicy} />
            <DotSlider label="짠맛" emoji="🧊" value={tasteSalty} onChange={setTasteSalty} />
            <DotSlider label="단맛" emoji="🍯" value={tasteSweet} onChange={setTasteSweet} />
          </div>
        )}

        {/* ─────────── STEP 6: 적정 가격 ─────────── */}
        {step === 6 && (
          <div>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8E8E8E' }}>
              {menuName ? `"${menuName}"의` : '이 메뉴의'} 적정 가격을 알려주세요
            </p>

            <div style={{ position: 'relative', marginBottom: 14 }}>
              <input
                value={desiredPrice}
                onChange={e => setDesiredPrice(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0"
                type="text" inputMode="numeric"
                style={{
                  width: '100%', padding: '20px 60px 20px 20px',
                  borderRadius: 14, border: '1.5px solid #EFEFEF',
                  fontSize: 28, fontWeight: 800, outline: 'none',
                  boxSizing: 'border-box', color: '#111', background: '#FAFAFA',
                }}
              />
              <span style={{
                position: 'absolute', right: 20, top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 16, color: '#8E8E8E', fontWeight: 700,
              }}>
                원
              </span>
            </div>

            {desiredPrice && (
              <div style={{
                padding: '14px 16px', background: '#F5F5F5',
                borderRadius: 12, textAlign: 'center', marginBottom: 20,
              }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>
                  {parseInt(desiredPrice).toLocaleString()}원이 적당해요 👍
                </span>
              </div>
            )}

            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#8E8E8E', fontWeight: 600 }}>
              빠른 선택
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[5000, 8000, 10000, 12000, 15000, 20000, 30000].map(p => (
                <button
                  key={p}
                  onClick={() => setDesiredPrice(String(p))}
                  style={{
                    padding: '9px 16px', borderRadius: 20,
                    border: `1.5px solid ${desiredPrice === String(p) ? '#111' : '#DBDBDB'}`,
                    background: desiredPrice === String(p) ? '#111' : '#fff',
                    color: desiredPrice === String(p) ? '#fff' : '#555',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.toLocaleString()}원
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─────────── STEP 7: 식감 태그 ─────────── */}
        {step === 7 && (
          <div>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8E8E8E' }}>
              최대 5개 선택
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {TEXTURE_OPTIONS.map(tag => {
                const on = textureTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag, textureTags, setTextureTags, 5)}
                    style={{
                      padding: '10px 18px', borderRadius: 24,
                      border: `2px solid ${on ? '#111' : '#DBDBDB'}`,
                      background: on ? '#111' : '#fff',
                      color: on ? '#fff' : '#555',
                      fontWeight: 600, fontSize: 14,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ─────────── STEP 8: 상황 태그 ─────────── */}
        {step === 8 && (
          <div>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#8E8E8E' }}>
              최대 5개 선택
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {SITUATION_OPTIONS.map(tag => {
                const on = situationTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag, situationTags, setSituationTags, 5)}
                    style={{
                      padding: '10px 18px', borderRadius: 24,
                      border: `2px solid ${on ? '#111' : '#DBDBDB'}`,
                      background: on ? '#111' : '#fff',
                      color: on ? '#fff' : '#555',
                      fontWeight: 600, fontSize: 14,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ─────────── STEP 9: 리뷰 작성 ─────────── */}
        {step === 9 && (
          <div>
            {/* 한줄 리뷰 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: 13,
                fontWeight: 700, color: '#111', marginBottom: 8,
              }}>
                한줄 리뷰{' '}
                <span style={{
                  fontSize: 11, color: '#fff', background: '#111',
                  padding: '2px 7px', borderRadius: 6, fontWeight: 700,
                }}>
                  필수
                </span>
              </label>
              <input
                value={oneLineReview}
                onChange={e => {
                  if (e.target.value.length <= 100) setOneLineReview(e.target.value)
                }}
                placeholder="한 문장으로 솔직하게 표현해주세요"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  border: `1.5px solid ${oneLineReview ? '#111' : '#EFEFEF'}`,
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  color: '#111', background: '#FAFAFA',
                  transition: 'border-color 0.2s',
                }}
              />
              <p style={{ margin: '5px 0 0', fontSize: 11, color: '#C7C7C7', textAlign: 'right' }}>
                {oneLineReview.length}/100
              </p>
            </div>

            {/* 상세 리뷰 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: 13,
                fontWeight: 700, color: '#111', marginBottom: 8,
              }}>
                상세 리뷰{' '}
                <span style={{ fontSize: 11, color: '#C7C7C7', fontWeight: 400 }}>선택</span>
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="분위기, 서비스, 특이사항을 자유롭게 써주세요"
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  border: '1.5px solid #EFEFEF', fontSize: 14,
                  resize: 'none', height: 110, outline: 'none',
                  boxSizing: 'border-box', lineHeight: 1.6,
                  color: '#111', background: '#FAFAFA',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* 커스텀 태그 */}
            <div>
              <label style={{
                display: 'block', fontSize: 13,
                fontWeight: 700, color: '#111', marginBottom: 8,
              }}>
                나만의 태그{' '}
                <span style={{ fontSize: 11, color: '#C7C7C7', fontWeight: 400 }}>선택</span>
              </label>
              <div style={{
                display: 'flex', gap: 8,
                background: '#FAFAFA', borderRadius: 12,
                border: '1.5px solid #EFEFEF',
                padding: '4px 4px 4px 14px',
                alignItems: 'center',
              }}>
                <span style={{ color: '#C7C7C7', fontSize: 14, fontWeight: 700 }}>#</span>
                <input
                  value={customTag}
                  onChange={e => setCustomTag(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customTag.trim()) {
                      setCustomTags(prev => [...prev, customTag.trim()])
                      setCustomTag('')
                    }
                  }}
                  placeholder="태그 입력 후 엔터"
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    fontSize: 14, outline: 'none', color: '#111', padding: '10px 0',
                  }}
                />
                <button
                  onClick={() => {
                    if (customTag.trim()) {
                      setCustomTags(prev => [...prev, customTag.trim()])
                      setCustomTag('')
                    }
                  }}
                  style={{
                    padding: '9px 14px', borderRadius: 10,
                    border: 'none', background: '#111',
                    color: '#fff', fontSize: 13,
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  추가
                </button>
              </div>

              {customTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {customTags.map((tag, i) => (
                    <span key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', background: '#F0F0F0',
                      borderRadius: 20, fontSize: 13, color: '#555',
                    }}>
                      #{tag}
                      <button
                        onClick={() => setCustomTags(customTags.filter((_, j) => j !== i))}
                        style={{
                          border: 'none', background: 'none',
                          cursor: 'pointer', color: '#C7C7C7',
                          padding: 0, fontSize: 13, lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 최종 제출 전 요약 */}
            <div style={{
              marginTop: 24, padding: '16px',
              background: '#F9F9F9', borderRadius: 14,
              border: '1px solid #EFEFEF',
            }}>
              <p style={{
                margin: '0 0 10px', fontSize: 11,
                fontWeight: 700, color: '#8E8E8E', letterSpacing: 1,
              }}>
                리뷰 요약
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: '📍 가게', value: selectedStore?.name },
                  { label: '🍽️ 메뉴', value: menuName || '-' },
                  { label: '⭐ 별점', value: starRating > 0 ? `${'★'.repeat(starRating)} ${starRating}.0` : '-' },
                  { label: '📸 사진', value: photos.length > 0 ? `${photos.length}장` : '없음' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: '#8E8E8E', minWidth: 70 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 버튼 ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        padding: '12px 20px 32px',
        background: '#fff', borderTop: '1px solid #EFEFEF',
        boxSizing: 'border-box',
      }}>
        {step < totalSteps ? (
          <button
            onClick={() => {
              if (step === 1 && !selectedStore) { alert('가게를 선택해주세요'); return }
              setStep(s => s + 1)
            }}
            disabled={!canNext}
            style={{
              width: '100%', padding: '16px',
              background: canNext ? '#111' : '#EFEFEF',
              color: canNext ? '#fff' : '#C7C7C7',
              border: 'none', borderRadius: 14,
              fontWeight: 700, fontSize: 16,
              cursor: canNext ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            다음 →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !oneLineReview.trim()}
            style={{
              width: '100%', padding: '16px',
              background: submitting || !oneLineReview.trim() ? '#EFEFEF' : '#111',
              color: submitting || !oneLineReview.trim() ? '#C7C7C7' : '#fff',
              border: 'none', borderRadius: 14,
              fontWeight: 700, fontSize: 16,
              cursor: submitting || !oneLineReview.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
            }}
          >
            {submitting ? (
              <>
                <div style={{
                  width: 16, height: 16, border: '2px solid #C7C7C7',
                  borderTop: '2px solid #fff', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                등록 중…
              </>
            ) : (
              '리뷰 등록하기 🎉'
            )}
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

/* =========================================================
   Page export
   ========================================================= */
export default function ReviewWritePage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#fff',
        flexDirection: 'column', gap: 16,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <img src="/yum2.png" alt="YumMap" style={{ height: 28, objectFit: 'contain' }} />
        <div style={{
          width: 24, height: 24, border: '2.5px solid #EFEFEF',
          borderTop: '2.5px solid #111', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    }>
      <WriteContent />
    </Suspense>
  )
}
