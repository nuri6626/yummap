'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DUMMY_FEED = [
  {
    id: '1',
    user: { nickname: '맛집탐험가김철수', grade: '⭐ 얌슐랭 1스타', avatar: '👨‍🍳' },
    store: { name: '진짜 맛있는 김치찌개', category: '한식', address: '서울 강남구 역삼동' },
    menu: '김치찌개', taste_score: 4.5, portion_score: 4.0, value_score: 4.2,
    spiciness: 6, saltiness: 5,
    content: '진짜 오랜만에 제대로 된 김치찌개 먹었어요. 돼지고기가 듬뿍 들어있고 김치가 딱 알맞게 익어서 국물이 깊었습니다. 밥도 무한리필이라 가성비 최고!',
    photos: ['🍲'], likes: 42, comments: 8, liked: false, saved: false, time: '2시간 전',
  },
  {
    id: '2',
    user: { nickname: '라멘마니아박지영', grade: '🍱 미식 큐레이터', avatar: '👩‍🍳' },
    store: { name: '숨은 맛집 라멘', category: '일식', address: '서울 강남구 논현동' },
    menu: '특제 돈코츠 라멘', taste_score: 4.8, portion_score: 3.5, value_score: 3.8,
    spiciness: 3, saltiness: 7,
    content: '국물이 진짜 진하고 깊어요. 면 삶는 정도도 딱 알맞고 차슈도 부드럽습니다. 다만 양이 조금 적은 편이라 곱빼기 추천해요!',
    photos: ['🍜'], likes: 87, comments: 15, liked: true, saved: true, time: '5시간 전',
  },
  {
    id: '3',
    user: { nickname: '전통맛집수호자', grade: '🍜 맛집 탐험가', avatar: '🧑‍🍳' },
    store: { name: '할머니 손맛 국밥', category: '한식', address: '서울 강남구 삼성동' },
    menu: '순대국밥', taste_score: 4.6, portion_score: 4.9, value_score: 5.0,
    spiciness: 2, saltiness: 4,
    content: '40년 전통의 손맛이 느껴지는 곳이에요. 국물이 맑고 깔끔한데 깊은 맛이 납니다. 양도 엄청 많고 가격도 저렴해서 근처 직장인들이 항상 줄 서는 곳이에요.',
    photos: ['🥣'], likes: 156, comments: 32, liked: false, saved: false, time: '어제',
  },
]

export default function FeedPage() {
  const router = useRouter()
  const [feed, setFeed] = useState(DUMMY_FEED)
  const [activeTab, setActiveTab] = useState<'following' | 'recommended'>('recommended')

  const toggleLike = (id: string) => {
    setFeed(prev => prev.map(item =>
      item.id === id
        ? { ...item, liked: !item.liked, likes: item.liked ? item.likes - 1 : item.likes + 1 }
        : item
    ))
  }

  const toggleSave = (id: string) => {
    setFeed(prev => prev.map(item =>
      item.id === id ? { ...item, saved: !item.saved } : item
    ))
  }

  const ScoreBar = ({ value, max = 10 }: { value: number, max?: number }) => (
    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
      <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${(value / max) * 100}%` }} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* 헤더 */}
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <img src="/yum2.png" style={{ height:'32px' }} />
          <button className="text-gray-400 text-xl">🔔</button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'recommended' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500'
            }`}
          >
            추천 피드
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'following' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500'
            }`}
          >
            팔로잉
          </button>
        </div>
      </div>

      {/* 피드 리스트 */}
      <div className="flex-1 px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        {feed.map(item => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">

            {/* 유저 정보 */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-xl">
                  {item.user.avatar}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{item.user.nickname}</p>
                  <p className="text-xs text-orange-500">{item.user.grade}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{item.time}</span>
                <button className="text-gray-300">•••</button>
              </div>
            </div>

            {/* 가게 정보 */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full">
                  {item.store.category}
                </span>
                <span className="text-xs text-gray-400">{item.store.address}</span>
              </div>
              <h3 className="font-bold text-gray-800">📍 {item.store.name}</h3>
              <p className="text-sm text-orange-500 font-medium mt-0.5">🍽️ {item.menu}</p>
            </div>

            {/* 사진 */}
            <div className="bg-orange-50 h-48 flex items-center justify-center text-7xl">
              {item.photos[0]}
            </div>

            {/* 평점 */}
            <div className="px-4 py-3 border-b border-gray-50">
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: '맛', score: item.taste_score },
                  { label: '양', score: item.portion_score },
                  { label: '가성비', score: item.value_score },
                ].map(({ label, score }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className="font-bold text-orange-500">⭐ {score}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">🌶️ 맵기</span>
                  <ScoreBar value={item.spiciness} />
                  <span className="text-xs text-gray-500 w-6">{item.spiciness}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">🧂 짠기</span>
                  <ScoreBar value={item.saltiness} />
                  <span className="text-xs text-gray-500 w-6">{item.saltiness}</span>
                </div>
              </div>
            </div>

            {/* 리뷰 내용 */}
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-sm text-gray-700 leading-relaxed">{item.content}</p>
            </div>

            {/* 액션 버튼 */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleLike(item.id)} className="flex items-center gap-1">
                  <span className={`text-xl ${item.liked ? 'text-red-500' : 'text-gray-300'}`}>♥</span>
                  <span className="text-sm text-gray-500">{item.likes}</span>
                </button>
                <button className="flex items-center gap-1">
                  <span className="text-xl text-gray-300">💬</span>
                  <span className="text-sm text-gray-500">{item.comments}</span>
                </button>
              </div>
              <button
                onClick={() => toggleSave(item.id)}
                className={`text-xl ${item.saved ? 'text-orange-500' : 'text-gray-300'}`}
              >
                🗂️
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* 하단 네비게이션 */}
      <div className="bg-white border-t border-gray-100 px-4 py-2 flex justify-around sticky bottom-0">
        <button onClick={() => router.push('/map')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">🗺️</span>
          <span className="text-xs">지도</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-orange-500">
          <span className="text-2xl">📰</span>
          <span className="text-xs font-medium">피드</span>
        </button>
        <button onClick={() => router.push('/review/write')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">✏️</span>
          <span className="text-xs">리뷰</span>
        </button>
        <button onClick={() => router.push('/saved')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">🗂️</span>
          <span className="text-xs">저장</span>
        </button>
        <button onClick={() => router.push('/profile')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">👤</span>
          <span className="text-xs">프로필</span>
        </button>
      </div>

    </div>
  )
}
