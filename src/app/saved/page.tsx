'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

/* =========================================================
   타입 정의
   ========================================================= */
interface Store {
  id: string
  name: string
  category: string | null
  address: string | null
  phone: string | null
  average_rating?: number | null
  review_count?: number | null
}

interface SavedStore {
  id: string
  store_id: string
  created_at: string
  store: Store | null
}

/* =========================================================
   SavedPage
   ========================================================= */
export default function SavedPage() {
  const router = useRouter()
  const [savedStores, setSavedStores] = useState<SavedStore[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const categories = [
    '전체',
    ...Array.from(
      new Set(
        savedStores.map(s => s.store?.category).filter(Boolean) as string[]
      )
    ),
  ]

  useEffect(() => {
    loadSavedStores()
  }, [])

  async function loadSavedStores() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: savedData, error: savedError } = await supabase
        .from('saved_stores')
        .select('id, store_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (savedError) {
        console.error('saved_stores 에러:', JSON.stringify(savedError))
        setLoading(false)
        return
      }

      if (!savedData || savedData.length === 0) {
        setSavedStores([])
        setLoading(false)
        return
      }

      const storeIds = savedData.map(s => s.store_id).filter(Boolean)

      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id, name, category, address, phone, average_rating, review_count')
        .in('id', storeIds)

      if (storeError) console.error('stores 에러:', JSON.stringify(storeError))

      const mapped: SavedStore[] = savedData.map(saved => ({
        id: saved.id,
        store_id: saved.store_id,
        created_at: saved.created_at,
        store: (storeData || []).find(s => s.id === saved.store_id) || null,
      }))

      setSavedStores(mapped)
    } catch (err) {
      console.error('오류:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(savedId: string) {
    setDeletingId(savedId)
    const { error } = await supabase
      .from('saved_stores')
      .delete()
      .eq('id', savedId)
    if (!error) {
      setSavedStores(prev => prev.filter(s => s.id !== savedId))
    }
    setDeletingId(null)
  }

  const filtered =
    selectedCategory === '전체'
      ? savedStores
      : savedStores.filter(s => s.store?.category === selectedCategory)

  /* ── 메이슨리 2열 분배 ── */
  const leftCol = filtered.filter((_, i) => i % 2 === 0)
  const rightCol = filtered.filter((_, i) => i % 2 === 1)

  /* ── 네비게이션 ── */
  const navItems: { icon: React.ReactNode; label: string; path: string; active: boolean }[] = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
      label: '홈', path: '/feed', active: false,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      label: '탐색', path: '/map', active: false,
    },
    { icon: null, label: '리뷰', path: '/review/write', active: false },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#111" stroke="#111" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
      label: '저장', path: '/saved', active: true,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      label: '프로필', path: '/profile', active: false,
    },
  ]

  /* =========================================================
     렌더
     ========================================================= */
  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100vh',
        background: '#fff',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      }}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        *::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ══ 헤더 ══ */}
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid #F0F0F0',
          height: 54,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* 로고 — yum2.png 고정, 클릭 시 /feed */}
        <button
          onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          aria-label="YumMap 홈"
        >
          <img src="/yum2.png" alt="YumMap" style={{ height: 28, objectFit: 'contain', display: 'block' }} />
        </button>

        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 16, color: '#111', letterSpacing: '-0.4px' }}>저장한 맛집</p>
        </div>

        {/* 개수 뱃지 */}
        {savedStores.length > 0 && (
          <span
            style={{
              background: '#F3F3F3',
              color: '#666',
              borderRadius: 20,
              padding: '4px 11px',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {savedStores.length}개
          </span>
        )}
      </header>

      {/* ══ 카테고리 필터 ══ */}
      {categories.length > 1 && (
        <div
          style={{
            padding: '10px 14px',
            display: 'flex',
            gap: 7,
            overflowX: 'auto',
            background: '#fff',
            borderBottom: '1px solid #F0F0F0',
            scrollbarWidth: 'none',
          }}
        >
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: selectedCategory === cat ? 'none' : '1.5px solid #E0E0E0',
                background: selectedCategory === cat ? '#111' : '#fff',
                color: selectedCategory === cat ? '#fff' : '#555',
                fontWeight: selectedCategory === cat ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.2px',
                transition: 'all 0.15s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ══ 본문 ══ */}
      <main style={{ paddingBottom: 80, background: '#FAFAFA', minHeight: 'calc(100vh - 54px)' }}>

        {/* 로딩 */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 24px',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: '2.5px solid #F0F0F0',
                borderTop: '2.5px solid #111',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#999' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>🔖</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>
              {selectedCategory === '전체' ? '저장한 맛집이 없어요' : `${selectedCategory} 카테고리가 없어요`}
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 24 }}>
              {selectedCategory === '전체'
                ? '마음에 드는 가게를 저장해보세요!'
                : '다른 카테고리를 선택해보세요'}
            </p>
            {selectedCategory === '전체' ? (
              <button
                onClick={() => router.push('/map')}
                style={{
                  padding: '13px 32px',
                  background: '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 28,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  letterSpacing: '-0.2px',
                }}
              >
                지도에서 찾기
              </button>
            ) : (
              <button
                onClick={() => setSelectedCategory('전체')}
                style={{
                  padding: '13px 32px',
                  background: '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 28,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  letterSpacing: '-0.2px',
                }}
              >
                전체 보기
              </button>
            )}
          </div>
        )}

        {/* ── 메이슨리 2열 그리드 ── */}
        {!loading && filtered.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '14px 12px',
              alignItems: 'flex-start',
            }}
          >
            {/* 왼쪽 열 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {leftCol.map(item => (
                <SavedCard
                  key={item.id}
                  item={item}
                  deleting={deletingId === item.id}
                  onDelete={() => handleDelete(item.id)}
                  onReview={() =>
                    router.push(
                      `/review/write?storeId=${item.store_id}&storeName=${encodeURIComponent(item.store?.name || '')}`
                    )
                  }
                  onMap={() =>
                    router.push('/map')
                  }
                />
              ))}
            </div>
            {/* 오른쪽 열 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {rightCol.map(item => (
                <SavedCard
                  key={item.id}
                  item={item}
                  deleting={deletingId === item.id}
                  onDelete={() => handleDelete(item.id)}
                  onReview={() =>
                    router.push(
                      `/review/write?storeId=${item.store_id}&storeName=${encodeURIComponent(item.store?.name || '')}`
                    )
                  }
                  onMap={() =>
                    router.push('/map')
                  }
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ══ 하단 네비게이션 ══ */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderTop: '1px solid #F0F0F0',
          display: 'flex',
          alignItems: 'center',
          height: 60,
          zIndex: 200,
        }}
      >
        {navItems.map(item => (
          <div
            key={item.path}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            {item.icon === null ? (
              <button
                onClick={() => router.push('/review/write')}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: '#111',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="리뷰 작성"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => router.push(item.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '6px 0',
                  minWidth: 44,
                }}
                aria-label={item.label}
              >
                {item.icon}
                <span
                  style={{
                    fontSize: 10,
                    color: item.active ? '#111' : '#999',
                    fontWeight: item.active ? 700 : 400,
                    letterSpacing: '-0.2px',
                  }}
                >
                  {item.label}
                </span>
              </button>
            )}
          </div>
        ))}
      </nav>
    </div>
  )
}

