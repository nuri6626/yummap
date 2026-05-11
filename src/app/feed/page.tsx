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
  taste_me?: number
  taste_amount?: number
  taste_spicy?: number
  taste_salty?: number
  taste_sweet?: number
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
   Avatar
   ========================================================= */
function Avatar({ name, size = 32 }: { name?: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: getAvatarBg(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38,
      flexShrink: 0,
    }}>
      {getInitial(name)}
    </div>
  )
}

/* =========================================================
   ReviewDetailModal — 사진 클릭 시 풀스크린 팝업
   ========================================================= */
function ReviewDetailModal({
  review,
  currentUserId,
  isLiked,
  isSaved,
  likeCount,
  onLike,
  onSave,
  onClose,
  onProfileClick,
  followingIds,
}: {
  review: Review
  currentUserId: string | null
  isLiked: boolean
  isSaved: boolean
  likeCount: number
  onLike: () => void
  onSave: () => void
  onClose: () => void
  onProfileClick: () => void
  followingIds: Set<string>
}) {
  const router = useRouter()
  const photos = parsePhotos(review.photos)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showAllComments, setShowAllComments] = useState(false)
  const tags = Array.isArray(review.tags) ? review.tags : []

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    supabase
      .from('comments')
      .select('*, user:user_profiles(nickname)')
      .eq('review_id', review.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setComments(data as Comment[]) })
  }, [review.id])

  async function handleComment() {
    if (!commentInput.trim() || !currentUserId) return
    setSubmitting(true)
    const { data } = await supabase
      .from('comments')
      .insert({ review_id: review.id, user_id: currentUserId, content: commentInput })
      .select('*, user:user_profiles(nickname)')
      .single()
    if (data) setComments(prev => [...prev, data as Comment])
    setCommentInput('')
    setSubmitting(false)
  }

  const tasteBadges = [
    { label: '맛', emoji: '🧂', value: review.taste_me },
    { label: '양', emoji: '🍱', value: review.taste_amount },
    { label: '매운맛', emoji: '🌶️', value: review.taste_spicy },
    { label: '짠맛', emoji: '🧊', value: review.taste_salty },
    { label: '단맛', emoji: '🍯', value: review.taste_sweet },
  ].filter(b => b.value != null)

  const visibleComments = showAllComments ? comments : comments.slice(0, 3)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          maxHeight: '95vh',
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* 드래그 핸들 */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: '#E0E0E0', margin: '12px auto 0', flexShrink: 0,
        }} />

        {/* 사진 슬라이더 */}
        {photos.length > 0 && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={photos[photoIdx]}
              alt=""
              style={{
                width: '100%', maxHeight: 420,
                objectFit: 'cover', display: 'block',
              }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {/* 화살표 */}
            {photoIdx > 0 && (
              <button
                onClick={() => setPhotoIdx(i => i - 1)}
                style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.45)', color: '#fff',
                  border: 'none', borderRadius: '50%',
                  width: 34, height: 34, cursor: 'pointer',
                  fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >‹</button>
            )}
            {photoIdx < photos.length - 1 && (
              <button
                onClick={() => setPhotoIdx(i => i + 1)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.45)', color: '#fff',
                  border: 'none', borderRadius: '50%',
                  width: 34, height: 34, cursor: 'pointer',
                  fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >›</button>
            )}
            {/* 인디케이터 */}
            {photos.length > 1 && (
              <div style={{
                position: 'absolute', bottom: 10, left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', gap: 5,
              }}>
                {photos.map((_, pi) => (
                  <button
                    key={pi}
                    onClick={() => setPhotoIdx(pi)}
                    style={{
                      width: pi === photoIdx ? 16 : 6, height: 6,
                      borderRadius: 3, border: 'none', padding: 0,
                      background: pi === photoIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  />
                ))}
              </div>
            )}
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(0,0,0,0.5)', color: '#fff',
                border: 'none', borderRadius: '50%',
                width: 32, height: 32, cursor: 'pointer',
                fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>
        )}

        {/* 컨텐츠 */}
        <div style={{ padding: '18px 18px 0', flex: 1 }}>

          {/* 가게명 + 카테고리 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{
                fontSize: 18, fontWeight: 900, color: '#111',
                margin: 0, letterSpacing: -0.5,
              }}>
                {review.store?.name || '가게 정보 없음'}
              </h2>
              {review.store?.category && (
                <span style={{
                  fontSize: 11, background: '#F0F0F0', color: '#555',
                  padding: '3px 8px', borderRadius: 10, fontWeight: 600,
                }}>
                  {review.store.category}
                </span>
              )}
            </div>
            {review.store?.address && (
              <p style={{ fontSize: 12, color: '#8E8E8E', margin: 0 }}>
                📍 {review.store.address}
              </p>
            )}
          </div>

          {/* 작성자 정보 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: 14, borderBottom: '1px solid #F0F0F0', marginBottom: 14,
          }}>
            <div
              onClick={onProfileClick}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            >
              <Avatar name={review.user?.nickname} size={38} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>
                  {review.user?.nickname || '익명'}
                </p>
                {review.user?.taste_mbti && (
                  <p style={{ margin: 0, fontSize: 11, color: '#8E8E8E' }}>
                    {review.user.taste_mbti}
                  </p>
                )}
              </div>
            </div>
            <span style={{ fontSize: 11, color: '#C7C7C7' }}>
              {timeAgo(review.created_at)}
            </span>
          </div>

          {/* 메뉴명 + 별점 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            {review.menu_name && (
              <span style={{
                fontSize: 13, background: '#F7F7F7',
                padding: '5px 12px', borderRadius: 10,
                color: '#555', fontWeight: 600,
              }}>
                🍽️ {review.menu_name}
              </span>
            )}
            {review.total_rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {[1,2,3,4,5].map(s => (
                  <span key={s} style={{
                    color: s <= Math.round(review.total_rating) ? '#111' : '#E0E0E0',
                    fontSize: 16,
                  }}>★</span>
                ))}
                <span style={{ fontSize: 13, fontWeight: 800, color: '#111', marginLeft: 2 }}>
                  {review.total_rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* 한줄 리뷰 */}
          {review.one_line_review && (
            <p style={{
              fontSize: 15, fontWeight: 700, color: '#111',
              lineHeight: 1.5, margin: '0 0 10px',
            }}>
              "{review.one_line_review}"
            </p>
          )}

          {/* 상세 내용 */}
          {review.content && (
            <p style={{
              fontSize: 13, color: '#555', lineHeight: 1.7,
              margin: '0 0 14px', padding: '12px',
              background: '#FAFAFA', borderRadius: 10,
            }}>
              {review.content}
            </p>
          )}

          {/* 맛 평가 배지 */}
          {tasteBadges.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {tasteBadges.map(b => (
                <div key={b.label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: '#F7F7F7', borderRadius: 10, padding: '8px 12px', gap: 3,
                }}>
                  <span style={{ fontSize: 16 }}>{b.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{b.value}</span>
                  <span style={{ fontSize: 10, color: '#8E8E8E' }}>{b.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* 재방문 */}
          {review.revisit != null && (
            <div style={{ marginBottom: 14 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#F0F0F0', color: '#111',
                padding: '6px 14px', borderRadius: 20,
                fontSize: 12, fontWeight: 700,
              }}>
                {review.revisit ? '👍 재방문 의향 있음' : '🤔 재방문 글쎄요'}
              </span>
            </div>
          )}

          {/* 태그 */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {tags.map(tag => (
                <span key={tag} style={{
                  background: '#F0F0F0', color: '#555',
                  padding: '5px 12px', borderRadius: 20,
                  fontSize: 11, fontWeight: 600,
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 좋아요 / 저장 / 가게 보기 액션 */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 16,
            paddingTop: 14, borderTop: '1px solid #F0F0F0',
          }}>
            <button
              onClick={onLike}
              style={{
                flex: 1, padding: '11px',
                background: isLiked ? '#111' : '#F5F5F5',
                color: isLiked ? '#fff' : '#111',
                border: 'none', borderRadius: 12,
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24"
                fill={isLiked ? '#fff' : 'none'}
                stroke={isLiked ? '#fff' : '#111'} strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likeCount > 0 ? `좋아요 ${likeCount}` : '좋아요'}
            </button>
            <button
              onClick={onSave}
              style={{
                flex: 1, padding: '11px',
                background: isSaved ? '#111' : '#F5F5F5',
                color: isSaved ? '#fff' : '#111',
                border: 'none', borderRadius: 12,
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24"
                fill={isSaved ? '#fff' : 'none'}
                stroke={isSaved ? '#fff' : '#111'} strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              {isSaved ? '저장됨' : '저장'}
            </button>
            {review.store?.id && (
              <button
                onClick={() => router.push(`/store/${review.store!.id}`)}
                style={{
                  flex: 1, padding: '11px',
                  background: '#F5F5F5', color: '#111',
                  border: 'none', borderRadius: 12,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                가게 보기
              </button>
            )}
          </div>

          {/* 댓글 */}
          <div style={{ paddingBottom: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 12 }}>
              댓글 {comments.length}개
            </p>

            {visibleComments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <Avatar name={c.user?.nickname} size={28} />
                <div style={{
                  flex: 1, background: '#F7F7F7',
                  borderRadius: 10, padding: '8px 12px',
                }}>
                  <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: '#111' }}>
                    {c.user?.nickname || '익명'}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#444', lineHeight: 1.5 }}>
                    {c.content}
                  </p>
                </div>
              </div>
            ))}

            {comments.length > 3 && !showAllComments && (
              <button
                onClick={() => setShowAllComments(true)}
                style={{
                  background: 'none', border: 'none',
                  color: '#8E8E8E', fontSize: 12,
                  cursor: 'pointer', fontWeight: 600, marginBottom: 12,
                }}
              >
                댓글 {comments.length}개 모두 보기
              </button>
            )}

            {/* 댓글 입력 */}
            {currentUserId && (
              <div style={{
                display: 'flex', gap: 10, alignItems: 'center',
                paddingTop: 12, borderTop: '1px solid #F0F0F0',
              }}>
                <Avatar name={currentUserId} size={28} />
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center',
                  background: '#F5F5F5', borderRadius: 20,
                  padding: '0 14px', gap: 8,
                }}>
                  <input
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleComment()}
                    placeholder="댓글 추가..."
                    style={{
                      flex: 1, border: 'none', background: 'transparent',
                      fontSize: 13, color: '#111', padding: '10px 0', outline: 'none',
                    }}
                  />
                  {commentInput.trim() && (
                    <button
                      onClick={handleComment}
                      disabled={submitting}
                      style={{
                        background: 'none', border: 'none',
                        color: '#111', fontWeight: 700,
                        fontSize: 13, cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      게시
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   ProfileModal
   ========================================================= */
function ProfileModal({
  profile, onClose, onFollow, currentUserId,
}: {
  profile: MiniProfile
  onClose: () => void
  onFollow: (userId: string, isFollowing: boolean) => void
  currentUserId: string | null
}) {
  const router = useRouter()
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '20px 20px 0 0',
          padding: '28px 24px 44px', width: '100%', maxWidth: 480,
        }}
      >
        <div style={{
          width: 36, height: 3, borderRadius: 2,
          background: '#E0E0E0', margin: '0 auto 24px',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <Avatar name={profile.nickname} size={56} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 16, color: '#111', margin: '0 0 3px' }}>
              {profile.nickname}
            </p>
            {profile.taste_mbti && (
              <p style={{ fontSize: 12, color: '#8E8E8E', margin: '0 0 2px' }}>
                {profile.taste_mbti}
              </p>
            )}
            <p style={{ fontSize: 12, color: '#C7C7C7', margin: 0 }}>
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
                border: `1.5px solid ${profile.isFollowing ? '#DBDBDB' : '#111'}`,
                borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              {profile.isFollowing ? '팔로잉' : '팔로우'}
            </button>
          )}
        </div>
        {profile.bio && (
          <p style={{
            fontSize: 13, color: '#555', lineHeight: 1.65,
            marginBottom: 20, paddingTop: 16, borderTop: '1px solid #F0F0F0',
          }}>
            {profile.bio}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { router.push(`/profile/${profile.userId}`); onClose() }}
            style={{
              flex: 1, padding: 13, background: '#111', border: 'none',
              borderRadius: 10, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', color: '#fff',
            }}
          >
            프로필 보기
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 13, background: '#F5F5F5', border: 'none',
              borderRadius: 10, fontWeight: 600, fontSize: 14,
              cursor: 'pointer', color: '#111',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   PinterestCard — 그리드 카드 (클릭 → 모달)
   ========================================================= */
function PinterestCard({
  review, onClick,
}: {
  review: Review
  onClick: () => void
}) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const photos = parsePhotos(review.photos)
  const photo = photos[0] || null

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        marginBottom: 10, cursor: 'pointer',
        breakInside: 'avoid', display: 'inline-block', width: '100%',
        transition: 'transform 0.15s',
      }}
      onMouseDown={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.98)' }}
      onMouseUp={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)' }}
    >
      {/* 사진 — 자연스러운 비율 유지 */}
      {photo && !imgError ? (
        <div style={{ background: '#F0F0F0', overflow: 'hidden' }}>
          <img
            src={photo}
            alt={review.menu_name}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            style={{
              width: '100%', display: 'block',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.25s',
              // 비율 자유 — 사진 원본 비율 그대로
            }}
          />
        </div>
      ) : (
        <div style={{
          height: 90, background: '#F7F7F7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 28 }}>🍽️</span>
        </div>
      )}

      {/* 정보 */}
      <div style={{ padding: '10px 12px 12px' }}>
        <p style={{
          fontSize: 12, fontWeight: 800, color: '#111',
          margin: '0 0 3px', lineHeight: 1.3, letterSpacing: -0.3,
        }}>
          {review.store?.name || '가게 정보 없음'}
        </p>

        {review.menu_name && (
          <p style={{ fontSize: 11, color: '#8E8E8E', margin: '0 0 5px' }}>
            {review.menu_name}
          </p>
        )}

        {review.total_rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 5 }}>
            {[1,2,3,4,5].map(s => (
              <span key={s} style={{
                fontSize: 10,
                color: s <= Math.round(review.total_rating) ? '#111' : '#E0E0E0',
              }}>★</span>
            ))}
            <span style={{ fontSize: 10, fontWeight: 700, color: '#111', marginLeft: 2 }}>
              {review.total_rating.toFixed(1)}
            </span>
          </div>
        )}

        {review.one_line_review && (
          <p style={{
            fontSize: 11, color: '#555', lineHeight: 1.5, margin: '0 0 7px',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {review.one_line_review}
          </p>
        )}

        {/* 작성자 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Avatar name={review.user?.nickname} size={18} />
          <span style={{
            fontSize: 10, fontWeight: 600, color: '#8E8E8E',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {review.user?.nickname || '익명'}
          </span>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   FilterBar — 카테고리 + 정렬
   ========================================================= */
const CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '카페', '분식', '패스트푸드', '기타']
const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'rating', label: '별점순' },
]

function FilterBar({
  category, setCategory, sort, setSort,
}: {
  category: string
  setCategory: (c: string) => void
  sort: string
  setSort: (s: string) => void
}) {
  const [showSort, setShowSort] = useState(false)

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #F0F0F0' }}>
      {/* 카테고리 스크롤 */}
      <div style={{
        display: 'flex', overflowX: 'auto', padding: '10px 12px',
        gap: 7, scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              flexShrink: 0, padding: '7px 14px',
              borderRadius: 20, border: 'none', cursor: 'pointer',
              background: category === cat ? '#111' : '#F3F3F3',
              color: category === cat ? '#fff' : '#555',
              fontSize: 12, fontWeight: 700,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 정렬 */}
      <div style={{ padding: '0 14px 10px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSort(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1.5px solid #EFEFEF',
              borderRadius: 20, padding: '5px 12px',
              fontSize: 12, color: '#555', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.find(o => o.value === sort)?.label}
            <span style={{ fontSize: 10, color: '#C7C7C7' }}>▼</span>
          </button>
          {showSort && (
            <div style={{
              position: 'absolute', right: 0, top: '110%',
              background: '#fff', borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              zIndex: 300, overflow: 'hidden', minWidth: 100,
            }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setShowSort(false) }}
                  style={{
                    display: 'block', width: '100%',
                    padding: '11px 16px', textAlign: 'left',
                    background: sort === opt.value ? '#F7F7F7' : '#fff',
                    border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: sort === opt.value ? 700 : 400,
                    color: '#111',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   MasonryGrid — 자유 비율 2열
   ========================================================= */
function MasonryGrid({
  reviews, onCardClick,
}: {
  reviews: Review[]
  onCardClick: (r: Review) => void
}) {
  const left = reviews.filter((_, i) => i % 2 === 0)
  const right = reviews.filter((_, i) => i % 2 === 1)

  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 10px', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {left.map(r => (
          <PinterestCard key={r.id} review={r} onClick={() => onCardClick(r)} />
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {right.map(r => (
          <PinterestCard key={r.id} review={r} onClick={() => onCardClick(r)} />
        ))}
      </div>
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

  // 모달
  const [detailModal, setDetailModal] = useState<Review | null>(null)
  const [profileModal, setProfileModal] = useState<MiniProfile | null>(null)

  // 필터
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('전체')
  const [sort, setSort] = useState('latest')

  const searchRef = useRef<HTMLInputElement>(null)

  /* ─── 데이터 로드 ─── */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      setCurrentUser(uid)

      const [reviewsRes, followsRes, likesRes, savesRes] = await Promise.all([
        supabase
          .from('reviews')
          .select('*, store:stores(id,name,category,address), user:user_profiles(nickname,bio,taste_mbti)')
          .order('created_at', { ascending: false })
          .limit(80),
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
      const followIds = new Set((followsRes.data || []).map(f => (f as any).following_id as string))
      const likedIds = new Set((likesRes.data || []).map(l => (l as any).review_id as string))
      const savedIds = new Set((savesRes.data || []).map(s => (s as any).store_id as string))

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

      // 좋아요 카운트 병렬 로드
      await Promise.all(allReviews.map(async r => {
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('review_id', r.id)
        setLikeCountMap(prev => ({ ...prev, [r.id]: count || 0 }))
      }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  /* ─── 좋아요 ─── */
  const handleLike = useCallback(async (review: Review) => {
    if (!currentUser) { router.push('/login'); return }
    const isLiked = likedMap[review.id]
    setLikedMap(prev => ({ ...prev, [review.id]: !isLiked }))
    setLikeCountMap(prev => ({ ...prev, [review.id]: (prev[review.id] || 0) + (isLiked ? -1 : 1) }))
    if (isLiked) {
      await supabase.from('likes').delete().eq('user_id', currentUser).eq('review_id', review.id)
    } else {
      await supabase.from('likes').insert({ user_id: currentUser, review_id: review.id })
    }
    // 모달 열려있으면 상태 동기화
    if (detailModal?.id === review.id) {
      setDetailModal(prev => prev ? { ...prev } : null)
    }
  }, [currentUser, likedMap, detailModal, router])

  /* ─── 저장 ─── */
  const handleSave = useCallback(async (review: Review) => {
    if (!currentUser) { router.push('/login'); return }
    const isSaved = savedMap[review.id]
    setSavedMap(prev => ({ ...prev, [review.id]: !isSaved }))
    if (isSaved) {
      await supabase.from('saved_stores').delete().eq('user_id', currentUser).eq('store_id', review.store_id)
    } else {
      await supabase.from('saved_stores').insert({ user_id: currentUser, store_id: review.store_id })
    }
  }, [currentUser, savedMap, router])

  /* ─── 팔로우 ─── */
  const handleFollow = useCallback(async (userId: string, isFollowing: boolean) => {
    if (!currentUser) return
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser).eq('following_id', userId)
      setFollowingIds(prev => { const n = new Set(prev); n.delete(userId); return n })
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser, following_id: userId })
      setFollowingIds(prev => new Set([...prev, userId]))
    }
    setProfileModal(prev => prev ? { ...prev, isFollowing: !isFollowing } : null)
  }, [currentUser])

  /* ─── 프로필 모달 ─── */
  const openProfileModal = useCallback(async (review: Review) => {
    const { count } = await supabase
      .from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', review.user_id)
    setProfileModal({
      userId: review.user_id,
      nickname: review.user?.nickname || '익명',
      bio: review.user?.bio,
      taste_mbti: review.user?.taste_mbti,
      reviewCount: count || 0,
      isFollowing: followingIds.has(review.user_id),
    })
  }, [followingIds])

  /* ─── 필터링 & 정렬 ─── */
  const filteredReviews = reviews
    .filter(r => tab === 'following' ? followingIds.has(r.user_id) : true)
    .filter(r => {
      if (category !== '전체') {
        return r.store?.category?.includes(category)
      }
      return true
    })
    .filter(r => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        r.store?.name?.toLowerCase().includes(q) ||
        r.menu_name?.toLowerCase().includes(q) ||
        r.one_line_review?.toLowerCase().includes(q) ||
        r.store?.category?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sort === 'rating') return (b.total_rating || 0) - (a.total_rating || 0)
      if (sort === 'popular') return (likeCountMap[b.id] || 0) - (likeCountMap[a.id] || 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  /* ─── 로딩 ─── */
  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', background: '#fff',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      }}>
        <button
          onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginBottom: 32 }}
        >
          <img src="/yum2.png" alt="YumMap" style={{ height: 30, objectFit: 'contain' }} />
        </button>
        <div style={{
          width: 28, height: 28, border: '2.5px solid #F0F0F0',
          borderTop: '2.5px solid #111', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ─── 네비게이션 ─── */
  const navItems = [
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#111"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
      label: '홈', path: '/feed', active: true,
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
      label: '지도', path: '/map', active: false,
    },
    { icon: null, label: '작성', path: '/review/write', active: false },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
      label: '저장', path: '/saved', active: false,
    },
    {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      label: '프로필', path: '/profile', active: false,
    },
  ]

  /* ─── 렌더 ─── */
  return (
    <div style={{
      background: '#FAFAFA', minHeight: '100vh', maxWidth: 480,
      margin: '0 auto', position: 'relative',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        *::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ══ 헤더 ══ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: '#fff', borderBottom: '1px solid #F0F0F0',
        height: 54, display: 'flex', alignItems: 'center',
        padding: '0 14px', gap: 10,
      }}>
        <button
          onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
        >
          <img src="/yum2.png" alt="YumMap" style={{ height: 28, objectFit: 'contain' }} />
        </button>

        {/* 검색 pill */}
        <div style={{
          flex: 1, height: 36, background: '#F3F3F3',
          borderRadius: 20, display: 'flex', alignItems: 'center',
          padding: '0 14px', gap: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="가게나 메뉴 검색"
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', fontSize: 13, color: '#111',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 16, padding: 0 }}
            >×</button>
          )}
        </div>

        {/* 리뷰 작성 아이콘 */}
        <button
          onClick={() => router.push('/review/write')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </header>

      {/* ══ 탭 ══ */}
      <div style={{
        background: '#fff', display: 'flex',
        padding: '10px 14px 0', gap: 6,
        borderBottom: '1px solid #F0F0F0',
      }}>
        {(['all', 'following'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 4px', fontSize: 14,
              fontWeight: tab === t ? 800 : 500,
              color: tab === t ? '#111' : '#999',
              borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s', letterSpacing: -0.3,
            }}
          >
            {t === 'all' ? '전체' : '팔로잉'}
          </button>
        ))}
      </div>

      {/* ══ 필터바 ══ */}
      <FilterBar
        category={category} setCategory={setCategory}
        sort={sort} setSort={setSort}
      />

      {/* ══ 메이슨리 피드 ══ */}
      <main style={{ paddingBottom: 80 }}>
        {filteredReviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#999' }}>
            <p style={{ fontSize: 40, marginBottom: 16 }}>
              {searchQuery ? '🔍' : tab === 'following' ? '👥' : '🍽️'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>
              {searchQuery
                ? `"${searchQuery}" 검색 결과 없음`
                : tab === 'following' ? '팔로잉 리뷰가 없어요' : '아직 리뷰가 없어요'}
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.65 }}>
              {searchQuery ? '다른 키워드로 검색해보세요'
                : tab === 'following' ? '친구를 팔로우하고 맛집을 공유해보세요!'
                : '첫 번째 맛집 리뷰를 남겨보세요!'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => router.push('/review/write')}
                style={{
                  marginTop: 24, padding: '13px 32px',
                  background: '#111', color: '#fff', border: 'none',
                  borderRadius: 28, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                리뷰 작성하기
              </button>
            )}
          </div>
        ) : (
          <MasonryGrid
            reviews={filteredReviews}
            onCardClick={r => setDetailModal(r)}
          />
        )}
      </main>

      {/* ══ 하단 네비 ══ */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#fff', borderTop: '1px solid #F0F0F0',
        display: 'flex', alignItems: 'center', height: 60, zIndex: 200,
      }}>
        {navItems.map(item => (
          <div key={item.path} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            {item.icon === null ? (
              <button
                onClick={() => router.push('/review/write')}
                style={{
                  width: 42, height: 42, borderRadius: 14,
                  background: '#111', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={() => router.push(item.path)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 3, padding: '6px 0', minWidth: 44,
                }}
              >
                {item.icon}
                <span style={{
                  fontSize: 10,
                  color: item.active ? '#111' : '#999',
                  fontWeight: item.active ? 700 : 400,
                }}>
                  {item.label}
                </span>
              </button>
            )}
          </div>
        ))}
      </nav>

      {/* ══ 리뷰 상세 모달 ══ */}
      {detailModal && (
        <ReviewDetailModal
          review={detailModal}
          currentUserId={currentUser}
          isLiked={likedMap[detailModal.id] ?? false}
          isSaved={savedMap[detailModal.id] ?? false}
          likeCount={likeCountMap[detailModal.id] ?? 0}
          onLike={() => handleLike(detailModal)}
          onSave={() => handleSave(detailModal)}
          onClose={() => setDetailModal(null)}
          onProfileClick={() => {
            openProfileModal(detailModal)
            setDetailModal(null)
          }}
          followingIds={followingIds}
        />
      )}

      {/* ══ 프로필 모달 ══ */}
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
