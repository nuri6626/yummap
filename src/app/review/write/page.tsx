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

function DotSlider({
  value,
  onChange,
  min = 1,
  max = 5,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: value === v ? '#111' : '#eee',
            color: value === v ? '#fff' : '#111',
            border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
          }}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

function WriteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [registeringStore, setRegisteringStore] = useState(false)
  const [done, setDone] = useState(false)

  const [storeQuery, setStoreQuery] = useState('')
  const [dbResults, setDbResults] = useState<StoreCandidate[]>([])
  const [naverResults, setNaverResults] = useState<StoreCandidate[]>([])
  const [selectedStore, setSelectedStore] = useState<StoreCandidate | null>(null)

  const [menuName, setMenuName] = useState('')
  const [menuPrice, setMenuPrice] = useState('')

  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const [starRating, setStarRating] = useState(3)
  const [wantToGoBack, setWantToGoBack] = useState<boolean | null>(null)

  const [tasteMe, setTasteMe] = useState(3)
  const [tasteAmount, setTasteAmount] = useState(3)
  const [tasteSpicy, setTasteSpicy] = useState(3)
  const [tasteSalty, setTasteSalty] = useState(3)
  const [tasteSweet, setTasteSweet] = useState(3)

  const [desiredPrice, setDesiredPrice] = useState('')
  const [textureTags, setTextureTags] = useState<string[]>([])
  const [situationTags, setSituationTags] = useState<string[]>([])
  const [oneLineReview, setOneLineReview] = useState('')
  const [content, setContent] = useState('')
  const [customTags, setCustomTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const TEXTURE_OPTIONS = ['바삭한', '촉촉한', '쫄깃한', '부드러운', '진한', '담백한', '느끼한', '깔끔한']
  const SITUATION_OPTIONS = ['혼밥', '데이트', '가족식사', '친구모임', '회식', '배달', '포장', '술안주']
  const stepTitles = ['가게 선택', '메뉴 정보', '사진', '별점', '재방문', '맛 평가', '가격', '태그', '최종 리뷰']

  useEffect(() => {
    const storeId = searchParams.get('storeId')
    const storeName = searchParams.get('storeName')
    if (storeId && storeName && isValidUUID(storeId)) {
      setSelectedStore({ id: storeId, name: storeName, category: null, address: null, phone: null, isNew: false })
      setStep(2)
    }
  }, [searchParams])

  useEffect(() => {
    if (storeQuery.length < 1) {
      setDbResults([])
      setNaverResults([])
      return
    }
    const timer = setTimeout(async () => {
      // DB 검색 (최대 20개)
      const { data } = await supabase
        .from('stores')
        .select('*')
        .ilike('name', `%${storeQuery}%`)
        .limit(20)
      const dbList = data || []
      setDbResults(dbList)

      // 네이버 검색 (위치 기반)
      try {
        const pos = await new Promise<GeolocationPosition | null>(resolve => {
          if (!navigator.geolocation) { resolve(null); return }
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 3000 })
        })
        const locParam = pos
          ? `&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          : ''
        const res = await fetch(`/api/naver-search?query=${encodeURIComponent(storeQuery)}${locParam}`)
        const json = await res.json()

        // DB에 없는 것만 네이버 결과로 표시
        const filtered = (json.results || []).filter(
          (n: StoreCandidate) => !dbList.some((d: StoreCandidate) => d.name === n.name)
        )
        setNaverResults(filtered)
      } catch {
        setNaverResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [storeQuery])

  function resetSearch() {
    setDbResults([])
    setNaverResults([])
    setStoreQuery('')
  }

  async function handleSelectStore(store: StoreCandidate) {
    if (!store.isNew) {
      setSelectedStore(store)
      resetSearch()
      setStep(2)
      return
    }
    setRegisteringStore(true)
    try {
      const { data: existing } = await supabase
        .from('stores').select('*').eq('name', store.name).maybeSingle()
      if (existing) {
        setSelectedStore({ ...existing, isNew: false })
        resetSearch()
        setStep(2)
        return
      }

      let lat = null
      let lng = null
      if (store.latitude && store.longitude) {
        try {
          const res = await fetch(`/api/convert-coords?mx=${store.longitude}&my=${store.latitude}`)
          const json = await res.json()
          lat = json.lat
          lng = json.lng
        } catch {
          // 좌표 변환 실패 무시
        }
      }

      const { data: newStore, error } = await supabase
        .from('stores')
        .insert({ name: store.name, category: store.category, address: store.address, phone: store.phone, latitude: lat, longitude: lng })
        .select().single()

      if (error) {
        console.error('가게 등록 오류:', JSON.stringify(error))
        if (error.code === '42501') {
          alert('가게 등록 권한이 없어요.')
          return
        }
        const { data: fallback } = await supabase.from('stores').select('*').eq('name', store.name).maybeSingle()
        if (fallback) {
          setSelectedStore({ ...fallback, isNew: false })
        } else {
          alert(`가게 등록 실패: ${error.message}`)
          return
        }
      } else if (newStore) {
        setSelectedStore({ ...newStore, isNew: false })
      }
      resetSearch()
      setStep(2)
    } catch (e) {
      console.error('가게 선택 오류', e)
      alert('가게 선택 중 오류가 발생했어요.')
    } finally {
      setRegisteringStore(false)
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (photos.length + files.length > 5) {
      alert('사진은 최대 5장까지 업로드할 수 있어요.')
      return
    }
    const newFiles = [...photos, ...files]
    setPhotos(newFiles)
    setPhotoPreviews(newFiles.map((f) => URL.createObjectURL(f)))
  }

  function removePhoto(idx: number) {
    const newFiles = photos.filter((_, i) => i !== idx)
    setPhotos(newFiles)
    setPhotoPreviews(newFiles.map((f) => URL.createObjectURL(f)))
  }

  function toggleTag(tag: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag])
  }

  function addCustomTag() {
    const t = tagInput.trim()
    if (!t || customTags.includes(t) || customTags.length >= 10) return
    setCustomTags([...customTags, t])
    setTagInput('')
  }

  async function handleSubmit() {
    if (!selectedStore?.id) { alert('가게를 선택해주세요.'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { alert('로그인이 필요해요.'); router.push('/login'); return }

      const uploadedUrls: string[] = []
      for (const file of photos) {
        const ext = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { data: uploaded, error: upErr } = await supabase.storage
          .from('review-photos').upload(fileName, file, { upsert: true })
        if (upErr) { console.error('사진 업로드 실패:', upErr); continue }
        const { data: { publicUrl } } = supabase.storage.from('review-photos').getPublicUrl(uploaded.path)
        uploadedUrls.push(publicUrl)
      }

      const insertData = {
        user_id: user.id,
        store_id: selectedStore.id,
        menu_name: menuName || null,
        menu_price: menuPrice ? parseInt(menuPrice) : null,
        photos: uploadedUrls.length > 0 ? uploadedUrls : null,
        star_score: starRating,
        want_to_go_back: wantToGoBack,
        taste_me: tasteMe,
        taste_amount: tasteAmount,
        taste_spicy: tasteSpicy,
        taste_salty: tasteSalty,
        taste_sweet: tasteSweet,
        desired_price: desiredPrice ? parseInt(desiredPrice) : null,
        texture_tags: textureTags.length > 0 ? textureTags : null,
        situation_tags: situationTags.length > 0 ? situationTags : null,
        one_line_review: oneLineReview || null,
        content: content || null,
        tags: customTags.length > 0 ? customTags : null,
      }

      console.log('📤 리뷰 저장 데이터:', insertData)
      const { error: revErr } = await supabase.from('reviews').insert(insertData)
      if (revErr) {
        console.error('리뷰 저장 실패:', JSON.stringify(revErr, null, 2))
        alert(`리뷰 저장 실패: ${revErr.message}`)
        return
      }
      setDone(true)
    } catch (e) {
      console.error('제출 오류:', e)
      alert('리뷰 저장 중 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 36, color: '#fff' }}>✓</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>리뷰가 등록됐어요!</h2>
        <p style={{ color: '#888', marginBottom: 32, textAlign: 'center' }}>소중한 리뷰 감사해요 😊</p>
        <div style={{ background: '#f7f7f7', borderRadius: 16, padding: '20px 24px', width: '100%', marginBottom: 32, boxSizing: 'border-box' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{selectedStore?.name}</div>
          {menuName && <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>🍽 {menuName}</div>}
          <div style={{ fontSize: 14 }}>{'★'.repeat(starRating)}{'☆'.repeat(5 - starRating)}</div>
          {photos.length > 0 && <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>📷 사진 {photos.length}장</div>}
        </div>
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button onClick={() => router.push('/feed')} style={{ flex: 1, padding: '14px 0', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>피드 보기</button>
          <button onClick={() => router.push('/map')} style={{ flex: 1, padding: '14px 0', background: '#fff', color: '#111', border: '2px solid #111', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>지도 보기</button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => (step > 1 ? setStep(step - 1) : router.back())} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>←</button>
        <img src="/yum2.png" alt="logo" onClick={() => router.push('/feed')} style={{ height: 28, cursor: 'pointer' }} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: '#999' }}>{step} / {stepTitles.length}</span>
      </div>

      {/* 스텝 인디케이터 */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 20px 0' }}>
        {stepTitles.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i + 1 <= step ? '#111' : '#eee', transition: 'background 0.3s' }} />
        ))}
      </div>

      <div style={{ padding: '24px 20px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{stepTitles[step - 1]}</h2>

        {/* Step 1: 가게 선택 */}
        {step === 1 && (
          <div>
            {registeringStore && <div style={{ textAlign: 'center', color: '#888', marginBottom: 12 }}>가게 등록 중...</div>}
            <input
              value={storeQuery}
              onChange={(e) => setStoreQuery(e.target.value)}
              placeholder="가게 이름 검색"
              style={{ width: '100%', padding: '12px 16px', border: '2px solid #111', borderRadius: 12, fontSize: 15, boxSizing: 'border-box' }}
            />
            {selectedStore && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: '#f7f7f7', borderRadius: 12 }}>
                <div style={{ fontWeight: 700 }}>✅ {selectedStore.name}</div>
                {selectedStore.address && <div style={{ fontSize: 13, color: '#888' }}>{selectedStore.address}</div>}
              </div>
            )}

            {(dbResults.length > 0 || naverResults.length > 0) && (
              <div style={{ marginTop: 8, border: '1px solid #eee', borderRadius: 12, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
                {dbResults.length > 0 && (
                  <>
                    <div style={{ padding: '8px 16px', background: '#f7f7f7', fontSize: 12, color: '#888', fontWeight: 600 }}>
                      📍 내 주변 가게 ({dbResults.length}개)
                    </div>
                    {dbResults.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectStore({ ...s, isNew: false })}
                        style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        {s.category && <span style={{ fontSize: 11, color: '#999', marginRight: 6 }}>{s.category}</span>}
                        {s.address && <div style={{ fontSize: 12, color: '#888' }}>{s.address}</div>}
                      </div>
                    ))}
                  </>
                )}
                {naverResults.length > 0 && (
                  <>
                    <div style={{ padding: '8px 16px', background: '#f7f7f7', fontSize: 12, color: '#888', fontWeight: 600 }}>
                      🔍 네이버 검색 결과 ({naverResults.length}개)
                    </div>
                    {naverResults.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectStore({ ...s, isNew: true })}
                        style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                      >
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        {s.category && <span style={{ fontSize: 11, color: '#999', marginRight: 6 }}>{s.category}</span>}
                        {s.address && <div style={{ fontSize: 12, color: '#888' }}>{s.address}</div>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => (selectedStore ? setStep(2) : alert('가게를 선택해주세요.'))}
              disabled={!selectedStore}
              style={{ marginTop: 24, width: '100%', padding: '14px 0', background: selectedStore ? '#111' : '#eee', color: selectedStore ? '#fff' : '#aaa', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: selectedStore ? 'pointer' : 'not-allowed' }}
            >
              다음
            </button>
          </div>
        )}

        {/* Step 2: 메뉴 정보 */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input value={menuName} onChange={(e) => setMenuName(e.target.value)} placeholder="메뉴 이름 (선택)" style={{ padding: '12px 16px', border: '2px solid #eee', borderRadius: 12, fontSize: 15 }} />
            <input value={menuPrice} onChange={(e) => setMenuPrice(e.target.value)} placeholder="실제 가격 (선택, 숫자만)" type="number" style={{ padding: '12px 16px', border: '2px solid #eee', borderRadius: 12, fontSize: 15 }} />
            <button onClick={() => setStep(3)} style={{ padding: '14px 0', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>다음</button>
          </div>
        )}

        {/* Step 3: 사진 */}
        {step === 3 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {photoPreviews.map((url, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
              ))}
              {photos.length < 5 && (
                <div onClick={() => fileInputRef.current?.click()} style={{ aspectRatio: '1', borderRadius: 8, border: '2px dashed #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa', fontSize: 28 }}>+</div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: 'none' }} />
            <p style={{ color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>최대 5장까지 업로드 가능해요</p>
            <button onClick={() => setStep(4)} style={{ width: '100%', padding: '14px 0', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>다음</button>
          </div>
        )}

        {/* Step 4: 별점 */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 24 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} onClick={() => setStarRating(i + 1)} style={{ cursor: 'pointer', color: i < starRating ? '#111' : '#ddd' }}>★</span>
              ))}
            </div>
            <p style={{ color: '#888', marginBottom: 32 }}>{['', '별로예요', '그냥 그래요', '괜찮아요', '맛있어요', '최고예요!'][starRating]}</p>
            <button onClick={() => setStep(5)} style={{ width: '100%', padding: '14px 0', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>다음</button>
          </div>
        )}

        {/* Step 5: 재방문 */}
        {step === 5 && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
              {[{ v: true, label: '또 가고 싶어요 😊' }, { v: false, label: '글쎄요... 🤔' }].map(({ v, label }) => (
                <button key={String(v)} onClick={() => setWantToGoBack(v)} style={{ flex: 1, padding: '16px 0', border: `2px solid ${wantToGoBack === v ? '#111' : '#eee'}`, borderRadius: 12, background: wantToGoBack === v ? '#111' : '#fff', color: wantToGoBack === v ? '#fff' : '#111', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>{label}</button>
              ))}
            </div>
            <button onClick={() => setStep(6)} style={{ width: '100%', padding: '14px 0', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>다음</button>
          </div>
        )}

        {/* Step 6: 맛 평가 */}
        {step === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[
              { label: '입맛에 맞나요?', value: tasteMe, set: setTasteMe, left: '별로', right: '딱이야' },
              { label: '양은요?', value: tasteAmount, set: setTasteAmount, left: '적다', right: '많다' },
              { label: '매운 정도는?', value: tasteSpicy, set: setTasteSpicy, left: '안매워', right: '매워' },
              { label: '짠 정도는?', value: tasteSalty, set: setTasteSalty, left: '싱겁다', right: '짜다' },
              { label: '단 정도는?', value: tasteSweet, set: setTasteSweet, left: '안달아', right: '달아' },
            ].map(({ label, value, set, left, right }) => (
              <div key={label}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#888', minWidth: 36 }}>{left}</span>
                  <div style={{ flex: 1 }}><DotSlider value={value} onChange={set} /></div>
                  <span style={{ fontSize: 12, color: '#888', minWidth: 36, textAlign: 'right' }}>{right}</span>
                </div>
              </div>
            ))}
            <button onClick={() => setStep(7)} style={{ padding: '14px 0', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>다음</button>
          </div>
        )}

        {/* Step 7: 가격 제안 */}
        {step === 7 && (
          <div>
            <p style={{ color: '#888', marginBottom: 16, fontSize: 14 }}>적정하다고 생각하는 가격은?</p>
            <input value={desiredPrice} onChange={(e) => setDesiredPrice(e.target.value)} placeholder="적정 가격 입력 (숫자만)" type="number" style={{ width: '100%', padding: '12px 16px', border: '2px solid #eee', borderRadius: 12, fontSize: 15, boxSizing: 'border-box', marginBottom: 24 }} />
            <button onClick={() => setStep(8)} style={{ width: '100%', padding: '14px 0', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>다음</button>
          </div>
        )}

        {/* Step 8: 텍스처 & 상황 태그 */}
        {step === 8 && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>맛의 질감</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TEXTURE_OPTIONS.map((t) => (
                  <button key={t} onClick={() => toggleTag(t, textureTags, setTextureTags)} style={{ padding: '8px 14px', borderRadius: 20, border: `2px solid ${textureTags.includes(t) ? '#111' : '#eee'}`, background: textureTags.includes(t) ? '#111' : '#fff', color: textureTags.includes(t) ? '#fff' : '#111', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>어떤 상황에?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SITUATION_OPTIONS.map((t) => (
                  <button key={t} onClick={() => toggleTag(t, situationTags, setSituationTags)} style={{ padding: '8px 14px', borderRadius: 20, border: `2px solid ${situationTags.includes(t) ? '#111' : '#eee'}`, background: situationTags.includes(t) ? '#111' : '#fff', color: situationTags.includes(t) ? '#fff' : '#111', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>{t}</button>
                ))}
              </div>
            </div>
            <button onClick={() => setStep(9)} style={{ width: '100%', padding: '14px 0', background: '#111', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>다음</button>
          </div>
        )}

        {/* Step 9: 최종 리뷰 */}
        {step === 9 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input value={oneLineReview} onChange={(e) => setOneLineReview(e.target.value)} placeholder="한 줄 요약 (예: 울산 최고의 국밥집!)" maxLength={50} style={{ padding: '12px 16px', border: '2px solid #eee', borderRadius: 12, fontSize: 15 }} />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="자세한 리뷰를 남겨주세요" rows={5} style={{ padding: '12px 16px', border: '2px solid #eee', borderRadius: 12, fontSize: 15, resize: 'vertical', fontFamily: 'inherit' }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>커스텀 태그</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomTag()} placeholder="#태그 입력 후 엔터" style={{ flex: 1, padding: '10px 14px', border: '2px solid #eee', borderRadius: 10, fontSize: 14 }} />
                <button onClick={addCustomTag} style={{ padding: '10px 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>추가</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {customTags.map((t) => (
                  <span key={t} style={{ padding: '6px 12px', background: '#f0f0f0', borderRadius: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    #{t}
                    <button onClick={() => setCustomTags(customTags.filter((x) => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, color: '#888' }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ background: '#f7f7f7', borderRadius: 16, padding: '16px 20px', marginTop: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>📋 리뷰 요약 확인</div>
              <div style={{ fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>🏪 {selectedStore?.name}</div>
                {menuName && <div>🍽 {menuName}</div>}
                <div>⭐ {starRating}점 / {'★'.repeat(starRating)}{'☆'.repeat(5 - starRating)}</div>
                <div>🔄 재방문: {wantToGoBack === true ? '또 가고 싶어요' : wantToGoBack === false ? '글쎄요' : '미선택'}</div>
                <div>📷 사진 {photos.length}장</div>
                {customTags.length > 0 && <div>🏷 {customTags.map((t) => `#${t}`).join(' ')}</div>}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ padding: '14px 0', background: loading ? '#888' : '#111', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  저장 중...
                </>
              ) : '리뷰 등록하기'}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ReviewWritePage() {
  return (
    <Suspense
      fallback={
        <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <img src="/yum2.png" alt="logo" style={{ height: 40 }} />
          <div style={{ width: 32, height: 32, border: '3px solid #111', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <WriteContent />
    </Suspense>
  )
}
