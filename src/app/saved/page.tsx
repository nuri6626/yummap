'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

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

export default function SavedPage() {
  const router = useRouter()
  const [savedStores, setSavedStores] = useState<SavedStore[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')

  const categories = ['전체', ...Array.from(new Set(savedStores.map(s => s.store?.category).filter(Boolean) as string[]))]

  useEffect(() => {
    loadSavedStores()
  }, [])

  async function loadSavedStores() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // ── Step 1: saved_stores만 조회 (JOIN 없이) ──
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

      // ── Step 2: store_id로 stores 따로 조회 ──
      const storeIds = savedData.map(s => s.store_id).filter(Boolean)

      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id, name, category, address, phone, average_rating, review_count')
        .in('id', storeIds)

      if (storeError) {
        console.error('stores 에러:', JSON.stringify(storeError))
      }

      // ── Step 3: 합치기 ──
      const mapped: SavedStore[] = savedData.map(saved => {
        const store = (storeData || []).find(s => s.id === saved.store_id) || null
        return {
          id: saved.id,
          store_id: saved.store_id,
          created_at: saved.created_at,
          store,
        }
      })

      setSavedStores(mapped)
    } catch (err) {
      console.error('오류:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(savedId: string) {
    const { error } = await supabase
      .from('saved_stores')
      .delete()
      .eq('id', savedId)
    if (!error) {
      setSavedStores(prev => prev.filter(s => s.id !== savedId))
    }
  }

  const filtered = selectedCategory === '전체'
    ? savedStores
    : savedStores.filter(s => s.store?.category === selectedCategory)

  const navItems = [
    { icon: '🗺️', label: '지도', path: '/map' },
    { icon: '📋', label: 'MOTD', path: '/feed' },
    { icon: '✏️', label: '리뷰', path: '/review/write' },
    { icon: '🔖', label: '저장', path: '/saved' },
    { icon: '👤', label: '프로필', path: '/profile' },
  ]

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#f9f9f9', fontFamily: 'sans-serif' }}>

      {/* 헤더 */}
      <div style={{ background: '#fff', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 10 }}>
        <img src="/yum2.png" alt="YumMap" style={{ height: '28px', objectFit: 'contain' }} />
        <span style={{ fontWeight: 800, fontSize: '18px', color: '#222' }}>저장한 맛집</span>
        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#aaa' }}>{savedStores.length}개</span>
      </div>

      {/* 카테고리 필터 */}
      {categories.length > 1 && (
        <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap',
                background: selectedCategory === cat ? '#FF5A3D' : '#f0f0f0',
                color: selectedCategory === cat ? '#fff' : '#666',
                fontWeight: selectedCategory === cat ? 700 : 400,
                fontSize: '13px', cursor: 'pointer',
              }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 본문 */}
      <div style={{ padding: '16px', paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔖</div>
            <div>불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#aaa' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔖</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#444', marginBottom: '8px' }}>저장한 맛집이 없어요</div>
            <div style={{ fontSize: '13px', marginBottom: '24px' }}>마음에 드는 가게를 저장해보세요!</div>
            <button onClick={() => router.push('/map')}
              style={{ padding: '12px 24px', background: '#FF5A3D', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
              지도에서 찾기
            </button>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} style={{ background: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: '#222', marginBottom: '4px' }}>
                    {item.store?.name || '알 수 없는 가게'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>
                    {[item.store?.category, item.store?.address].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id)}
                  style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#ddd', padding: '4px' }}>
                  ✕
                </button>
              </div>

              {/* 평점 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {item.store?.average_rating != null && (
                  <span style={{ background: '#fff3f0', color: '#FF5A3D', borderRadius: '8px', padding: '3px 9px', fontSize: '12px', fontWeight: 700 }}>
                    ⭐ {item.store.average_rating}
                  </span>
                )}
                {item.store?.review_count != null && item.store.review_count > 0 && (
                  <span style={{ background: '#f5f5f5', color: '#888', borderRadius: '8px', padding: '3px 9px', fontSize: '12px' }}>
                    리뷰 {item.store.review_count}개
                  </span>
                )}
                {item.store?.phone && (
                  <span style={{ background: '#f0f7ff', color: '#4A90E2', borderRadius: '8px', padding: '3px 9px', fontSize: '12px' }}>
                    📞 {item.store.phone}
                  </span>
                )}
              </div>

              {/* 버튼 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => router.push(`/review/write?storeId=${item.store_id}&storeName=${encodeURIComponent(item.store?.name || '')}`)}
                  style={{ flex: 1, padding: '10px', background: '#FF5A3D', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  ✏️ 리뷰 쓰기
                </button>
                <button
                  onClick={() => router.push(`/map?lat=${''}&lng=${''}`)}
                  style={{ flex: 1, padding: '10px', background: '#f5f5f5', color: '#555', border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  🗺️ 지도 보기
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#fff', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 10 }}>
        {navItems.map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', color: item.path === '/saved' ? '#FF5A3D' : '#888', fontWeight: item.path === '/saved' ? 700 : 400 }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
