'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* ── 랜덤 닉네임 생성기 ── */
const NICKNAME_PREFIXES = ['매운맛', '달콤한', '짭짤한', '고소한', '새콤한', '담백한', '촉촉한', '바삭한', '진한', '부드러운']
const NICKNAME_SUFFIXES = ['탐험가', '미식가', '헌터', '마스터', '여행자', '수집가', '전문가', '감정사', '도전자', '발굴자']
const generateRandomNickname = () => {
  const p = NICKNAME_PREFIXES[Math.floor(Math.random() * NICKNAME_PREFIXES.length)]
  const s = NICKNAME_SUFFIXES[Math.floor(Math.random() * NICKNAME_SUFFIXES.length)]
  return `${p} ${s}`
}

/* ── 맛 MBTI 목록 ── */
const TASTE_MBTIS = [
  { value: '매운맛 탐험가 🌶️',   desc: '자극적이고 강렬한 맛을 좋아해요' },
  { value: '달콤한 미식가 🍯',    desc: '달콤하고 부드러운 맛을 선호해요' },
  { value: '담백함 추구자 🥢',    desc: '깔끔하고 자극 없는 맛을 좋아해요' },
  { value: '짭짤함 헌터 🧂',     desc: '짭조름한 감칠맛을 즐겨요' },
  { value: '고소함 마스터 🌰',    desc: '고소하고 깊은 맛을 추구해요' },
  { value: '새콤달콤 여행자 🍋',  desc: '새콤하면서 달콤한 밸런스를 좋아해요' },
  { value: '양 중시 파워 🍱',     desc: '맛도 중요하지만 양이 최고예요' },
  { value: '가성비 분석가 💰',    desc: '가격 대비 만족도를 꼼꼼히 따져요' },
]

interface UserProfile {
  user_id: string
  nickname: string
  bio: string | null
  taste_mbti: string | null
  taste_scores: {
    taste: number; portion: number; value: number
    spiciness: number; saltiness: number; sweetness: number
  } | null
}

interface Review {
  id: string; menu_name: string | null; content: string | null
  star_score: number | null; created_at: string; one_line_review: string | null
  stores: { name: string; category: string } | null
}

