'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Store {
  id: string
  name: string
  category: string
  address: string
  editor_score: number
  user_score: number
  review_count: number
}

const DUMMY_STORES: Store[] = [
  { id: '1', name: '맛있는 김치찌개', category: '한식', address: '서울시 강남구 역삼동 123', editor_score: 4.5, user_score: 4.2, review_count: 128 },
  { id: '2', name: '황금 삼겹살', category: '고기', address: '서울시 강남구 논현동 456', editor_score: 4.3, user_score: 4.0, review_count: 89 },
  { id: '3', name: '스시 오마카세', category: '일식', address: '서울시 강남구 청담동 789', editor_score: 4.8, user_score: 4.6, review_count: 234 }
]

export default function MapPage() {
  const router = useRouter()
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)

  const handleStoreSelect = (storeId: string) => {
    const store = DUMMY_STORES.find(s => s.id === storeId)
    if (store) setSelectedStore(store)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* 헤더 */}
      <div style={{ background: 'white', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', zIndex: 10 }}>
      <div style={{display:'flex',alignItems:'center'}}>
  <img src="/yum2.png" alt="yummap" style={{height:'32px'}} />
</div>
 
        <button onClick={() => router.push('/review/write')} style={{ background: '#F59E0B', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
          + 리뷰 작성
        </button>
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px 16px', background: 'white', overflowX: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {['전체', '한식', '일식', '중식', '양식', '고기', '카페', '분식'].map(cat => (
          <button key={cat} style={{ whiteSpace: 'nowrap', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', cursor: 'pointer' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* 지도 iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          src="/kakaomap.html"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="kakaomap"
          onLoad={(e) => {
            const iframe = e.target as HTMLIFrameElement
            try {
              iframe.contentWindow?.addEventListener('message', (event) => {
                if (event.data.type === 'storeSelect') {
                  handleStoreSelect(event.data.storeId)
                }
              })
            } catch {}
          }}
        />
      </div>

      {/* 가게 상세 카드 */}
      {selectedStore && (
        <div style={{ background: 'white', padding: '20px', boxShadow: '0 -4px 12px rgba(0,0,0,0.1)', zIndex: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '12px', background: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: '10px' }}>{selectedStore.category}</span>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0 0' }}>{selectedStore.name}</h3>
              <p style={{ color: '#6B7280', fontSize: '14px', margin: '4px 0 0' }}>{selectedStore.address}</p>
            </div>
            <button onClick={() => setSelectedStore(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, background: '#EFF6FF', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#2563EB', margin: '0 0 4px' }}>에디터 평점</p>
              <p style={{ fontSize: '22px', fontWeight: '900', color: '#2563EB', margin: 0 }}>★ {selectedStore.editor_score}</p>
            </div>
            <div style={{ flex: 1, background: '#FFFBEB', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#D97706', margin: '0 0 4px' }}>소비자 평점</p>
              <p style={{ fontSize: '22px', fontWeight: '900', color: '#D97706', margin: 0 }}>★ {selectedStore.user_score}</p>
            </div>
          </div>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>리뷰 {selectedStore.review_count}개</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => router.push('/store/' + selectedStore.id)} style={{ flex: 1, background: '#F59E0B', color: 'white', padding: '12px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>상세 보기</button>
            <button onClick={() => router.push('/review/write')} style={{ flex: 1, background: 'white', color: '#F59E0B', padding: '12px', borderRadius: '12px', fontWeight: 'bold', border: '2px solid #F59E0B', cursor: 'pointer' }}>리뷰 쓰기</button>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div style={{ background: 'white', borderTop: '1px solid #F3F4F6', padding: '12px 24px', display: 'flex', justifyContent: 'space-around' }}>
        {[
          { icon: '🗺️', label: '지도', path: '/map' },
          { icon: '📰', label: '피드', path: '/feed' },
          { icon: '✍️', label: '리뷰', path: '/review/write' },
          { icon: '🔖', label: '저장', path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile' },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: '24px' }}>{item.icon}</span>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
