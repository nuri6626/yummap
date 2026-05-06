'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Strict Mode 이중실행 방지용 전역 캐시
let cachedLocation: { lat: number; lng: number } | null = null

declare global { interface Window { kakao: any } }

interface Store {
  id: string
  name: string
  category: string
  address: string
  latitude: number
  longitude: number
  phone?: string
  placeUrl?: string
  isKakao?: boolean
  isSearchResult?: boolean
}

function MapPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const mapRef = useRef<HTMLDivElement>(null)
  const kakaoMapRef = useRef<any>(null)
  const overlaysRef = useRef<any[]>([])

  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [activeCategory, setActiveCategory] = useState('전체')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'fallback'>('loading')
  const [storeScores, setStoreScores] = useState<Record<string, number>>({})

  const CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '고기', '카페', '분식', '해산물', '디저트']

  // ── 1) 위치 취득 ──
  useEffect(() => {
    // 캐시된 위치 즉시 사용
    if (cachedLocation) {
      console.log('📍 캐시 위치:', cachedLocation)
      setUserLocation(cachedLocation)
      setLocationStatus('success')
      return
    }

    // URL 파라미터 우선
    const urlLat = searchParams.get('lat')
    const urlLng = searchParams.get('lng')
    if (urlLat && urlLng) {
      const loc = { lat: parseFloat(urlLat), lng: parseFloat(urlLng) }
      cachedLocation = loc
      setUserLocation(loc)
      setLocationStatus('success')
      return
    }

    if (!navigator.geolocation) {
      const fallback = { lat: 35.5384, lng: 129.3114 }
      cachedLocation = fallback
      setUserLocation(fallback)
      setLocationStatus('fallback')
      return
    }

    setLocationStatus('loading')
    console.log('📍 위치 요청 시작...')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        console.log('✅ 위치 성공:', loc.lat, loc.lng)
        cachedLocation = loc
        setUserLocation(loc)
        setLocationStatus('success')
      },
      (err) => {
        console.warn('❌ 위치 실패:', err.code, err.message)
        const fallback = { lat: 35.5384, lng: 129.3114 }
        cachedLocation = fallback
        setUserLocation(fallback)
        setLocationStatus('fallback')
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    )
  }, [])

  // ── 2) 카카오맵 초기화 ──
  useEffect(() => {
    if (!userLocation) return

    const tryInit = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => {
          if (!mapRef.current) return
          if (!kakaoMapRef.current) {
            kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, {
              center: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
              level: 4,
            })
            console.log('✅ 카카오맵 초기화:', userLocation.lat, userLocation.lng)
            setMapReady(true)
          } else {
            kakaoMapRef.current.setCenter(
              new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng)
            )
            if (!mapReady) setMapReady(true)
          }
        })
      } else {
        setTimeout(tryInit, 300)
      }
    }
    tryInit()
  }, [userLocation])

  // ── 3) 맵 준비 후 가게 검색 ──
  useEffect(() => {
    if (!mapReady || !userLocation) return

    const targetLat = searchParams.get('lat')
    const targetLng = searchParams.get('lng')
    const targetName = searchParams.get('name')

    if (targetLat && targetLng) {
      const lat = parseFloat(targetLat)
      const lng = parseFloat(targetLng)
      kakaoMapRef.current?.setCenter(new window.kakao.maps.LatLng(lat, lng))
      kakaoMapRef.current?.setLevel(3)
      fetchNearbyStores(lat, lng, '전체').then((results) => {
        if (targetName) {
          const decoded = decodeURIComponent(targetName)
          const found = results.find((s) => s.name === decoded)
          if (found) setSelectedStore(found)
          else setSelectedStore({
            id: `saved-${Date.now()}`, name: decoded,
            category: '저장한 가게', address: '',
            latitude: lat, longitude: lng,
          })
        }
      })
    } else {
      fetchNearbyStores(userLocation.lat, userLocation.lng, activeCategory)
    }

    loadSavedIds()
    loadStoreScores()
  }, [mapReady])

  // ── 4) 오버레이 렌더링 ──
  useEffect(() => {
    if (!mapReady || !kakaoMapRef.current) return
    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    stores.forEach((store) => {
      const isSaved = savedIds.includes(String(store.id))
      const isSelected = selectedStore?.id === store.id
      const isSearch = store.isSearchResult
      const score = storeScores[String(store.id)]

      let bg = 'white', color = '#1A1A1A', border = '#E0E0E0'
      let shadow = '0 2px 6px rgba(0,0,0,0.12)'

      if (isSelected) {
        bg = '#1A1A1A'; color = 'white'; border = '#1A1A1A'
        shadow = '0 4px 14px rgba(0,0,0,0.35)'
      } else if (isSaved) {
        bg = '#FF5A3D'; color = 'white'; border = '#FF5A3D'
        shadow = '0 3px 10px rgba(255,90,61,0.4)'
      } else if (isSearch) {
        bg = '#4A90E2'; color = 'white'; border = '#4A90E2'
        shadow = '0 3px 10px rgba(74,144,226,0.4)'
      }

      const ratingTextColor = (isSelected || isSaved || isSearch)
        ? 'rgba(255,255,255,0.9)' : '#FF9500'

      const ratingHtml = score != null
        ? `<div style="font-size:11px;font-weight:700;color:${ratingTextColor};margin-top:2px;">⭐ ${score.toFixed(1)}</div>`
        : `<div style="font-size:9px;color:${isSelected || isSaved || isSearch ? 'rgba(255,255,255,0.55)' : '#C0C0C0'};margin-top:1px;">리뷰 없음</div>`

      const div = document.createElement('div')
      div.style.cssText = `
        background:${bg};color:${color};border:2px solid ${border};
        border-radius:12px;padding:5px 10px;font-size:12px;font-weight:700;
        white-space:nowrap;box-shadow:${shadow};cursor:pointer;
        text-align:center;min-width:64px;
      `
      div.innerHTML = `
        <div style="font-size:12px;font-weight:800;line-height:1.3;">
          ${isSaved ? '❤️ ' : ''}${store.name}
        </div>
        ${ratingHtml}
      `
      div.addEventListener('click', () => setSelectedStore(store))

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(store.latitude, store.longitude),
        content: div,
        yAnchor: 1.35,
        zIndex: isSelected ? 10 : (score != null ? 5 : 1),
      })
      overlay.setMap(kakaoMapRef.current)
      overlaysRef.current.push(overlay)
    })
  }, [mapReady, stores, savedIds, selectedStore, storeScores])

  // ── 함수들 ──
  const loadSavedIds = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('saved_stores').select('store_id').eq('user_id', user.id)
    setSavedIds(data?.map((d: any) => String(d.store_id)) || [])
  }

  const loadStoreScores = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('store_id, taste_score, portion_score, value_score')
    if (!data || error) return

    const scoreMap: Record<string, { total: number; count: number }> = {}
    data.forEach((r: any) => {
      const id = String(r.store_id)
      const avg = (r.taste_score + r.portion_score + r.value_score) / 3
      if (!scoreMap[id]) scoreMap[id] = { total: 0, count: 0 }
      scoreMap[id].total += avg
      scoreMap[id].count += 1
    })

    const result: Record<string, number> = {}
    Object.entries(scoreMap).forEach(([id, { total, count }]) => {
      result[id] = Math.round((total / count) * 10) / 10
    })
    setStoreScores(result)
  }

  const fetchNearbyStores = async (lat: number, lng: number, category: string): Promise<Store[]> => {
    const keyword = category === '전체' ? '음식점' : category
    const REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&x=${lng}&y=${lat}&radius=2000&size=15&category_group_code=FD6`,
        { headers: { Authorization: `KakaoAK ${REST_API_KEY}` } }
      )
      const data = await res.json()
      if (data.documents) {
        const results: Store[] = data.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.place_name,
          category: doc.category_name?.split(' > ').pop() || '음식점',
          address: doc.road_address_name || doc.address_name,
          latitude: parseFloat(doc.y),
          longitude: parseFloat(doc.x),
          phone: doc.phone,
          placeUrl: doc.place_url,
          isKakao: true,
          isSearchResult: false,
        }))
        setStores(results)
        setIsSearchMode(false)
        return results
      }
    } catch (err) {
      console.error('장소 검색 오류:', err)
      const { data } = await supabase.from('stores').select('*')
      const fallback = (data || []) as Store[]
      setStores(fallback)
      return fallback
    }
    return []
  }

  const searchByKeyword = async () => {
    if (!searchKeyword.trim() || !userLocation) return
    const REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchKeyword)}&x=${userLocation.lng}&y=${userLocation.lat}&radius=5000&size=15`,
        { headers: { Authorization: `KakaoAK ${REST_API_KEY}` } }
      )
      const data = await res.json()
      if (data.documents) {
        const results: Store[] = data.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.place_name,
          category: doc.category_name?.split(' > ').pop() || '음식점',
          address: doc.road_address_name || doc.address_name,
          latitude: parseFloat(doc.y),
          longitude: parseFloat(doc.x),
          phone: doc.phone,
          placeUrl: doc.place_url,
          isKakao: true,
          isSearchResult: true,
        }))
        setStores(results)
        setIsSearchMode(true)
        if (results.length && kakaoMapRef.current) {
          kakaoMapRef.current.setCenter(
            new window.kakao.maps.LatLng(results[0].latitude, results[0].longitude)
          )
        }
      }
    } catch (err) { console.error('검색 오류:', err) }
  }

  const handleSave = async () => {
    if (!selectedStore) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const storeIdStr = String(selectedStore.id)
    const isSavedNow = savedIds.includes(storeIdStr)
    if (isSavedNow) {
      await supabase.from('saved_stores').delete()
        .eq('user_id', user.id).eq('store_id', storeIdStr)
      setSavedIds((prev) => prev.filter((id) => id !== storeIdStr))
    } else {
      await supabase.from('saved_stores').insert({
        user_id: user.id, store_id: storeIdStr,
        store_name: selectedStore.name, store_category: selectedStore.category,
        store_address: selectedStore.address, store_lat: selectedStore.latitude,
        store_lng: selectedStore.longitude, store_phone: selectedStore.phone || '',
      })
      setSavedIds((prev) => [...prev, storeIdStr])
    }
  }

  const handleDetail = (store: Store) => {
    if (store.placeUrl) {
      window.open(store.placeUrl, '_blank')
    } else {
      window.open(`https://map.kakao.com/link/search/${encodeURIComponent(store.name)}`, '_blank')
    }
  }

  const isSaved = selectedStore ? savedIds.includes(String(selectedStore.id)) : false

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>

      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #F2F2F2', zIndex: 10 }}>
        <img src="/yum2.png" alt="yummap" style={{ height: '32px' }} />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {locationStatus === 'loading' && (
            <span style={{ fontSize: '11px', color: '#999', background: '#F2F2F2', padding: '4px 8px', borderRadius: '10px' }}>
              📍 위치 확인 중...
            </span>
          )}
          {locationStatus === 'fallback' && (
            <span style={{ fontSize: '11px', color: '#FF9500', background: '#FFF3E0', padding: '4px 8px', borderRadius: '10px' }}>
              ⚠️ 기본위치
            </span>
          )}
          {locationStatus === 'success' && (
            <span style={{ fontSize: '11px', color: '#34C759', background: '#E8F9EE', padding: '4px 8px', borderRadius: '10px' }}>
              📍 위치확인
            </span>
          )}
          <button onClick={() => router.push('/review/write')}
            style={{ background: 'linear-gradient(135deg,#FF5A3D,#FF8560)', color: 'white', border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            + 리뷰 작성
          </button>
        </div>
      </div>

      {/* ── 검색 바 ── */}
      <div style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #F2F2F2', display: 'flex', gap: '8px' }}>
        <input type="text" placeholder="🔍 맛집 검색 (예: 피자, 삼겹살)" value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchByKeyword()}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #F2F2F2', fontSize: '14px', outline: 'none' }} />
        <button onClick={searchByKeyword}
          style={{ background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 16px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          검색
        </button>
        {isSearchMode && (
          <button onClick={() => {
            setSearchKeyword('')
            setIsSearchMode(false)
            if (userLocation) fetchNearbyStores(userLocation.lat, userLocation.lng, activeCategory)
          }}
            style={{ background: '#F2F2F2', color: '#666', border: 'none', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            ✕
          </button>
        )}
      </div>

      {/* ── 카테고리 ── */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px 16px', overflowX: 'auto', background: 'white', borderBottom: '1px solid #F2F2F2' }}>
        {CATEGORIES.map((cat) => (
          <button key={cat}
            onClick={() => {
              setActiveCategory(cat)
              if (userLocation) fetchNearbyStores(userLocation.lat, userLocation.lng, cat)
            }}
            style={{ whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: activeCategory === cat ? '#FF5A3D' : '#F2F2F2', color: activeCategory === cat ? 'white' : '#666' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── 지도 ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* 범례 */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'white', borderRadius: '10px', padding: '6px 10px', fontSize: '10px', color: '#666', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', zIndex: 5, lineHeight: '1.8' }}>
          <div>⬜ 일반&nbsp;&nbsp;<span style={{ color: '#FF5A3D' }}>❤️ 저장</span></div>
          <div><span style={{ color: '#4A90E2' }}>🔵 검색</span>&nbsp;&nbsp;⬛ 선택</div>
        </div>

        {/* 가게 수 */}
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: '600', zIndex: 5, whiteSpace: 'nowrap' }}>
          {isSearchMode ? `"${searchKeyword}" ${stores.length}개` : `주변 ${stores.length}개 맛집`}
        </div>

        {/* 내 위치 버튼 */}
        <button onClick={() => {
          if (userLocation && kakaoMapRef.current) {
            kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng))
            fetchNearbyStores(userLocation.lat, userLocation.lng, activeCategory)
          }
        }}
          style={{ position: 'absolute', bottom: '20px', right: '16px', background: 'white', border: '1px solid #eee', borderRadius: '50%', width: '48px', height: '48px', fontSize: '22px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 5 }}>
          📍
        </button>
      </div>

      {/* ── 선택된 가게 카드 ── */}
      {selectedStore && (
        <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '16px 16px 8px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', maxHeight: '50vh', overflowY: 'auto' }}>
          <div style={{ width: '40px', height: '4px', background: '#E0E0E0', borderRadius: '2px', margin: '0 auto 12px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ background: '#FFE7DF', color: '#FF5A3D', borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
                {selectedStore.category}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1A1A1A', margin: '6px 0 4px' }}>
                {isSaved && '❤️ '}{selectedStore.name}
              </h3>
              {selectedStore.address && (
                <p style={{ color: '#888', fontSize: '13px', margin: '0 0 2px' }}>📍 {selectedStore.address}</p>
              )}
              {selectedStore.phone && (
                <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>📞 {selectedStore.phone}</p>
              )}

              {/* 평점 표시 */}
              {storeScores[String(selectedStore.id)] != null ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFF5F3', borderRadius: '20px', padding: '4px 10px', marginTop: '8px' }}>
                  <span style={{ fontSize: '14px' }}>⭐</span>
                  <span style={{ fontSize: '15px', fontWeight: '900', color: '#FF5A3D' }}>
                    {storeScores[String(selectedStore.id)].toFixed(1)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#999' }}>yummap 평점</span>
                </div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F8F8F8', borderRadius: '20px', padding: '4px 10px', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>아직 리뷰가 없어요</span>
                  {selectedStore.placeUrl && (
                    <button onClick={() => window.open(selectedStore.placeUrl, '_blank')}
                      style={{ background: '#FFEB00', color: '#3A1D00', border: 'none', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                      카카오맵 평점 보기
                    </button>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setSelectedStore(null)}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
          </div>

          {/* 버튼 3개 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
            <button onClick={handleSave}
              style={{ background: isSaved ? '#FFE7DF' : '#FF5A3D', color: isSaved ? '#FF5A3D' : 'white', border: isSaved ? '1.5px solid #FF5A3D' : 'none', borderRadius: '12px', padding: '11px 8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              {isSaved ? '❤️ 저장됨' : '🤍 저장'}
            </button>
            <button onClick={() => router.push(
              `/review/write?store_id=${selectedStore.id}` +
              `&store_name=${encodeURIComponent(selectedStore.name)}` +
              `&store_address=${encodeURIComponent(selectedStore.address || '')}` +
              `&store_category=${encodeURIComponent(selectedStore.category || '')}` +
              `&store_lat=${selectedStore.latitude}` +
              `&store_lng=${selectedStore.longitude}` +
              `&store_phone=${encodeURIComponent(selectedStore.phone || '')}`
            )}
              style={{ background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '11px 8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              ✏️ 리뷰
            </button>
            <button onClick={() => handleDetail(selectedStore)}
              style={{ background: '#FFEB00', color: '#3A1D00', border: 'none', borderRadius: '12px', padding: '11px 8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              🗺️ 카카오맵
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#C0C0C0', textAlign: 'center', margin: '10px 0 4px' }}>
            메뉴·영업시간·평점은 🗺️ 카카오맵에서 확인하세요
          </p>
        </div>
      )}

      {/* ── 하단 네비 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0 18px', background: 'white', borderTop: '1px solid #F2F2F2' }}>
        {[
          { icon: '🗺️', label: '지도', path: '/map', active: true },
          { icon: '📰', label: '피드', path: '/feed' },
          { icon: '✏️', label: '리뷰', path: '/review/write' },
          { icon: '❤️', label: '저장', path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile' },
        ].map((item) => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600', color: item.active ? '#FF5A3D' : '#999' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '40px' }}>🗺️</div>
        <p style={{ color: '#999', fontSize: '14px' }}>지도 불러오는 중...</p>
      </div>
    }>
      <MapPageInner />
    </Suspense>
  )
}
