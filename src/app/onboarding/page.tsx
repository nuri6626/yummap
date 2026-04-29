'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CUISINE_LIST = [
  { id: 'korean', label: '🍚 한식', },
  { id: 'chinese', label: '🥟 중식', },
  { id: 'japanese', label: '🍱 일식', },
  { id: 'western', label: '🍝 양식', },
  { id: 'snack', label: '🍢 분식', },
  { id: 'seafood', label: '🦞 해산물', },
  { id: 'meat', label: '🥩 고기', },
  { id: 'cafe', label: '☕ 카페', },
  { id: 'dessert', label: '🍰 디저트', },
  { id: 'fastfood', label: '🍔 패스트푸드', },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [spiceLevel, setSpiceLevel] = useState(5)
  const [pickiness, setPickiness] = useState(5)
  const [stylePref, setStylePref] = useState(5)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])
  const [nickname, setNickname] = useState('')

  const toggleCuisine = (id: string) => {
    setSelectedCuisines(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : [...prev, id]
    )
  }

  const handleComplete = () => {
    // 나중에 Supabase 저장 연결
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">

      {/* 헤더 */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm">
        <h1 className="text-xl font-bold text-orange-500">🍜 얌맵</h1>
        <span className="text-gray-400 text-sm">입맛 프로필 설정</span>
      </div>

      {/* 진행 바 */}
      <div className="bg-white px-4 pb-3">
        <div className="flex gap-1 mt-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? 'bg-orange-400' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">{step} / 3 단계</p>
      </div>

      <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full">

        {/* Step 1 — 닉네임 */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              반갑습니다! 👋
            </h2>
            <p className="text-gray-500 mb-8">
              얌맵에서 사용할 닉네임을 입력해주세요
            </p>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="예: 맛집탐험가"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-orange-400"
                maxLength={20}
              />
              <p className="text-xs text-gray-400 mt-2">
                {nickname.length}/20
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={nickname.length < 2}
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white font-bold py-4 rounded-2xl transition-all"
            >
              다음
            </button>
          </div>
        )}

        {/* Step 2 — 입맛 설정 */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              내 입맛을 알려주세요 🌶️
            </h2>
            <p className="text-gray-500 mb-6">
              슬라이더로 내 입맛을 설정하면<br />
              딱 맞는 맛집을 추천해드려요
            </p>

            <div className="space-y-6">

              {/* 자극도 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-800">자극도</span>
                  <span className="text-orange-500 font-bold">{spiceLevel}/10</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>😌 순한맛</span>
                  <span>🔥 강한맛</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={spiceLevel}
                  onChange={e => setSpiceLevel(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              {/* 기준 엄격도 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-800">입맛 기준</span>
                  <span className="text-orange-500 font-bold">{pickiness}/10</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>😊 관대한 입</span>
                  <span>🧐 까다로운 입</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={pickiness}
                  onChange={e => setPickiness(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              {/* 스타일 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-800">음식 스타일</span>
                  <span className="text-orange-500 font-bold">{stylePref}/10</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>🏠 전통/담백</span>
                  <span>✨ 트렌디/퓨전</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={stylePref}
                  onChange={e => setStylePref(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl"
              >
                이전
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — 선호 음식 */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              좋아하는 음식은? 🍽️
            </h2>
            <p className="text-gray-500 mb-6">
              선호하는 음식 종류를 선택해주세요<br />
              <span className="text-orange-400 font-medium">여러 개 선택 가능해요</span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              {CUISINE_LIST.map(cuisine => (
                <button
                  key={cuisine.id}
                  onClick={() => toggleCuisine(cuisine.id)}
                  className={`py-4 rounded-2xl font-medium text-sm transition-all ${
                    selectedCuisines.includes(cuisine.id)
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-white text-gray-700 shadow-sm'
                  }`}
                >
                  {cuisine.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl"
              >
                이전
              </button>
              <button
                onClick={handleComplete}
                disabled={selectedCuisines.length === 0}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white font-bold py-4 rounded-2xl transition-all"
              >
                완료 🎉
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
