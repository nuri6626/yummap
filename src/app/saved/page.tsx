'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SavedStore {
  id: string
  store_id: string
  store_name: string
  store_category: string
  store_address: string
  store_lat: number
  store_lng: number
  store_phone: string
  created_at: string
}

export default function SavedPage() {
  const router = useRouter()
  const supabase = createClient()
  const [savedStores, setSavedStores] = useState<SavedStore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSaved = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('saved_stores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      console.log('저장 데이터:', data, '오류:', error)
      setSavedStores(data || [])
      setLoading(false)
    }
    fetchSaved()
  }, [])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('saved_stores').delete().eq('id', id)
    if (error) { alert('삭제 오류: ' + error.message); return }
    setSavedStores(prev => prev.filter(s => s.id !== id))
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#FFF5F3' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>❤️</div>
        <p style={{ color: '#FF5A3D', fontWeight: '700' }}>불러오는 중...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFF5F3', fontFamily: 'Pretendard, -apple-system, sans-serif', paddingBottom: '80px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'white', borderBottom: '1px solid #F2F2F2', position: 'sticky', top: 0, zIndex: 10 }}>
        <img src="/yum2.png" alt="yummap" style={{ height: '32px' }} />
        <span style={{ fontSize: '16px', fontWeight: '800', color: '#1A1A1A' }}>저장한 맛집</span>
        <div style={{ width: '32px' }} />
      </div>

      <div style={{ padding: '16px' }}>
        {savedStores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>❤️</div>
            <p style={{ fontSize: '18px', fontWeight: '800', color: '#1A1A1A', marginBottom: '8px' }}>저장한 맛집이 없어요</p>
            <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>지도에서 마음에 드는 맛집을 저장해보세요!</p>
            <button onClick={() => router.push('/map')}
              style={{ background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '16px', padding: '14px 28px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
              🗺️ 지도로 가기
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: '#999', marginBottom: '12px', fontWeight: '600' }}>
              총 {savedStores.length}개 저장됨
            </p>
            {savedStores.map(store => (
              <div key={store.id} style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ background: '#FFE7DF', color: '#FF5A3D', borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
                      {store.store_category}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#1A1A1A', margin: '0 0 4px' }}>{store.store_name}</h3>
                  <p style={{ fontSize: '13px', color: '#999', margin: '0 0 8px' }}>📍 {store.store_address}</p>
                  {store.store_phone && <p style={{ fontSize: '13px', color: '#999', margin: '0 0 10px' }}>📞 {store.store_phone}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => router.push(
                        `/review/write?store_id=${store.store_id}` +
                        `&store_name=${encodeURIComponent(store.store_name)}` +
                        `&store_address=${encodeURIComponent(store.store_address || '')}` +
                        `&store_category=${encodeURIComponent(store.store_category || '')}` +
                        `&store_lat=${store.store_lat}` +
                        `&store_lng=${store.store_lng}` +
                        `&store_phone=${encodeURIComponent(store.store_phone || '')}`
                      )}
                      style={{ background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                      ✏️ 리뷰 작성
                    </button>
                    <button
                      onClick={() => router.push(`/map`)}
                      style={{ background: '#F2F2F2', color: '#666', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                      🗺️ 지도
                    </button>
                  </div>
                </div>
                <button onClick={() => handleDelete(store.id)}
                  style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#FF5A3D', marginLeft: '8px' }}>
                  ❤️
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '12px 0 20px', background: 'white', borderTop: '1px solid #F2F2F2' }}>
        {[
          { icon: '🗺️', label: '지도', path: '/map' },
          { icon: '📰', label: '피드', path: '/feed' },
          { icon: '✏️', label: '리뷰', path: '/review/write' },
          { icon: '❤️', label: '저장', path: '/saved', active: true },
          { icon: '👤', label: '프로필', path: '/profile' },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600', color: (item as any).active ? '#FF5A3D' : '#999' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
