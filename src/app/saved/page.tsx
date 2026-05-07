'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SavedStore {
  id: string
  store_id: string
  created_at: string
  stores: {
    id: string
    name: string
    category: string | null
    address: string | null
    latitude: number | null
    longitude: number | null
    phone: string | null
    review_count: number | null
    average_rating: number | null
    kakao_id: string | null
  } | null
}

export default function SavedPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [savedStores, setSavedStores] = useState<SavedStore[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<string>('전체')
  const [categories,  setCategories]  = useState<string[]>([])

  useEffect(() => {
    const fetchSaved = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('saved_stores')
        .select(`
          id,
          store_id,
          created_at,
          stores (
            id, name, category, address,
            latitude, longitude, phone,
            review_count, average_rating, kakao_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('저장 목록 오류:', error)
        setLoading(false)
        return
      }

      const list = (data || []) as SavedStore[]
      setSavedStores(list)

      const cats = Array.from(
        new Set(list.map(s => s.stores?.category).filter(Boolean) as string[])
      )
      setCategories(cats)
      setLoading(false)
    }
    fetchSaved()
  }, [])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('saved_stores').delete().eq('id', id)
    if (error) { alert('삭제 오류: ' + error.message); return }
    setSavedStores(prev => prev.filter(s => s.id !== id))
  }

  const handleWriteReview = (item: SavedStore) => {
    if (!item.stores) return
    const params = new URLSearchParams({
      store_id:       item.store_id,
      store_name:     item.stores.name,
      store_address:  item.stores.address  ?? '',
      store_category: item.stores.category ?? '',
      store_lat:      String(item.stores.latitude  ?? ''),
      store_lng:      String(item.stores.longitude ?? ''),
      store_phone:    item.stores.phone    ?? '',
    })
    router.push(`/review/write?${params.toString()}`)
  }

  const handleViewMap = (item: SavedStore) => {
    if (!item.stores) return
    router.push(
      `/map?lat=${item.stores.latitude}&lng=${item.stores.longitude}&name=${encodeURIComponent(item.stores.name)}`
    )
  }

  const filtered = filter === '전체'
    ? savedStores
    : savedStores.filter(s => s.stores?.category === filter)

  if (loading) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: '#f5f5f5', flexDirection: 'column', gap: '12px'
    }}>
      <div style={{ fontSize: '40px' }}>🔖</div>
      <p style={{ color: '#999', fontSize: '14px' }}>저장 목록 불러오는 중...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', paddingBottom: '80px' }}>

      {/* ── 헤더 ── */}
      <div style={{
        background: 'white', padding: '16px 20px',
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1
          onClick={() => router.push('/map')}
          style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#FF5A3D', cursor: 'pointer' }}
        >🍜 맛지도</h1>
        <span style={{ fontSize: '11px', color: '#bbb' }}>{filtered.length}개 저장</span>
      </div>

      {/* ── 카테고리 필터 탭 ── */}
      {categories.length > 0 && (
        <div style={{
          background: 'white', borderBottom: '1px solid #f0f0f0',
          display: 'flex', overflowX: 'auto', padding: '0 16px',
          position: 'sticky', top: '57px', zIndex: 99,
          scrollbarWidth: 'none',
        }}>
          {['전체', ...categories].map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              flexShrink: 0, padding: '12px 14px', border: 'none', background: 'none',
              fontSize: '13px', fontWeight: filter === cat ? '700' : '400',
              color: filter === cat ? '#FF5A3D' : '#aaa',
              borderBottom: filter === cat ? '2px solid #FF5A3D' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap'
            }}>{cat}</button>
          ))}
        </div>
      )}

      <div style={{ padding: '12px 16px' }}>

        {/* ── 빈 상태 ── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔖</div>
            <p style={{ fontSize: '18px', fontWeight: '800', color: '#333', marginBottom: '8px' }}>
              {filter === '전체' ? '저장한 맛집이 없어요' : `${filter} 카테고리 저장 없음`}
            </p>
            <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>
              지도에서 마음에 드는 맛집을 저장해보세요!
            </p>
            <button onClick={() => router.push('/map')} style={{
              background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)', color: 'white',
              border: 'none', borderRadius: '16px', padding: '14px 28px',
              fontSize: '15px', fontWeight: '700', cursor: 'pointer'
            }}>🗺️ 지도로 가기</button>
          </div>

        ) : (

          /* ── 저장 목록 ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(item => {
              const store = item.stores
              if (!store) return null

              return (
                <div key={item.id} style={{
                  background: 'white', borderRadius: '20px', padding: '16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1 }}>

                    {store.category && (
                      <span style={{
                        background: '#fff3f0', color: '#FF5A3D',
                        borderRadius: '10px', padding: '3px 10px',
                        fontSize: '11px', fontWeight: '700',
                        display: 'inline-block', marginBottom: '8px'
                      }}>{store.category}</span>
                    )}

                    <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#333' }}>
                      {store.name}
                    </h3>

                    {store.address && (
                      <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#aaa' }}>
                        📍 {store.address}
                      </p>
                    )}

                    {store.phone && (
                      <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#aaa' }}>
                        📞 {store.phone}
                      </p>
                    )}

                    {(store.average_rating || store.review_count) && (
                      <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#FF5A3D', fontWeight: '700' }}>
                        {store.average_rating ? `⭐ ${store.average_rating.toFixed(1)}` : ''}
                        {store.review_count   ? ` · 리뷰 ${store.review_count}개` : ''}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleWriteReview(item)} style={{
                        background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)', color: 'white',
                        border: 'none', borderRadius: '10px', padding: '8px 14px',
                        fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                      }}>✍️ 리뷰 작성</button>
                      <button onClick={() => handleViewMap(item)} style={{
                        background: '#f5f5f5', color: '#666', border: 'none',
                        borderRadius: '10px', padding: '8px 14px',
                        fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                      }}>🗺️ 지도 보기</button>
                    </div>
                  </div>

                  <button onClick={() => handleDelete(item.id)} style={{
                    background: 'none', border: 'none', fontSize: '22px',
                    cursor: 'pointer', marginLeft: '10px', flexShrink: 0, padding: '4px'
                  }} title="저장 해제">🔖</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 하단 네비게이션 ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid #f0f0f0',
        display: 'flex',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
        zIndex: 100
      }}>
        {[
          { icon: '🗺️', label: '지도',   path: '/map' },
          { icon: '🍜', label: 'MOTD',   path: '/feed' },
          { icon: '✍️', label: '리뷰',   path: '/review/write' },
          { icon: '🔖', label: '저장',   path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile' },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)} style={{
            flex: 1, border: 'none', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            cursor: 'pointer', padding: '4px 0'
          }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', color: item.path === '/saved' ? '#FF5A3D' : '#999' }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}
