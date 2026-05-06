'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Window {
    kakao: any
  }
}

interface Store {
  id: number
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
}

export default function MapPage() {
  const router = useRouter()
  const supabase = createClient()
  const mapRef = useRef<HTMLDivElement>(null)
  const kakaoMapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [activeCategory, setActiveCategory] = useState('전체')

  const CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '고기', '카페', '분식', '해산물', '디저트']

  // 1단계: 가게 데이터 fetch
  useEffect(() => {
    const fetchStores = async () => {
      const { data, error } = await supabase.from('stores').select('*')
      console.log('가게 데이터:', data, '오류:', error)
      if (data && data.length > 0) {
        setStores(data)
      }
    }
    fetchStores()
  }, [])

  // 2단계: 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          setUserLocation({ lat: 35.5384, lng: 129.3114 }) // 울산 기본값
        }
      )
    } else {
      setUserLocation({ lat: 35.5384, lng: 129.3114 })
    }
  }, [])

  // 3단계: 카카오맵 초기화 (위치 준비된 후)
  useEffect(() => {
    if (!userLocation) return
    
    const initMap = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          if (!mapRef.current) return
          const options = {
            center: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
            level: 5,
          }
          kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, options)
          setMapReady(true)
          console.log('카카오맵 초기화 완료')
        })
      } else {
        setTimeout(initMap, 300)
      }
    }
    initMap()
  }, [userLocation])

  // 4단계: 마커 표시 (맵 + 데이터 모두 준비된 후)
  useEffect(() => {
    if (!mapReady || !kakaoMapRef.current) return
    
    console.log('마커 렌더링 시작, 가게 수:', stores.length)

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    const filtered = activeCategory === '전체'
      ? stores
      : stores.filter(s => s.category === activeCategory)

    console.log('필터된 가게 수:', filtered.length)

    filtered.forEach(store => {
      const position = new window.kakao.maps.LatLng(store.latitude, store.longitude)
      const marker = new window.kakao.maps.Marker({
        position,
        map: kakaoMapRef.current,
      })

      window.kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedStore(store)
      })

      markersRef.current.push(marker)
    })

    console.log('마커 추가 완료:', markersRef.current.length, '개')
  }, [mapReady, stores, activeCategory])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, -apple-system, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'white', borderBottom: '1px solid #F2F2F2', zIndex: 10 }}>
        <img src="/yum2.png" alt="yummap" style={{ height: '32px' }} />
        <button
          onClick={() => router.push('/review/write')}
          style={{ background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
          + 리뷰 작성
        </button>
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', overflowX: 'auto', background: 'white', borderBottom: '1px solid #F2F2F2' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{ whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: activeCategory === cat ? '#FF5A3D' : '#F2F2F2', color: activeCategory === cat ? 'white' : '#666' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* 지도 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* 내 위치 버튼 */}
        <button
          onClick={() => {
            if (userLocation && kakaoMapRef.current) {
              kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng))
            }
          }}
          style={{ position: 'absolute', bottom: '20px', right: '16px', background: 'white', border: '1px solid #eee', borderRadius: '50%', width: '44px', height: '44px', fontSize: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 5 }}>
          📍
        </button>

        {/* 가게 수 뱃지 */}
        <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: '600', zIndex: 5 }}>
          {activeCategory === '전체' ? stores.length : stores.filter(s => s.category === activeCategory).length}개 맛집
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
          <div style={{ display: 'flex', gap: '12px', margin: '12px 0' }}>
            {selectedStore.editor_score && (
              <div style={{ background: '#F8F8F8', borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#FF5A3D' }}>⭐ {selectedStore.editor_score}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>에디터</div>
              </div>
            )}
            {selectedStore.user_score && (
              <div style={{ background: '#F8F8F8', borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#FF5A3D' }}>⭐ {selectedStore.user_score}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>유저</div>
              </div>
            )}
            {selectedStore.review_count && (
              <div style={{ background: '#F8F8F8', borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#1A1A1A' }}>{selectedStore.review_count}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>리뷰</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => router.push(`/review/write?store_id=${selectedStore.id}&store_name=${encodeURIComponent(selectedStore.name)}`)}
              style={{ flex: 1, background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              리뷰 작성
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
          { icon: '📰', label: '피드', path: '/feed', active: false },
          { icon: '✏️', label: '리뷰', path: '/review/write', active: false },
          { icon: '❤️', label: '저장', path: '/saved', active: false },
          { icon: '👤', label: '프로필', path: '/profile', active: false },
        ].map(item => (
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
