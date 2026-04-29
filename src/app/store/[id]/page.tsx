'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DUMMY_STORE = {
  id: '1',
  name: '진짜 맛있는 김치찌개',
  category: '한식',
  address: '서울 강남구 역삼동 123-45',
  phone: '02-1234-5678',
  business_hours: '11:00 ~ 21:00 (월요일 휴무)',
  editor_score: 4.5,
  user_score: 4.2,
  review_count: 128,
  saved_count: 342,
  taste_scores: {
    아기입맛: 4.8,
    까다로운입: 3.9,
    매운맛선호: 4.6,
    전통입맛: 4.7,
  },
  menus: [
    {
      id: '1',
      name: '김치찌개',
      price: 9000,
      avg_taste: 4.5,
      avg_portion: 4.0,
      avg_value: 4.2,
      avg_spiciness: 6,
      avg_saltiness: 5,
      review_count: 98,
    },
    {
      id: '2',
      name: '제육볶음',
      price: 10000,
      avg_taste: 4.2,
      avg_portion: 4.5,
      avg_value: 4.0,
      avg_spiciness: 7,
      avg_saltiness: 6,
      review_count: 45,
    },
    {
      id: '3',
      name: '된장찌개',
      price: 8000,
      avg_taste: 4.0,
      avg_portion: 3.8,
      avg_value: 4.3,
      avg_spiciness: 2,
      avg_saltiness: 5,
      review_count: 32,
    },
  ],
  reviews: [
    {
      id: '1',
      user: { nickname: '맛집탐험가김철수', grade: '⭐ 얌슐랭 1스타', avatar: '👨‍🍳' },
      menu: '김치찌개',
      taste_score: 4.5,
      spiciness: 6,
      saltiness: 5,
      content: '진짜 오랜만에 제대로 된 김치찌개 먹었어요. 돼지고기가 듬뿍 들어있고 국물이 깊었습니다.',
      photo: '🍲',
      likes: 42,
      time: '2일 전',
    },
    {
      id: '2',
      user: { nickname: '전통맛집수호자', grade: '🍜 맛집 탐험가', avatar: '🧑‍🍳' },
      menu: '된장찌개',
      taste_score: 4.0,
      spiciness: 2,
      saltiness: 5,
      content: '된장찌개가 정말 구수하고 맛있어요. 두부도 신선하고 채소도 풍성합니다.',
      photo: '🥘',
      likes: 28,
      time: '5일 전',
    },
  ],
}

