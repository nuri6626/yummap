'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Store {
  id: string
  name: string
  category: string
  address: string
  phone: string
  business_hours: string
  editor_score: number
  user_score: number
  review_count: number
}

interface Review {
  id: string
  user_id: string
  taste_score: number
  portion_score: number
  value_score: number
  spiciness_actual: number
  saltiness_actual: number
  content: string
  created_at: string
  user_taste_profile: { nickname: string; reviewer_grade: string }
}

export default function StoreDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const storeId = params.id as string

  const [store, setStore] = useState<Store | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // 가게 정보
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single()
      setStore(storeData)

      // 리뷰 목록
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*, user_taste_profile(nickname, reviewer_grade)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
      setReviews(reviewData || [])

      setLoading(false)
    }
    fetchData()
  }, [storeId])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#FFF5F3' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍜</div>
        <p style={{ color: '#FF5A3D', fontWeight: '700' }}>불러오는 중...</p>
      </div>
    </div>
  )

  if (!store) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>가게를 찾을 수 없습니다</p>
    </div>
  )

  const avgScore = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.taste_score, 0) / reviews.length).toFixed(1)
    : '-'

  return (
    <div style={{ minHeight: '100vh', background: '#FFF5F3', fontFamily: 'Pretendard, -apple-system, sans-serif', paddingBottom: '100px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'white', borderBottom: '1px solid #F2F2F2', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>←</button>
        <img src="/yum2.png" alt="yummap" style={{ height: '28px' }} />
        <span style={{ fontSize: '16px', fontWeight: '800', color: '#1A1A1A' }}>가게 상세</span>
      </div>

      {/* 가게 정보 카드 */}
      <div style={{ background: 'linear-gradient(135deg, #FF5A3D, #FF8560)', padding: '24px 16px', color: 'white' }}>
        <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '700' }}>
          {store.category}
        </span>
        <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '8px 0 4px' }}>{store.name}</h1>
        <p style={{ fontSize: '13px', opacity: 0.9, margin: '0 0 16px' }}>📍 {store.address}</p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '900' }}>⭐ {avgScore}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>평균 맛 점수</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '900' }}>{reviews.length}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>리뷰</div>
          </div>
          {store.editor_score && (
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '900' }}>⭐ {store.editor_score}</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>에디터</div>
            </div>
          )}
        </div>
      </div>

      {/* 가게 상세 정보 */}
      <div style={{ background: 'white', margin: '12px 16px', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {store.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>📞</span>
            <span style={{ fontSize: '14px', color: '#444' }}>{store.phone}</span>
          </div>
        )}
        {store.business_hours && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🕐</span>
            <span style={{ fontSize: '14px', color: '#444' }}>{store.business_hours}</span>
          </div>
        )}
      </div>

      {/* 리뷰 작성 버튼 */}
      <div style={{ padding: '0 16px', marginBottom: '12px' }}>
        <button
          onClick={() => router.push(`/review/write?store_id=${store.id}&store_name=${encodeURIComponent(store.name)}`)}
          style={{ width: '100%', background: 'linear-gradient(135deg, #FF5A3D, #FF8560)', color: 'white', border: 'none', borderRadius: '16px', padding: '14px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,90,61,0.3)' }}>
          ✏️ 리뷰 작성하기
        </button>
      </div>

      {/* 리뷰 목록 */}
      <div style={{ padding: '0 16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 12px' }}>
          리뷰 {reviews.length}개
        </h3>
        {reviews.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✍️</div>
            <p style={{ color: '#999', fontSize: '14px' }}>아직 리뷰가 없어요. 첫 번째 리뷰를 작성해보세요!</p>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.id} style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {/* 유저 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF5A3D, #FF8560)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    👤
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#1A1A1A', margin: 0 }}>
                      {review.user_taste_profile?.nickname || '익명'}
                    </p>
                    <p style={{ fontSize: '11px', color: '#FF5A3D', margin: 0 }}>
                      {review.user_taste_profile?.reviewer_grade || '맛집 탐험가'}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#bbb' }}>
                  {new Date(review.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>

              {/* 점수 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {[
                  { label: '맛', value: review.taste_score },
                  { label: '양', value: review.portion_score },
                  { label: '가성비', value: review.value_score },
                ].map(item => (
                  <div key={item.label} style={{ background: '#FFF5F3', borderRadius: '8px', padding: '6px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#FF5A3D' }}>{item.value}</div>
                    <div style={{ fontSize: '10px', color: '#999' }}>{item.label}</div>
                  </div>
                ))}
                <div style={{ background: '#FFF5F3', borderRadius: '8px', padding: '6px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#FF5A3D' }}>🌶️{review.spiciness_actual}</div>
                  <div style={{ fontSize: '10px', color: '#999' }}>맵기</div>
                </div>
                <div style={{ background: '#F0F8FF', borderRadius: '8px', padding: '6px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#4A90E2' }}>🧂{review.saltiness_actual}</div>
                  <div style={{ fontSize: '10px', color: '#999' }}>짠기</div>
                </div>
              </div>

              {/* 내용 */}
              <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.6', margin: 0 }}>{review.content}</p>
            </div>
          ))
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '12px 0 20px', background: 'white', borderTop: '1px solid #F2F2F2' }}>
        {[
          { icon: '🗺️', label: '지도', path: '/map' },
          { icon: '📰', label: '피드', path: '/feed' },
          { icon: '✏️', label: '리뷰', path: '/review/write' },
          { icon: '❤️', label: '저장', path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile' },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600', color: '#999' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
