'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  star_score: number | null  // ✅ total_rating → star_score
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

const supabase = createClient()

function parsePhotos(p: string | string[] | null): string[] {
  if (!p) return []
  if (Array.isArray(p)) return p.filter(Boolean)
  try {
    const r = JSON.parse(p)
    return Array.isArray(r) ? r.filter(Boolean) : [p]
  } catch {
    return [p]
  }
}

function getInitial(name?: string | null): string {
  return name ? name.charAt(0).toUpperCase() : '?'
}

function getAvatarBg(name?: string | null): string {
  const colors = ['#1a1a1a', '#2d2d2d', '#404040', '#333', '#555', '#222']
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function Avatar({ name, size = 64 }: { name?: string | null; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: getAvatarBg(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
        letterSpacing: '-0.5px',
      }}
    >
      {getInitial(name)}
    </div>
  )
}

function TasteBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>
          {value}
          <span style={{ fontWeight: 400, color: '#999', fontSize: 11 }}>/5</span>
        </span>
      </div>
      <div style={{ height: 6, background: '#F0F0F0', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${(value / 5) * 100}%`,
            background: '#111',
            borderRadius: 3,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}

function ReviewCard({
  review,
  expanded,
  onToggle,
}: {
  review: Review
  expanded: boolean
  onToggle: () => void
}) {
  const imgs = parsePhotos(review.photos)
  const tags = Array.isArray(review.tags) ? review.tags : []
  const photo = imgs[0] || null

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        breakInside: 'avoid',
        marginBottom: 14,
        display: 'inline-block',
        width: '100%',
      }}
    >
      {photo ? (
        <div style={{ position: 'relative', width: '100%', background: '#F0F0F0', overflow: 'hidden' }}>
          <img
            src={photo}
            alt={review.menu_name || ''}
            style={{ width: '100%', display: 'block', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {imgs.length > 1 && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(0,0,0,0.5)',
                borderRadius: 20,
                padding: '4px 10px',
                fontSize: 11,
                color: '#fff',
                fontWeight: 600,
              }}
            >
              +{imgs.length - 1}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            height: 100,
            background: '#F7F7F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 28 }}>🍽️</span>
        </div>
      )}

      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#111',
              letterSpacing: '-0.3px',
              lineHeight: 1.3,
              flex: 1,
              marginRight: 8,
            }}
          >
            {review.stores?.name ?? '가게 정보 없음'}
          </p>
          <span style={{ fontSize: 10, color: '#bbb', flexShrink: 0 }}>
            {new Date(review.created_at).toLocaleDateString('ko-KR')}
          </span>
        </div>

        {review.stores?.category && (
          <span
            style={{
              display: 'inline-block',
              fontSize: 10,
              color: '#666',
              background: '#F3F3F3',
              padding: '3px 8px',
              borderRadius: 20,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            {review.stores.category}
          </span>
        )}

        {/* ✅ total_rating → star_score */}
        {review.menu_name && (
          <p style={{ fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 500 }}>
            {review.menu_name}
            {review.star_score != null && (
              <span style={{ marginLeft: 6, color: '#111', fontWeight: 800 }}>
                {'★'.repeat(Math.round(review.star_score))}
                <span style={{ fontWeight: 400, color: '#999', fontSize: 10 }}>
                  {' '}{review.star_score.toFixed(1)}
                </span>
              </span>
            )}
          </p>
        )}

        {review.one_line_review && (
          <p
            style={{
              fontSize: 12,
              color: '#444',
              lineHeight: 1.55,
              marginBottom: 6,
              display: '-webkit-box',
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: 'vertical',
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            {review.one_line_review}
          </p>
        )}

        {expanded && review.content && (
          <p
            style={{
              fontSize: 12,
              color: '#666',
              lineHeight: 1.65,
              marginBottom: 8,
              paddingTop: 6,
              borderTop: '1px solid #F3F3F3',
            }}
          >
            {review.content}
          </p>
        )}

        {expanded && tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  color: '#555',
                  background: '#F3F3F3',
                  padding: '3px 8px',
                  borderRadius: 20,
                  fontWeight: 500,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {(review.content || tags.length > 0) && (
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              fontSize: 11,
              cursor: 'pointer',
              padding: 0,
              fontWeight: 600,
              letterSpacing: '-0.2px',
            }}
          >
            {expanded ? '접기 ↑' : '더보기 ↓'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [expandedReview, setExpandedReview] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'reviews' | 'taste'>('reviews')

  useEffect(() => {
    if (userId) loadUserProfile()
  }, [userId])

  async function loadUserProfile() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const [profileRes, reviewsRes, followerRes, followingRes] = await Promise.all([
        supabase.from('user_taste_profile').select('*').eq('user_id', userId).maybeSingle(),
        supabase
          .from('reviews')
          // ✅ total_rating → star_score
          .select('id, created_at, menu_name, one_line_review, content, star_score, photos, tags, store_id, stores(id, name, category, address)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
      ])

      if (profileRes.data) setProfile(profileRes.data)

      if (reviewsRes.data) {
        setReviews(
          reviewsRes.data.map((r: any) => ({
            ...r,
            stores: Array.isArray(r.stores) ? (r.stores[0] ?? null) : (r.stores ?? null),
          }))
        )
      }

      setFollowerCount(followerRes.count ?? 0)
      setFollowingCount(followingRes.count ?? 0)

      if (user && user.id !== userId) {
        const { data: fd } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle()
        setIsFollowing(!!fd)
      }
    } catch (err) {
      console.error('유저 프로필 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleFollow() {
    if (!currentUserId || currentUserId === userId) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId)
        setIsFollowing(false)
        setFollowerCount((c) => Math.max(0, c - 1))
      } else {
        await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId })
        setIsFollowing(true)
        setFollowerCount((c) => c + 1)
      }
    } catch (err) {
      console.error('팔로우 에러:', err)
    } finally {
      setFollowLoading(false)
    }
  }

  const leftCol = reviews.filter((_, i) => i % 2 === 0)
  const rightCol = reviews.filter((_, i) => i % 2 === 1)

  const navItems: { icon: React.ReactNode; label: string; path: string; active: boolean }[] = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
      label: '홈', path: '/feed', active: false,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      label: '탐색', path: '/map', active: false,
    },
    { icon: null, label: '리뷰', path: '/review/write', active: false },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
      label: '저장', path: '/saved', active: false,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#111" stroke="#111" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      label: '프로필', path: '/profile', active: true,
    },
  ]

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fff' }}>
        <button onClick={() => router.push('/feed')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 32 }}>
          <img src="/yum2.png" alt="YumMap" style={{ height: 28, objectFit: 'contain' }} />
        </button>
        <div style={{ width: 32, height: 32, border: '2.5px solid #F0F0F0', borderTop: '2.5px solid #111', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fff', gap: 12 }}>
        <p style={{ fontSize: 48 }}>😕</p>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>프로필을 찾을 수 없어요</p>
        <p style={{ fontSize: 13, color: '#999' }}>존재하지 않는 사용자예요</p>
        <button
          onClick={() => router.back()}
          style={{ marginTop: 8, padding: '12px 28px', background: '#111', color: '#fff', border: 'none', borderRadius: 28, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          돌아가기
        </button>
      </div>
    )
  }

  const isSelf = currentUserId === userId

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        background: '#fff',
        minHeight: '100vh',
        paddingBottom: 80,
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      }}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        *::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* 헤더 */}
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 200, background: '#fff',
          borderBottom: '1px solid #F0F0F0', height: 54,
          display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <img src="/yum2.png" alt="YumMap" style={{ height: 28, objectFit: 'contain', display: 'block' }} />
        </button>

        <div style={{ flex: 1 }} />

        {!isSelf && currentUserId && (
          <button
            onClick={toggleFollow}
            disabled={followLoading}
            style={{
              padding: '8px 18px',
              background: isFollowing ? '#fff' : '#111',
              color: isFollowing ? '#111' : '#fff',
              border: `1.5px solid ${isFollowing ? '#E0E0E0' : '#111'}`,
              borderRadius: 9, fontWeight: 700, fontSize: 13,
              cursor: 'pointer', opacity: followLoading ? 0.6 : 1,
            }}
          >
            {followLoading ? '...' : isFollowing ? '팔로잉' : '팔로우'}
          </button>
        )}

        {isSelf && (
          <button
            onClick={() => router.push('/profile')}
            style={{ background: 'none', border: '1.5px solid #E0E0E0', borderRadius: 9, padding: '7px 14px', fontSize: 13, fontWeight: 700, color: '#111', cursor: 'pointer' }}
          >
            편집
          </button>
        )}
      </header>

      {/* 프로필 영역 */}
      <div style={{ padding: '28px 20px 24px', borderBottom: '1px solid #F0F0F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
          <Avatar name={profile.nickname} size={72} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '-0.5px', marginBottom: 5 }}>
              {profile.nickname || '닉네임 없음'}
            </p>
            {profile.taste_mbti && (
              <span style={{ display: 'inline-block', fontSize: 11, color: '#555', background: '#F3F3F3', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                {profile.taste_mbti}
              </span>
            )}
          </div>
        </div>

        {profile.bio && (
          <p style={{ fontSize: 13, color: '#555', lineHeight: 1.65, marginBottom: 18 }}>
            {profile.bio}
          </p>
        )}

        <div style={{ display: 'flex', borderTop: '1px solid #F0F0F0', paddingTop: 18 }}>
          {[
            { label: '리뷰', value: reviews.length },
            { label: '팔로워', value: followerCount },
            { label: '팔로잉', value: followingCount },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid #F0F0F0' : 'none' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: '#999', marginTop: 2, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', background: '#fff' }}>
        {([
          { key: 'reviews', label: `리뷰 ${reviews.length}` },
          { key: 'taste', label: '맛 성향' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, background: 'none', border: 'none', padding: '14px 0',
              fontSize: 13, fontWeight: activeTab === t.key ? 800 : 500,
              color: activeTab === t.key ? '#111' : '#999',
              borderBottom: activeTab === t.key ? '2px solid #111' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 리뷰 탭 */}
      {activeTab === 'reviews' && (
        <div style={{ background: '#FAFAFA', minHeight: 200 }}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '72px 24px', color: '#999' }}>
              <p style={{ fontSize: 40, marginBottom: 16 }}>📝</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>아직 작성한 리뷰가 없어요</p>
              <p style={{ fontSize: 13, lineHeight: 1.65 }}>
                {isSelf ? '첫 번째 맛집 리뷰를 남겨보세요!' : '이 유저는 아직 리뷰가 없어요'}
              </p>
              {isSelf && (
                <button
                  onClick={() => router.push('/review/write')}
                  style={{ marginTop: 24, padding: '13px 32px', background: '#111', color: '#fff', border: 'none', borderRadius: 28, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  리뷰 작성하기
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, padding: '14px 12px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {leftCol.map((r) => (
                  <ReviewCard key={r.id} review={r} expanded={expandedReview === r.id} onToggle={() => setExpandedReview(expandedReview === r.id ? null : r.id)} />
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {rightCol.map((r) => (
                  <ReviewCard key={r.id} review={r} expanded={expandedReview === r.id} onToggle={() => setExpandedReview(expandedReview === r.id ? null : r.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 맛 성향 탭 */}
      {activeTab === 'taste' && (
        <div style={{ padding: '24px 20px' }}>
          {profile.taste_mbti && (
            <div style={{ background: '#F7F7F7', borderRadius: 16, padding: '18px 20px', marginBottom: 24, border: '1px solid #E8E8E8' }}>
              <p style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: 8 }}>맛 유형</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#111', letterSpacing: '-0.4px' }}>{profile.taste_mbti}</p>
            </div>
          )}
          <p style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: 16 }}>맛 성향 분석</p>
          <TasteBar label="🌶️ 맵기" value={profile.taste_spicy ?? 3} />
          <TasteBar label="🧂 짠기" value={profile.taste_salty ?? 3} />
          <TasteBar label="🍯 단기" value={profile.taste_sweet ?? 3} />
          <TasteBar label="🍋 신기" value={profile.taste_sour ?? 3} />
          <TasteBar label="🥩 풍미" value={profile.taste_rich ?? 3} />
        </div>
      )}

      {/* 하단 네비게이션 */}
      <nav
        style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, background: '#fff',
          borderTop: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', height: 60, zIndex: 200,
        }}
      >
        {navItems.map((item) => (
          <div key={item.path} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {item.icon === null ? (
              <button
                onClick={() => router.push('/review/write')}
                style={{ width: 42, height: 42, borderRadius: 14, background: '#111', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => router.push(item.path)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', minWidth: 44 }}
              >
                {item.icon}
                <span style={{ fontSize: 10, color: item.active ? '#111' : '#999', fontWeight: item.active ? 700 : 400 }}>
                  {item.label}
                </span>
              </button>
            )}
          </div>
        ))}
      </nav>
    </div>
  )
}
