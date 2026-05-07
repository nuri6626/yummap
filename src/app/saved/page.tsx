'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── 타입 정의 ─────────────────────────────────────────────────────────────
interface StoreInfo {
  id: string
  name: string
  category: string | null
  address: string | null
  phone: string | null
  latitude: number | null
  longitude: number | null
  review_count: number | null
  average_rating: number | null
  kakao_id: string | null
}

interface SavedStore {
  id: string
  store_id: string
  created_at: string
  stores: StoreInfo | null
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────
export default function SavedPage() {
  const router = useRouter()
  const supabase = createClient()

  const [savedStores, setSavedStores] = useState<SavedStore[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('전체')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    loadSavedStores()
  }, [])

  async function loadSavedStores() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('saved_stores')
        .select(`
          id, store_id, created_at,
          stores(id, name, category, address, phone, latitude, longitude, review_count, average_rating, kakao_id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // stores 배열 → 단일 객체 변환
      const mapped: SavedStore[] = (data ?? []).map((item: any) => ({
        ...item,
        stores: Array.isArray(item.stores) ? (item.stores[0] ?? null) : (item.stores ?? null),
      }))

      setSavedStores(mapped)

      // 카테고리 목록 추출
      const cats = Array.from(
        new Set(mapped.map(s => s.stores?.category).filter((c): c is string => !!c))
      )
      setCategories(cats)
    } catch (err) {
      console.error('저장 목록 로드 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(savedId: string) {
    const { error } = await supabase.from('saved_stores').delete().eq('id', savedId)
    if (!error) {
      const updated = savedStores.filter(s => s.id !== savedId)
      setSavedStores(updated)
      const cats = Array.from(
        new Set(updated.map(s => s.stores?.category).filter((c): c is string => !!c))
      )
      setCategories(cats)
      if (!cats.includes(filter)) setFilter('전체')
    }
  }

  function handleWriteReview(store: StoreInfo) {
    const params = new URLSearchParams({
      store_id: store.id,
      store_name: store.name,
      store_address: store.address ?? '',
      store_category: store.category ?? '',
    })
    router.push(`/review/write?${params.toString()}`)
  }

  function handleViewMap(store: StoreInfo) {
    const params = new URLSearchParams({
      lat: String(store.latitude ?? 37.5665),
      lng: String(store.longitude ?? 126.9780),
      name: store.name,
    })
    router.push(`/map?${params.toString()}`)
  }

  const filtered = filter === '전체'
    ? savedStores
    : savedStores.filter(s => s.stores?.category === filter)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔖</div>
          <p style={{ color: '#888' }}>저장 목록 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', background: '#fff', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '20px', fontWeight: 700 }}>🍜 맛지도</span>
        <span style={{ fontSize: '14px', color: '#888' }}>
          저장 {savedStores.length}개
        </span>
      </div>

      {/* 카테고리 필터 */}
      {categories.length > 0 && (
        <div style={{
          position: 'sticky', top: '57px', zIndex: 99,
          background: '#fff', borderBottom: '1px solid #f0f0f0',
          overflowX: 'auto', display: 'flex', gap: '8px',
          padding: '10px 16px', scrollbarWidth: 'none',
        }}>
          {['전체', ...categories].map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              whiteSpace: 'nowrap', padding: '6px 14px',
              borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
              border: filter === cat ? '2px solid #FF5A3D' : '1px solid #ddd',
              background: filter === cat ? '#FFF3F1' : '#fff',
              color: filter === cat ? '#FF5A3D' : '#666',
              fontWeight: filter === cat ? 700 : 400,
              flexShrink: 0,
            }}>{cat}</button>
          ))}
        </div>
      )}

      {/* 목록 */}
      <div style={{ padding: '16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔖</div>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>
              {filter === '전체' ? '저장된 맛집이 없어요' : `${filter} 카테고리의 저장 맛집이 없어요`}
            </p>
            <p style={{ fontSize: '13px', color: '#ccc' }}>지도에서 맛집을 찾아 저장해보세요!</p>
            <button onClick={() => router.push('/map')} style={{
              marginTop: '16px', background: '#FF5A3D', color: '#fff',
              border: 'none', borderRadius: '20px', padding: '10px 24px',
              fontSize: '14px', cursor: 'pointer',
            }}>지도에서 찾기</button>
          </div>
        ) : (
          filtered.map(item => {
            const store = item.stores
            return (
              <div key={item.id} style={{
                background: '#fff', borderRadius: '16px', marginBottom: '12px',
                border: '1px solid #f0f0f0', padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                position: 'relative',
              }}>
                {/* 삭제 버튼 */}
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{
                    position: 'absolute', top: '14px', right: '14px',
                    background: 'none', border: 'none',
                    fontSize: '20px', cursor: 'pointer', color: '#FF5A3D',
                  }}
                  title="저장 취소"
                >🔖</button>

                {/* 카테고리 배지 */}
                {store?.category && (
                  <span style={{
                    display: 'inline-block', marginBottom: '6px',
                    background: '#FFF3F1', color: '#FF5A3D',
                    padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                  }}>{store.category}</span>
                )}

                {/* 가게 이름 */}
                <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px', paddingRight: '36px' }}>
                  {store?.name ?? '알 수 없는 가게'}
                </div>

                {/* 주소 */}
                {store?.address && (
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>
                    📍 {store.address}
                  </p>
                )}

                {/* 전화번호 */}
                {store?.phone && (
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                    📞 {store.phone}
                  </p>
                )}

                {/* 평점 / 리뷰 수 */}
                {(store?.average_rating != null || store?.review_count != null) && (
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    {store?.average_rating != null && (
                      <span style={{ fontSize: '13px', color: '#FF5A3D', fontWeight: 600 }}>
                        ⭐ {store.average_rating.toFixed(1)}
                      </span>
                    )}
                    {store?.review_count != null && (
                      <span style={{ fontSize: '13px', color: '#aaa' }}>
                        리뷰 {store.review_count}개
                      </span>
                    )}
                  </div>
                )}

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => store && handleWriteReview(store)}
                    style={{
                      flex: 1, padding: '10px',
                      background: 'linear-gradient(135deg, #FF5A3D, #FF8C69)',
                      color: '#fff', border: 'none',
                      borderRadius: '10px', fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >✍️ 리뷰 작성</button>
                  <button
                    onClick={() => store && handleViewMap(store)}
                    style={{
                      flex: 1, padding: '10px',
                      background: 'linear-gradient(135deg, #4A90E2, #7BB8F0)',
                      color: '#fff', border: 'none',
                      borderRadius: '10px', fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >🗺️ 지도 보기</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 하단 내비게이션 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: '#fff', borderTop: '1px solid #f0f0f0',
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
        zIndex: 200,
      }}>
        {[
          { icon: '🗺️', label: '지도', path: '/map' },
          { icon: '🍜', label: 'MOTD', path: '/feed' },
          { icon: '✍️', label: '리뷰', path: '/review/write' },
          { icon: '🔖', label: '저장', path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile' },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            color: item.path === '/saved' ? '#FF5A3D' : '#888',
          }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', marginTop: '2px' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
