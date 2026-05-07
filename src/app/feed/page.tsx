'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Review {
  id: string
  user_id: string
  store_id: string
  taste_score: number
  portion_score: number
  value_score: number
  spiciness_actual: number
  saltiness_actual: number
  content: string
  like_count: number
  created_at: string
  stores: { name: string; category: string; address: string }
  user_taste_profile: { nickname: string; reviewer_grade: string }
}

export default function FeedPage() {
  const router = useRouter()
  const supabase = createClient()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'recommend' | 'following'>('recommend')

  useEffect(() => {
  const fetchReviews = async () => {
    console.log('피드 fetch 시작')
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        stores(name, category, address),
        user_taste_profile(nickname, reviewer_grade)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    console.log('피드 데이터:', data, '오류:', error)
    setReviews(data || [])
    setLoading(false)
  }
  fetchReviews()
}, [])


  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontSize: '11px', color: '#999' }}>{label}</span>
        <span style={{ fontSize: '11px', fontWeight: '700', color: '#FF5A3D' }}>{value}/5</span>
      </div>
      <div style={{ background: '#F2F2F2', borderRadius: '10px', height: '4px' }}>
        <div style={{ background: 'linear-gradient(90deg, #FF5A3D, #FF8560)', borderRadius: '10px', height: '4px', width: `${value * 20}%` }} />
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#FFF5F3' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍜</div>
        <p style={{ color: '#FF5A3D', fontWeight: '700' }}>피드 불러오는 중...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFF5F3', fontFamily: 'Pretendard, -apple-system, sans-serif', paddingBottom: '80px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'white', borderBottom: '1px solid #F2F2F2', position: 'sticky', top: 0, zIndex: 10 }}>
        <img src="/yum2.png" alt="yummap" style={{ height: '32px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}>🔔</button>
          <button style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}>🔍</button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #F2F2F2' }}>
        {[
          { key: 'recommend', label: '추천 피드' },
          { key: 'following', label: '팔로잉' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            style={{ flex: 1, padding: '14px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700', background: 'white', color: activeTab === tab.key ? '#FF5A3D' : '#999', borderBottom: activeTab === tab.key ? '2px solid #FF5A3D' : '2px solid transparent' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 피드 내용 */}
      <div style={{ padding: '12px 16px' }}>
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
            <p style={{ color: '#999', fontSize: '16px', fontWeight: '600' }}>아직 리뷰가 없어요</p>
            <p style={{ color: '#bbb', fontSize: '13px', marginBottom: '20px' }}>첫 번째 리뷰를 작성해보세요!</p>
            <button onClick={() => router.push('/map')}
              style={{ background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              맛집 찾으러 가기
            </button>
          </div>
        ) : (
          reviews.map(review => (
            <div key={review.id} style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {/* 유저 정보 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF5A3D, #FF8560)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    👤
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#1A1A1A', margin: 0 }}>
                      {review.user_taste_profile?.nickname || '익명'}
                    </p>
                    <p style={{ fontSize: '11px', color: '#FF5A3D', margin: 0, fontWeight: '600' }}>
                      {review.user_taste_profile?.reviewer_grade || '맛집 탐험가'}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#bbb' }}>
                  {new Date(review.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>

              {/* 가게 정보 */}
              <div style={{ background: '#FFF5F3', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ background: '#FFE7DF', color: '#FF5A3D', borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
                    {review.stores?.category}
                  </span>
                </div>
                <p style={{ fontSize: '16px', fontWeight: '900', color: '#1A1A1A', margin: '4px 0 2px' }}>
                  {review.stores?.name}
                </p>
                <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>📍 {review.stores?.address}</p>
              </div>

              {/* 점수 */}
              <div style={{ marginBottom: '12px' }}>
                <ScoreBar label="맛" value={review.taste_score} />
                <ScoreBar label="양" value={review.portion_score} />
                <ScoreBar label="가성비" value={review.value_score} />
              </div>

              {/* 맵기/짠기 */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ background: '#FFF5F3', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: '#FF5A3D' }}>
                  🌶️ 맵기 {review.spiciness_actual}/10
                </div>
                <div style={{ background: '#F0F8FF', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: '#4A90E2' }}>
                  🧂 짠기 {review.saltiness_actual}/10
                </div>
              </div>

              {/* 리뷰 내용 */}
              <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 12px' }}>
                {review.content}
              </p>
import RadarChart from '@/components/RadarChart'

// 리뷰 카드 안에 추가 (별점 아래쪽)
{review.taste_score && (
  <div style={{
    background: '#fafafa',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }}>
    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#999', fontWeight: '600' }}>
      🕸️ 맛 레이더
    </p>
    <RadarChart
      scores={{
        taste: review.taste_score || 5,
        portion: review.portion_score || 5,
        value: review.value_score || 5,
        spiciness: review.spiciness || 5,
        saltiness: review.saltiness || 5,
        sweetness: review.sweetness || 5
      }}
      size={160}
      showLabels={true}
    />
  </div>
)}

              {/* 좋아요 버튼 */}
              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #F2F2F2', paddingTop: '12px' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '13px', fontWeight: '600' }}>
                  ❤️ {review.like_count || 0}
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '13px', fontWeight: '600' }}>
                  💬 댓글
                </button>
                <button
                  onClick={() => router.push(`/review/write?store_id=${review.store_id}&store_name=${encodeURIComponent(review.stores?.name || '')}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#FF5A3D', fontSize: '13px', fontWeight: '600', marginLeft: 'auto' }}>
                  ✏️ 나도 리뷰
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '12px 0 20px', background: 'white', borderTop: '1px solid #F2F2F2' }}>
        {[
          { icon: '🗺️', label: '지도', path: '/map' },
          { icon: '📰', label: '피드', path: '/feed', active: true },
          { icon: '✏️', label: '리뷰', path: '/review/write' },
          { icon: '❤️', label: '저장', path: '/saved' },
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