export default function ProfilePage() {
  const router  = useRouter()
  const supabase = createClient()

  const [profile,         setProfile]         = useState<UserProfile | null>(null)
  const [reviews,         setReviews]         = useState<Review[]>([])
  const [loading,         setLoading]         = useState(true)
  const [editing,         setEditing]         = useState(false)
  const [nickname,        setNickname]        = useState('')
  const [bio,             setBio]             = useState('')
  const [tasteMbti,       setTasteMbti]       = useState('')
  const [saving,          setSaving]          = useState(false)
  const [followerCount,   setFollowerCount]   = useState(0)
  const [followingCount,  setFollowingCount]  = useState(0)
  const [showMbtiPicker,  setShowMbtiPicker]  = useState(false)
  const [userId,          setUserId]          = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [{ data: p }, { data: rv }, { data: fwer }, { data: fwing }] = await Promise.all([
        supabase.from('user_taste_profile').select('*').eq('user_id', user.id).single(),
        supabase.from('reviews')
          .select('id, menu_name, content, star_score, created_at, one_line_review, stores(name, category)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('follows').select('id').eq('following_id', user.id),
        supabase.from('follows').select('id').eq('follower_id', user.id),
      ])

      if (p) {
        setProfile(p as UserProfile)
        setNickname(p.nickname || '')
        setBio(p.bio || '')
        setTasteMbti(p.taste_mbti || '')
      } else {
        /* 프로필 없으면 랜덤 닉네임으로 자동 생성 */
        const autoNick = generateRandomNickname()
        await supabase.from('user_taste_profile').insert({ user_id: user.id, nickname: autoNick })
        setNickname(autoNick)
        setProfile({ user_id: user.id, nickname: autoNick, bio: null, taste_mbti: null, taste_scores: null })
      }

      setReviews((rv || []) as Review[])
      setFollowerCount(fwer?.length || 0)
      setFollowingCount(fwing?.length || 0)
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('user_taste_profile').upsert({
      user_id:    user.id,
      nickname:   nickname.trim(),
      bio:        bio.trim()        || null,
      taste_mbti: tasteMbti.trim()  || null,
    })

    setProfile(p => p ? {
      ...p,
      nickname:   nickname.trim(),
      bio:        bio.trim() || null,
      taste_mbti: tasteMbti.trim() || null,
    } : p)
    setEditing(false)
    setSaving(false)
  }

  const handleRandomNickname = () => {
    setNickname(generateRandomNickname())
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '40px' }}>👤</div>
      <p style={{ color: '#999', fontSize: '14px' }}>프로필 로딩 중...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', paddingBottom: '80px' }}>

      {/* 헤더 */}
      <div style={{
        background: 'white', padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1
          onClick={() => router.push('/map')}
          style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#FF5A3D', cursor: 'pointer' }}
        >🍜 맛지도</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleLogout} style={{
            border: '1px solid #ddd', background: 'white', color: '#aaa',
            borderRadius: '20px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer'
          }}>로그아웃</button>
          <button onClick={() => { setEditing(!editing); setShowMbtiPicker(false) }} style={{
            border: '1px solid #FF5A3D', background: editing ? '#FF5A3D' : 'white',
            color: editing ? 'white' : '#FF5A3D',
            borderRadius: '20px', padding: '6px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
          }}>{editing ? '취소' : '편집'}</button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* ── 프로필 카드 ── */}
        <div style={{
          background: 'white', borderRadius: '20px', padding: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px'
        }}>
          {/* 아바타 */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '32px', fontWeight: '700',
            margin: '0 auto 20px'
          }}>
            {(profile?.nickname || '?')[0]}
          </div>

          {editing ? (
            /* ── 편집 모드 ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 닉네임 + 랜덤 버튼 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="닉네임"
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '12px',
                    border: '1px solid #eee', fontSize: '14px', outline: 'none'
                  }}
                />
                <button onClick={handleRandomNickname} style={{
                  padding: '10px 14px', borderRadius: '12px', border: '1px solid #FF5A3D',
                  background: 'white', color: '#FF5A3D', fontSize: '12px',
                  fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap'
                }}>🎲 랜덤</button>
              </div>

              {/* 맛 MBTI 선택 */}
              <div>
                <button
                  onClick={() => setShowMbtiPicker(!showMbtiPicker)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '12px',
                    border: '1px solid #eee', background: 'white', fontSize: '14px',
                    textAlign: 'left', cursor: 'pointer', color: tasteMbti ? '#333' : '#aaa',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <span>{tasteMbti || '맛 MBTI 선택하기'}</span>
                  <span>{showMbtiPicker ? '▲' : '▼'}</span>
                </button>
                {showMbtiPicker && (
                  <div style={{
                    background: 'white', borderRadius: '12px', border: '1px solid #eee',
                    marginTop: '6px', overflow: 'hidden'
                  }}>
                    {TASTE_MBTIS.map(m => (
                      <div
                        key={m.value}
                        onClick={() => { setTasteMbti(m.value); setShowMbtiPicker(false) }}
                        style={{
                          padding: '12px 14px', borderBottom: '1px solid #f5f5f5',
                          cursor: 'pointer', background: tasteMbti === m.value ? '#fff3f0' : 'white'
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#333' }}>{m.value}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#aaa' }}>{m.desc}</p>
                      </div>
                    ))}
                    <div
                      onClick={() => { setTasteMbti(''); setShowMbtiPicker(false) }}
                      style={{ padding: '12px 14px', cursor: 'pointer', color: '#aaa', fontSize: '13px' }}
                    >직접 입력하기</div>
                  </div>
                )}
                {!showMbtiPicker && !TASTE_MBTIS.find(m => m.value === tasteMbti) && (
                  <input
                    value={tasteMbti}
                    onChange={e => setTasteMbti(e.target.value)}
                    placeholder="맛 MBTI 직접 입력"
                    style={{
                      marginTop: '8px', width: '100%', padding: '10px 14px',
                      borderRadius: '12px', border: '1px solid #eee', fontSize: '14px',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>

              {/* 자기소개 */}
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="자기소개 (어떤 음식을 좋아하나요?)"
                rows={3}
                style={{
                  padding: '10px 14px', borderRadius: '12px', border: '1px solid #eee',
                  fontSize: '14px', outline: 'none', resize: 'vertical', lineHeight: '1.6'
                }}
              />

              <button onClick={handleSave} disabled={saving} style={{
                padding: '14px', borderRadius: '14px', border: 'none',
                background: saving ? '#ccc' : 'linear-gradient(135deg,#FF5A3D,#FF8C42)',
                color: 'white', fontSize: '15px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer'
              }}>{saving ? '저장 중...' : '저장하기'}</button>
            </div>
          ) : (
            /* ── 보기 모드 ── */
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '800', color: '#333' }}>
                {profile?.nickname || '닉네임 없음'}
              </p>
              {profile?.taste_mbti && (
                <span style={{
                  background: 'linear-gradient(135deg,#FF5A3D,#FF8C42)', color: 'white',
                  borderRadius: '20px', padding: '5px 16px', fontSize: '13px', fontWeight: '700'
                }}>{profile.taste_mbti}</span>
              )}
              {profile?.bio && (
                <p style={{ margin: '14px 0 0', fontSize: '14px', color: '#666', lineHeight: '1.7' }}>
                  {profile.bio}
                </p>
              )}

              {/* 통계 */}
              <div style={{
                display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '20px',
                paddingTop: '20px', borderTop: '1px solid #f5f5f5'
              }}>
                {[
                  { label: '리뷰',    val: reviews.length },
                  { label: '팔로워',  val: followerCount },
                  { label: '팔로잉',  val: followingCount },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#FF5A3D' }}>{s.val}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#aaa' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 내 리뷰 ── */}
        <div style={{
          background: 'white', borderRadius: '20px', padding: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: '#333' }}>
            🍴 내 리뷰 ({reviews.length})
          </h3>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <p style={{ fontSize: '40px', margin: '0 0 8px' }}>🍽️</p>
              <p style={{ color: '#aaa', margin: 0 }}>아직 리뷰가 없어요</p>
              <button onClick={() => router.push('/review/write')} style={{
                marginTop: '12px', padding: '10px 20px', borderRadius: '20px',
                border: 'none', background: '#FF5A3D', color: 'white',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer'
              }}>첫 리뷰 작성하기</button>
            </div>
          ) : (
            reviews.map((r, i) => (
              <div key={r.id} style={{
                borderBottom: i < reviews.length - 1 ? '1px solid #f5f5f5' : 'none',
                paddingBottom: '14px', marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#333' }}>
                      {r.stores?.name || '가게 이름 없음'}
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '12px', color: '#aaa' }}>
                      {r.stores?.category} · {r.menu_name || '메뉴 미입력'}
                    </p>
                    {r.one_line_review && (
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#FF5A3D', fontStyle: 'italic' }}>
                        "{r.one_line_review}"
                      </p>
                    )}
                    {r.content && (
                      <p style={{
                        margin: '4px 0 0', fontSize: '13px', color: '#666', lineHeight: '1.5',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const, overflow: 'hidden'
                      }}>{r.content}</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                    {r.star_score && (
                      <div style={{ fontSize: '12px' }}>{'⭐'.repeat(r.star_score)}</div>
                    )}
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ccc' }}>
                      {new Date(r.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 하단 내비 */}
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
            <span style={{ fontSize: '10px', color: item.path === '/profile' ? '#FF5A3D' : '#999' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
