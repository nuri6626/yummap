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
  id: string
  name: string
  category: string
  address: string
  latitude: number
  longitude: number
  editor_score: number
  user_score: number
  review_count: number
}

export default function MapPage() {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const supabase = createClient()

  // Supabase에서 가게 데이터 불러오기
  useEffect(() => {
    const fetchStores = async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .limit(50)

      if (data && data.length > 0) {
        setStores(data)
      } else {
        // 데이터 없으면 더미 데이터
        setStores([
          {
            id: '1',
            name: '맛있는 김치찌개',
            category: '한식',
            address: '서울시 강남구 역삼동 123',
            latitude: 37.4979,
            longitude: 127.0276,
            editor_score: 4.5,
            user_score: 4.2,
            review_count: 128
          },
          {
            id: '2',
            name: '황금 삼겹살',
            category: '고기',
            address: '서울시 강남구 논현동 456',
            latitude: 37.5110,
            longitude: 127.0215,
            editor_score: 4.3,
            user_score: 4.0,
            review_count: 89
          },
          {
            id: '3',
            name: '스시 오마카세',
            category: '일식',
            address: '서울시 강남구 청담동 789',
            latitude: 37.5172,
            longitude: 127.0473,
            editor_score: 4.8,
            user_score: 4.6,
            review_count: 234
          }
        ])
      }
      setLoading(false)
    }
    fetchStores()
  }, [])

  // 카카오맵 로드
  useEffect(() => {
    if (loading) return

    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      window.kakao.maps.load(() => {
        setMapLoaded(true)
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [loading])

  // 지도 초기화 & 마커 표시
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    const options = {
      center: new window.kakao.maps.LatLng(37.4979, 127.0276),
      level: 5
    }

    const map = new window.kakao.maps.Map(mapRef.current, options)
    mapInstanceRef.current = map

    // 마커 추가
    stores.forEach(store => {
      const markerPosition = new window.kakao.maps.LatLng(
        store.latitude,
        store.longitude
      )

      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        map: map
      })

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedStore(store)
      })

      // 커스텀 오버레이 (가게 이름 표시)
      const content = `
        <div style="
          background: white;
          border: 2px solid #F59E0B;
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: bold;
          color: #1F2937;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          cursor: pointer;
        ">
          ${store.name}
        </div>
      `

      const overlay = new window.kakao.maps.CustomOverlay({
        position: markerPosition,
        content: content,
        yAnchor: 2.5
      })

      overlay.setMap(map)
    })

  }, [mapLoaded, stores])

  // 현재 위치로 이동
  const moveToCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      const locPosition = new window.kakao.maps.LatLng(lat, lng)
      mapInstanceRef.current?.setCenter(locPosition)
    })
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍜</span>
          <span className="text-xl font-black text-amber-500">YUMMAP</span>
        </div>
        <button
          onClick={() => router.push('/review/write')}
          className="bg-amber-400 text-white px-4 py-2 rounded-full text-sm font-bold"
        >
          + 리뷰 작성
        </button>
      </div>

      {/* 카테고리 필터 */}
      <div className="bg-white px-4 py-2 flex gap-2 overflow-x-auto shadow-sm z-10">
        {['전체', '한식', '일식', '중식', '양식', '고기', '카페', '분식'].map(cat => (
          <button
            key={cat}
            className="whitespace-nowrap px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-400 hover:text-white transition-colors"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 지도 영역 */}
      <div className="relative flex-1">
        <div ref={mapRef} className="w-full h-full" />

        {/* 로딩 */}
        {(loading || !mapLoaded) && (
          <div className="absolute inset-0 bg-amber-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-amber-600 font-bold">지도 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 현재 위치 버튼 */}
        <button
          onClick={moveToCurrentLocation}
          className="absolute bottom-4 right-4 bg-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl z-10 border border-gray-200"
        >
          📍
        </button>
      </div>

      {/* 가게 상세 카드 */}
      {selectedStore && (
        <div className="bg-white rounded-t-3xl shadow-2xl p-5 z-20">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                {selectedStore.category}
              </span>
              <h3 className="text-xl font-bold text-gray-800 mt-1">{selectedStore.name}</h3>
              <p className="text-gray-500 text-sm mt-1">{selectedStore.address}</p>
            </div>
            <button
              onClick={() => setSelectedStore(null)}
              className="text-gray-400 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* 평점 */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">에디터 평점</p>
              <p className="text-2xl font-black text-blue-600">
                ⭐ {selectedStore.editor_score}
              </p>
            </div>
            <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-600 font-medium mb-1">소비자 평점</p>
              <p className="text-2xl font-black text-amber-600">
                ⭐ {selectedStore.user_score}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">리뷰 {selectedStore.review_count}개</p>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/store/${selectedStore.id}`)}
              className="flex-1 bg-amber-400 text-white py-3 rounded-xl font-bold"
            >
              상세 보기
            </button>
            <button
              onClick={() => router.push('/review/write')}
              className="flex-1 border-2 border-amber-400 text-amber-500 py-3 rounded-xl font-bold"
            >
              리뷰 쓰기
            </button>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div className="bg-white border-t border-gray-100 px-6 py-3 flex justify-around z-10">
        {[
          { icon: '🗺️', label: '지도', path: '/map' },
          { icon: '📰', label: '피드', path: '/feed' },
          { icon: '✍️', label: '리뷰', path: '/review/write' },
          { icon: '🔖', label: '저장', path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile' },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs text-gray-500">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
