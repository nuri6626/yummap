'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── 타입 정의 ───────────────────────────────────────────────────────────────
interface Store {
  id: string
  name: string
  category: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  average_rating: number | null
  review_count: number | null
  editor_score: number | null
  business_hours: string | null
}

interface UserTasteProfile {
  nickname: string | null
  reviewer_grade: string | null
}

interface Review {
  id: string
  user_id: string
  created_at: string
  content: string | null
  one_line_review: string | null
  total_rating: number | null
  taste_me: number | null
  taste_amount: number | null
  taste_spicy: number | null
  taste_salty: number | null
  taste_sweet: number | null
  photos: string | string[] | null
  tags: string[] | null
  menu_name: string | null
  revisit: boolean | null
  user_taste_profile: UserTasteProfile | null
}

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────
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

function getInitial(name: string | null | undefined): string {
  return name ? name.charAt(0).toUpperCase() : '?'
}

function getAvatarBg(name: string | null | undefined): string {
  const colors = ['#1a1a1a', '#2d2d2d', '#404040', '#333', '#4a4a4a', '#222']
  if (!name) return colors[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}

// ─── 아바타 컴포넌트 ──────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string | null | undefined; size?: number }) {
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

// ─── 별점 렌더 ────────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ color: s <= Math.round(rating) ? '#111' : '#E0E0E0', fontSize: 13 }}>
          ★
        </span>
      ))}
    </span>
  )
}

