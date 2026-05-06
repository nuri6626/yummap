'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

declare global { interface Window { kakao: any } }

interface Store {
  id: string
  name: string
  category: string
  address: string
  latitude: number
  longitude: number
  phone?: string
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

  const CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '고기', '카페', '분식', '해산물', '디저트']

  // ───────────────────────────────────────────────
  // 1) 위치 취득 (URL 파라미터 → 브라우저 GPS → 폴백)
  // ───────────────────────────────────────────────
  useEffect(() => {
    const urlLat = searchParams.get('lat')
    const urlLng = searchParams.get('lng')

    if (urlLat && urlLng) {
      setUserLocation({ lat: parseFloat(urlLat), lng: parseFloat(urlLng) })
      setLocationStatus('success')
      return
    }

    if (!navigator.geolocation) {
      setUserLocation({ lat: 35.5384, lng: 129.3114 })
      setLocationStatus('fallback')
      return
    }

    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus('success')
      },
      (err) => {
        console.warn('위치 오류:', err.code, err.message)
        setUserLocation({ lat: 35.5384, lng: 129.3114 })
        setLocationStatus('fallback')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  // ───────────────────────────────────────────────
  // 2) 카카오맵 초기화
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!userLocation) return

    const tryInit = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => {
          if (!mapRef.current) return
          kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, {
            center: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
            level: 4,
          })
          setMapReady(true)
        })
      } else {
        setTimeout(tryInit, 300)
      }
    }
    tryInit()
  }, [userLocation])

  // ───────────────────────────────────────────────
  // 3) 맵 준비 후 주변 가게 검색 + URL 타깃 자동 선택
  // ───────────────────────────────────────────────
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
          if (found) {
            setSelectedStore(found)
          } else {
            setSelectedStore({
              id: `saved-${Date.now()}`,
              name: decoded,
              category: '저장한 가게',
              address: '',
              latitude: lat,
              longitude: lng,
            })
          }
        }
      })
    } else {
      fetchNearbyStores(userLocation.lat, userLocation.lng, activeCategory)
    }

    loadSavedIds()
  }, [mapReady, userLocation])

  // ───────────────────────────────────────────────
  // 4) 마커(오버레이) 렌더링
  // ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !kakaoMapRef.current) return
    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    stores.forEach((store) => {
      const isSaved = savedIds.includes(String(store.id))
      const isSelected = selectedStore?.id === store.id
      const isSearch = store.isSearchResult

      let bg = 'white'
      let color = '#1A1A1A'
      let border = '#ddd'

      if (isSelected) { bg = '#1A1A1A'; color = 'white'; border = '#1A1A1A' }
      else if (isSaved) { bg = '#FF5A3D'; color = 'white'; border = '#FF5A3D' }
      else if (isSearch) { bg = '#4A90E2'; color = 'white'; border = '#4A90E2' }

      const div = document.createElement('div')
      div.style.cssText = `
        background:${bg};color:${color};border:2px solid ${border};
        border-radius:20px;padding:4px 10px;font-size:12px;font-weight:700;
        white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);cursor:pointer;
        display:flex;align-items:center;gap:4px;
      `
      div.innerHTML = `${isSaved ? '❤️ ' : ''}${store.name}`
      div.addEventListener('click', () => setSelectedStore(store))

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(store.latitude, store.longitude),
        content: div,
        yAnchor: 1.3,
      })
      overlay.setMap(kakaoMapRef.current)
      overlaysRef.current.push(overlay)
    })
  }, [mapReady, stores, savedIds, selectedStore])

  const loadSavedIds = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('saved_stores').select('store_id').eq('user_id', user.id)
    setSavedIds(data?.map((d: any) => String(d.store_id)) || [])
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
        const results: Store[] = data.documents
          .filter((doc: any) =>
            doc.place_name.includes(searchKeyword) ||
            doc.category_name?.includes(searchKeyword)
          )
          .map((doc: any) => ({
            id: doc.id,
            name: doc.place_name,
            category: doc.category_name?.split(' > ').pop() || '음식점',
            address: doc.road_address_name || doc.address_name,
            latitude: parseFloat(doc.y),
            longitude: parseFloat(doc.x),
            phone: doc.phone,
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
    } catch (err) {
      console.error('검색 오류:', err)
    }
  }

  const handleSave = async () => {
    if (!selectedStore) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const storeIdStr = String(selectedStore.id)
    const isSaved = savedIds.includes(storeIdStr)

    if (isSaved) {
      await supabase.from('saved_stores').delete()
        .eq('user_id', user.id).eq('store_id', storeIdStr)
      setSavedIds((prev) => prev.filter((id) => id !== storeIdStr))
    } else {
      await supabase.from('saved_stores').insert({
        user_id: user.id,
        store_id: storeIdStr,
        store_name: selectedStore.name,
        store_category: selectedStore.category,
        store_address: selectedStore.address,
        store_lat: selectedStore.latitude,
        store_lng: selectedStore.longitude,
        store_phone: selectedStore.phone || '',
      })
      setSavedIds((prev) => [...prev, storeIdStr])
    }
  }

  const isSaved = selectedStore ? savedIds.includes(String(selectedStore.id)) : false

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>

      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #F2F2F2', zIndex: 10 }}>
        <img src="/yum2.png" alt="yummap" style={{ height: '32px' }} />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {locationStatus === 'loading' && <span style={{ fontSize: '12px', color: '#999' }}>📍 위치 확인 중...</span>}
          {locationStatus === 'fallback' && <span style={{ fontSize: '12px', color: '#FF9500' }}>⚠️ 기본 위치</span>}
          {locationStatus === 'success' && <span style={{ fontSize: '12px', color: '#34C759' }}>📍 위치 확인됨</span>}
          <button onClick={() => router.push('/review/write')}
            style={{ background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
            + 리뷰 작성
          </button>
        </div>
      </div>

      {/* ── 검색 바 ── */}
      <div style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #F2F2F2', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="🔍 맛집 검색 (예: 피자, 삼겹살)"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchByKeyword()}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #F2F2F2', fontSize: '14px', outline: 'none' }}
        />
        <button onClick={searchByKeyword}
          style={{ background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 16px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          검색
        </button>
        {isSearchMode && (
          <button
            onClick={() => {
              setSearchKeyword('')
              setIsSearchMode(false)
              if (userLocation) fetchNearbyStores(userLocation.lat, userLocation.lng, activeCategory)
            }}
            style={{ background: '#F2F2F2', color: '#666', border: 'none', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            초기화
          </button>
        )}
      </div>

      {/* ── 카테고리 ── */}
      <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', overflowX: 'auto', background: 'white', borderBottom: '1px solid #F2F2F2' }}>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => {
            setActiveCategory(cat)
            if (userLocation) fetchNearbyStores(userLocation.lat, userLocation.lng, cat)
          }}
            style={{ whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: activeCategory === cat ? '#FF5A3D' : '#F2F2F2', color: activeCategory === cat ? 'white' : '#666' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── 색상 범례 ── */}
      <div style={{ display: 'flex', gap: '12px', padding: '6px 16px', background: '#FAFAFA', borderBottom: '1px solid #F2F2F2', fontSize: '11px', color: '#666' }}>
        <span>⬜ 일반</span>
        <span style={{ color: '#FF5A3D' }}>❤️ 저장됨</span>
        <span style={{ color: '#4A90E2' }}>🔵 검색결과</span>
        <span style={{ color: '#1A1A1A' }}>⬛ 선택됨</span>
      </div>

      {/* ── 지도 ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* 내 위치 버튼 */}
        <button
          onClick={() => {
            if (userLocation && kakaoMapRef.current) {
              kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng))
              fetchNearbyStores(userLocation.lat, userLocation.lng, activeCategory)
            }
          }}
          style={{ position: 'absolute', bottom: '20px', right: '16px', background: 'white', border: '1px solid #eee', borderRadius: '50%', width: '44px', height: '44px', fontSize: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 5 }}>
          📍
        </button>

        {/* 가게 수 배지 */}
        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: '600', zIndex: 5, whiteSpace: 'nowrap' }}>
          {isSearchMode ? `"${searchKeyword}" 검색 결과 ${stores.length}개` : `주변 ${stores.length}개 맛집`}
        </div>
      </div>

      {/* ── 선택된 가게 카드 ── */}
      {selectedStore && (
        <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 16px 8px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', maxHeight: '45vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <span style={{ background: '#FFE7DF', color: '#FF5A3D', borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
                {selectedStore.category}
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1A1A1A', margin: '6px 0 4px' }}>
                {isSaved && '❤️ '}{selectedStore.name}
              </h3>
              {selectedStore.address && <p style={{ color: '#999', fontSize: '13px', margin: '0 0 2px' }}>📍 {selectedStore.address}</p>}
              {selectedStore.phone && <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>📞 {selectedStore.phone}</p>}
            </div>
            <button onClick={() => setSelectedStore(null)}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={handleSave}
              style={{ flex: 1, background: isSaved ? '#FFE7DF' : '#FF5A3D', color: isSaved ? '#FF5A3D' : 'white', border: isSaved ? '1.5px solid #FF5A3D' : 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {isSaved ? '❤️ 저장됨' : '🤍 저장'}
            </button>
            <button onClick={() => router.push(
              `/review/write?store_id=${selectedStore.id}&store_name=${encodeURIComponent(selectedStore.name)}&store_address=${encodeURIComponent(selectedStore.address || '')}&store_category=${encodeURIComponent(selectedStore.category || '')}&store_lat=${selectedStore.latitude}&store_lng=${selectedStore.longitude}&store_phone=${encodeURIComponent(selectedStore.phone || '')}`
            )}
              style={{ flex: 1, background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              ✏️ 리뷰 작성
            </button>
            <button onClick={() => router.push(`/store/${selectedStore.id}`)}
              style={{ flex: 1, background: '#F2F2F2', color: '#1A1A1A', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              📋 상세 보기
            </button>
          </div>
        </div>
      )}

      {/* ── 하단 네비 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0 20px', background: 'white', borderTop: '1px solid #F2F2F2' }}>
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
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '16px', color: '#666' }}>🗺️ 지도 불러오는 중...</div>}>
      <MapPageInner />
    </Suspense>
  )
}
