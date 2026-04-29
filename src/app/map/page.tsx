'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// 더미 맛집 데이터
const DUMMY_STORES = [
  {
    id: '1',
    name: '진짜 맛있는 김치찌개',
    category: '한식',
    address: '서울 강남구 역삼동',
    lat: 37.4979,
    lng: 127.0276,
    editor_score: 4.5,
    user_score: 4.2,
    review_count: 128,
    taste_scores: {
      아기입맛: 4.8,
      까다로운입: 3.9,
      매운맛선호: 4.6,
      전통입맛: 4.7,
    }
  },
  {
    id: '2',
    name: '숨은 맛집 라멘',
    category: '일식',
    address: '서울 강남구 논현동',
    lat: 37.5112,
    lng: 127.0231,
    editor_score: 4.8,
    user_score: 4.5,
    review_count: 89,
    taste_scores: {
      아기입맛: 3.9,
      까다로운입: 4.7,
      매운맛선호: 3.5,
      전통입맛: 4.0,
    }
  },
  {
    id: '3',
    name: '할머니 손맛 국밥',
    category: '한식',
    address: '서울 강남구 삼성동',
    lat: 37.5140,
    lng: 127.0573,
    editor_score: 4.3,
    user_score: 4.6,
    review_count: 234,
    taste_scores: {
      아기입맛: 4.9,
      까다로운입: 4.1,
      매운맛선호: 3.8,
      전통입맛: 4.9,
    }
  },
]

declare global {
  interface Window {
    kakao: any
  }
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [selectedStore, setSelectedStore] = useState<typeof DUMMY_STORES[0] | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return

        const options = {
          center: new window.kakao.maps.LatLng(37.4979, 127.0276),
          level: 5,
        }

        const map = new window.kakao.maps.Map(mapRef.current, options)
        setMapLoaded(true)

        // 마커 생성
        DUMMY_STORES.forEach(store => {
          const markerPosition = new window.kakao.maps.LatLng(store.lat, store.lng)

          const marker = new window.kakao.maps.Marker({
            position: markerPosition,
            map: map,
          })

          // 마커 클릭 이벤트
          window.kakao.maps.event.addListener(marker, 'click', () => {
            setSelectedStore(store)
          })
        })
      })
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-50">

      {/* 상단 헤더 */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm z-10">
        <h1 className="text-xl font-bold text-orange-500">🍜 얌맵</h1>
        <div className="flex-1 bg-gray-100 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-gray-400">🔍</span>
          <span className="text-gray-400 text-sm">맛집 검색</span>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="bg-white px-4 py-2 flex gap-2 overflow-x-auto shadow-sm">
        {['전체', '한식', '일식', '중식', '양식', '분식', '카페'].map(category => (
          <button
            key={category}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-orange-50 text-orange-500 border border-orange-200"
          >
            {category}
          </button>
        ))}
      </div>

      {/* 지도 */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <p className="text-4xl mb-2">🗺️</p>
              <p className="text-gray-500">지도 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 내 위치 버튼 */}
        <button className="absolute bottom-4 right-4 bg-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center text-xl z-10">
          📍
        </button>

        {/* 가게 상세 카드 */}
        {selectedStore && (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5 z-20">

            {/* 닫기 버튼 */}
            <button
              onClick={() => setSelectedStore(null)}
              className="absolute top-4 right-4 text-gray-400 text-xl"
            >
              ✕
            </button>

            {/* 가게 기본 정보 */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full">
                  {selectedStore.category}
                </span>
                <span className="text-xs text-gray-400">
                  리뷰 {selectedStore.review_count}개
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                {selectedStore.name}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                📍 {selectedStore.address}
              </p>
            </div>

            {/* 이중 평점 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-orange-50 rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">에디터 평점</p>
                <p className="text-2xl font-bold text-orange-500">
                  ⭐ {selectedStore.editor_score}
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">소비자 평점</p>
                <p className="text-2xl font-bold text-gray-700">
                  ⭐ {selectedStore.user_score}
                </p>
              </div>
            </div>

            {/* 입맛별 평점 */}
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-700 mb-2">입맛별 평점</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(selectedStore.taste_scores).map(([type, score]) => (
                  <div key={type} className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2">
                    <span className="text-xs text-gray-500">{type}</span>
                    <span className="text-sm font-bold text-orange-500">⭐ {score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/store/${selectedStore.id}`)}
                className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-2xl"
              >
                상세보기
              </button>
              <button className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-xl">
                🗺️
              </button>
            </div>

          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div className="bg-white border-t border-gray-100 px-4 py-2 flex justify-around">
        <button className="flex flex-col items-center gap-1 text-orange-500">
          <span className="text-2xl">🗺️</span>
          <span className="text-xs font-medium">지도</span>
        </button>
        <button
          onClick={() => router.push('/feed')}
          className="flex flex-col items-center gap-1 text-gray-400"
        >
          <span className="text-2xl">📰</span>
          <span className="text-xs">피드</span>
        </button>
        <button
          onClick={() => router.push('/review/write')}
          className="flex flex-col items-center gap-1 text-gray-400"
        >
          <span className="text-2xl">✏️</span>
          <span className="text-xs">리뷰</span>
        </button>
        <button
          onClick={() => router.push('/saved')}
          className="flex flex-col items-center gap-1 text-gray-400"
        >
          <span className="text-2xl">🗂️</span>
          <span className="text-xs">저장</span>
        </button>
        <button
          onClick={() => router.push('/profile')}
          className="flex flex-col items-center gap-1 text-gray-400"
        >
          <span className="text-2xl">👤</span>
          <span className="text-xs">프로필</span>
        </button>
      </div>

    </div>
  )
}
