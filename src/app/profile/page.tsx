'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* =========================================================
   타입 정의
   ========================================================= */
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

/* =========================================================
   유틸리티
   ========================================================= */
const supabase = createClient()

function parsePhotos(photos: string | string[] | null): string[] {
  if (!photos) return []
  if (Array.isArray(photos)) return photos.filter(Boolean)
  try {
    const parsed = JSON.parse(photos)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [photos]
  } catch {
    return [photos]
  }
}

function generateNickname(): string {
  const adj = ['맛있는', '배고픈', '즐거운', '행복한', '신나는', '귀여운', '멋진', '용감한']
  const noun = ['미식가', '탐험가', '요리사', '먹방러', '맛집러', '구루메', '푸디', '셰프']
  return `${adj[Math.floor(Math.random() * adj.length)]}${noun[Math.floor(Math.random() * noun.length)]}${Math.floor(Math.random() * 9000) + 1000}`
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

const TASTE_MBTI_LIST = [
  '🌶️ 매운맛 탐험가', '🧂 짭조름한 미식가', '🍯 달달한 디저트러버',
  '🥩 고기 마니아', '🐟 해산물 전문가', '🌿 채식 지향가',
  '☕ 카페 순례자', '🍜 면요리 전도사', '🍱 한식 지킴이', '🌍 세계음식 탐험가',
]

/* =========================================================
   Avatar
   ========================================================= */
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

/* =========================================================
   TasteBar — 흑백
   ========================================================= */
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

/* =========================================================
   ReviewCard — 핀터레스트 스타일
   ========================================================= */
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
      {/* 사진 */}
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

      {/* 본문 */}
      <div style={{ padding: '12px 14px 14px' }}>
        {/* 가게명 + 날짜 */}
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

        {/* 카테고리 칩 */}
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

        {/* 메뉴명 + 별점 */}
        {review.menu_name && (
          <p style={{ fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 500 }}>
            {review.menu_name}
            {review.total_rating != null && (
              <span style={{ marginLeft: 6, color: '#111', fontWeight: 800 }}>
                {'★'.repeat(Math.round(review.total_rating))}
                <span style={{ fontWeight: 400, color: '#999', fontSize: 10 }}>
                  {' '}{review.total_rating.toFixed(1)}
                </span>
              </span>
            )}
          </p>
        )}

        {/* 한줄 리뷰 */}
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

        {/* 상세 내용 (펼쳤을 때) */}
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

        {/* 태그 */}
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

        {/* 더보기 버튼 */}
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

/* =========================================================
   메인 ProfilePage
   ========================================================= */
export default function ProfilePage() {
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [expandedReview, setExpandedReview] = useState<string | null>(null)
  const [editNickname, setEditNickname] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editMBTI, setEditMBTI] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'reviews' | 'taste'>('reviews')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [profileRes, reviewsRes, followerRes, followingRes] = await Promise.all([
        supabase.from('user_taste_profile').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('reviews')
          .select('id, created_at, menu_name, one_line_review, content, total_rating, photos, tags, store_id, stores(id, name, category, address)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
      ])

      if (profileRes.data) {
        setProfile(profileRes.data)
        setEditNickname(profileRes.data.nickname || '')
        setEditBio(profileRes.data.bio || '')
        setEditMBTI(profileRes.data.taste_mbti || '')
      } else {
        const nick = generateNickname()
        const { data: newP } = await supabase
          .from('user_taste_profile')
          .upsert({ user_id: user.id, nickname: nick }, { onConflict: 'user_id' })
          .select()
          .maybeSingle()
        if (newP) {
          setProfile(newP)
          setEditNickname(newP.nickname || '')
        }
      }

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
    } catch (err) {
      console.error('프로필 로드 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    try {
      await supabase
        .from('user_taste_profile')
        .update({
          nickname: editNickname.trim() || profile.nickname,
          bio: editBio.trim(),
          taste_mbti: editMBTI,
        })
        .eq('user_id', profile.user_id)
      setProfile((p) =>
        p
          ? {
              ...p,
              nickname: editNickname.trim() || p.nickname,
              bio: editBio.trim(),
              taste_mbti: editMBTI,
            }
          : p
      )
      setEditing(false)
    } catch {
      alert('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  /* ─── 메이슨리 2열 분배 ─── */
  const leftCol = reviews.filter((_, i) => i % 2 === 0)
  const rightCol = reviews.filter((_, i) => i % 2 === 1)

  /* ─── 로딩 ─── */
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#fff',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        }}
      >
        <button
          onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 32 }}
        >
          <img src="/yum2.png" alt="YumMap" style={{ height: 28, objectFit: 'contain' }} />
        </button>
        <div
          style={{
            width: 32,
            height: 32,
            border: '2.5px solid #F0F0F0',
            borderTop: '2.5px solid #111',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ─── 네비게이션 아이템 ─── */
  const navItems: { icon: React.ReactNode; label: string; path: string; active: boolean }[] = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
      label: '홈',
      path: '/feed',
      active: false,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      ),
      label: '탐색',
      path: '/map',
      active: false,
    },
    { icon: null, label: '리뷰', path: '/review/write', active: false },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
      label: '저장',
      path: '/saved',
      active: false,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#111" stroke="#111" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      label: '프로필',
      path: '/profile',
      active: true,
    },
  ]

  /* ─── 렌더 ─── */
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

      {/* ══ 헤더 ══ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 200,
          background: '#fff',
          borderBottom: '1px solid #F0F0F0',
          height: 54,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
        }}
      >
        {/* 로고 — yum2.png 고정, 클릭 시 /feed */}
        <button
          onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          aria-label="YumMap 홈"
        >
          <img src="/yum2.png" alt="YumMap" style={{ height: 28, objectFit: 'contain', display: 'block' }} />
        </button>

        {/* 편집 버튼 */}
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            style={{
              background: 'none',
              border: '1.5px solid #E0E0E0',
              borderRadius: 9,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 700,
              color: '#111',
              cursor: 'pointer',
              letterSpacing: '-0.2px',
            }}
          >
            편집
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setEditing(false)}
              style={{
                background: '#F5F5F5',
                border: 'none',
                borderRadius: 9,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                color: '#555',
                cursor: 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: '#111',
                border: 'none',
                borderRadius: 9,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '저장중...' : '저장'}
            </button>
          </div>
        )}
      </header>

      {/* ══ 프로필 영역 ══ */}
      <div style={{ padding: '28px 20px 24px', borderBottom: '1px solid #F0F0F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
          <Avatar name={profile?.nickname} size={72} />
          <div style={{ flex: 1 }}>
            {editing ? (
              <input
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                placeholder="닉네임"
                style={{
                  width: '100%',
                  fontSize: 16,
                  fontWeight: 700,
                  border: '1.5px solid #E0E0E0',
                  borderRadius: 10,
                  padding: '7px 11px',
                  outline: 'none',
                  marginBottom: 6,
                  color: '#111',
                  letterSpacing: '-0.3px',
                }}
              />
            ) : (
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#111',
                  letterSpacing: '-0.5px',
                  marginBottom: 5,
                }}
              >
                {profile?.nickname || '닉네임 없음'}
              </p>
            )}
            {profile?.taste_mbti && !editing && (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  color: '#555',
                  background: '#F3F3F3',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontWeight: 600,
                }}
              >
                {profile.taste_mbti}
              </span>
            )}
          </div>
        </div>

        {/* 편집 — 맛 MBTI 선택 */}
        {editing && (
          <div style={{ marginBottom: 14 }}>
            <p
              style={{
                fontSize: 11,
                color: '#999',
                fontWeight: 600,
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              맛 MBTI
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TASTE_MBTI_LIST.map((m) => (
                <button
                  key={m}
                  onClick={() => setEditMBTI(m)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 20,
                    fontSize: 12,
                    border: editMBTI === m ? '1.5px solid #111' : '1.5px solid #E0E0E0',
                    background: editMBTI === m ? '#111' : '#fff',
                    color: editMBTI === m ? '#fff' : '#555',
                    cursor: 'pointer',
                    fontWeight: editMBTI === m ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 자기소개 */}
        {editing ? (
          <textarea
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            placeholder="자기소개를 입력하세요"
            style={{
              width: '100%',
              border: '1.5px solid #E0E0E0',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              resize: 'none',
              height: 72,
              outline: 'none',
              color: '#111',
              lineHeight: 1.55,
              marginBottom: 16,
            }}
          />
        ) : (
          profile?.bio && (
            <p
              style={{
                fontSize: 13,
                color: '#555',
                lineHeight: 1.65,
                marginBottom: 18,
              }}
            >
              {profile.bio}
            </p>
          )
        )}

        {/* 통계 */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderTop: '1px solid #F0F0F0',
            paddingTop: 18,
          }}
        >
          {[
            { label: '리뷰', value: reviews.length },
            { label: '팔로워', value: followerCount },
            { label: '팔로잉', value: followingCount },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                textAlign: 'center',
                borderRight: i < 2 ? '1px solid #F0F0F0' : 'none',
              }}
            >
              <p style={{ fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>
                {s.value}
              </p>
              <p style={{ fontSize: 11, color: '#999', marginTop: 2, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ 탭 ══ */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #F0F0F0',
          background: '#fff',
        }}
      >
        {([
          { key: 'reviews', label: `리뷰 ${reviews.length}` },
          { key: 'taste', label: '맛 성향' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '14px 0',
              fontSize: 13,
              fontWeight: activeTab === t.key ? 800 : 500,
              color: activeTab === t.key ? '#111' : '#999',
              borderBottom: activeTab === t.key ? '2px solid #111' : '2px solid transparent',
              cursor: 'pointer',
              letterSpacing: '-0.2px',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ 탭 컨텐츠 ══ */}

      {/* 리뷰 탭 — 메이슨리 2열 */}
      {activeTab === 'reviews' && (
        <div style={{ background: '#FAFAFA', minHeight: 200 }}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '72px 24px', color: '#999' }}>
              <p style={{ fontSize: 40, marginBottom: 16 }}>📝</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>
                아직 작성한 리뷰가 없어요
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.65 }}>첫 번째 맛집 리뷰를 남겨보세요!</p>
              <button
                onClick={() => router.push('/review/write')}
                style={{
                  marginTop: 24,
                  padding: '13px 32px',
                  background: '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 28,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  letterSpacing: '-0.2px',
                }}
              >
                리뷰 작성하기
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: '14px 12px',
                alignItems: 'flex-start',
              }}
            >
              {/* 왼쪽 열 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {leftCol.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    expanded={expandedReview === r.id}
                    onToggle={() =>
                      setExpandedReview(expandedReview === r.id ? null : r.id)
                    }
                  />
                ))}
              </div>
              {/* 오른쪽 열 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {rightCol.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    expanded={expandedReview === r.id}
                    onToggle={() =>
                      setExpandedReview(expandedReview === r.id ? null : r.id)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 맛 성향 탭 */}
      {activeTab === 'taste' && profile && (
        <div style={{ padding: '24px 20px' }}>
          {/* 맛 MBTI 카드 */}
          {profile.taste_mbti && (
            <div
              style={{
                background: '#F7F7F7',
                borderRadius: 16,
                padding: '18px 20px',
                marginBottom: 24,
                border: '1px solid #E8E8E8',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: '#999',
                  fontWeight: 600,
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                나의 맛 유형
              </p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#111', letterSpacing: '-0.4px' }}>
                {profile.taste_mbti}
              </p>
            </div>
          )}

          {/* 맛 성향 바 */}
          <p
            style={{
              fontSize: 11,
              color: '#999',
              fontWeight: 600,
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            맛 성향 분석
          </p>
          <TasteBar label="🌶️ 맵기" value={profile.taste_spicy ?? 3} />
          <TasteBar label="🧂 짠기" value={profile.taste_salty ?? 3} />
          <TasteBar label="🍯 단기" value={profile.taste_sweet ?? 3} />
          <TasteBar label="🍋 신기" value={profile.taste_sour ?? 3} />
          <TasteBar label="🥩 풍미" value={profile.taste_rich ?? 3} />
        </div>
      )}

      {/* ══ 하단 네비게이션 ══ */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          background: '#fff',
          borderTop: '1px solid #F0F0F0',
          display: 'flex',
          alignItems: 'center',
          height: 60,
          zIndex: 200,
        }}
      >
        {navItems.map((item) => (
          <div
            key={item.path}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            {item.icon === null ? (
              <button
                onClick={() => router.push('/review/write')}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: '#111',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="리뷰 작성"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => router.push(item.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '6px 0',
                  minWidth: 44,
                }}
                aria-label={item.label}
              >
                {item.icon}
                <span
                  style={{
                    fontSize: 10,
                    color: item.active ? '#111' : '#999',
                    fontWeight: item.active ? 700 : 400,
                    letterSpacing: '-0.2px',
                  }}
                >
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
