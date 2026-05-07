'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  user_id: string
  nickname: string
  bio: string | null
  taste_mbti: string | null
}

interface Review {
  id: string
  menu_name: string | null
  content: string | null
  one_line_review: string | null
  star_score: number | null
  taste_score: number
  portion_score: number
  value_score: number
  spiciness: number | null
  saltiness: number | null
  sweetness: number | null
  texture_tags: string[] | null
  situation_tags: string[] | null
  photos: string[] | null
  created_at: string
  stores: { name: string; category: string } | null
}

function TasteBar({ label, emoji, value, color }: {
  label: string; emoji: string; value: number; color: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{emoji}</span>
      <span style={{ fontSize: '12px', color: '#555', width: '40px', fontWeight: '600' }}>{label}</span>
      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#f0f0f0', overflow: 'hidden' }}>
        <div style={{ width: `${value * 10}%`, height: '100%', background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: '700', color, width: '20px', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function parsePhotos(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return (raw as unknown[]).filter((x): x is string => typeof x === 'string')
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

export default function UserProfilePage() {
  const router   = useRouter()
  const params   = useParams()
  const supabase = createClient()

  const targetUserId = params.userId as string

  const [profile,        setProfile]        = useState<UserProfile | null>(null)
  const [reviews,        setReviews]        = useState<Review[]>([])
  const [loading,        setLoading]        = useState(true)
  const [followerCount,  setFollowerCount]  = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing,    setIsFollowing]    = useState(false)
  const [currentUser,    setCurrentUser]    = useState<string | null>(null)
  const [followLoading,  setFollowLoading]  = useState(false)
  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [isMe,           setIsMe]           = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      setCurrentUser(uid)
      setIsMe(uid === targetUserId)

      const [{ data: p }, { data: rv }, { data: fwer }, { data: fwing }, { data: myFollow }] = await Promise.all([
        supabase.from('user_taste_profile').select('*').eq('user_id', targetUserId).single(),
        supabase.from('reviews')
          .select(`
            id, menu_name, content, one_line_review,
            star_score, taste_score, portion_score, value_score,
            spiciness, saltiness, sweetness,
            texture_tags, situation_tags, photos, created_at,
            stores(name, category)
          `)
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('follows').select('id').eq('following_id', targetUserId),
        supabase.from('follows').select('id').eq('follower_id', targetUserId),
        uid
          ? supabase.from('follows').select('id').eq('follower_id', uid).eq('following_id', targetUserId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      setProfile(p as UserProfile | null)

      /* stores 배열→객체 변환 */
      const parsedReviews: Review[] = (rv || []).map((r: any) => ({
        id:              r.id,
        menu_name:       r.menu_name,
        content:         r.content,
        one_line_review: r.one_line_review,
        star_score:      r.star_score,
        taste_score:     r.taste_score     ?? 5,
        portion_score:   r.portion_score   ?? 5,
        value_score:     r.value_score     ?? 5,
        spiciness:       r.spiciness       ?? 5,
        saltiness:       r.saltiness       ?? 5,
        sweetness:       r.sweetness       ?? 5,
        texture_tags:    r.texture_tags,
        situation_tags:  r.situation_tags,
        photos:          r.photos,
        created_at:      r.created_at,
        stores: Array.isArray(r.stores)
          ? (r.stores[0] ?? null)
          : (r.stores ?? null),
      }))

      setReviews(parsedReviews)
      setFollowerCount(fwer?.length ?? 0)
      setFollowingCount(fwing?.length ?? 0)
      setIsFollowing(!!myFollow)
      setLoading(false)
    }
    load()
  }, [targetUserId])

  const toggleFollow = async () => {
    if (!currentUser || isMe) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser).eq('following_id', targetUserId)
      setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser, following_id: targetUserId })
      setFollowerCount(c => c + 1)
    }
    setIsFollowing(f => !f)
    setFollowLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '40px' }}>👤</div>
      <p style={{ color: '#999', fontSize: '14px' }}>프로필 로딩 중...</p>
    </div>
  )

  const nickname = profile?.nickname || '익명'

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', paddingBottom: '80px' }}>

      {/* 헤더 */}
      <div style={{
        background: 'white', padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: '12px',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={() => router.back()} style={{
          border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', padding: 0, color: '#333'
        }}>←</button>
        <h1 onClick={() => router.push('/map')}
          style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#FF5A3D', cursor: 'pointer' }}>
          🍜 맛지도
        </h1>
        <span style={{ fontSize: '14px', color: '#666' }}>{nickname}님의 프로필</span>
      </div>

      <div style={{ padding: '16px' }}>

        {/* 프로필 카드 */}
        <div style={{
          background: 'white', borderRadius: '20px', padding: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '28px', fontWeight: '700'
            }}>{nickname[0]}</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '800', color: '#333' }}>{nickname}</p>
              {profile?.taste_mbti && (
                <span style={{
                  background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)', color: 'white',
                  borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: '700'
                }}>{profile.taste_mbti}</span>
              )}
            </div>
            {!isMe && currentUser && (
              <button onClick={toggleFollow} disabled={followLoading} style={{
                padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
                cursor: followLoading ? 'not-allowed' : 'pointer',
                border: `2px solid ${isFollowing ? '#ddd' : '#FF5A3D'}`,
                background: isFollowing ? '#f5f5f5' : '#FF5A3D',
                color: isFollowing ? '#aaa' : 'white', flexShrink: 0
              }}>{followLoading ? '...' : isFollowing ? '팔로잉 ✓' : '+ 팔로우'}</button>
            )}
            {isMe && (
              <button onClick={() => router.push('/profile')} style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', border: '1.5px solid #FF5A3D', background: 'white', color: '#FF5A3D'
              }}>편집</button>
            )}
          </div>

          {profile?.bio && (
            <p style={{
              margin: '0 0 16px', fontSize: '14px', color: '#666', lineHeight: '1.7',
              background: '#fafafa', borderRadius: '12px', padding: '12px 14px'
            }}>{profile.bio}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '16px', borderTop: '1px solid #f5f5f5' }}>
            {[
              { label: '리뷰',   val: reviews.length },
              { label: '팔로워', val: followerCount },
              { label: '팔로잉', val: followingCount },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#FF5A3D' }}>{s.val}</p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#aaa' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 리뷰 목록 */}
        <div style={{
          background: 'white', borderRadius: '20px', padding: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: '#333' }}>
            🍴 리뷰 ({reviews.length})
          </h3>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <p style={{ fontSize: '36px', margin: '0 0 8px' }}>🍽️</p>
              <p style={{ color: '#aaa', margin: 0 }}>아직 리뷰가 없어요</p>
            </div>
          ) : (
            reviews.map((r, i) => {
              const photos     = parsePhotos(r.photos)
              const isExpanded = expandedId === r.id
              const total      = Math.round(
                ((r.taste_score ?? 5) + (r.portion_score ?? 5) + (r.value_score ?? 5) +
                 (r.spiciness   ?? 5) + (r.saltiness    ?? 5) + (r.sweetness   ?? 5)) / 6 * 10
              ) / 10

              return (
                <div key={r.id} onClick={() => setExpandedId(isExpanded ? null : r.id)} style={{
                  borderBottom: i < reviews.length - 1 ? '1px solid #f5f5f5' : 'none',
                  paddingBottom: '16px', marginBottom: '16px', cursor: 'pointer'
                }}>
                  {photos.length > 0 && (
                    <div style={{
                      width: '100%', aspectRatio: '16/9', borderRadius: '14px',
                      overflow: 'hidden', marginBottom: '10px', background: '#f0f0f0'
                    }}>
                      <img src={photos[0]} alt="리뷰 사진"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: '#333' }}>
                        {r.stores?.name || '가게 이름 없음'}
                      </p>
                      <p style={{ margin: '2px 0', fontSize: '12px', color: '#aaa' }}>
                        {r.stores?.category}{r.menu_name ? ` · ${r.menu_name}` : ''}
                      </p>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)', color: 'white',
                      borderRadius: '12px', padding: '4px 10px', fontSize: '13px', fontWeight: '800',
                      flexShrink: 0, marginLeft: '10px'
                    }}>⭐ {total}</div>
                  </div>

                  {r.one_line_review && (
                    <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#FF5A3D', fontStyle: 'italic' }}>
                      "{r.one_line_review}"
                    </p>
                  )}

                  {r.content && (
                    <p style={{
                      margin: '6px 0 0', fontSize: '13px', color: '#555', lineHeight: '1.6',
                      display: '-webkit-box',
                      WebkitLineClamp: isExpanded ? undefined : 2,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: isExpanded ? 'visible' : 'hidden'
                    }}>{r.content}</p>
                  )}

                  {((r.texture_tags?.length ?? 0) + (r.situation_tags?.length ?? 0)) > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                      {r.texture_tags?.map(t => (
                        <span key={t} style={{ background: '#fff3f0', color: '#FF5A3D', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>{t}</span>
                      ))}
                      {r.situation_tags?.map(t => (
                        <span key={t} style={{ background: '#f0f7ff', color: '#2196F3', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>{t}</span>
                      ))}
                    </div>
                  )}

                  {isExpanded && (
                    <div style={{ marginTop: '12px', background: '#fafafa', borderRadius: '14px', padding: '14px' }}>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#aaa', fontWeight: '600' }}>🍴 맛 분석</p>
                      <TasteBar label="맛"     emoji="🍽️" value={r.taste_score   ?? 5} color="#FF5A3D" />
                      <TasteBar label="양"     emoji="🍱" value={r.portion_score ?? 5} color="#FF9800" />
                      <TasteBar label="가성비" emoji="💰" value={r.value_score   ?? 5} color="#4CAF50" />
                      <TasteBar label="맵기"   emoji="🌶️" value={r.spiciness     ?? 5} color="#F44336" />
                      <TasteBar label="짠기"   emoji="🧂" value={r.saltiness     ?? 5} color="#2196F3" />
                      <TasteBar label="단기"   emoji="🍯" value={r.sweetness     ?? 5} color="#9C27B0" />
                    </div>
                  )}

                  {r.content && r.content.length > 60 && (
                    <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#FF5A3D', fontWeight: '600', textAlign: 'center' }}>
                      {isExpanded ? '접기 ▲' : '더보기 ▼'}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 하단 네비 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid #f0f0f0',
        display: 'flex', padding: '8px 0 calc(8px + env(safe-area-inset-bottom))', zIndex: 100
      }}>
        {[
          { icon: '🗺️', label: '지도',   path: '/map' },
          { icon: '🍜', label: 'MOTD',   path: '/feed' },
          { icon: '✍️', label: '리뷰',   path: '/review/write' },
          { icon: '🔖', label: '저장',   path: '/saved' },
          { icon: '👤', label: '프로필', path: '/profile' },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)} style={{
            flex: 1, border: 'none', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            cursor: 'pointer', padding: '4px 0'
          }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', color: '#999' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
