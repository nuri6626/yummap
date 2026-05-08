'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── 타입 정의 ────────────────────────────────────────────────────────────────
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
  if (Array.isArray(photos)) return photos
  try {
    const parsed = JSON.parse(photos)
    return Array.isArray(parsed) ? parsed : [photos]
  } catch {
    return [photos]
  }
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

  useEffect(() => {
    if (storeId) fetchData()
  }, [storeId])

  async function fetchData() {
    try {
      // 가게 정보
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single()

      if (storeError) console.error('가게 로드 에러:', storeError.message)
      if (storeData) setStore(storeData)

      // 리뷰 목록 — user_taste_profile join
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
        // user_taste_profile 배열 → 단일 객체 변환
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

  if (loading) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: '#FFF5F3',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍜</div>
        <p style={{ color: '#FF5A3D', fontWeight: 700 }}>불러오는 중...</p>
      </div>
    </div>
  )

  if (!store) return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ fontSize: '40px' }}>😕</div>
      <p style={{ color: '#888' }}>가게를 찾을 수 없습니다</p>
      <button onClick={() => router.back()} style={{
        background: '#FF5A3D', color: '#fff', border: 'none',
        borderRadius: '20px', padding: '10px 20px', cursor: 'pointer',
      }}>돌아가기</button>
    </div>
  )

  // 평균 평점 — total_rating 기준
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.total_rating ?? 0), 0) / reviews.length).toFixed(1)
    : null

  return (
    <div style={{
      maxWidth: '480px', margin: '0 auto',
      minHeight: '100vh', background: '#FFF5F3',
      fontFamily: 'Pretendard, -apple-system, sans-serif',
      paddingBottom: '100px',
    }}>

      {/* ── 헤더 ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', background: 'white',
        borderBottom: '1px solid #F2F2F2',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer',
        }}>←</button>
        <img src="/yum2.png" alt="YumMap" style={{ height: '28px', objectFit: 'contain' }} />
        <span style={{ fontSize: '16px', fontWeight: 800, color: '#1A1A1A', flex: 1 }}>
          가게 상세
        </span>
      </div>

      {/* ── 가게 헤더 카드 ── */}
      <div style={{
        background: 'linear-gradient(135deg, #FF5A3D, #FF8560)',
        padding: '24px 16px', color: 'white',
      }}>
        {store.category && (
          <span style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: '20px',
            padding: '4px 12px', fontSize: '12px', fontWeight: 700,
          }}>{store.category}</span>
        )}
        <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '8px 0 4px' }}>
          {store.name}
        </h1>
        {store.address && (
          <p style={{ fontSize: '13px', opacity: 0.9, margin: '0 0 16px' }}>
            📍 {store.address}
          </p>
        )}

        {/* 통계 배지 */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {avgRating && (
            <div style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
              padding: '10px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', fontWeight: 900 }}>⭐ {avgRating}</div>
              <div style={{ fontSize: '11px', opacity: 0.85 }}>YumMap 평점</div>
            </div>
          )}
          <div style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
            padding: '10px 16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 900 }}>{reviews.length}</div>
            <div style={{ fontSize: '11px', opacity: 0.85 }}>리뷰</div>
          </div>
          {store.editor_score != null && (
            <div style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: '12px',
              padding: '10px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', fontWeight: 900 }}>⭐ {store.editor_score}</div>
              <div style={{ fontSize: '11px', opacity: 0.85 }}>에디터 점수</div>
            </div>
          )}
        </div>
      </div>

      {/* ── 가게 상세 정보 ── */}
      {(store.phone || store.business_hours) && (
        <div style={{
          background: 'white', margin: '12px 16px', borderRadius: '16px',
          padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          {store.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '18px' }}>📞</span>
              <a href={`tel:${store.phone}`} style={{ fontSize: '14px', color: '#444', textDecoration: 'none' }}>
                {store.phone}
              </a>
            </div>
          )}
          {store.business_hours && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🕐</span>
              <span style={{ fontSize: '14px', color: '#444', lineHeight: 1.5 }}>
                {store.business_hours}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── 리뷰 작성 버튼 ── */}
      <div style={{ padding: '0 16px', marginBottom: '16px' }}>
        <button
          onClick={() => router.push(
            `/review/write?store_id=${store.id}&store_name=${encodeURIComponent(store.name)}&store_address=${encodeURIComponent(store.address ?? '')}&store_category=${encodeURIComponent(store.category ?? '')}`
          )}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #FF5A3D, #FF8560)',
            color: 'white', border: 'none', borderRadius: '16px',
            padding: '14px', fontSize: '15px', fontWeight: 800,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,90,61,0.3)',
          }}
        >✏️ 리뷰 작성하기</button>
      </div>

      {/* ── 리뷰 목록 ── */}
      <div style={{ padding: '0 16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1A1A1A', margin: '0 0 12px' }}>
          리뷰 {reviews.length}개
        </h3>

        {reviews.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '16px', padding: '40px',
            textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✍️</div>
            <p style={{ color: '#999', fontSize: '14px' }}>
              아직 리뷰가 없어요. 첫 번째 리뷰를 작성해보세요!
            </p>
          </div>
        ) : (
          reviews.map(review => {
            const photos = parsePhotos(review.photos)
            const isExpanded = expandedReview === review.id
            return (
              <div key={review.id} style={{
                background: 'white', borderRadius: '16px',
                marginBottom: '12px', overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                {/* 대표 사진 */}
                {photos.length > 0 && (
                  <img
                    src={photos[0]} alt="리뷰 사진"
                    style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                  />
                )}

                <div style={{ padding: '14px 16px' }}>
                  {/* 유저 정보 */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FF5A3D, #FF8560)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', flexShrink: 0,
                      }}>👤</div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
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

                  {/* 메뉴명 */}
                  {review.menu_name && (
                    <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                      🍽️ {review.menu_name}
                    </p>
                  )}

                  {/* 한줄 리뷰 */}
                  {review.one_line_review && (
                    <p style={{
                      fontSize: '15px', fontWeight: 700,
                      color: '#1A1A1A', marginBottom: '10px',
                    }}>"{review.one_line_review}"</p>
                  )}

                  {/* 점수 배지 */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {review.total_rating != null && (
                      <div style={{
                        background: '#FFF5F3', borderRadius: '8px',
                        padding: '5px 10px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#FF5A3D' }}>
                          ⭐ {review.total_rating.toFixed(1)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>총점</div>
                      </div>
                    )}
                    {review.taste_me != null && (
                      <div style={{
                        background: '#FFF5F3', borderRadius: '8px',
                        padding: '5px 10px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#FF5A3D' }}>
                          {review.taste_me}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>맛</div>
                      </div>
                    )}
                    {review.taste_amount != null && (
                      <div style={{
                        background: '#FFF5F3', borderRadius: '8px',
                        padding: '5px 10px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#FF5A3D' }}>
                          {review.taste_amount}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>양</div>
                      </div>
                    )}
                    {review.taste_spicy != null && (
                      <div style={{
                        background: '#FFF5F3', borderRadius: '8px',
                        padding: '5px 10px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#FF5A3D' }}>
                          🌶️ {review.taste_spicy}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>맵기</div>
                      </div>
                    )}
                    {review.taste_salty != null && (
                      <div style={{
                        background: '#F0F8FF', borderRadius: '8px',
                        padding: '5px 10px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#4A90E2' }}>
                          🧂 {review.taste_salty}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>짠기</div>
                      </div>
                    )}
                    {review.revisit != null && (
                      <div style={{
                        background: review.revisit ? '#F0FFF4' : '#FFF0F0',
                        borderRadius: '8px', padding: '5px 10px', textAlign: 'center',
                      }}>
                        <div style={{
                          fontSize: '13px', fontWeight: 800,
                          color: review.revisit ? '#27AE60' : '#E74C3C',
                        }}>
                          {review.revisit ? '👍 재방문' : '🤔 1회'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 태그 */}
                  {review.tags && review.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                      {review.tags.map(tag => (
                        <span key={tag} style={{
                          background: '#FFF3F1', color: '#FF5A3D',
                          padding: '3px 8px', borderRadius: '10px', fontSize: '11px',
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* 상세 내용 토글 */}
                  {review.content && (
                    <>
                      {isExpanded && (
                        <p style={{
                          fontSize: '13px', color: '#555',
                          lineHeight: 1.6, marginBottom: '6px',
                        }}>{review.content}</p>
                      )}
                      <button
                        onClick={() => setExpandedReview(isExpanded ? null : review.id)}
                        style={{
                          background: 'none', border: 'none',
                          color: '#FF5A3D', fontSize: '12px',
                          cursor: 'pointer', padding: 0, fontWeight: 600,
                        }}
                      >{isExpanded ? '접기 ▲' : '자세히 보기 ▼'}</button>
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
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
        background: 'white', borderTop: '1px solid #F2F2F2', zIndex: 100,
      }}>
        {[
          { icon: '🗺️', label: '지도', path: '/map' },
          { icon: '🍜', label: 'MOTD', path: '/feed' },
          { icon: '✍️', label: '리뷰', path: '/review/write' },
          { icon: '🔖', label: '저장', path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile' },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '2px', background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#999' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
