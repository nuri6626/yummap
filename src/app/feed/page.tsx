'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* =========================================================
   타입 정의
   ========================================================= */
interface StoreInfo {
  id: string
  name: string
  category: string
  address: string
}

interface UserProfile {
  nickname: string
  bio?: string
  taste_mbti?: string
}

interface Review {
  id: string
  user_id: string
  store_id: string
  menu_name: string
  one_line_review: string
  content: string
  total_rating: number
  revisit: boolean
  photos: string | string[]
  tags: string[]
  created_at: string
  menu_price?: number
  saltiness?: number
  spiciness?: number
  sweetness?: number
  oiliness?: number
  umami?: number
  desired_price?: number
  store?: StoreInfo
  user?: UserProfile
}

interface Comment {
  id: string
  review_id: string
  user_id: string
  content: string
  created_at: string
  user?: UserProfile
}

interface MiniProfile {
  userId: string
  nickname: string
  bio?: string
  taste_mbti?: string
  reviewCount: number
  isFollowing: boolean
}

/* =========================================================
   유틸리티
   ========================================================= */
const supabase = createClient()

function parsePhotos(photos: string | string[] | null | undefined): string[] {
  if (!photos) return []
  if (Array.isArray(photos)) return photos.filter(Boolean)
  try {
    const parsed = JSON.parse(photos)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return photos ? [photos] : []
  }
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

function getInitial(name?: string): string {
  return name ? name.charAt(0).toUpperCase() : '?'
}

function getAvatarBg(name?: string): string {
  const colors = ['#1a1a1a', '#2d2d2d', '#404040', '#333', '#555', '#222']
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

/* =========================================================
   Avatar — 흑백
   ========================================================= */
function Avatar({ name, size = 32 }: { name?: string; size?: number }) {
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
   TasteModal
   ========================================================= */
function TasteModal({ review, onClose }: { review: Review; onClose: () => void }) {
  const tastes = [
    { label: '짠맛', value: review.saltiness },
    { label: '매운맛', value: review.spiciness },
    { label: '단맛', value: review.sweetness },
    { label: '기름짐', value: review.oiliness },
    { label: '감칠맛', value: review.umami },
  ].filter((t) => t.value !== undefined && t.value !== null)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: '28px 24px 44px',
          width: '100%',
          maxWidth: 480,
          maxHeight: '75vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: 36,
            height: 3,
            borderRadius: 2,
            background: '#E0E0E0',
            margin: '0 auto 24px',
          }}
        />
        <p style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: 4 }}>
          맛 분석 리포트
        </p>
        <p style={{ fontSize: 12, color: '#999', marginBottom: 24 }}>
          {review.store?.name} · {review.menu_name}
        </p>
        {tastes.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px 0', fontSize: 14 }}>
            맛 분석 데이터가 없습니다
          </p>
        ) : (
          tastes.map((t) => (
            <div key={t.label} style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 7,
                }}
              >
                <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{t.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>
                  {t.value}
                  <span style={{ fontWeight: 400, color: '#999' }}>/10</span>
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: '#F0F0F0',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(((t.value as number) || 0) / 10) * 100}%`,
                    background: '#111',
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))
        )}
        {review.desired_price && (
          <div
            style={{
              marginTop: 24,
              padding: '16px 18px',
              background: '#F7F7F7',
              borderRadius: 12,
              border: '1px solid #E8E8E8',
            }}
          >
            <p style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              적정 가격 제안
            </p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#111', marginTop: 6 }}>
              ₩{review.desired_price.toLocaleString()}
            </p>
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '15px',
            background: '#111',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            marginTop: 28,
            letterSpacing: '-0.2px',
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}

/* =========================================================
   ProfileModal
   ========================================================= */
function ProfileModal({
  profile,
  onClose,
  onFollow,
  currentUserId,
}: {
  profile: MiniProfile
  onClose: () => void
  onFollow: (userId: string, isFollowing: boolean) => void
  currentUserId: string | null
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: '28px 24px 44px',
          width: '100%',
          maxWidth: 480,
        }}
      >
        <div
          style={{
            width: 36,
            height: 3,
            borderRadius: 2,
            background: '#E0E0E0',
            margin: '0 auto 24px',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 20,
          }}
        >
          <Avatar name={profile.nickname} size={56} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>{profile.nickname}</p>
            {profile.taste_mbti && (
              <p style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{profile.taste_mbti}</p>
            )}
            <p style={{ fontSize: 12, color: '#999', marginTop: 3 }}>
              리뷰 {profile.reviewCount}개
            </p>
          </div>
          {currentUserId && currentUserId !== profile.userId && (
            <button
              onClick={() => onFollow(profile.userId, profile.isFollowing)}
              style={{
                padding: '9px 20px',
                background: profile.isFollowing ? '#fff' : '#111',
                color: profile.isFollowing ? '#111' : '#fff',
                border: `1.5px solid ${profile.isFollowing ? '#E0E0E0' : '#111'}`,
                borderRadius: 9,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                letterSpacing: '-0.2px',
              }}
            >
              {profile.isFollowing ? '팔로잉' : '팔로우'}
            </button>
          )}
        </div>
        {profile.bio && (
          <p
            style={{
              fontSize: 13,
              color: '#555',
              lineHeight: 1.65,
              marginBottom: 20,
              paddingTop: 16,
              borderTop: '1px solid #F0F0F0',
            }}
          >
            {profile.bio}
          </p>
        )}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: 13,
            background: '#F5F5F5',
            border: 'none',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            color: '#111',
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}

/* =========================================================
   CommentsSection
   ========================================================= */
function CommentsSection({
  reviewId,
  currentUserId,
}: {
  reviewId: string
  currentUserId: string | null
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase
      .from('comments')
      .select('*, user:user_profiles(nickname)')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setComments(data as Comment[])
      })
  }, [reviewId])

  const handleSubmit = async () => {
    if (!input.trim() || !currentUserId) return
    setSubmitting(true)
    const { data } = await supabase
      .from('comments')
      .insert({ review_id: reviewId, user_id: currentUserId, content: input })
      .select('*, user:user_profiles(nickname)')
      .single()
    if (data) setComments((prev) => [...prev, data as Comment])
    setInput('')
    setSubmitting(false)
  }

  return (
    <div style={{ borderTop: '1px solid #F0F0F0', marginTop: 10, paddingTop: 12 }}>
      {comments.slice(0, 3).map((c) => (
        <p
          key={c.id}
          style={{
            fontSize: 13,
            color: '#111',
            marginBottom: 6,
            lineHeight: 1.55,
          }}
        >
          <span style={{ fontWeight: 700 }}>{c.user?.nickname || '익명'}</span>{' '}
          <span style={{ color: '#444' }}>{c.content}</span>
        </p>
      ))}
      {comments.length > 3 && (
        <p style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
          댓글 {comments.length}개 모두 보기
        </p>
      )}
      {currentUserId && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 10,
          }}
        >
          <Avatar name={currentUserId} size={24} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="댓글 추가..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: '#111',
              background: 'transparent',
            }}
          />
          {input.trim() && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                background: 'none',
                border: 'none',
                color: '#111',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              게시
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   PinterestCard — 단일 카드 (핀터레스트 스타일)
   ========================================================= */
function PinterestCard({
  review,
  currentUserId,
  isLiked,
  isSaved,
  likeCount,
  onLike,
  onSave,
  onTaste,
  onProfileClick,
}: {
  review: Review
  currentUserId: string | null
  isLiked: boolean
  isSaved: boolean
  likeCount: number
  onLike: () => void
  onSave: () => void
  onTaste: () => void
  onProfileClick: () => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const photos = parsePhotos(review.photos)
  const tags = Array.isArray(review.tags) ? review.tags : []
  const photo = photos[0] || null
  const hasPhoto = !!photo

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
      {hasPhoto ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            background: '#F0F0F0',
            overflow: 'hidden',
          }}
        >
          <img
            src={photo}
            alt={review.menu_name}
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
            style={{
              width: '100%',
              display: 'block',
              objectFit: 'cover',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />
          {/* 저장 버튼 오버레이 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSave()
            }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: isSaved ? '#111' : 'rgba(255,255,255,0.92)',
              border: 'none',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              color: isSaved ? '#fff' : '#111',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              letterSpacing: '-0.2px',
            }}
          >
            {isSaved ? '저장됨' : '저장'}
          </button>
          {photos.length > 1 && (
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
              +{photos.length - 1}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            height: 120,
            background: '#F7F7F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 32 }}>🍽️</span>
        </div>
      )}

      {/* 본문 */}
      <div style={{ padding: '12px 14px 14px' }}>
        {/* 가게 & 메뉴 */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: '#111',
            marginBottom: 3,
            lineHeight: 1.3,
            letterSpacing: '-0.3px',
          }}
        >
          {review.store?.name || '가게 정보 없음'}
        </p>
        <p style={{ fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 500 }}>
          {review.menu_name}
          {review.total_rating > 0 && (
            <span style={{ marginLeft: 6, color: '#111', fontWeight: 700 }}>
              {'★'.repeat(Math.round(review.total_rating))}
              <span style={{ fontWeight: 400, color: '#999', fontSize: 11 }}>
                {' '}{review.total_rating.toFixed(1)}
              </span>
            </span>
          )}
        </p>

        {/* 한줄 리뷰 */}
        {review.one_line_review && (
          <p
            style={{
              fontSize: 12,
              color: '#444',
              lineHeight: 1.55,
              marginBottom: 8,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {review.one_line_review}
          </p>
        )}

        {/* 태그 */}
        {tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              marginBottom: 10,
            }}
          >
            {tags.slice(0, 3).map((tag) => (
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

        {/* 하단 액션 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 10,
            borderTop: '1px solid #F3F3F3',
          }}
        >
          {/* 작성자 */}
          <div
            onClick={onProfileClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              cursor: 'pointer',
              flex: 1,
              minWidth: 0,
            }}
          >
            <Avatar name={review.user?.nickname} size={26} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#333',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {review.user?.nickname || '익명'}
            </span>
          </div>

          {/* 액션 아이콘 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={onLike}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                padding: '4px 6px',
                borderRadius: 8,
                color: isLiked ? '#111' : '#999',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isLiked ? '#111' : 'none'}
                stroke={isLiked ? '#111' : '#999'}
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likeCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700 }}>{likeCount}</span>
              )}
            </button>
            <button
              onClick={() => setShowComments((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 8,
                color: '#999',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#999"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <button
              onClick={onTaste}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 8,
                color: '#999',
                fontSize: 15,
                lineHeight: 1,
              }}
            >
              ···
            </button>
          </div>
        </div>

        {/* 댓글 섹션 */}
        {showComments && (
          <CommentsSection reviewId={review.id} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  )
}

/* =========================================================
   Masonry Grid — 핀터레스트 2열 폭포 레이아웃
   ========================================================= */
function MasonryGrid({
  reviews,
  currentUserId,
  likedMap,
  savedMap,
  likeCountMap,
  onLike,
  onSave,
  onTaste,
  onProfileClick,
}: {
  reviews: Review[]
  currentUserId: string | null
  likedMap: Record<string, boolean>
  savedMap: Record<string, boolean>
  likeCountMap: Record<string, number>
  onLike: (r: Review) => void
  onSave: (r: Review) => void
  onTaste: (r: Review) => void
  onProfileClick: (r: Review) => void
}) {
  const left = reviews.filter((_, i) => i % 2 === 0)
  const right = reviews.filter((_, i) => i % 2 === 1)

  const renderCol = (col: Review[]) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      {col.map((r) => (
        <PinterestCard
          key={r.id}
          review={r}
          currentUserId={currentUserId}
          isLiked={likedMap[r.id] ?? false}
          isSaved={savedMap[r.id] ?? false}
          likeCount={likeCountMap[r.id] ?? 0}
          onLike={() => onLike(r)}
          onSave={() => onSave(r)}
          onTaste={() => onTaste(r)}
          onProfileClick={() => onProfileClick(r)}
        />
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 10, padding: '14px 12px', alignItems: 'flex-start' }}>
      {renderCol(left)}
      {renderCol(right)}
    </div>
  )
}

/* =========================================================
   메인 FeedPage
   ========================================================= */
export default function FeedPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'following'>('all')
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({})
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})
  const [likeCountMap, setLikeCountMap] = useState<Record<string, number>>({})
  const [tasteModal, setTasteModal] = useState<Review | null>(null)
  const [profileModal, setProfileModal] = useState<MiniProfile | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  /* ─── 데이터 로드 ─── */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      setCurrentUser(uid)

      const [reviewsRes, followsRes, likesRes, savesRes] = await Promise.all([
        supabase
          .from('reviews')
          .select(
            '*, store:stores(id,name,category,address), user:user_profiles(nickname,bio,taste_mbti)'
          )
          .order('created_at', { ascending: false })
          .limit(60),
        uid
          ? supabase.from('follows').select('following_id').eq('follower_id', uid)
          : Promise.resolve({ data: [] as { following_id: string }[] }),
        uid
          ? supabase.from('likes').select('review_id').eq('user_id', uid)
          : Promise.resolve({ data: [] as { review_id: string }[] }),
        uid
          ? supabase.from('saved_stores').select('store_id').eq('user_id', uid)
          : Promise.resolve({ data: [] as { store_id: string }[] }),
      ])

      const allReviews: Review[] = (reviewsRes.data || []) as Review[]
      const followIds = new Set(
        (followsRes.data || []).map((f) => (f as { following_id: string }).following_id)
      )
      const likedIds = new Set(
        (likesRes.data || []).map((l) => (l as { review_id: string }).review_id)
      )
      const savedIds = new Set(
        (savesRes.data || []).map((s) => (s as { store_id: string }).store_id)
      )

      setReviews(allReviews)
      setFollowingIds(followIds)

      const lm: Record<string, boolean> = {}
      const sm: Record<string, boolean> = {}
      const lcm: Record<string, number> = {}
      for (const r of allReviews) {
        lm[r.id] = likedIds.has(r.id)
        sm[r.id] = savedIds.has(r.store_id)
        lcm[r.id] = 0
      }
      setLikedMap(lm)
      setSavedMap(sm)
      setLikeCountMap(lcm)

      await Promise.all(
        allReviews.map(async (r) => {
          const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('review_id', r.id)
          setLikeCountMap((prev) => ({ ...prev, [r.id]: count || 0 }))
        })
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ─── 검색창 토글 ─── */
  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus()
  }, [showSearch])

  /* ─── 좋아요 ─── */
  const handleLike = useCallback(
    async (review: Review) => {
      if (!currentUser) { router.push('/login'); return }
      const isLiked = likedMap[review.id]
      setLikedMap((prev) => ({ ...prev, [review.id]: !isLiked }))
      setLikeCountMap((prev) => ({
        ...prev,
        [review.id]: (prev[review.id] || 0) + (isLiked ? -1 : 1),
      }))
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', currentUser).eq('review_id', review.id)
      } else {
        await supabase.from('likes').insert({ user_id: currentUser, review_id: review.id })
      }
    },
    [currentUser, likedMap, router]
  )

  /* ─── 저장 ─── */
  const handleSave = useCallback(
    async (review: Review) => {
      if (!currentUser) { router.push('/login'); return }
      const isSaved = savedMap[review.id]
      setSavedMap((prev) => ({ ...prev, [review.id]: !isSaved }))
      if (isSaved) {
        await supabase
          .from('saved_stores')
          .delete()
          .eq('user_id', currentUser)
          .eq('store_id', review.store_id)
      } else {
        await supabase
          .from('saved_stores')
          .insert({ user_id: currentUser, store_id: review.store_id })
      }
    },
    [currentUser, savedMap]
  )

  /* ─── 팔로우 ─── */
  const handleFollow = useCallback(
    async (userId: string, isFollowing: boolean) => {
      if (!currentUser) return
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser)
          .eq('following_id', userId)
        setFollowingIds((prev) => {
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUser, following_id: userId })
        setFollowingIds((prev) => new Set([...prev, userId]))
      }
      setProfileModal((prev) => (prev ? { ...prev, isFollowing: !isFollowing } : null))
    },
    [currentUser]
  )

  /* ─── 프로필 모달 ─── */
  const openProfileModal = useCallback(
    async (review: Review) => {
      const { count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', review.user_id)
      setProfileModal({
        userId: review.user_id,
        nickname: review.user?.nickname || '익명',
        bio: review.user?.bio,
        taste_mbti: review.user?.taste_mbti,
        reviewCount: count || 0,
        isFollowing: followingIds.has(review.user_id),
      })
    },
    [followingIds]
  )

  /* ─── 필터링 ─── */
  const filteredReviews = reviews
    .filter((r) => (tab === 'following' ? followingIds.has(r.user_id) : true))
    .filter((r) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        r.store?.name?.toLowerCase().includes(q) ||
        r.menu_name?.toLowerCase().includes(q) ||
        r.one_line_review?.toLowerCase().includes(q) ||
        r.store?.address?.toLowerCase().includes(q)
      )
    })

  /* ─── 네비게이션 ─── */
  const navItems: {
    icon: React.ReactNode
    label: string
    path: string
    active: boolean
  }[] = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#111" stroke="none">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
      label: '홈',
      path: '/feed',
      active: true,
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
    {
      icon: null,
      label: '리뷰',
      path: '/review/write',
      active: false,
    },
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      label: '프로필',
      path: '/profile',
      active: false,
    },
  ]

  /* ─── 로딩 ─── */
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#fff',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        }}
      >
        <button
          onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 32 }}
        >
          <img src="/yum2.png" alt="YumMap" style={{ height: 30, objectFit: 'contain' }} />
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

  /* ─── 렌더 ─── */
  return (
    <div
      style={{
        background: '#fff',
        minHeight: '100vh',
        maxWidth: 480,
        margin: '0 auto',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        position: 'relative',
      }}
    >
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        *::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
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
          padding: '0 14px',
          gap: 10,
        }}
      >
        {/* 로고 — yum2.png 고정, 클릭 시 /feed */}
        <button
          onClick={() => router.push('/feed')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
          aria-label="YumMap 홈"
        >
          <img
            src="/yum2.png"
            alt="YumMap"
            style={{ height: 28, objectFit: 'contain', display: 'block' }}
          />
        </button>

        {/* 검색 입력 — 핀터레스트식 pill 형태 */}
        <div
          style={{
            flex: 1,
            height: 36,
            background: '#F3F3F3',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="가게나 메뉴 검색"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              color: '#111',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#999',
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* 리뷰 작성 */}
        <button
          onClick={() => router.push('/review/write')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            flexShrink: 0,
          }}
          aria-label="리뷰 작성"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </header>

      {/* ══ 탭 ══ */}
      <div
        style={{
          background: '#fff',
          display: 'flex',
          padding: '10px 14px 0',
          gap: 6,
          borderBottom: '1px solid #F0F0F0',
        }}
      >
        {(['all', 'following'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 4px',
              fontSize: 14,
              fontWeight: tab === t ? 800 : 500,
              color: tab === t ? '#111' : '#999',
              borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
              marginBottom: -1,
              letterSpacing: '-0.3px',
              transition: 'all 0.15s',
            }}
          >
            {t === 'all' ? '전체' : '팔로잉'}
          </button>
        ))}
      </div>

      {/* ══ 메이슨리 피드 ══ */}
      <main style={{ paddingBottom: 80, background: '#FAFAFA' }}>
        {filteredReviews.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              color: '#999',
            }}
          >
            <p style={{ fontSize: 40, marginBottom: 16 }}>
              {searchQuery ? '🔍' : tab === 'following' ? '👥' : '🍽️'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>
              {searchQuery
                ? `"${searchQuery}" 검색 결과 없음`
                : tab === 'following'
                ? '팔로잉 리뷰가 없어요'
                : '아직 리뷰가 없어요'}
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.65 }}>
              {searchQuery
                ? '다른 키워드로 검색해보세요'
                : tab === 'following'
                ? '친구를 팔로우하고 맛집을 공유해보세요!'
                : '첫 번째 맛집 리뷰를 남겨보세요!'}
            </p>
            {!searchQuery && (
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
            )}
          </div>
        ) : (
          <MasonryGrid
            reviews={filteredReviews}
            currentUserId={currentUser}
            likedMap={likedMap}
            savedMap={savedMap}
            likeCountMap={likeCountMap}
            onLike={handleLike}
            onSave={handleSave}
            onTaste={setTasteModal}
            onProfileClick={openProfileModal}
          />
        )}
      </main>

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
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {item.icon === null ? (
              /* 가운데 + 추가 버튼 — 핀터레스트식 둥근 사각형 */
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

      {/* ══ 모달 ══ */}
      {tasteModal && (
        <TasteModal review={tasteModal} onClose={() => setTasteModal(null)} />
      )}
      {profileModal && (
        <ProfileModal
          profile={profileModal}
          onClose={() => setProfileModal(null)}
          onFollow={handleFollow}
          currentUserId={currentUser}
        />
      )}
    </div>
  )
}
