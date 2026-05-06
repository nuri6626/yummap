'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

declare global { interface Window { kakao: any } }

interface Review {
  id: string
  store_id: string
  taste_score: number
  portion_score: number
  value_score: number
  content: string
  created_at: string
  stores?: { name: string; category: string; address: string; latitude: number; longitude: number }
}

interface TasteProfile {
  nickname: string
  reviewer_grade: string
  spice_level: number
  taste_style: number
  pickiness: number
  preferred_cuisines: string[]
  badges: any[]
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const mapRef = useRef<HTMLDivElement>(null)
  const kakaoMapRef = useRef<any>(null)

  const [profile, setProfile] = useState<TasteProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'reviews' | 'map' | 'saved'>('reviews')
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('user_taste_profile').select('*').eq('user_id', user.id).single()
      setProfile(profileData)

      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*, stores(name, category, address, latitude, longitude)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setReviews(reviewData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  // 리뷰 지도 탭 선택 시 카카오맵 초기화
  useEffect(() => {
    if (activeTab !== 'map' || mapReady) return
    const tryInit = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => {
          if (!mapRef.current) return
          // 첫 번째 리뷰 가게 위치를 기본 center로
          const firstReview = reviews.find(r => r.stores?.latitude)
          const center = firstReview?.stores
            ? new window.kakao.maps.LatLng(firstReview.stores.latitude, firstReview.stores.longitude)
            : new window.kakao.maps.LatLng(35.5384, 129.3114)

          kakaoMapRef.current = new window.kakao.maps.Map(mapRef.current, { center, level: 5 })
          setMapReady(true)

          // 리뷰한 가게 핀 꽂기
          reviews.forEach((review) => {
            if (!review.stores?.latitude) return
            const pos = new window.kakao.maps.LatLng(review.stores.latitude, review.stores.longitude)
            const avgScore = ((review.taste_score + review.portion_score + review.value_score) / 3).toFixed(1)

            const div = document.createElement('div')
            div.style.cssText = `
              background:linear-gradient(135deg,#FF5A3D,#FF8560);color:white;
              border-radius:12px;padding:6px 10px;font-size:11px;font-weight:700;
              white-space:nowrap;box-shadow:0 3px 10px rgba(255,90,61,0.4);
              cursor:pointer;text-align:center;
            `
            div.innerHTML = `
              <div>📍 ${review.stores.name}</div>
              <div style="font-size:10px;opacity:0.9;">⭐ ${avgScore}</div>
            `

            const overlay = new window.kakao.maps.CustomOverlay({
              position: pos, content: div, yAnchor: 1.3,
            })
            overlay.setMap(kakaoMapRef.current)
          })
        })
      } else {
        setTimeout(tryInit, 300)
      }
    }
    setTimeout(tryInit, 100) // DOM 준비 기다림
  }, [activeTab, reviews])

  const avgScore = reviews.length
    ? (reviews.reduce((s, r) => s + (r.taste_score + r.portion_score + r.value_score) / 3, 0) / reviews.length).toFixed(1)
    : '-'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '40px' }}>🍽️</div>
      <p style={{ color: '#999', fontSize: '14px' }}>프로필 불러오는 중...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F8', fontFamily: 'Pretendard, -apple-system, sans-serif', paddingBottom: '80px' }}>

      {/* 프로필 배너 */}
      <div style={{ background: 'linear-gradient(135deg,#FF5A3D,#FF8560)', padding: '48px 20px 24px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: '3px solid white' }}>
            😋
          </div>
          <div>
            <p style={{ fontSize: '12px', opacity: 0.8, margin: '0 0 4px' }}>{profile?.reviewer_grade || '맛집 탐험가'}</p>
            <h2 style={{ fontSize: '22px', fontWeight: '900', margin: '0 0 8px' }}>{profile?.nickname || '닉네임 없음'}</h2>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <span>리뷰 <strong>{reviews.length}</strong>개</span>
              <span>평균 <strong>⭐{avgScore}</strong></span>
            </div>
          </div>
        </div>
        {/* 배지 */}
        {profile?.badges && profile.badges.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {profile.badges.map((badge: any, i: number) => (
              <span key={i} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600' }}>
                {badge.emoji} {badge.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #F2F2F2' }}>
        {[
          { key: 'reviews', label: '✍️ 내 리뷰' },
          { key: 'map', label: '🗺️ 리뷰 지도' },
          { key: 'saved', label: '❤️ 저장' },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            style={{ flex: 1, padding: '14px 0', border: 'none', background: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', color: activeTab === tab.key ? '#FF5A3D' : '#999', borderBottom: activeTab === tab.key ? '2px solid #FF5A3D' : '2px solid transparent' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div style={{ padding: '16px' }}>

        {/* ── 내 리뷰 탭 ── */}
        {activeTab === 'reviews' && (
          reviews.length === 0
            ? <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
              <p>아직 작성한 리뷰가 없어요</p>
              <button onClick={() => router.push('/map')} style={{ marginTop: '16px', background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '20px', padding: '10px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                맛집 찾으러 가기
              </button>
            </div>
            : reviews.map((review) => (
              <div key={review.id} style={{ background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <span style={{ background: '#FFE7DF', color: '#FF5A3D', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>{review.stores?.category || '음식점'}</span>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: '#1A1A1A', margin: '4px 0 2px' }}>{review.stores?.name || '가게 정보 없음'}</p>
                    {review.stores?.address && <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>📍 {review.stores.address}</p>}
                  </div>
                  <span style={{ fontSize: '11px', color: '#bbb' }}>{new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {[['맛', review.taste_score], ['양', review.portion_score], ['가성비', review.value_score]].map(([label, score]) => (
                    <div key={String(label)} style={{ flex: 1, background: '#FFF5F3', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#999' }}>{label}</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#FF5A3D' }}>{score}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '14px', color: '#444', lineHeight: '1.6', margin: 0 }}>{review.content}</p>
              </div>
            ))
        )}

        {/* ── 리뷰 지도 탭 ── */}
        {activeTab === 'map' && (
          <div>
            <p style={{ fontSize: '13px', color: '#999', margin: '0 0 12px', textAlign: 'center' }}>
              내가 리뷰한 가게 <strong style={{ color: '#FF5A3D' }}>{reviews.filter(r => r.stores?.latitude).length}곳</strong>이 지도에 표시됩니다
            </p>
            <div ref={mapRef} style={{ width: '100%', height: '60vh', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
            {reviews.filter(r => r.stores?.latitude).length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '20px', color: '#999' }}>
                <p>리뷰한 가게의 위치 정보가 없어요</p>
                <p style={{ fontSize: '12px' }}>카카오맵에서 선택한 가게에 리뷰를 작성하면 지도에 표시됩니다</p>
              </div>
            )}
          </div>
        )}

        {/* ── 저장 탭 ── */}
        {activeTab === 'saved' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>❤️</div>
            <p>저장한 맛집은 저장 페이지에서 확인하세요</p>
            <button onClick={() => router.push('/saved')}
              style={{ marginTop: '12px', background: '#FF5A3D', color: 'white', border: 'none', borderRadius: '20px', padding: '10px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              저장 페이지 가기
            </button>
          </div>
        )}
      </div>

      {/* 하단 네비 */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '10px 0 18px', background: 'white', borderTop: '1px solid #F2F2F2' }}>
        {[
          { icon: '🗺️', label: '지도', path: '/map' },
          { icon: '📰', label: '피드', path: '/feed' },
          { icon: '✏️', label: '리뷰', path: '/review/write' },
          { icon: '❤️', label: '저장', path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile', active: true },
        ].map((item) => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600', color: item.active ? '#FF5A3D' : '#999' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