/* =========================================================
   SavedCard — 핀터레스트 스타일 카드
   ========================================================= */
function SavedCard({
  item,
  deleting,
  onDelete,
  onReview,
  onMap,
}: {
  item: SavedStore
  deleting: boolean
  onDelete: () => void
  onReview: () => void
  onMap: () => void
}) {
  const savedDate = new Date(item.created_at).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        marginBottom: 14,
        display: 'inline-block',
        width: '100%',
        opacity: deleting ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* 가게 없음 플레이스홀더 */}
      <div
        style={{
          width: '100%',
          height: 80,
          background: '#F7F7F7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <span style={{ fontSize: 28 }}>🍽️</span>
        {/* 삭제 버튼 오버레이 */}
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(255,255,255,0.92)',
            border: 'none',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 13,
            color: '#555',
            backdropFilter: 'blur(4px)',
          }}
          aria-label="저장 취소"
        >
          ×
        </button>
        {/* 저장 날짜 */}
        <span
          style={{
            position: 'absolute',
            bottom: 8,
            left: 10,
            fontSize: 10,
            color: '#999',
            background: 'rgba(255,255,255,0.85)',
            padding: '2px 7px',
            borderRadius: 10,
            fontWeight: 500,
          }}
        >
          {savedDate}
        </span>
      </div>

      {/* 본문 */}
      <div style={{ padding: '12px 13px 13px' }}>
        {/* 가게명 */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: '#111',
            letterSpacing: '-0.3px',
            lineHeight: 1.3,
            marginBottom: 4,
          }}
        >
          {item.store?.name || '알 수 없는 가게'}
        </p>

        {/* 카테고리 칩 */}
        {item.store?.category && (
          <span
            style={{
              display: 'inline-block',
              fontSize: 10,
              color: '#666',
              background: '#F3F3F3',
              padding: '3px 8px',
              borderRadius: 20,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            {item.store.category}
          </span>
        )}

        {/* 주소 */}
        {item.store?.address && (
          <p
            style={{
              fontSize: 11,
              color: '#999',
              marginBottom: 8,
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.store.address}
          </p>
        )}

        {/* 평점 / 리뷰 수 칩 */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {item.store?.average_rating != null && (
            <span
              style={{
                background: '#F3F3F3',
                color: '#111',
                borderRadius: 20,
                padding: '3px 9px',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {'★'.repeat(Math.round(item.store.average_rating))}{' '}
              {item.store.average_rating}
            </span>
          )}
          {item.store?.review_count != null && item.store.review_count > 0 && (
            <span
              style={{
                background: '#F3F3F3',
                color: '#666',
                borderRadius: 20,
                padding: '3px 9px',
                fontSize: 11,
              }}
            >
              리뷰 {item.store.review_count}
            </span>
          )}
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onReview}
            style={{
              flex: 1,
              padding: '9px 0',
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              letterSpacing: '-0.2px',
            }}
          >
            리뷰 쓰기
          </button>
          <button
            onClick={onMap}
            style={{
              flex: 1,
              padding: '9px 0',
              background: '#fff',
              color: '#111',
              border: '1.5px solid #E0E0E0',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              letterSpacing: '-0.2px',
            }}
          >
            지도 보기
          </button>
        </div>
      </div>
    </div>
  )
}
