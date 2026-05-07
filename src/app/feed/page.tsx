'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── 유틸 ──────────────────────────────────────────────────
function parsePhotos(photos: any): string[] {
  if (!photos) return []
  if (Array.isArray(photos)) return photos.filter(Boolean)
  if (typeof photos === 'string') {
    try { const p = JSON.parse(photos); return Array.isArray(p) ? p.filter(Boolean) : [] }
    catch { return [] }
  }
  return []
}

// ── 레이더 차트 ───────────────────────────────────────────
function RadarChart({ scores, size = 140 }: {
  scores: { taste:number; portion:number; value:number; spiciness:number; saltiness:number; sweetness:number }
  size?: number
}) {
  const c = size/2, r = size/2-24
  const vals = [scores.taste, scores.portion, scores.value, scores.spiciness, scores.saltiness, scores.sweetness]
  const emojis = ['🍽️','🍱','💰','🌶️','🧂','🍯']
  const clrs  = ['#FF5A3D','#FF9800','#4CAF50','#F44336','#2196F3','#9C27B0']
  const labels = ['맛','양','가성비','맵기','짠기','단기']
  const pt = (i:number, rad:number) => {
    const a = Math.PI*2*i/6 - Math.PI/2
    return { x: c+rad*Math.cos(a), y: c+rad*Math.sin(a) }
  }
  const bg = [2,4,6,8,10].map(l =>
    Array.from({length:6},(_,i)=>pt(i,r*l/10)).map(p=>`${p.x},${p.y}`).join(' ')
  )
  const dp = vals.map((v,i) => pt(i, r*Math.max(0,Math.min(10,v||5))/10))
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
      <svg width={size} height={size} style={{overflow:'visible'}}>
        {bg.map((pts,i)=><polygon key={i} points={pts} fill="none" stroke="#eee" strokeWidth="1"/>)}
        {Array.from({length:6},(_,i)=>{const e=pt(i,r);return<line key={i} x1={c} y1={c} x2={e.x} y2={e.y} stroke="#eee" strokeWidth="1"/>})}
        <polygon points={dp.map(p=>`${p.x},${p.y}`).join(' ')} fill="rgba(255,90,61,0.15)" stroke="#FF5A3D" strokeWidth="2"/>
        {dp.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill={clrs[i]} stroke="white" strokeWidth="1.5"/>)}
        {Array.from({length:6},(_,i)=>{const lp=pt(i,r+18);return<text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="12">{emojis[i]}</text>})}
      </svg>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'3px 10px',marginTop:'6px',width:'100%'}}>
        {labels.map((lb,i)=>(
          <div key={lb} style={{display:'flex',alignItems:'center',gap:'3px',fontSize:'10px'}}>
            <div style={{width:'7px',height:'7px',borderRadius:'50%',background:clrs[i],flexShrink:0}}/>
            <span style={{color:'#888'}}>{lb}</span>
            <span style={{color:clrs[i],fontWeight:'700'}}>{vals[i]||5}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 팔로우 버튼 ───────────────────────────────────────────
function FollowButton({ myId, targetId, followingIds, onToggle }: {
  myId: string; targetId: string; followingIds: string[]
  onToggle: (id: string, follow: boolean) => void
}) {
  const supabase = createClient()
  const isFollowing = followingIds.includes(targetId)
  const [busy, setBusy] = useState(false)

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setBusy(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', targetId)
      onToggle(targetId, false)
    } else {
      await supabase.from('follows').insert({ follower_id: myId, following_id: targetId })
      onToggle(targetId, true)
    }
    setBusy(false)
  }

  return (
    <button onClick={toggle} disabled={busy} style={{
      padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
      border: isFollowing ? '1.5px solid #eee' : 'none',
      background: isFollowing ? 'white' : 'linear-gradient(135deg,#FF5A3D,#FF8C42)',
      color: isFollowing ? '#999' : 'white',
      fontSize: '11px', fontWeight: '700', flexShrink: 0
    }}>{busy ? '...' : isFollowing ? '팔로잉 ✓' : '+ 팔로우'}</button>
  )
}

// ── 타입 ──────────────────────────────────────────────────
interface Review {
  id: string; user_id: string; store_id: string
  content: string|null; menu_name: string|null
  star_score: number|null; want_to_go_back: boolean|null
  taste_score: number; portion_score: number; value_score: number
  spiciness: number|null; saltiness: number|null; sweetness: number|null
  texture_tags: string[]|null; situation_tags: string[]|null
  photos: any; created_at: string
  stores: { name:string; category:string; address:string }|null
  user_taste_profile: {
    nickname: string
    spice_level?: number; pickiness?: number
    style_pref?: number; preferred_cuisines?: string[]
  }|null
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
export default function FeedPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [reviews,     setReviews]     = useState<Review[]>([])
  const [loading,     setLoading]     = useState(true)
  const [expandedId,  setExpandedId]  = useState<string|null>(null)
  const [tab,         setTab]         = useState<'all'|'following'|'taste'>('all')
  const [myUserId,    setMyUserId]    = useState<string|null>(null)
  const [followingIds,setFollowingIds]= useState<string[]>([])
  const [myProfile,   setMyProfile]   = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      // 내 정보 (비로그인도 피드 볼 수 있게)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setMyUserId(user.id)
          const { data: fol } = await supabase
            .from('follows').select('following_id').eq('follower_id', user.id)
          setFollowingIds(fol?.map(f => f.following_id) || [])
          const { data: tp } = await supabase
            .from('user_taste_profile')
            .select('spice_level,pickiness,style_pref,preferred_cuisines')
            .eq('user_id', user.id).single()
          setMyProfile(tp)
        }
      } catch {}

      // 리뷰 로드 (stores만 join)
      const { data: revData, error } = await supabase
        .from('reviews')
        .select('*, stores(name, category, address)')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error || !revData) { setLoading(false); return }

      // user_taste_profile 별도 조회 후 병합
      const userIds = [...new Set(revData.map((r: any) => r.user_id))]
      const { data: profiles } = await supabase
        .from('user_taste_profile')
        .select('user_id, nickname, spice_level, pickiness, style_pref, preferred_cuisines')
        .in('user_id', userIds)

      const profileMap: Record<string, any> = {}
      profiles?.forEach(p => { profileMap[p.user_id] = p })

      const merged = revData.map((r: any) => ({
        ...r,
        user_taste_profile: profileMap[r.user_id] || { nickname: '익명' }
      }))

      setReviews(merged as Review[])
      setLoading(false)
    }
    load()
  }, [])

  // 입맛 유사도 점수
  function tasteMatchScore(my: any, reviewer: any): number {
    if (!my || !reviewer) return 0
    const diff =
      Math.abs((my.spice_level||5) - (reviewer.spice_level||5)) +
      Math.abs((my.pickiness||5)   - (reviewer.pickiness||5))   +
      Math.abs((my.style_pref||5)  - (reviewer.style_pref||5))
    const bonus = (my.preferred_cuisines||[]).some((c:string) =>
      (reviewer.preferred_cuisines||[]).includes(c)) ? 20 : 0
    return Math.max(0, 100 - diff*5 + bonus)
  }

  // 탭별 필터/정렬
  const displayed = (() => {
    if (tab === 'following') return reviews.filter(r => followingIds.includes(r.user_id))
    if (tab === 'taste') return [...reviews].sort((a, b) =>
      tasteMatchScore(myProfile, b.user_taste_profile) -
      tasteMatchScore(myProfile, a.user_taste_profile)
    )
    return reviews
  })()

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'48px'}}>🍜</div>
      <p style={{color:'#bbb',fontSize:'14px'}}>피드 불러오는 중...</p>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f5',paddingBottom:'80px'}}>

      {/* ── 헤더 ── */}
      <div style={{
        background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',
        padding:'48px 20px 20px',
        display:'flex',justifyContent:'space-between',alignItems:'flex-end'
      }}>
        <div>
          <h1 style={{margin:0,fontSize:'22px',fontWeight:'800',color:'white',letterSpacing:'-0.5px'}}>🍜 맛지도 피드</h1>
          <p style={{margin:'4px 0 0',fontSize:'13px',color:'rgba(255,255,255,0.8)'}}>리뷰 {reviews.length}개</p>
        </div>
        <button onClick={()=>router.push('/review/write')} style={{
          background:'rgba(255,255,255,0.25)',backdropFilter:'blur(8px)',
          color:'white',border:'1.5px solid rgba(255,255,255,0.5)',
          borderRadius:'20px',padding:'8px 18px',fontSize:'13px',fontWeight:'700',cursor:'pointer'
        }}>+ 리뷰 작성</button>
      </div>

      {/* ── 탭 (전체 / 팔로잉 / 입맛순) ── */}
      <div style={{
        background:'white',display:'flex',
        borderBottom:'1px solid #f0f0f0',
        position:'sticky',top:0,zIndex:10
      }}>
        {([
          ['all',       '🕐 전체'],
          ['following', '👥 팔로잉'],
          ['taste',     '👅 입맛순'],
        ] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{
            flex:1,padding:'13px 0',border:'none',background:'transparent',
            fontSize:'13px',fontWeight:tab===key?'700':'400',
            color:tab===key?'#FF5A3D':'#aaa',cursor:'pointer',
            borderBottom:tab===key?'2px solid #FF5A3D':'2px solid transparent',
            transition:'all 0.2s'
          }}>{label}</button>
        ))}
      </div>

      {/* ── 팔로잉 탭 빈 상태 ── */}
      {tab==='following' && displayed.length===0 && (
        <div style={{textAlign:'center',padding:'60px 20px'}}>
          <div style={{fontSize:'60px',marginBottom:'16px'}}>👥</div>
          <p style={{color:'#999',fontSize:'16px'}}>팔로잉한 사람의 리뷰가 없어요</p>
          <button onClick={()=>router.push('/users')} style={{
            marginTop:'16px',background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',
            color:'white',border:'none',borderRadius:'14px',
            padding:'12px 28px',fontSize:'14px',fontWeight:'700',cursor:'pointer'
          }}>사용자 탐색</button>
        </div>
      )}

      {/* ── 리뷰 없음 ── */}
      {tab!=='following' && displayed.length===0 && !loading && (
        <div style={{textAlign:'center',padding:'80px 20px'}}>
          <div style={{fontSize:'64px',marginBottom:'16px'}}>🍽️</div>
          <p style={{color:'#bbb',fontSize:'16px',fontWeight:'500'}}>아직 리뷰가 없어요</p>
          <button onClick={()=>router.push('/review/write')} style={{
            marginTop:'20px',background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',
            color:'white',border:'none',borderRadius:'14px',
            padding:'12px 28px',fontSize:'14px',fontWeight:'700',cursor:'pointer'
          }}>리뷰 작성하기</button>
        </div>
      )}

      {/* ── 리뷰 카드 목록 ── */}
      {displayed.length > 0 && (
        <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:'18px'}}>
          {displayed.map(review => {
            const photos  = parsePhotos(review.photos)
            const isExp   = expandedId === review.id
            const avg     = Math.round(((review.taste_score||5)+(review.portion_score||5)+(review.value_score||5))/3*10)/10
            const initials = (review.user_taste_profile?.nickname||'익')[0]

            return (
              <div
                key={review.id}
                onClick={()=>setExpandedId(isExp ? null : review.id)}
                style={{
                  background:'white',borderRadius:'22px',
                  overflow:'hidden',cursor:'pointer',
                  boxShadow:'0 4px 20px rgba(0,0,0,0.07)'
                }}
              >
                {/* ① 사진 or 헤더 */}
                {photos.length > 0 ? (
                  <div style={{position:'relative',width:'100%',aspectRatio:'4/3',background:'#efefef'}}>
                    <img
                      src={photos[0]} alt="리뷰 사진"
                      style={{width:'100%',height:'100%',objectFit:'cover'}}
                      onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none'}}
                    />
                    {photos.length > 1 && (
                      <div style={{
                        position:'absolute',top:'12px',right:'12px',
                        background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',
                        color:'white',borderRadius:'14px',padding:'3px 9px',
                        fontSize:'11px',fontWeight:'700'
                      }}>+{photos.length-1}</div>
                    )}
                    <div style={{
                      position:'absolute',bottom:0,left:0,right:0,
                      background:'linear-gradient(transparent,rgba(0,0,0,0.72))',
                      padding:'24px 16px 14px'
                    }}>
                      <p style={{margin:0,color:'white',fontWeight:'800',fontSize:'17px',letterSpacing:'-0.3px'}}>
                        {review.stores?.name||'가게 이름 없음'}
                      </p>
                      <p style={{margin:'3px 0 0',color:'rgba(255,255,255,0.75)',fontSize:'12px'}}>
                        {review.stores?.category} · ⭐ {avg}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',padding:'22px 18px'}}>
                    <p style={{margin:0,color:'white',fontWeight:'800',fontSize:'17px'}}>{review.stores?.name||'가게 이름 없음'}</p>
                    <p style={{margin:'4px 0 0',color:'rgba(255,255,255,0.8)',fontSize:'12px'}}>{review.stores?.category} · ⭐ {avg}</p>
                  </div>
                )}

                {/* ② 본문 */}
                <div style={{padding:'16px 18px'}}>

                  {/* 유저 정보 행 */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{
                        width:'34px',height:'34px',borderRadius:'50%',
                        background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        color:'white',fontSize:'14px',fontWeight:'800',flexShrink:0
                      }}>{initials}</div>
                      <div>
                        <p style={{margin:0,fontSize:'13px',fontWeight:'700',color:'#222'}}>
                          {review.user_taste_profile?.nickname||'익명'}
                        </p>
                        <p style={{margin:0,fontSize:'11px',color:'#bbb'}}>
                          {new Date(review.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      {review.star_score ? <span style={{fontSize:'13px'}}>{'⭐'.repeat(review.star_score)}</span> : null}
                      {review.want_to_go_back && (
                        <span style={{
                          background:'#FF5A3D',color:'white',
                          borderRadius:'10px',padding:'2px 9px',
                          fontSize:'10px',fontWeight:'700'
                        }}>또 갈래요!</span>
                      )}
                      {myUserId && review.user_id !== myUserId && (
                        <FollowButton
                          myId={myUserId}
                          targetId={review.user_id}
                          followingIds={followingIds}
                          onToggle={(id, follow) =>
                            setFollowingIds(prev => follow ? [...prev, id] : prev.filter(f => f !== id))
                          }
                        />
                      )}
                    </div>
                  </div>

                  {/* 메뉴 */}
                  {review.menu_name && (
                    <p style={{
                      margin:'0 0 10px',fontSize:'13px',color:'#555',
                      background:'#fff5f3',borderRadius:'10px',
                      padding:'7px 12px',display:'inline-block'
                    }}>🍴 {review.menu_name}</p>
                  )}

                  {/* 리뷰 텍스트 */}
                  {review.content && (
                    <p style={{
                      margin:'0 0 12px',fontSize:'14px',color:'#444',lineHeight:'1.65',
                      display:'-webkit-box',
                      WebkitLineClamp: isExp ? 'unset' : 2,
                      WebkitBoxOrient:'vertical' as any,
                      overflow:'hidden'
                    }}>{review.content}</p>
                  )}

                  {/* 태그 */}
                  {((review.texture_tags?.length||0)+(review.situation_tags?.length||0)) > 0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'12px'}}>
                      {review.texture_tags?.map(t=>(
                        <span key={t} style={{background:'#fff3f0',color:'#FF5A3D',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>{t}</span>
                      ))}
                      {review.situation_tags?.map(t=>(
                        <span key={t} style={{background:'#f0f7ff',color:'#2196F3',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>{t}</span>
                      ))}
                    </div>
                  )}

                  {/* 레이더 차트 */}
                  <div style={{background:'#fafafa',borderRadius:'16px',padding:'16px',display:'flex',flexDirection:'column',alignItems:'center'}}>
                    <p style={{margin:'0 0 10px',fontSize:'11px',color:'#ccc',fontWeight:'600',letterSpacing:'0.5px'}}>🕸️ 맛 레이더</p>
                    <RadarChart scores={{
                      taste:    review.taste_score||5,
                      portion:  review.portion_score||5,
                      value:    review.value_score||5,
                      spiciness:review.spiciness||5,
                      saltiness:review.saltiness||5,
                      sweetness:review.sweetness||5
                    }} size={140}/>
                  </div>

                  {/* 추가 사진 (펼쳤을 때) */}
                  {isExp && photos.length > 1 && (
                    <div style={{display:'flex',gap:'8px',overflowX:'auto',marginTop:'14px',paddingBottom:'4px'}}>
                      {photos.slice(1).map((url,i)=>(
                        <img key={i} src={url} alt={`사진${i+2}`}
                          style={{width:'82px',height:'82px',objectFit:'cover',borderRadius:'12px',flexShrink:0}}
                        />
                      ))}
                    </div>
                  )}

                  {/* 더보기/접기 */}
                  {(review.content?.length||0) > 60 && (
                    <p style={{margin:'10px 0 0',fontSize:'12px',color:'#FF8C42',fontWeight:'700',textAlign:'center'}}>
                      {isExp ? '접기 ▲' : '더보기 ▼'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 하단 네비게이션 ── */}
      <nav style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'white',borderTop:'1px solid #f0f0f0',
        display:'flex',
        paddingTop:'8px',
        paddingBottom:'calc(8px + env(safe-area-inset-bottom))',
        zIndex:100
      }}>
        {[
          {icon:'🗺️',label:'지도', path:'/map'},
          {icon:'🍜',label:'피드', path:'/feed'},
          {icon:'✍️',label:'리뷰', path:'/review/write'},
          {icon:'🔖',label:'저장', path:'/saved'},
          {icon:'👤',label:'프로필',path:'/profile'},
        ].map(item=>(
          <button key={item.path} onClick={()=>router.push(item.path)} style={{
            flex:1,border:'none',background:'transparent',
            display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',
            cursor:'pointer',padding:'0 4px',minHeight:'44px',
            WebkitTapHighlightColor:'transparent'
          }}>
            <span style={{fontSize:'24px',lineHeight:'1'}}>{item.icon}</span>
            <span style={{fontSize:'10px',color:'#999',fontWeight:'500'}}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
