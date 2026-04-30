'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CUISINES = [
  '한식', '중식', '일식', '양식', '분식',
  '해산물', '고기', '카페', '디저트', '패스트푸드'
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [nickname, setNickname] = useState('')
  const [spiceLevel, setSpiceLevel] = useState(5)
  const [pickiness, setPickiness] = useState(5)
  const [stylePref, setStylePref] = useState(5)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    )
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('user_taste_profile')
        .upsert({
          user_id: user.id,
          nickname: nickname,
          spice_level: spiceLevel,
          pickiness: pickiness,
          style_pref: stylePref,
          preferred_cuisines: selectedCuisines,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('저장 오류:', error)
        alert('저장 중 오류가 발생했습니다. 다시 시도해주세요.')
        setLoading(false)
        return
      }

      router.push('/map')
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-4">
      {/* 진행 바 */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step >= i ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-400'}`}
            >
              {i}
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-amber-400 h-2 rounded-full transition-all"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">

        {/* STEP 1: 닉네임 */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">닉네임을 입력해주세요</h2>
            <p className="text-gray-500 mb-6">얌맵에서 사용할 이름이에요</p>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="닉네임 입력 (2~20자)"
              maxLength={20}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-amber-400 focus:outline-none"
            />
            <p className="text-right text-sm text-gray-400 mt-1">{nickname.length}/20</p>
            <button
              onClick={() => setStep(2)}
              disabled={nickname.length < 2}
              className="w-full mt-6 bg-amber-400 text-white py-3 rounded-xl font-bold text-lg disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}

        {/* STEP 2: 입맛 슬라이더 */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">내 입맛을 알려주세요</h2>
            <p className="text-gray-500 mb-6">맞춤 맛집 추천에 활용됩니다</p>

            {[
              { label: '🌶️ 자극도', value: spiceLevel, setter: setSpiceLevel, left: '순한맛', right: '매운맛' },
              { label: '🧐 입맛 기준', value: pickiness, setter: setPickiness, left: '아무거나', right: '까다로운' },
              { label: '🍽️ 음식 스타일', value: stylePref, setter: setStylePref, left: '전통적', right: '트렌디' },
            ].map(({ label, value, setter, left, right }) => (
              <div key={label} className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-gray-700">{label}</span>
                  <span className="font-bold text-amber-500">{value}/10</span>
                </div>
                <input
                  type="range" min={0} max={10} value={value}
                  onChange={e => setter(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{left}</span>
                  <span>{right}</span>
                </div>
              </div>
            ))}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(1)} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold">이전</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-amber-400 text-white py-3 rounded-xl font-bold">다음</button>
            </div>
          </div>
        )}

        {/* STEP 3: 음식 선택 */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">좋아하는 음식을 선택해주세요</h2>
            <p className="text-gray-500 mb-6">여러 개 선택 가능해요</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {CUISINES.map(cuisine => (
                <button
                  key={cuisine}
                  onClick={() => toggleCuisine(cuisine)}
                  className={`py-3 rounded-xl font-semibold border-2 transition-all
                    ${selectedCuisines.includes(cuisine)
                      ? 'bg-amber-400 border-amber-400 text-white'
                      : 'bg-white border-gray-200 text-gray-700'}`}
                >
                  {cuisine}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold">이전</button>
              <button
                onClick={handleComplete}
                disabled={selectedCuisines.length === 0 || loading}
                className="flex-1 bg-amber-400 text-white py-3 rounded-xl font-bold disabled:opacity-40"
              >
                {loading ? '저장 중...' : '완료!'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
