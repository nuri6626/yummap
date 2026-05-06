'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface TasteProfile {
  nickname: string
  spice_level: number
  pickiness: number
  style_pref: number
  preferred_cuisines: string[]
  reviewer_grade: string
  badges: any[]
}

interface Review {
  id: string
  store_id: string
  taste_score: number
  portion_score: number
  value_score: number
  spiciness_actual: number
  saltiness_actual: number
  content: string
  created_at: string
  stores: { name: string; category: string }
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'reviews' | 'saved' | 'collections'>('reviews')
  const [profile, setProfile] = useState<TasteProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // 프로필 가져오기
      const { data: profileData } = await supabase
        .from('user_taste_profile')
        .select('*')
        .eq('user_id', user.id)
        .single()
      setProfile(profileData)

      // 내 리뷰 가져오기
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*, stores(name, category)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setReviews(reviewData || [])

      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#FFF5F3' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍜</div>
        <p style={{ color: '#FF5A3D', fontWeight: '700' }}>불러오는 중...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFF5F3', fontFamily: 'Pretendard, -apple-system, sans-serif', paddingBottom: '80px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'white', borderBottom: '1px solid #F2F2F2' }}>
        <img src="/yum2.png" alt="yummap" style={{ height: '32px' }} />
        <button onClick={() => router.push('/onboarding')} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer' }}>⚙️</button>
      </div>

      {/* 프로필 배너 */}
      <div style={{ background: 'linear-gradient(135deg, #FF5A3D, #FF8560)', padding: '24px 16px', color: 'white', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '8px' }}>👤</div>
        <h2 style={{ fontSize: '22px', fontWeight: '900', margin: '0 0 4px' }}>{profile?.nickname || '닉네임 없음'}</h2>
        <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '700' }}>
          {profile?.reviewer_grade || '맛집 탐험가'}
        </span>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '16px' }}>
          {[
            { label: '리뷰', value: reviews.length },
            { label: '팔로워', value: 0 },
            { label: '팔로잉', value: 0 },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: '900' }}>{item.value}</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 배지 */}
      {profile?.badges && profile.badges.length > 0 && (
        <div style={{ background: 'white', margin: '12px 16px', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '14px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 12px' }}>🏅 획득한 배지</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profile.badges.map((badge: any, i: number) => (
              <div key={i} style={{ background: '#FFE7DF', borderRadius: '20px', padding: '6px 12px', fontSize: '13px', fontWeight: '700', color: '#FF5A3D' }}>
                {badge.emoji} {badge.name}
                {badge.store && <span style={{ fontSize: '11px', color: '#FF8560' }}> · {badge.store}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 입맛 프로필 */}
      {profile && (
        <div style={{ background: 'white', margin: '12px 16px', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '14px', fontWeight: '800', color: '#1A1A1A', margin: '0 0 12px' }}>👅 입맛 프로필</p>
          {[
            { label: '자극도', value: profile.spice_level || 5 },
            { label: '입맛 기준', value: profile.pickiness || 5 },
            { label: '음식 스타일', value: profile.style_pref || 5 },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>{item.label}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#FF5A3D' }}>{item.value}/10</span>
              </div>
              <div style={{ background: '#F2F2F2', borderRadius: '10px', height: '6px' }}>
                <div style={{ background: 'linear-gradient(90deg, #FF5A3D, #FF8560)', borderRadius: '10px', height: '6px', width: `${item.value * 10}%` }} />
              </div>
            </div>
          ))}
          {profile.preferred_cuisines && profile.preferred_cuisines.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {profile.preferred_cuisines.map((c: string) => (
                <span key={c} style={{ background: '#FFE7DF', color: '#FF5A3D', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', fontWeight: '700' }}>{c}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 탭 */}
      <div style={{ display: 'flex', background: 'white', margin: '12px 16px 0', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
        {(['reviews', 'saved', 'collections'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ flex: 1, padding: '14px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', background: activeTab === tab ? '#FF5A3D' : 'white', color: activeTab === tab ? 'white' : '#999' }}>
            {tab === 'reviews' ? `리뷰 ${reviews.length}` : tab === 'saved' ? '저장' : '컬렉션'}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div style={{ background: 'white', margin: '0 16px', borderRadius: '0 0 16px 16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

        {/* 리뷰 탭 */}
        {activeTab === 'reviews' && (
          <div>
            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>✍️</div>
                <p style={{ color: '#999', fontSize: '14px' }}>아직 작성한 리뷰가 없어요</p>
                <button onClick={() => router.push('/map')}
                  style={{ marginTop: '12px', background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  맛집 찾으러 가기
                </button>
              </div>
            ) : (
              reviews.map(review => (
                <div key={review.id} style={{ borderBottom: '1px solid #F2F2F2', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ background: '#FFE7DF', color: '#FF5A3D', borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
                        {review.stores?.category}
                      </span>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#1A1A1A', margin: '4px 0 2px' }}>{review.stores?.name}</p>
                    </div>
                    <span style={{ fontSize: '11px', color: '#bbb' }}>{new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>맛 {review.taste_score}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>양 {review.portion_score}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>가성비 {review.value_score}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#444', margin: 0, lineHeight: '1.6' }}>{review.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 저장 탭 */}
        {activeTab === 'saved' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>❤️</div>
            <p style={{ color: '#999', fontSize: '14px' }}>저장한 맛집이 없어요</p>
            <button onClick={() => router.push('/map')}
              style={{ marginTop: '12px', background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              맛집 찾으러 가기
            </button>
          </div>
        )}

        {/* 컬렉션 탭 */}
        {activeTab === 'collections' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📚</div>
            <p style={{ color: '#999', fontSize: '14px' }}>컬렉션이 없어요</p>
            <button style={{ marginTop: '12px', background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              + 새 컬렉션 만들기
            </button>
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '12px 0 20px', background: 'white', borderTop: '1px solid #F2F2F2' }}>
        {[
          { icon: '🗺️', label: '지도', path: '/map' },
          { icon: '📰', label: '피드', path: '/feed' },
          { icon: '✏️', label: '리뷰', path: '/review/write' },
          { icon: '❤️', label: '저장', path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile', active: true },
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
