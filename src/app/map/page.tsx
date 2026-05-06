'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window { kakao: any }
}

interface Store {
  id: string
  name: string
  category: string
  address: string
  latitude: number
  longitude: number
  phone?: string
  business_hours?: string
  editor_score?: number
  user_score?: number
  review_count?: number
  isKakao?: boolean
  isSearchResult?: boolean
}

export default function MapPage() {
  const router = useRouter()
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

  const CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '고기', '카페', '분식', '해산물', '디저트']

  // 1단계: 사용자 위치
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 35.5384, lng: 129.3114 })
      )
    } else {
      setUserLocation({ lat: 35.5384, lng: 129.3114 })
    }
  }, [])

  // 2단계: 카카오맵 초기화
  useEffect(() => {
    if (!userLocation) return
    const initMap = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          if (!mapRef.current) return
          kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, {
            center: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
            level: 4,
          })
          setMapReady(true)
        })
      } else {
        setTimeout(initMap, 300)
      }
    }
    initMap()
  }, [userLocation])

  // 3단계: 주변 음식점 검색
  useEffect(() => {
    if (!mapReady || !userLocation) return
    searchNearbyStores(userLocation.lat, userLocation.lng, activeCategory)
  }, [mapReady, userLocation])

  const searchNearbyStores = async (lat: number, lng: number, category: string) => {
    const keyword = category === '전체' ? '음식점' : category
    const REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
    try {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&x=${lng}&y=${lat}&radius=2000&size=15&category_group_code=FD6`,
        { headers: { Authorization: `KakaoAK ${REST_API_KEY}` } }
      )
      const data = await response.json()
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
      }
    } catch (err) {
      console.error('장소 검색 오류:', err)
      const { data } = await supabase.from('stores').select('*')
      setStores(data || [])
    }
  }

  // 키워드 검색 - 정확히 해당 키워드만
  const searchByKeyword = async () => {
    if (!searchKeyword.trim() || !userLocation) return
    const REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
    try {
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchKeyword)}&x=${userLocation.lng}&y=${userLocation.lat}&radius=5000&size=15&category_group_code=FD6`,
        { headers: { Authorization: `KakaoAK ${REST_API_KEY}` } }
      )
      const data = await response.json()
      if (data.documents) {
        // 검색어가 가게 이름에 포함된 것만 필터링
        const filtered = data.documents.filter((doc: any) =>
          doc.place_name.includes(searchKeyword) ||
          doc.category_name.includes(searchKeyword)
        )
        const results: Store[] = filtered.map((doc: any) => ({
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
        if (results.length > 0 && kakaoMapRef.current) {
          kakaoMapRef.current.setCenter(
            new window.kakao.maps.LatLng(results[0].latitude, results[0].longitude)
          )
        }
        if (results.length === 0) {
          alert('검색 결과가 없습니다. 다른 키워드로 검색해보세요.')
        }
      }
    } catch (err) {
      console.error('검색 오류:', err)
    }
  }

  // 4단계: 마커 표시
  useEffect(() => {
    if (!mapReady || !kakaoMapRef.current) return

    // 기존 오버레이 제거
    overlaysRef.current.forEach(o => o.setMap(null))
    overlaysRef.current = []

    stores.forEach(store => {
      const position = new window.kakao.maps.LatLng(store.latitude, store.longitude)
      const isHighlight = store.isSearchResult

      const content = document.createElement('div')
      content.innerHTML = store.name
      content.style.cssText = `
        background: ${isHighlight ? '#FF5A3D' : 'white'};
        border: 2px solid ${isHighlight ? '#FF5A3D' : '#FF8560'};
        border-radius: 20px;
        padding: 5px 12px;
        font-size: 12px;
        font-weight: 700;
        color: ${isHighlight ? 'white' : '#FF5A3D'};
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(255,90,61,${isHighlight ? '0.5' : '0.2'});
        cursor: pointer;
        user-select: none;
      `

      content.addEventListener('click', () => {
        setSelectedStore(store)
      })

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 1.3,
      })
      overlay.setMap(kakaoMapRef.current)
      overlaysRef.current.push(overlay)
    })
  }, [mapReady, stores])

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat)
    setSearchKeyword('')
    setIsSearchMode(false)
    if (userLocation) searchNearbyStores(userLocation.lat, userLocation.lng, cat)
  }

  const handleReset = () => {
    setSearchKeyword('')
    setIsSearchMode(false)
    setActiveCategory('전체')
    if (userLocation) searchNearbyStores(userLocation.lat, userLocation.lng, '전체')
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #F2F2F2', zIndex: 10 }}>
        <img src="/yum2.png" alt="yummap" style={{ height: '32px' }} />
        <button onClick={() => router.push('/review/write')}
          style={{ background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
          + 리뷰 작성
        </button>
      </div>

      {/* 검색창 */}
      <div style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #F2F2F2', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="🔍 맛집 이름으로 검색..."
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchByKeyword()}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #F2F2F2', fontSize: '14px', outline: 'none' }}
        />
        <button onClick={searchByKeyword}
          style={{ background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 16px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          검색
        </button>
        {isSearchMode && (
          <button onClick={handleReset}
            style={{ background: '#F2F2F2', color: '#666', border: 'none', borderRadius: '12px', padding: '10px 16px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
            초기화
          </button>
        )}
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', overflowX: 'auto', background: 'white', borderBottom: '1px solid #F2F2F2' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => handleCategoryChange(cat)}
            style={{ whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: activeCategory === cat ? '#FF5A3D' : '#F2F2F2', color: activeCategory === cat ? 'white' : '#666' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* 지도 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* 내 위치 버튼 */}
        <button onClick={() => {
          if (userLocation && kakaoMapRef.current) {
            kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng))
            handleReset()
          }
        }}
          style={{ position: 'absolute', bottom: '20px', right: '16px', background: 'white', border: '1px solid #eee', borderRadius: '50%', width: '44px', height: '44px', fontSize: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 5 }}>
          📍
        </button>

        {/* 상태 뱃지 */}
        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', background: isSearchMode ? '#FF5A3D' : 'rgba(0,0,0,0.7)', color: 'white', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: '600', zIndex: 5 }}>
          {isSearchMode ? `"${searchKeyword}" 검색결과 ${stores.length}개` : `주변 ${stores.length}개 맛집`}
        </div>
      </div>

      {/* 선택된 가게 카드 */}
      {selectedStore && (
        <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 16px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', maxHeight: '40vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <span style={{ background: '#FFE7DF', color: '#FF5A3D', borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>{selectedStore.category}</span>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1A1A1A', margin: '6px 0 4px' }}>{selectedStore.name}</h3>
              <p style={{ color: '#999', fontSize: '13px', margin: '0 0 2px' }}>📍 {selectedStore.address}</p>
              {selectedStore.phone && <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>📞 {selectedStore.phone}</p>}
            </div>
            <button onClick={() => setSelectedStore(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
  onClick={() => router.push(
    `/review/write?store_id=${selectedStore.id}` +
    `&store_name=${encodeURIComponent(selectedStore.name)}` +
    `&store_address=${encodeURIComponent(selectedStore.address || '')}` +
    `&store_category=${encodeURIComponent(selectedStore.category || '')}` +
    `&store_lat=${selectedStore.latitude}` +
    `&store_lng=${selectedStore.longitude}` +
    `&store_phone=${encodeURIComponent(selectedStore.phone || '')}`
  )}
  style={{ flex: 1, background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
  ✏️ 리뷰 작성
</button>

            <button
              onClick={() => router.push(`/store/${selectedStore.id}`)}
              style={{ flex: 1, background: '#F2F2F2', color: '#1A1A1A', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              상세 보기
            </button>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0 20px', background: 'white', borderTop: '1px solid #F2F2F2' }}>
        {[
          { icon: '🗺️', label: '지도', path: '/map', active: true },
          { icon: '📰', label: '피드', path: '/feed' },
          { icon: '✏️', label: '리뷰', path: '/review/write' },
          { icon: '❤️', label: '저장', path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile' },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600', color: (item as any).active ? '#FF5A3D' : '#999' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