export default function StoreDetailPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'menu' | 'review' | 'info'>('menu')
  const [saved, setSaved] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* 헤더 이미지 영역 */}
      <div className="bg-orange-100 h-52 flex items-center justify-center relative">
        <span className="text-8xl">🍲</span>

        {/* 뒤로가기 */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md"
        >
          ←
        </button>

        {/* 저장 버튼 */}
        <button
          onClick={() => setSaved(!saved)}
          className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md"
        >
          {saved ? '🗂️' : '📂'}
        </button>
      </div>

      {/* 가게 기본 정보 */}
      <div className="bg-white px-4 py-4 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full">
              {DUMMY_STORE.category}
            </span>
            <h1 className="text-2xl font-bold text-gray-800 mt-1">
              {DUMMY_STORE.name}
            </h1>
          </div>
        </div>

        <div className="flex gap-4 text-sm text-gray-500 mb-4">
          <span>리뷰 {DUMMY_STORE.review_count}개</span>
          <span>저장 {DUMMY_STORE.saved_count}회</span>
        </div>

        {/* 이중 평점 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-orange-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">에디터 평점</p>
            <p className="text-3xl font-bold text-orange-500">
              ⭐ {DUMMY_STORE.editor_score}
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">소비자 평점</p>
            <p className="text-3xl font-bold text-gray-700">
              ⭐ {DUMMY_STORE.user_score}
            </p>
          </div>
        </div>

        {/* 입맛별 평점 */}
        <div className="mb-4">
          <p className="text-sm font-bold text-gray-700 mb-2">
            입맛별 평점
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(DUMMY_STORE.taste_scores).map(([type, score]) => (
              <div
                key={type}
                className="flex justify-between items-center bg-gray-50 rounded-xl px-3 py-2"
              >
                <span className="text-xs text-gray-500">{type}</span>
                <span className="text-sm font-bold text-orange-500">
                  ⭐ {score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 리뷰 작성 버튼 */}
        <button
          onClick={() => router.push('/review/write')}
          className="w-full bg-orange-500 text-white font-bold py-3 rounded-2xl"
        >
          ✏️ 리뷰 작성하기
        </button>
      </div>

      {/* 탭 */}
      <div className="bg-white px-4 py-2 flex gap-1 mb-3 sticky top-0 z-10 shadow-sm">
        {[
          { key: 'menu', label: '🍽️ 메뉴' },
          { key: 'review', label: '📝 리뷰' },
          { key: 'info', label: 'ℹ️ 정보' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex-1 px-4 pb-8 max-w-md mx-auto w-full">

        {/* 메뉴 탭 */}
        {activeTab === 'menu' && (
          <div className="space-y-3">
            {DUMMY_STORE.menus.map(menu => (
              <div
                key={menu.id}
                className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer transition-all ${
                  selectedMenu === menu.id ? 'border-2 border-orange-400' : ''
                }`}
                onClick={() => setSelectedMenu(
                  selectedMenu === menu.id ? null : menu.id
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800">{menu.name}</h3>
                    <p className="text-sm text-gray-500">
                      {menu.price.toLocaleString()}원 · 리뷰 {menu.review_count}개
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-500">
                      ⭐ {menu.avg_taste}
                    </p>
                    <p className="text-xs text-gray-400">맛 기준</p>
                  </div>
                </div>

                {/* 상세 펼치기 */}
                {selectedMenu === menu.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: '맛', score: menu.avg_taste },
                        { label: '양', score: menu.avg_portion },
                        { label: '가성비', score: menu.avg_value },
                      ].map(({ label, score }) => (
                        <div key={label} className="bg-orange-50 rounded-xl p-2 text-center">
                          <p className="text-xs text-gray-500">{label}</p>
                          <p className="font-bold text-orange-500">⭐ {score}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-12">🌶️ 맵기</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-orange-400 h-2 rounded-full"
                            style={{ width: `${menu.avg_spiciness * 10}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-6">
                          {menu.avg_spiciness}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-12">🧂 짠기</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-300 h-2 rounded-full"
                            style={{ width: `${menu.avg_saltiness * 10}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-6">
                          {menu.avg_saltiness}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 리뷰 탭 */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            {DUMMY_STORE.reviews.map(review => (
              <div key={review.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-xl">
                    {review.user.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">
                      {review.user.nickname}
                    </p>
                    <p className="text-xs text-orange-500">{review.user.grade}</p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400">
                    {review.time}
                  </span>
                </div>

                <div className="bg-orange-50 h-32 rounded-xl flex items-center justify-center text-5xl mb-3">
                  {review.photo}
                </div>

                <div className="flex gap-2 mb-2">
                  <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full">
                    {review.menu}
                  </span>
                  <span className="text-xs text-gray-500">
                    ⭐ {review.taste_score}
                  </span>
                  <span className="text-xs text-gray-500">
                    🌶️ {review.spiciness}
                  </span>
                  <span className="text-xs text-gray-500">
                    🧂 {review.saltiness}
                  </span>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  {review.content}
                </p>

                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1">
                    <span className="text-gray-300">♥</span>
                    <span className="text-xs text-gray-500">{review.likes}</span>
                  </button>
                  <button className="flex items-center gap-1">
                    <span className="text-gray-300">💬</span>
                    <span className="text-xs text-gray-500">댓글</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 정보 탭 */}
        {activeTab === 'info' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-700 mb-3">기본 정보</p>
              <div className="space-y-3">
                {[
                  { icon: '📍', label: '주소', value: DUMMY_STORE.address },
                  { icon: '📞', label: '전화', value: DUMMY_STORE.phone },
                  { icon: '🕐', label: '영업시간', value: DUMMY_STORE.business_hours },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex gap-3">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm text-gray-700">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 지도 미니 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-700 mb-3">위치</p>
              <div className="bg-orange-50 h-40 rounded-xl flex items-center justify-center">
                <p className="text-gray-400 text-sm">🗺️ 지도 영역</p>
              </div>
              <button
                onClick={() => router.push('/map')}
                className="w-full mt-3 bg-orange-50 text-orange-500 font-medium py-2 rounded-xl text-sm"
              >
                지도에서 보기 →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
