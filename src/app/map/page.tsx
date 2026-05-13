'use client'

import { useEffect, useRef, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window { naver: any }
}

interface Store {
  id: string
  name: string
  category: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  average_rating?: number | null
  review_count?: number | null
}

interface SelectedStore extends Store {
  isReviewed: boolean
}

const supabase = createClient()

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function MapContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
  const initLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null
  return <MapCore initLat={initLat} initLng={initLng} router={router} />
}

function MapCore({
  initLat,
  initLng,
  router,
}: {
  initLat: number | null
  initLng: number | null
  router: ReturnType<typeof useRouter>
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const mapReadyRef = useRef(false)
  const myMarkerRef = useRef<any>(null)

  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<SelectedStore | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyMode, setNearbyMode] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [storeCount, setStoreCount] = useState(0)

  const storesRef = useRef<Store[]>([])
  const reviewedRef = useRef<Set<string>>(new Set())
  const currentUserRef = useRef<any>(null)
  const myLocationRef = useRef<{ lat: number; lng: number } | null>(null)
  const initCenterRef = useRef<{ lat: number; lng: number } | null>(
    initLat && initLng ? { lat: initLat, lng: initLng } : null
  )

  const NAVER_CLIENT_ID = 'm4vilfrzoa'

  const renderMarkers = useCallback((
    storeList: Store[],
    reviewedIds: Set<string>,
    nearby = false
  ) => {
    if (!mapInstanceRef.current || !window.naver?.maps) return
    markersRef.current.forEach(m => { try { m.setMap(null) } catch {} })
    markersRef.current = []

    const myLoc = myLocationRef.current
    const filtered = nearby && myLoc
      ? storeList.filter(s =>
          s.latitude != null && s.longitude != null &&
          getDistanceKm(myLoc.lat, myLoc.lng, s.latitude!, s.longitude!) <= 1.0
        )
      : storeList.filter(s => s.latitude != null && s.longitude != null)

    filtered.forEach(store => {
      const isReviewed = reviewedIds.has(store.id)
      const bgColor = isReviewed ? '#111' : '#fff'
      const textColor = isReviewed ? '#fff' : '#111'
      const border = isReviewed ? 'none' : '1.5px solid #E0E0E0'
      const rating = store.average_rating != null ? `${store.average_rating} · ` : ''

      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(store.latitude!, store.longitude!),
        map: mapInstanceRef.current,
        icon: {
          content: `<div style="
            background:${bgColor};color:${textColor};
            padding:5px 11px;border-radius:20px;font-size:11px;font-weight:700;
            white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.15);
            border:${border};cursor:pointer;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
            letter-spacing:-0.2px;
          ">${rating}${store.name}</div>`,
          anchor: new window.naver.maps.Point(0, 0),
        },
      })

      window.naver.maps.Event.addListener(marker, 'click', async () => {
        setSelectedStore({ ...store, isReviewed })
        mapInstanceRef.current.panTo(new window.naver.maps.LatLng(store.latitude!, store.longitude!))
        const user = currentUserRef.current
        if (user) {
          const { data } = await supabase
            .from('saved_stores').select('id')
            .eq('user_id', user.id).eq('store_id', store.id).maybeSingle()
          setIsSaved(!!data)
        }
      })

      markersRef.current.push(marker)
    })
  }, [])

  const showMyLocationMarker = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current || !window.naver?.maps) return
    if (myMarkerRef.current) { try { myMarkerRef.current.setMap(null) } catch {} }
    myMarkerRef.current = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(lat, lng),
      map: mapInstanceRef.current,
      icon: {
        content: `<div style="width:14px;height:14px;background:#111;border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(0,0,0,0.12);"></div>`,
        anchor: new window.naver.maps.Point(7, 7),
      },
    })
  }, [])

  const initNaverMap = useCallback((centerLat?: number, centerLng?: number) => {
    if (mapReadyRef.current) return
    if (!window.naver?.maps || !mapRef.current) return
    const lat = centerLat ?? initCenterRef.current?.lat ?? 37.5665
    const lng = centerLng ?? initCenterRef.current?.lng ?? 126.9780
    try {
      const map = new window.naver.maps.Map(mapRef.current, {
        center: new window.naver.maps.LatLng(lat, lng),
        zoom: centerLat ? 15 : 14,
        mapTypeId: window.naver.maps.MapTypeId.NORMAL,
        zoomControl: true,
        zoomControlOptions: { position: window.naver.maps.Position.TOP_RIGHT },
      })
      mapInstanceRef.current = map
      mapReadyRef.current = true
      console.log(`✅ 네이버 지도 초기화 완료 (${lat}, ${lng})`)
      if (storesRef.current.length > 0) {
        renderMarkers(storesRef.current, reviewedRef.current, false)
      }
    } catch (e) {
      console.error('지도 초기화 오류:', e)
    }
  }, [renderMarkers])

  const initWithLocation = useCallback(() => {
    if (!navigator.geolocation) { initNaverMap(); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setMyLocation({ lat, lng })
        myLocationRef.current = { lat, lng }
        initNaverMap(lat, lng)
        setTimeout(() => showMyLocationMarker(lat, lng), 200)
      },
      () => initNaverMap(),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    )
  }, [initNaverMap, showMyLocationMarker])

  const getMyLocation = useCallback(() => {
    if (nearbyMode) {
      setNearbyMode(false)
      renderMarkers(storesRef.current, reviewedRef.current, false)
      return
    }
    if (!navigator.geolocation) { alert('위치 서비스를 지원하지 않아요.'); return }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setMyLocation({ lat, lng })
        myLocationRef.current = { lat, lng }
        setLocationLoading(false)
        setNearbyMode(true)
        if (mapInstanceRef.current && window.naver?.maps) {
          mapInstanceRef.current.setCenter(new window.naver.maps.LatLng(lat, lng))
          mapInstanceRef.current.setZoom(15)
          showMyLocationMarker(lat, lng)
        }
        renderMarkers(storesRef.current, reviewedRef.current, true)
      },
      (err) => {
        setLocationLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          alert('위치 권한이 거부됐어요.')
        } else {
          alert('위치를 가져올 수 없어요.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [nearbyMode, renderMarkers, showMyLocationMarker])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      currentUserRef.current = user

      const { count } = await supabase.from('stores').select('*', { count: 'exact', head: true })
      console.log(`📦 stores 테이블 전체 행 수: ${count}`)
      setStoreCount(count || 0)

      let storeList: Store[] = []
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id, name, category, address, latitude, longitude, phone, average_rating, review_count')
        .not('latitude', 'is', null).not('longitude', 'is', null).limit(500)

      if (storeError) {
        const { data: fallback } = await supabase
          .from('stores').select('id, name, category, address, latitude, longitude, phone')
          .not('latitude', 'is', null).not('longitude', 'is', null).limit(500)
        storeList = fallback || []
      } else {
        storeList = storeData || []
      }

      console.log(`🏪 위경도 있는 가게 수: ${storeList.length}`)
      storesRef.current = storeList
      setStores(storeList)

      let reviewedIds = new Set<string>()
      if (user) {
        const { data: myReviews } = await supabase
          .from('reviews').select('store_id').eq('user_id', user.id)
        if (myReviews) reviewedIds = new Set(myReviews.map((r: any) => r.store_id))
      }
      reviewedRef.current = reviewedIds

      if (mapReadyRef.current) renderMarkers(storeList, reviewedIds, false)
    } catch (err) {
      console.error('loadData 에러:', err)
    } finally {
      setLoading(false)
    }
  }, [renderMarkers])

  const handleScriptLoad = useCallback(() => {
    console.log('✅ 네이버 맵 스크립트 로드 완료')
    setTimeout(() => {
      initWithLocation()
      if (storesRef.current.length > 0) renderMarkers(storesRef.current, reviewedRef.current, false)
    }, 150)
  }, [initWithLocation, renderMarkers])

  useEffect(() => {
    ;(window as any).navermap_authFailure = () => { setAuthError(true) }
    return () => { delete (window as any).navermap_authFailure }
  }, [])

  useEffect(() => {
    loadData()
    if (window.naver?.maps) setTimeout(() => initWithLocation(), 100)
    return () => {
      mapReadyRef.current = false
      mapInstanceRef.current = null
      markersRef.current.forEach(m => { try { m.setMap(null) } catch {} })
      markersRef.current = []
      if (myMarkerRef.current) { try { myMarkerRef.current.setMap(null) } catch {} }
      myMarkerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }

    const dbResults = storesRef.current.filter(s =>
      s.name.includes(q) || (s.address || '').includes(q)
    ).slice(0, 5)
    setSearchResults(dbResults)

    try {
      const res = await fetch(`/api/naver-search?query=${encodeURIComponent(q)}`)
      const json = await res.json()
      const naverResults: Store[] = (json.results || []).map((r: any) => ({
        id: `naver_${r.name}_${r.address}`,
        name: r.name,
        category: r.category,
        address: r.address,
        phone: r.phone,
        latitude: r.latitude,
        longitude: r.longitude,
      }))
      const merged = [
        ...dbResults,
        ...naverResults.filter(n => !dbResults.some(d => d.name === n.name)),
      ].slice(0, 10)
      setSearchResults(merged)
    } catch {
      // DB 결과 유지
    }
  }

  const focusStore = (store: Store) => {
    setSearchResults([])
    setSearchQuery(store.name)
    if (store.latitude && store.longitude && mapInstanceRef.current && window.naver?.maps) {
      mapInstanceRef.current.setCenter(new window.naver.maps.LatLng(store.latitude, store.longitude))
      mapInstanceRef.current.setZoom(17)
    }
    const dbStore = storesRef.current.find(s => s.id === store.id)
    if (dbStore) {
      setSelectedStore({ ...dbStore, isReviewed: reviewedRef.current.has(dbStore.id) })
    } else {
      setSelectedStore({ ...store, isReviewed: false })
    }
  }

  const handleSave = async () => {
    if (!currentUser || !selectedStore) return
    if (isSaved) {
      await supabase.from('saved_stores').delete()
        .eq('user_id', currentUser.id).eq('store_id', selectedStore.id)
      setIsSaved(false)
    } else {
      await supabase.from('saved_stores').insert({ user_id: currentUser.id, store_id: selectedStore.id })
      setIsSaved(true)
    }
  }

  const navItems: { icon: React.ReactNode; label: string; path: string; active: boolean }[] = [
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>,
      label: '홈', path: '/feed', active: false,
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>,
      label: '탐색', path: '/map', active: true,
    },
    { icon: null, label: '리뷰', path: '/review/write', active: false },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>,
      label: '저장', path: '/saved', active: false,
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
      label: '프로필', path: '/profile', active: false,
    },
  ]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      maxWidth: 480, margin: '0 auto',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      background: '#FAFAFA', overflow: 'hidden',
    }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        *::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* 헤더 */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #F0F0F0',
        padding: '0 14px', height: 54,
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0, zIndex: 10,
      }}>
        <button
          onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <img src="/yum2.png" alt="YumMap" style={{ height: 28, objectFit: 'contain', display: 'block' }} />
        </button>

        <div style={{
          flex: 1, height: 36, background: '#F3F3F3', borderRadius: 20,
          display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, position: 'relative',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="가게 이름 검색"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#111' }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 16, lineHeight: 1, padding: 0 }}
            >×</button>
          )}

          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
              background: '#fff', borderRadius: 14,
              boxShadow: '0 4px 24px rgba(0,0,0,0.1)', zIndex: 100,
              maxHeight: 280, overflowY: 'auto', border: '1px solid #F0F0F0',
            }}>
              {searchResults.map((s, i) => (
                <div
                  key={`${s.id}_${i}`}
                  onClick={() => focusStore(s)}
                  style={{
                    padding: '11px 16px', cursor: 'pointer',
                    borderBottom: '1px solid #F7F7F7',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: storesRef.current.find(d => d.id === s.id) ? '#111' : '#F3F3F3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 14 }}>
                      {storesRef.current.find(d => d.id === s.id) ? '📍' : '🔍'}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#111', margin: 0 }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: '#999', margin: '2px 0 0' }}>
                      {s.category && `${s.category} · `}{s.address}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={getMyLocation}
          style={{
            padding: '7px 13px', borderRadius: 20,
            border: nearbyMode ? 'none' : '1.5px solid #E0E0E0',
            background: nearbyMode ? '#111' : '#fff',
            color: nearbyMode ? '#fff' : '#555',
            fontWeight: 700, fontSize: 12, cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s',
          }}
        >
          {locationLoading ? '찾는 중' : nearbyMode ? '내 주변 ON' : '내 주변'}
        </button>
      </header>

      {/* 지도 */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

        {authError && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 60, gap: 10 }}>
            <p style={{ fontSize: 40 }}>⚠️</p>
            <p style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>지도 인증 실패</p>
            <p style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 1.65 }}>네이버 클라우드 콘솔 → Web Service URL 확인</p>
          </div>
        )}

        {loading && !authError && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50, gap: 14 }}>
            <img src="/yum2.png" alt="YumMap" style={{ height: 26, objectFit: 'contain' }} />
            <div style={{ width: 28, height: 28, border: '2.5px solid #F0F0F0', borderTop: '2.5px solid #111', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {process.env.NODE_ENV === 'development' && !loading && (
          <div style={{ position: 'absolute', bottom: 90, left: 14, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 11, zIndex: 20 }}>
            DB: {storeCount}개 | 표시: {stores.filter(s => s.latitude && s.longitude).length}개
          </div>
        )}

        {nearbyMode && (
          <div style={{ position: 'absolute', top: 12, left: 12, background: '#111', color: '#fff', borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 700, zIndex: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            반경 1km 내
            <button
              onClick={() => { setNearbyMode(false); renderMarkers(storesRef.current, reviewedRef.current, false) }}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '1px 7px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >✕</button>
          </div>
        )}

        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: '10px 14px', fontSize: 11, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: 20, border: '1px solid #F0F0F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#111', flexShrink: 0 }} />
            <span style={{ color: '#444', fontWeight: 500 }}>내가 리뷰한 곳</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', border: '1.5px solid #E0E0E0', flexShrink: 0 }} />
            <span style={{ color: '#444', fontWeight: 500 }}>미방문 가게</span>
          </div>
        </div>

        {myLocation && (
          <button
            onClick={() => {
              if (mapInstanceRef.current && window.naver?.maps) {
                mapInstanceRef.current.setCenter(new window.naver.maps.LatLng(myLocation.lat, myLocation.lng))
                mapInstanceRef.current.setZoom(15)
              }
            }}
            style={{
              position: 'absolute', bottom: selectedStore ? 220 : 28, right: 14,
              width: 44, height: 44, borderRadius: '50%', background: '#fff',
              border: '1.5px solid #E0E0E0', boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
              cursor: 'pointer', zIndex: 25, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'bottom 0.25s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2">
              <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
        )}

        {selectedStore && (
          <div style={{
            position: 'absolute', bottom: 16, left: 14, right: 14,
            background: '#fff', borderRadius: 20, padding: '18px 18px 20px',
            boxShadow: '0 4px 28px rgba(0,0,0,0.12)', zIndex: 30,
            border: '1px solid #F0F0F0', animation: 'slideUp 0.25s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ flex: 1, paddingRight: 8 }}>
                <p style={{ fontWeight: 800, fontSize: 16, color: '#111', letterSpacing: '-0.4px', lineHeight: 1.3 }}>{selectedStore.name}</p>
                <p style={{ fontSize: 12, color: '#999', marginTop: 3 }}>{[selectedStore.category, selectedStore.address].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => setSelectedStore(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {selectedStore.average_rating != null && (
                <span style={{ background: '#F3F3F3', color: '#111', borderRadius: 20, padding: '4px 11px', fontSize: 12, fontWeight: 700 }}>
                  {'★'.repeat(Math.round(selectedStore.average_rating))} {selectedStore.average_rating}
                </span>
              )}
              {(selectedStore.review_count ?? 0) > 0 && (
                <span style={{ background: '#F3F3F3', color: '#666', borderRadius: 20, padding: '4px 11px', fontSize: 12 }}>리뷰 {selectedStore.review_count}개</span>
              )}
              {selectedStore.isReviewed && (
                <span style={{ background: '#111', color: '#fff', borderRadius: 20, padding: '4px 11px', fontSize: 12, fontWeight: 700 }}>내가 리뷰함</span>
              )}
              {selectedStore.phone && (
                <span style={{ background: '#F3F3F3', color: '#555', borderRadius: 20, padding: '4px 11px', fontSize: 12 }}>{selectedStore.phone}</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => router.push(`/review/write?storeId=${selectedStore.id}&storeName=${encodeURIComponent(selectedStore.name)}`)}
                style={{ flex: 1, background: '#111', color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >리뷰 작성</button>
              <button
                onClick={handleSave}
                style={{ flex: 1, background: isSaved ? '#111' : '#fff', color: isSaved ? '#fff' : '#111', border: `1.5px solid ${isSaved ? '#111' : '#E0E0E0'}`, borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}
              >{isSaved ? '저장됨' : '저장'}</button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 네비 */}
      <nav style={{ background: '#fff', borderTop: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', height: 60, flexShrink: 0, zIndex: 10 }}>
        {navItems.map((item) => (
          <div key={item.path} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {item.icon === null ? (
              <button
                onClick={() => router.push('/review/write')}
                style={{ width: 42, height: 42, borderRadius: 14, background: '#111', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => router.push(item.path)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', minWidth: 44 }}
              >
                {item.icon}
                <span style={{ fontSize: 10, color: item.active ? '#111' : '#999', fontWeight: item.active ? 700 : 400 }}>{item.label}</span>
              </button>
            )}
          </div>
        ))}
      </nav>

      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}`}
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
        onError={() => { console.error('❌ 스크립트 로드 실패'); setAuthError(true) }}
      />
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', gap: 16 }}>
          <img src="/yum2.png" alt="YumMap" style={{ height: 28, objectFit: 'contain' }} />
          <div style={{ width: 28, height: 28, border: '2.5px solid #F0F0F0', borderTop: '2.5px solid #111', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <MapContent />
    </Suspense>
  )
}