// ─── 태스트 배지 ──────────────────────────────────────────────────────────────
function TasteBadge({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: '#F7F7F7', borderRadius: 10, padding: '8px 12px', gap: 4,
    }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{value}</span>
      <span style={{ fontSize: 10, color: '#8E8E8E' }}>{label}</span>
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function StoreDetailPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const storeId = params.id as string

  const [store, setStore] = useState<Store | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedReview, setExpandedReview] = useState<string | null>(null)
  const [activePhotoIndex, setActivePhotoIndex] = useState<Record<string, number>>({})

  useEffect(() => {
    if (storeId) fetchData()
  }, [storeId])

  async function fetchData() {
    try {
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single()

      if (storeError) console.error('가게 로드 에러:', storeError.message)
      if (storeData) setStore(storeData)

      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select(`
          id, user_id, created_at, content, one_line_review,
          total_rating, taste_me, taste_amount,
          taste_spicy, taste_salty, taste_sweet,
          photos, tags, menu_name, revisit,
          user_taste_profile(nickname, reviewer_grade)
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      if (reviewError) console.error('리뷰 로드 에러:', reviewError.message)

      if (reviewData) {
        const mapped: Review[] = reviewData.map((r: any) => ({
          ...r,
          user_taste_profile: Array.isArray(r.user_taste_profile)
            ? (r.user_taste_profile[0] ?? null)
            : (r.user_taste_profile ?? null),
        }))
        setReviews(mapped)
      }
    } catch (err) {
      console.error('fetchData 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── 로딩 ──
  if (loading) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: '#fff', flexDirection: 'column', gap: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <img src="/yum2.png" alt="YumMap" style={{ height: 28, objectFit: 'contain' }} />
      <div style={{
        width: 24, height: 24, border: '2.5px solid #EFEFEF',
        borderTop: '2.5px solid #111', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )

  // ── 가게 없음 ──
  if (!store) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', flexDirection: 'column', gap: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#fff',
    }}>
      <span style={{ fontSize: 48 }}>😕</span>
      <p style={{ color: '#8E8E8E', fontSize: 15, margin: 0 }}>가게를 찾을 수 없습니다</p>
      <button
        onClick={() => router.back()}
        style={{
          background: '#111', color: '#fff', border: 'none',
          borderRadius: 12, padding: '12px 28px',
          cursor: 'pointer', fontWeight: 700, fontSize: 14,
        }}
      >
        돌아가기
      </button>
    </div>
  )

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.total_rating ?? 0), 0) / reviews.length).toFixed(1)
    : null

  const revisitCount = reviews.filter(r => r.revisit === true).length
  const revisitRate = reviews.length > 0
    ? Math.round((revisitCount / reviews.length) * 100)
    : null

  const navItems = [
    { icon: '🏠', label: '홈', path: '/feed' },
    { icon: '🗺️', label: '지도', path: '/map' },
    { icon: '✏️', label: '작성', path: '/review/write' },
    { icon: '🔖', label: '저장', path: '/saved' },
    { icon: '👤', label: '프로필', path: '/profile' },
  ]

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', minHeight: '100vh',
      background: '#FAFAFA', paddingBottom: 100,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* ── 헤더 ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 16px', height: 54,
        background: '#fff', borderBottom: '1px solid #EFEFEF',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            border: 'none', background: 'none',
            fontSize: 20, cursor: 'pointer', color: '#111',
            padding: '4px 8px 4px 0',
          }}
        >
          ←
        </button>
        <img
          src="/yum2.png" alt="YumMap"
          style={{ height: 24, objectFit: 'contain', cursor: 'pointer' }}
          onClick={() => router.push('/feed')}
        />
        <span style={{ flex: 1 }} />
        <button
          onClick={() => router.push(
            `/review/write?storeId=${store.id}&storeName=${encodeURIComponent(store.name)}`
          )}
          style={{
            border: '1.5px solid #111', background: '#111', color: '#fff',
            borderRadius: 20, padding: '7px 16px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          ✏️ 리뷰 쓰기
        </button>
      </header>

      {/* ── 가게 정보 카드 ── */}
      <div style={{
        background: '#fff', margin: '12px 16px',
        borderRadius: 20, overflow: 'hidden',
        border: '1px solid #EFEFEF',
      }}>
        {/* 가게 기본 정보 */}
        <div style={{ padding: '20px 20px 16px' }}>
          {store.category && (
            <span style={{
              display: 'inline-block',
              background: '#F0F0F0', color: '#555',
              borderRadius: 20, padding: '4px 12px',
              fontSize: 12, fontWeight: 700, marginBottom: 10,
            }}>
              {store.category}
            </span>
          )}
          <h1 style={{
            fontSize: 22, fontWeight: 900, color: '#111',
            margin: '0 0 6px', letterSpacing: -0.5,
          }}>
            {store.name}
          </h1>
          {store.address && (
            <p style={{ fontSize: 13, color: '#8E8E8E', margin: '0 0 16px' }}>
              📍 {store.address}
            </p>
          )}

          {/* 통계 배지 행 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {avgRating && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#F7F7F7', borderRadius: 12,
                padding: '10px 14px',
              }}>
                <span style={{ fontSize: 20 }}>⭐</span>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#111' }}>
                    {avgRating}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: '#8E8E8E' }}>YumMap 평점</p>
                </div>
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#F7F7F7', borderRadius: 12,
              padding: '10px 14px',
            }}>
              <span style={{ fontSize: 20 }}>📝</span>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#111' }}>
                  {reviews.length}
                </p>
                <p style={{ margin: 0, fontSize: 10, color: '#8E8E8E' }}>리뷰</p>
              </div>
            </div>
            {revisitRate !== null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#F7F7F7', borderRadius: 12,
                padding: '10px 14px',
              }}>
                <span style={{ fontSize: 20 }}>🔁</span>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#111' }}>
                    {revisitRate}%
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: '#8E8E8E' }}>재방문율</p>
                </div>
              </div>
            )}
            {store.editor_score != null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#F7F7F7', borderRadius: 12,
                padding: '10px 14px',
              }}>
                <span style={{ fontSize: 20 }}>🏅</span>
                <div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#111' }}>
                    {store.editor_score}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: '#8E8E8E' }}>에디터 점수</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 구분선 */}
        {(store.phone || store.business_hours) && (
          <div style={{ borderTop: '1px solid #F0F0F0', padding: '14px 20px' }}>
            {store.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>📞</span>
                <a
                  href={`tel:${store.phone}`}
                  style={{ fontSize: 14, color: '#111', textDecoration: 'none', fontWeight: 600 }}
                >
                  {store.phone}
                </a>
              </div>
            )}
            {store.business_hours && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, marginTop: 1 }}>🕐</span>
                <span style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  {store.business_hours}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 지도에서 보기 버튼 */}
        {store.latitude && store.longitude && (
          <div style={{ padding: '0 20px 16px' }}>
            <button
              onClick={() => router.push(
                `/map?lat=${store.latitude}&lng=${store.longitude}&storeId=${store.id}`
              )}
              style={{
                width: '100%', padding: '12px',
                border: '1.5px solid #EFEFEF', borderRadius: 12,
                background: '#FAFAFA', color: '#555',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              🗺️ 지도에서 보기
            </button>
          </div>
        )}
      </div>

      {/* ── 리뷰 목록 ── */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 14,
        }}>
          <h3 style={{
            fontSize: 16, fontWeight: 800,
            color: '#111', margin: 0,
          }}>
            리뷰 {reviews.length}개
          </h3>
          {reviews.length > 0 && avgRating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <StarRating rating={parseFloat(avgRating)} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111', marginLeft: 4 }}>
                {avgRating}
              </span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 20, padding: '48px 24px',
            textAlign: 'center', border: '1px solid #EFEFEF',
          }}>
            <span style={{ fontSize: 44, display: 'block', marginBottom: 12 }}>✍️</span>
            <p style={{ color: '#8E8E8E', fontSize: 14, margin: '0 0 4px' }}>
              아직 리뷰가 없어요
            </p>
            <p style={{ color: '#C7C7C7', fontSize: 12, margin: '0 0 20px' }}>
              첫 번째 리뷰를 작성해보세요!
            </p>
            <button
              onClick={() => router.push(
                `/review/write?storeId=${store.id}&storeName=${encodeURIComponent(store.name)}`
              )}
              style={{
                background: '#111', color: '#fff',
                border: 'none', borderRadius: 12,
                padding: '12px 24px', fontSize: 14,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              리뷰 작성하기
            </button>
          </div>
        ) : (
          reviews.map(review => {
            const photos = parsePhotos(review.photos)
            const isExpanded = expandedReview === review.id
            const currentPhotoIdx = activePhotoIndex[review.id] ?? 0
            const nickname = review.user_taste_profile?.nickname || '익명'

            return (
              <div key={review.id} style={{
                background: '#fff', borderRadius: 20,
                marginBottom: 14, overflow: 'hidden',
                border: '1px solid #EFEFEF',
              }}>

                {/* 사진 슬라이더 */}
                {photos.length > 0 && (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={photos[currentPhotoIdx]}
                      alt="리뷰 사진"
                      style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    {/* 사진 인디케이터 */}
                    {photos.length > 1 && (
                      <>
                        <div style={{
                          position: 'absolute', bottom: 10, left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex', gap: 5,
                        }}>
                          {photos.map((_, pi) => (
                            <button
                              key={pi}
                              onClick={() => setActivePhotoIndex(prev => ({ ...prev, [review.id]: pi }))}
                              style={{
                                width: pi === currentPhotoIdx ? 16 : 6,
                                height: 6, borderRadius: 3, border: 'none',
                                background: pi === currentPhotoIdx
                                  ? '#fff' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer', padding: 0,
                                transition: 'all 0.2s',
                              }}
                            />
                          ))}
                        </div>
                        {currentPhotoIdx > 0 && (
                          <button
                            onClick={() => setActivePhotoIndex(prev => ({
                              ...prev, [review.id]: currentPhotoIdx - 1,
                            }))}
                            style={{
                              position: 'absolute', left: 10, top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.4)', color: '#fff',
                              border: 'none', borderRadius: '50%',
                              width: 30, height: 30, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14,
                            }}
                          >‹</button>
                        )}
                        {currentPhotoIdx < photos.length - 1 && (
                          <button
                            onClick={() => setActivePhotoIndex(prev => ({
                              ...prev, [review.id]: currentPhotoIdx + 1,
                            }))}
                            style={{
                              position: 'absolute', right: 10, top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'rgba(0,0,0,0.4)', color: '#fff',
                              border: 'none', borderRadius: '50%',
                              width: 30, height: 30, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14,
                            }}
                          >›</button>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div style={{ padding: '14px 16px' }}>
                  {/* 유저 정보 행 */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={nickname} size={36} />
                      <div>
                        <p style={{
                          margin: 0, fontSize: 14,
                          fontWeight: 700, color: '#111',
                        }}>
                          {nickname}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#8E8E8E' }}>
                          {review.user_taste_profile?.reviewer_grade || '맛집 탐험가'}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#C7C7C7' }}>
                      {new Date(review.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>

                  {/* 메뉴명 + 별점 */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 8,
                  }}>
                    {review.menu_name ? (
                      <span style={{
                        fontSize: 13, color: '#8E8E8E',
                        background: '#F7F7F7', padding: '4px 10px',
                        borderRadius: 8, fontWeight: 600,
                      }}>
                        🍽️ {review.menu_name}
                      </span>
                    ) : <span />}
                    {review.total_rating != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <StarRating rating={review.total_rating} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>
                          {review.total_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 한줄 리뷰 */}
                  {review.one_line_review && (
                    <p style={{
                      fontSize: 15, fontWeight: 700, color: '#111',
                      margin: '0 0 10px', lineHeight: 1.5,
                    }}>
                      "{review.one_line_review}"
                    </p>
                  )}

                  {/* 맛 평가 배지 */}
                  {(review.taste_me != null ||
                    review.taste_amount != null ||
                    review.taste_spicy != null ||
                    review.taste_salty != null) && (
                    <div style={{
                      display: 'flex', gap: 6,
                      flexWrap: 'wrap', marginBottom: 10,
                    }}>
                      {review.taste_me != null && (
                        <TasteBadge label="맛" value={review.taste_me} emoji="🧂" />
                      )}
                      {review.taste_amount != null && (
                        <TasteBadge label="양" value={review.taste_amount} emoji="🍱" />
                      )}
                      {review.taste_spicy != null && (
                        <TasteBadge label="맵기" value={review.taste_spicy} emoji="🌶️" />
                      )}
                      {review.taste_salty != null && (
                        <TasteBadge label="짠기" value={review.taste_salty} emoji="🧊" />
                      )}
                      {review.taste_sweet != null && (
                        <TasteBadge label="단맛" value={review.taste_sweet} emoji="🍯" />
                      )}
                    </div>
                  )}

                  {/* 재방문 여부 */}
                  {review.revisit != null && (
                    <div style={{ marginBottom: 10 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: review.revisit ? '#F0F0F0' : '#F0F0F0',
                        color: '#111', padding: '5px 12px',
                        borderRadius: 20, fontSize: 12, fontWeight: 700,
                      }}>
                        {review.revisit ? '👍 재방문 의향 있음' : '🤔 재방문 글쎄요'}
                      </span>
                    </div>
                  )}

                  {/* 태그 */}
                  {review.tags && review.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                      {review.tags.map(tag => (
                        <span key={tag} style={{
                          background: '#F0F0F0', color: '#555',
                          padding: '4px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 600,
                        }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 상세 내용 토글 */}
                  {review.content && (
                    <>
                      {isExpanded && (
                        <p style={{
                          fontSize: 13, color: '#555', lineHeight: 1.7,
                          margin: '0 0 8px', padding: '12px',
                          background: '#FAFAFA', borderRadius: 10,
                        }}>
                          {review.content}
                        </p>
                      )}
                      <button
                        onClick={() => setExpandedReview(isExpanded ? null : review.id)}
                        style={{
                          background: 'none', border: 'none', color: '#8E8E8E',
                          fontSize: 12, cursor: 'pointer', padding: 0, fontWeight: 600,
                        }}
                      >
                        {isExpanded ? '접기 ▲' : '자세히 보기 ▼'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── 하단 내비게이션 ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
        background: '#fff', borderTop: '1px solid #EFEFEF', zIndex: 100,
      }}>
        {navItems.map(item => {
          const isActive = item.path === '/feed'
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 12px',
              }}
            >
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: isActive ? '#111' : '#C7C7C7',
              }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
