'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MENU_EXAMPLES = ['김치찌개', '제육볶음', '된장찌개', '비빔밥', '삼겹살']

export default function ReviewWritePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // 가게 정보
  const [storeName, setStoreName] = useState('')

  // 메뉴 정보
  const [menuName, setMenuName] = useState('')
  const [tasteScore, setTasteScore] = useState(0)
  const [portionScore, setPortionScore] = useState(0)
  const [valueScore, setValueScore] = useState(0)
  const [spiciness, setSpiciness] = useState(5)
  const [saltiness, setSaltiness] = useState(5)

  // 리뷰 내용
  const [content, setContent] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const urls = Array.from(files).map(file => URL.createObjectURL(file))
    setPhotos(prev => [...prev, ...urls])
  }

  const handleSubmit = () => {
    // 나중에 Supabase 저장 연결
    alert('리뷰가 등록되었습니다! 🎉')
    router.push('/map')
  }

  // 별점 컴포넌트
  const StarRating = ({
    value,
    onChange,
    label
  }: {
    value: number
    onChange: (v: number) => void
    label: string
  }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={`text-2xl transition-all ${
              star <= value ? 'text-yellow-400' : 'text-gray-200'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* 헤더 */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.back()}
          className="text-gray-500 text-xl"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-gray-800">리뷰 작성</h1>
        <div className="flex-1" />
        <span className="text-sm text-gray-400">{step}/3</span>
      </div>

      {/* 진행 바 */}
      <div className="bg-white px-4 pb-3">
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? 'bg-orange-400' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-md mx-auto w-full">

        {/* Step 1 — 가게 선택 */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              어느 맛집에 다녀오셨나요? 📍
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              방문한 가게를 검색해주세요
            </p>

            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                가게 이름
              </label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="가게 이름을 입력하세요"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-orange-400"
              />
            </div>

            {/* 최근 방문 더미 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-700 mb-3">
                최근 방문 맛집
              </p>
              {['진짜 맛있는 김치찌개', '숨은 맛집 라멘', '할머니 손맛 국밥'].map(name => (
                <button
                  key={name}
                  onClick={() => setStoreName(name)}
                  className={`w-full text-left px-4 py-3 rounded-xl mb-2 text-sm transition-all ${
                    storeName === name
                      ? 'bg-orange-50 text-orange-500 font-medium'
                      : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  📍 {name}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={storeName.length < 1}
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white font-bold py-4 rounded-2xl transition-all"
            >
              다음
            </button>
          </div>
        )}

        {/* Step 2 — 메뉴 평가 */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              메뉴를 평가해주세요 🍽️
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {storeName}에서 드신 메뉴는요?
            </p>

            {/* 메뉴 입력 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                드신 메뉴
              </label>
              <input
                type="text"
                value={menuName}
                onChange={e => setMenuName(e.target.value)}
                placeholder="메뉴 이름을 입력하세요"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-orange-400 mb-3"
              />
              {/* 메뉴 예시 */}
              <div className="flex flex-wrap gap-2">
                {MENU_EXAMPLES.map(menu => (
                  <button
                    key={menu}
                    onClick={() => setMenuName(menu)}
                    className={`px-3 py-1 rounded-full text-xs transition-all ${
                      menuName === menu
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {menu}
                  </button>
                ))}
              </div>
            </div>

            {/* 별점 평가 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <p className="text-sm font-bold text-gray-700 mb-4">별점 평가</p>
              <div className="space-y-4">
                <StarRating value={tasteScore} onChange={setTasteScore} label="🍴 맛" />
                <StarRating value={portionScore} onChange={setPortionScore} label="🍱 양" />
                <StarRating value={valueScore} onChange={setValueScore} label="💰 가성비" />
              </div>
            </div>

            {/* 맵기/짠기 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <p className="text-sm font-bold text-gray-700 mb-4">실제 맵기 & 짠기</p>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">🌶️ 맵기</span>
                  <span className="text-orange-500 font-bold">{spiciness}/10</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>안매움</span>
                  <span>매우 매움</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={spiciness}
                  onChange={e => setSpiciness(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">🧂 짠기</span>
                  <span className="text-orange-500 font-bold">{saltiness}/10</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>안짬</span>
                  <span>매우 짬</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={saltiness}
                  onChange={e => setSaltiness(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl"
              >
                이전
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={menuName.length < 1 || tasteScore === 0}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white font-bold py-4 rounded-2xl transition-all"
              >
                다음
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — 리뷰 작성 */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              솔직한 리뷰를 남겨주세요 ✍️
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              다른 얌마들에게 도움이 될 거예요
            </p>

            {/* 사진 업로드 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <p className="text-sm font-bold text-gray-700 mb-3">
                📸 사진 추가
              </p>
              <div className="flex gap-3 overflow-x-auto">
                <label className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-orange-300 transition-all">
                  <span className="text-2xl text-gray-300">+</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
                {photos.map((photo, idx) => (
                  <div key={idx} className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden">
                    <img
                      src={photo}
                      alt={`photo-${idx}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 리뷰 텍스트 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <p className="text-sm font-bold text-gray-700 mb-3">
                💬 리뷰 작성
              </p>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="맛은 어땠나요? 분위기, 서비스 등 솔직하게 남겨주세요 😊"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-orange-400 resize-none"
                rows={5}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {content.length}/500
              </p>
            </div>

            {/* 리뷰 요약 */}
            <div className="bg-orange-50 rounded-2xl p-4 mb-6">
              <p className="text-sm font-bold text-orange-600 mb-2">📋 리뷰 요약</p>
              <p className="text-sm text-gray-700">📍 {storeName}</p>
              <p className="text-sm text-gray-700">🍽️ {menuName}</p>
              <p className="text-sm text-gray-700">
                ⭐ 맛 {tasteScore} / 양 {portionScore} / 가성비 {valueScore}
              </p>
              <p className="text-sm text-gray-700">
                🌶️ 맵기 {spiciness}/10 · 🧂 짠기 {saltiness}/10
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl"
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={content.length < 10}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 text-white font-bold py-4 rounded-2xl transition-all"
              >
                등록 🎉
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
