'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── 타입 정의 ─────────────────────────────────────────────────────────────
interface StoreInfo {
  id: string
  name: string
  category: string | null
  address: string | null
}

interface Review {
  id: string
  created_at: string
  menu_name: string | null
  one_line_review: string | null
  content: string | null
  total_rating: number | null
  photos: string | string[] | null
  tags: string[] | null
  store_id: string
  stores: StoreInfo | null
}

interface UserProfile {
  id: string
  user_id: string
  nickname: string | null
  bio: string | null
  taste_mbti: string | null
  taste_spicy: number | null
  taste_salty: number | null
  taste_sweet: number | null
  taste_sour: number | null
  taste_rich: number | null
}

// ─── 헬퍼 함수 ──────────────────────────────────────────────────────────────
function parsePhotos(photos: string | string[] | null): string[] {
  if (!photos) return []
  if (Array.isArray(photos)) return photos
  try {
    const parsed = JSON.parse(photos)
    return Array.isArray(parsed) ? parsed : [photos]
  } catch {
    return [photos]
  }
}

// ─── TasteBar 컴포넌트 ───────────────────────────────────────────────────────
function TasteBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: '#555' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color }}>{value}/5</span>
      </div>
      <div style={{ background: '#f0f0f0', borderRadius: '4px', height: '8px' }}>
        <div style={{
          width: `${(value / 5) * 100}%`,
          height: '100%',
          background: color,
          borderRadius: '4px',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [expandedReview, setExpandedReview] = useState<string | null>(null)

  useEffect(() => {
    if (userId) loadUserProfile()
  }, [userId])

  async function loadUserProfile() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const [profileRes, reviewsRes, followerRes, followingRes] = await Promise.all([
        supabase.from('user_taste_profile').select('*').eq('user_id', userId).single(),
        supabase.from('reviews')
          .select(`
            id, created_at, menu_name, one_line_review, content,
            total_rating, photos, tags, store_id,
            stores(id, name, category, address)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId),
      ])

      if (profileRes.data) setProfile(profileRes.data)

      // stores 배열 → 단일 객체 변환
      if (reviewsRes.data) {
        const mapped: Review[] = reviewsRes.data.map((r: any) => ({
          ...r,
          stores: Array.isArray(r.stores) ? (r.stores[0] ?? null) : (r.stores ?? null),
        }))
        setReviews(mapped)
      }

      setFollowerCount(followerRes.count ?? 0)
      setFollowingCount(followingRes.count ?? 0)

      // 팔로우 여부
      if (user && user.id !== userId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle()
        setIsFollowing(!!followData)
      }
    } catch (err) {
      console.error('유저 프로필 로드 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleFollow() {
    if (!currentUserId || currentUserId === userId) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId)
        setIsFollowing(false)
        setFollowerCount(c => Math.max(0, c - 1))
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: userId })
        setIsFollowing(true)
        setFollowerCount(c => c + 1)
      }
    } catch (err) {
      console.error('팔로우 토글 에러:', err)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👤</div>
          <p style={{ color: '#888' }}>프로필 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>😕</div>
          <p style={{ color: '#888' }}>프로필을 찾을 수 없어요</p>
          <button onClick={() => router.back()} style={{
            marginTop: '12px', background: '#FF5A3D', color: '#fff',
            border: 'none', borderRadius: '20px', padding: '10px 20px',
            fontSize: '14px', cursor: 'pointer',
          }}>돌아가기</button>
        </div>
      </div>
    )
  }

  const isSelf = currentUserId === userId

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', background: '#fff', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer',
        }}>←</button>
        <span style={{ fontSize: '18px', fontWeight: 700, flex: 1 }}>
          {profile.nickname || '사용자'} 의 프로필
        </span>
      </div>

      {/* 프로필 카드 */}
      <div style={{ padding: '24px 20px', borderBottom: '8px solid #f8f8f8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF5A3D, #FF8C69)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', flexShrink: 0,
          }}>🍜</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
              {profile.nickname || '닉네임 없음'}
            </div>
            {profile.taste_mbti && (
              <span style={{
                background: '#FFF3F1', color: '#FF5A3D',
                padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
              }}>{profile.taste_mbti}</span>
            )}
          </div>
          {/* 팔로우 버튼 */}
          {!isSelf && currentUserId && (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              style={{
                background: isFollowing ? '#f0f0f0' : '#FF5A3D',
                color: isFollowing ? '#555' : '#fff',
                border: 'none', borderRadius: '20px',
                padding: '8px 16px', fontSize: '14px', cursor: 'pointer',
                opacity: followLoading ? 0.7 : 1,
              }}
            >{followLoading ? '...' : isFollowing ? '팔로잉' : '팔로우'}</button>
          )}
        </div>

        {profile.bio && (
          <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.5', marginBottom: '16px' }}>
            {profile.bio}
          </p>
        )}

        {/* 통계 */}
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { label: '리뷰', value: reviews.length },
            { label: '팔로워', value: followerCount },
            { label: '팔로잉', value: followingCount },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#FF5A3D' }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 맛 성향 바 */}
      <div style={{ padding: '20px', borderBottom: '8px solid #f8f8f8' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🎯 맛 성향</h3>
        <TasteBar label="🌶️ 맵기" value={profile.taste_spicy ?? 3} color="#FF5A3D" />
        <TasteBar label="🧂 짠기" value={profile.taste_salty ?? 3} color="#4A90E2" />
        <TasteBar label="🍯 단기" value={profile.taste_sweet ?? 3} color="#F5A623" />
        <TasteBar label="🍋 신기" value={profile.taste_sour ?? 3} color="#7ED321" />
        <TasteBar label="🥩 풍미" value={profile.taste_rich ?? 3} color="#9B59B6" />
      </div>

      {/* 리뷰 목록 */}
      <div style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
          📝 리뷰 ({reviews.length})
        </h3>
        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
            <p>아직 작성한 리뷰가 없어요</p>
          </div>
        ) : (
          reviews.map(review => {
            const photos = parsePhotos(review.photos)
            const isExpanded = expandedReview === review.id
            return (
              <div key={review.id} style={{
                background: '#fff', borderRadius: '12px', marginBottom: '12px',
                border: '1px solid #f0f0f0', overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                {photos.length > 0 && (
                  <img
                    src={photos[0]}
                    alt="리뷰 사진"
                    style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                  />
                )}
                <div style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>
                      {review.stores?.name ?? '알 수 없는 가게'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>
                      {new Date(review.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  {review.stores?.category && (
                    <span style={{
                      background: '#f5f5f5', color: '#777',
                      padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
                    }}>{review.stores.category}</span>
                  )}
                  {review.menu_name && (
                    <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>
                      🍽️ {review.menu_name}
                    </p>
                  )}
                  {review.one_line_review && (
                    <p style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                      "{review.one_line_review}"
                    </p>
                  )}
                  {review.total_rating != null && (
                    <div style={{ fontSize: '13px', color: '#FF5A3D', marginTop: '4px' }}>
                      ⭐ {review.total_rating.toFixed(1)}
                    </div>
                  )}
                  {isExpanded && review.content && (
                    <p style={{ fontSize: '13px', color: '#555', marginTop: '8px', lineHeight: 1.6 }}>
                      {review.content}
                    </p>
                  )}
                  {(review.content || (review.tags && review.tags.length > 0)) && (
                    <button
                      onClick={() => setExpandedReview(isExpanded ? null : review.id)}
                      style={{
                        marginTop: '8px', background: 'none', border: 'none',
                        color: '#FF5A3D', fontSize: '13px', cursor: 'pointer', padding: 0,
                      }}
                    >{isExpanded ? '접기 ▲' : '더보기 ▼'}</button>
                  )}
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
            background: 'none', border: 'none', cursor: 'pointer', color: '#888',
          }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', marginTop: '2px' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
