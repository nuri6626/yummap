'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window { kakao: any }
}

interface Store {
  id: string; name: string; address: string; category: string
  latitude: number; longitude: number
  review_count: number; average_rating: number; phone?: string
}

interface KakaoPlace {
  id: string; place_name: string
  road_address_name: string; address_name: string
  category_name: string; x: string; y: string; phone: string
}

/* ── 거리 계산 (Haversine) ── */
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371000
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function MapPageInner() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const supabase    = createClient()

  const mapRef          = useRef<HTMLDivElement>(null)
  const mapInstanceRef  = useRef<any>(null)
  const markersRef      = useRef<any[]>([])
  const overlaysRef     = useRef<any[]>([])

  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState<KakaoPlace[]>([])
  const [selectedStore,  setSelectedStore]  = useState<Store | KakaoPlace | null>(null)
  const [savedStores,    setSavedStores]    = useState<Set<string>>(new Set())
  const [isSearching,    setIsSearching]    = useState(false)
  const [showPanel,      setShowPanel]      = useState(false)
  const [currentUser,    setCurrentUser]    = useState<string | null>(null)
  const [userLat,        setUserLat]        = useState<number>(37.5665)
  const [userLng,        setUserLng]        = useState<number>(126.9780)
  const [dbStores,       setDbStores]       = useState<Store[]>([])
  const [mapLoaded,      setMapLoaded]      = useState(false)
  const [nearbyFilter,   setNearbyFilter]   = useState(false)   // ← L: 100m 필터
  const [filterRadius,   setFilterRadius]   = useState(100)     // ← 반경 (m)

  const isSelectMode = searchParams.get('selectMode') === 'true'

  /* ── 유저 + 저장 목록 ── */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user.id)
        const { data: saved } = await supabase.from('saved_stores').select('store_id').eq('user_id', user.id)
        setSavedStores(new Set(saved?.map(s => s.store_id) ?? []))
      }
    }
    init()
  }, [])

  /* ── Kakao SDK 로드 ── */
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY
    if (!apiKey) return
    if (window.kakao?.maps) { initMap(); return }
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`
    script.onload = () => window.kakao.maps.load(() => setMapLoaded(true))
    document.head.appendChild(script)
  }, [])

  useEffect(() => { if (mapLoaded) initMap() }, [mapLoaded])

  /* ── 지도 초기화 ── */
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); createMap(pos.coords.latitude, pos.coords.longitude) },
      ()  => createMap(37.5665, 126.9780)
    )
  }, [])

  const createMap = (lat: number, lng: number) => {
    if (!mapRef.current) return
    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(lat, lng), level: 4
    })
    mapInstanceRef.current = map
    new window.kakao.maps.Marker({
      map, position: new window.kakao.maps.LatLng(lat, lng),
      image: new window.kakao.maps.MarkerImage(
        'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
        new window.kakao.maps.Size(24, 35)
      ),
    })
    loadDbStores(map, lat, lng)
  }

  /* ── DB 가게 로드 ── */
  const loadDbStores = async (map: any, lat: number, lng: number) => {
    const { data } = await supabase.from('stores').select('*').limit(200)
    setDbStores((data ?? []) as Store[])
    addMarkersToMap(map, (data ?? []) as Store[], lat, lng, false)
  }

  /* ── 마커 추가 (필터 적용 가능) ── */
  const addMarkersToMap = (map: any, stores: Store[], lat: number, lng: number, filter: boolean) => {
    markersRef.current.forEach(m => m.setMap(null))
    overlaysRef.current.forEach(o => o.setMap(null))
    markersRef.current = []; overlaysRef.current = []

    const filtered = filter
      ? stores.filter(s => s.latitude && s.longitude && getDistance(lat, lng, s.latitude, s.longitude) <= filterRadius)
      : stores

    filtered.forEach(store => {
      if (!store.latitude || !store.longitude) return
      const pos    = new window.kakao.maps.LatLng(store.latitude, store.longitude)
      const marker = new window.kakao.maps.Marker({ map, position: pos })
      const overlay = new window.kakao.maps.CustomOverlay({
        map, position: pos, yAnchor: 1,
        content: `<div style="background:white;border:2px solid #FF5A3D;border-radius:12px;padding:4px 10px;font-size:12px;font-weight:700;color:#FF5A3D;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);margin-bottom:45px;">${store.name}</div>`
      })
      window.kakao.maps.event.addListener(marker, 'click', () => { setSelectedStore(store); setShowPanel(true) })
      markersRef.current.push(marker)
      overlaysRef.current.push(overlay)
    })
  }

  /* ── 필터 토글 ── */
  const toggleNearbyFilter = () => {
    const next = !nearbyFilter
    setNearbyFilter(next)
    if (mapInstanceRef.current) {
      addMarkersToMap(mapInstanceRef.current, dbStores, userLat, userLng, next)
    }
  }

  /* ── 카카오 검색 ── */
  const handleSearch = () => {
    if (!searchQuery.trim() || !window.kakao?.maps) return
    setIsSearching(true)
    const ps = new window.kakao.maps.services.Places()
    ps.keywordSearch(searchQuery, (data: KakaoPlace[], status: string) => {
      setIsSearching(false)
      if (status === window.kakao.maps.services.Status.OK) {
        setSearchResults(data.slice(0, 10))
        /* 검색 결과 마커 추가 */
        if (mapInstanceRef.current) {
          data.slice(0, 10).forEach(place => {
            const pos    = new window.kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x))
            const marker = new window.kakao.maps.Marker({ map: mapInstanceRef.current, position: pos })
            const overlay = new window.kakao.maps.CustomOverlay({
              map: mapInstanceRef.current, position: pos, yAnchor: 1,
              content: `<div style="background:white;border:2px solid #2196F3;border-radius:12px;padding:4px 10px;font-size:12px;font-weight:700;color:#2196F3;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);margin-bottom:45px;">${place.place_name}</div>`
            })
            window.kakao.maps.event.addListener(marker, 'click', () => { setSelectedStore(place); setShowPanel(true) })
            markersRef.current.push(marker)
            overlaysRef.current.push(overlay)
          })
        }
      }
    }, { x: String(userLng), y: String(userLat), radius: 5000 })
  }

  /* ── 검색 결과 선택 ── */
  const handleSelectPlace = (place: KakaoPlace) => {
    if (isSelectMode) {
      const params = new URLSearchParams({
        store_id: place.id, store_name: place.place_name,
        store_address: place.road_address_name || place.address_name,
        store_category: place.category_name,
        store_lat: place.y, store_lng: place.x, store_phone: place.phone,
      })
      router.push(`/review/write?${params.toString()}`)
      return
    }
    setSelectedStore(place); setShowPanel(true); setSearchResults([])
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(new window.kakao.maps.LatLng(parseFloat(place.y), parseFloat(place.x)))
    }
  }

  /* ── 저장 토글 ── */
  const toggleSave = async (storeData: Store | KakaoPlace) => {
    if (!currentUser) { router.push('/login'); return }
    let storeUUID: string
    if ('place_name' in storeData) {
      const { data: found } = await supabase.from('stores').select('id').eq('kakao_id', storeData.id).maybeSingle()
      if (found) {
        storeUUID = found.id
      } else {
        const { data: created } = await supabase.from('stores').insert({
          name: storeData.place_name,
          address: storeData.road_address_name || storeData.address_name,
          category: storeData.category_name,
          latitude: parseFloat(storeData.y), longitude: parseFloat(storeData.x),
          phone: storeData.phone || null, kakao_id: storeData.id,
        }).select('id').single()
        if (!created) return
        storeUUID = created.id
      }
    } else {
      storeUUID = storeData.id
    }
    const isSaved = savedStores.has(storeUUID)
    if (isSaved) {
      await supabase.from('saved_stores').delete().eq('store_id', storeUUID).eq('user_id', currentUser)
      setSavedStores(s => { const n = new Set(s); n.delete(storeUUID); return n })
    } else {
      await supabase.from('saved_stores').insert({ store_id: storeUUID, user_id: currentUser })
      setSavedStores(s => new Set(s).add(storeUUID))
    }
  }

  /* ── 가게 정보 패널 ── */
  const renderPanel = () => {
    if (!selectedStore || !showPanel) return null
    const isKakao  = 'place_name' in selectedStore
    const name     = isKakao ? selectedStore.place_name : selectedStore.name
    const address  = isKakao ? (selectedStore.road_address_name || selectedStore.address_name) : selectedStore.address
    const category = isKakao ? selectedStore.category_name : selectedStore.category
    const storeKey = selectedStore.id
    const isSaved  = savedStores.has(storeKey)
    const rating   = !isKakao ? (selectedStore as Store).average_rating : null
    const reviewCnt= !isKakao ? (selectedStore as Store).review_count : null

    return (
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'white', borderRadius: '24px 24px 0 0', padding: '20px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', zIndex: 200, maxHeight: '50vh', overflowY: 'auto'
      }}>
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#ddd', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800' }}>{name}</h2>
            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#888' }}>{category}</p>
            <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>{address}</p>
            {rating != null && reviewCnt != null && (
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#FF5A3D', fontWeight: '700' }}>
                ⭐ {rating?.toFixed(1)} · 리뷰 {reviewCnt}개
              </p>
            )}
          </div>
          <button onClick={() => setShowPanel(false)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#aaa' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          {isSelectMode ? (
            <button onClick={() => handleSelectPlace(isKakao ? selectedStore as KakaoPlace : {
              id: (selectedStore as Store).id, place_name: (selectedStore as Store).name,
              road_address_name: (selectedStore as Store).address, address_name: (selectedStore as Store).address,
              category_name: (selectedStore as Store).category,
              x: String((selectedStore as Store).longitude), y: String((selectedStore as Store).latitude), phone: ''
            })} style={{
              flex: 1, padding: '14px', background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)',
              color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer'
            }}>✅ 이 가게 선택하기</button>
          ) : (
            <>
              <button onClick={() => toggleSave(selectedStore)} style={{
                flex: 1, padding: '12px', borderRadius: '14px', fontSize: '14px', fontWeight: '700',
                border: isSaved ? '2px solid #ddd' : '2px solid #FF5A3D',
                background: isSaved ? '#f5f5f5' : 'white',
                color: isSaved ? '#aaa' : '#FF5A3D', cursor: 'pointer'
              }}>{isSaved ? '🔖 저장됨' : '🔖 저장하기'}</button>
              <button onClick={() => {
                const params = new URLSearchParams({
                  store_id:       isKakao ? selectedStore.id : (selectedStore as Store).id,
                  store_name:     name, store_address: address, store_category: category,
                  store_lat:      isKakao ? selectedStore.y : String((selectedStore as Store).latitude),
                  store_lng:      isKakao ? selectedStore.x : String((selectedStore as Store).longitude),
                  store_phone:    isKakao ? selectedStore.phone : ((selectedStore as Store).phone ?? ''),
                })
                router.push(`/review/write?${params.toString()}`)
              }} style={{
                flex: 1, padding: '12px', background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)',
                color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer'
              }}>✍️ 리뷰 쓰기</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* 선택 모드 배너 */}
      {isSelectMode && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200,
          background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)',
          color: 'white', padding: '12px 16px', textAlign: 'center',
          fontSize: '14px', fontWeight: '700'
        }}>
          📍 리뷰할 가게를 선택하세요
          <button onClick={() => router.back()} style={{
            marginLeft: '12px', background: 'rgba(255,255,255,0.3)', border: 'none',
            color: 'white', borderRadius: '12px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer'
          }}>취소</button>
        </div>
      )}

      {/* 검색바 */}
      <div style={{
        position: 'absolute', top: isSelectMode ? '52px' : '16px',
        left: '16px', right: '16px', zIndex: 100
      }}>
        <div style={{
          display: 'flex', gap: '8px', background: 'white', borderRadius: '16px',
          padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="가게 이름, 음식 종류 검색..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' }}
          />
          <button onClick={handleSearch} style={{
            background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)', color: 'white',
            border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
          }}>{isSearching ? '...' : '🔍'}</button>
        </div>

        {searchResults.length > 0 && (
          <div style={{
            background: 'white', borderRadius: '16px', marginTop: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxHeight: '280px', overflowY: 'auto'
          }}>
            {searchResults.map(place => (
              <div key={place.id} onClick={() => handleSelectPlace(place)} style={{
                padding: '12px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer'
              }}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#333' }}>{place.place_name}</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#aaa' }}>
                  {place.category_name} · {place.road_address_name || place.address_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── L: 위치 필터 토글 버튼 ── */}
      <div style={{
        position: 'absolute', top: isSelectMode ? '110px' : '76px',
        right: '16px', zIndex: 100,
        display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end'
      }}>
        <button onClick={toggleNearbyFilter} style={{
          background: nearbyFilter ? '#FF5A3D' : 'white',
          color: nearbyFilter ? 'white' : '#FF5A3D',
          border: '2px solid #FF5A3D', borderRadius: '20px',
          padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)', whiteSpace: 'nowrap'
        }}>
          📍 {nearbyFilter ? `${filterRadius}m 이내 ON` : '거리 필터 OFF'}
        </button>
        {nearbyFilter && (
          <div style={{
            background: 'white', borderRadius: '16px', padding: '10px 14px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)', display: 'flex', gap: '6px'
          }}>
            {[100, 300, 500].map(r => (
              <button key={r} onClick={() => {
                setFilterRadius(r)
                if (mapInstanceRef.current) addMarkersToMap(mapInstanceRef.current, dbStores, userLat, userLng, true)
              }} style={{
                padding: '5px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: filterRadius === r ? '#FF5A3D' : '#f5f5f5',
                color: filterRadius === r ? 'white' : '#666', fontSize: '12px', fontWeight: '700'
              }}>{r}m</button>
            ))}
          </div>
        )}
      </div>

      {/* 가게 패널 */}
      {renderPanel()}

      {/* 하단 내비 */}
      {!isSelectMode && (
        <nav style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'white', borderTop: '1px solid #f0f0f0',
          display: 'flex', padding: '8px 0 calc(8px + env(safe-area-inset-bottom))', zIndex: 100
        }}>
          {[
            { icon: '🗺️', label: '지도',   path: '/map' },
            { icon: '🍜', label: 'MOTD',   path: '/feed' },
            { icon: '✍️', label: '리뷰',   path: '/review/write' },
            { icon: '🔖', label: '저장',   path: '/saved' },
            { icon: '👤', label: '프로필', path: '/profile' },
          ].map(item => (
            <button key={item.path} onClick={() => router.push(item.path)} style={{
              flex: 1, border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              cursor: 'pointer', padding: '4px 0'
            }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ fontSize: '10px', color: item.path === '/map' ? '#FF5A3D' : '#999' }}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><p>지도 로딩 중...</p></div>}>
      <MapPageInner />
    </Suspense>
  )
}
