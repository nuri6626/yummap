'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DUMMY_REVIEWS = [
  { id: '1', store: '진짜 맛있는 김치찌개', menu: '김치찌개', score: 4.5, content: '국물이 깊고 진해서 정말 맛있었어요!', photo: '🍲', time: '2일 전' },
  { id: '2', store: '숨은 맛집 라멘', menu: '돈코츠 라멘', score: 4.8, content: '국물이 진짜 진하고 면도 탱탱해요', photo: '🍜', time: '5일 전' },
  { id: '3', store: '할머니 손맛 국밥', menu: '순대국밥', score: 4.6, content: '40년 전통의 손맛, 가성비 최고!', photo: '🥣', time: '1주 전' },
]

const DUMMY_SAVED = [
  { id: '1', name: '진짜 맛있는 김치찌개', category: '한식', score: 4.5 },
  { id: '2', name: '숨은 맛집 라멘', category: '일식', score: 4.8 },
  { id: '3', name: '할머니 손맛 국밥', category: '한식', score: 4.6 },
  { id: '4', name: '트렌디 브런치 카페', category: '카페', score: 4.3 },
]

interface TasteProfile {
  nickname: string
  spice_level: number
  pickiness: number
  style_pref: number
  preferred_cuisines: string[]
  reviewer_grade: string
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'reviews' | 'saved' | 'collections'>('reviews')
  const [profile, setProfile] = useState<TasteProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('user_taste_profile')
        .select('nickname, spice_level, pickiness, style_pref, preferred_cuisines, reviewer_grade')
        .eq('user_id', user.id)
        .single()

      if (data) setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const GRADE_INFO = { grade: '🍜 맛집 탐험가', currentScore: 245, nextScore: 600, progress: 40 }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-orange-400 font-bold">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* 헤더 */}
      <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-orange-500">🍜 얌맵</h1>
        <button className="text-gray-400 text-xl">⚙️</button>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-white px-4 py-6 mb-3">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-4xl">
            👨‍🍳
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">
              {profile?.nickname || '닉네임 없음'}
            </h2>
            <p className="text-orange-500 font-medium text-sm mt-0.5">
              {GRADE_INFO.grade}
            </p>
            <div className="flex gap-4 mt-2">
              <div className="text-center">
                <p className="font-bold text-gray-800">32</p>
                <p className="text-xs text-gray-400">리뷰</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800">128</p>
                <p className="text-xs text-gray-400">팔로워</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800">64</p>
                <p className="text-xs text-gray-400">팔로잉</p>
              </div>
            </div>
          </div>
        </div>

        {/* 입맛 프로필 */}
        <div className="bg-orange-50 rounded-2xl p-4 mb-4">
          <p className="text-sm font-bold text-orange-600 mb-3">🌶️ 내 입맛 프로필</p>
          <div className="space-y-2">
            {[
              { label: '자극도', value: profile?.spice_level ?? 5, left: '순한맛', right: '강한맛' },
              { label: '입맛 기준', value: profile?.pickiness ?? 5, left: '관대한 입', right: '까다로운 입' },
              { label: '음식 스타일', value: profile?.style_pref ?? 5, left: '전통/담백', right: '트렌디/퓨전' },
            ].map(({ label, value, left, right }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{label}</span>
                  <span className="text-orange-500 font-bold">{value}/10</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{left}</span>
                  <span>{right}</span>
                </div>
                <div className="bg-white rounded-full h-2">
                  <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${value * 10}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* 선호 음식 태그 */}
          {profile?.preferred_cuisines && profile.preferred_cuisines.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-orange-600 font-bold mb-2">🍽️ 선호 음식</p>
              <div className="flex flex-wrap gap-1">
                {profile.preferred_cuisines.map((cuisine: string) => (
                  <span key={cuisine} className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                    {cuisine}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/onboarding')}
            className="w-full mt-3 text-xs text-orange-500 font-medium"
          >
            입맛 프로필 수정 →
          </button>
        </div>

        {/* 맛슐랭 등급 */}
        <div className="bg-white border border-orange-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800">{GRADE_INFO.grade}</p>
              <p className="text-xs text-gray-400">다음 등급까지 {GRADE_INFO.nextScore - GRADE_INFO.currentScore}점</p>
            </div>
            <div className="text-3xl">🍱</div>
          </div>
          <div className="bg-gray-100 rounded-full h-3 mb-2">
            <div className="bg-orange-400 h-3 rounded-full transition-all" style={{ width: `${GRADE_INFO.progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{GRADE_INFO.currentScore}점</span>
            <span>{GRADE_INFO.nextScore}점</span>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {['🌶️ 매운맛 마스터', '🔍 신상 헌터', '🏘️ 지역 토박이'].map(badge => (
              <span key={badge} className="text-xs bg-orange-50 text-orange-500 px-2 py-1 rounded-full">{badge}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-white px-4 py-2 flex gap-1 mb-3 sticky top-0 z-10 shadow-sm">
        {[
          { key: 'reviews', label: '📝 리뷰' },
          { key: 'saved', label: '🗂️ 저장' },
          { key: 'collections', label: '📚 컬렉션' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex-1 px-4 pb-20 max-w-md mx-auto w-full">
        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {DUMMY_REVIEWS.map(review => (
              <div key={review.id} className="bg-white rounded-2xl p-4 shadow-sm flex gap-3">
                <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                  {review.photo}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-gray-800 text-sm">{review.store}</p>
                    <span className="text-xs text-gray-400">{review.time}</span>
                  </div>
                  <p className="text-xs text-orange-500 mb-1">🍽️ {review.menu} · ⭐ {review.score}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{review.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">총 {DUMMY_SAVED.length}개 저장됨</p>
              <button className="text-sm text-orange-500 font-medium">지도로 보기 🗺️</button>
            </div>
            {DUMMY_SAVED.map(store => (
              <div key={store.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">{store.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full">{store.category}</span>
                    <span className="text-xs text-gray-500">⭐ {store.score}</span>
                  </div>
                </div>
                <button className="text-orange-500 text-xl">🗂️</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'collections' && (
          <div className="space-y-3">
            <button className="w-full bg-orange-500 text-white font-bold py-3 rounded-2xl mb-2">
              + 새 컬렉션 만들기
            </button>
            {[
              { id: '1', title: '강남 점심 가성비 맛집', count: 12, likes: 45, emoji: '🍱' },
              { id: '2', title: '혼밥 가능한 라멘 맛집', count: 8, likes: 32, emoji: '🍜' },
              { id: '3', title: '데이트 코스 레스토랑', count: 6, likes: 78, emoji: '🥂' },
            ].map(collection => (
              <div key={collection.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-3xl">
                  {collection.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{collection.title}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-gray-400">📍 {collection.count}곳</span>
                    <span className="text-xs text-gray-400">♥ {collection.likes}</span>
                  </div>
                </div>
                <button className="text-gray-300">›</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div className="bg-white border-t border-gray-100 px-4 py-2 flex justify-around fixed bottom-0 w-full">
        <button onClick={() => router.push('/map')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">🗺️</span><span className="text-xs">지도</span>
        </button>
        <button onClick={() => router.push('/feed')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">📰</span><span className="text-xs">피드</span>
        </button>
        <button onClick={() => router.push('/review/write')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">✏️</span><span className="text-xs">리뷰</span>
        </button>
        <button onClick={() => router.push('/saved')} className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">🗂️</span><span className="text-xs">저장</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-orange-500">
          <span className="text-2xl">👤</span><span className="text-xs font-medium">프로필</span>
        </button>
      </div>
    </div>
  )
}
