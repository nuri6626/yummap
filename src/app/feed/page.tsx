'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/* =========================================================
   타입 정의
   ========================================================= */
interface Review {
  id: string; user_id: string; store_id: string
  content: string | null; menu_name: string | null
  star_score: number | null; want_to_go_back: boolean | null
  taste_score: number; portion_score: number; value_score: number
  spiciness: number | null; saltiness: number | null; sweetness: number | null
  texture_tags: string[] | null; situation_tags: string[] | null
  photos: string[] | null; created_at: string
  stores: { id: string; name: string; category: string; address: string } | null
  user_taste_profile: { nickname: string; bio?: string; taste_mbti?: string } | null
  like_count?: number; is_liked?: boolean; is_saved?: boolean
  one_line_review?: string | null
}

interface Comment {
  id: string; user_id: string; review_id: string; content: string; created_at: string
  user_taste_profile: { nickname: string } | null
}

/* =========================================================
   맛 점수 팝업
   ========================================================= */
function TasteModal({ review, onClose }: { review: Review; onClose: () => void }) {
  const items = [
    { label:'맛',       emoji:'🍽️', value: review.taste_score    ?? 5 },
    { label:'양',       emoji:'🍱', value: review.portion_score  ?? 5 },
    { label:'가성비',   emoji:'💰', value: review.value_score    ?? 5 },
    { label:'맵기',     emoji:'🌶️', value: review.spiciness      ?? 5 },
    { label:'짠기',     emoji:'🧂', value: review.saltiness      ?? 5 },
    { label:'단기',     emoji:'🍯', value: review.sweetness      ?? 5 },
  ]
  const colors = ['#FF5A3D','#FF9800','#4CAF50','#F44336','#2196F3','#9C27B0']
  const total  = Math.round(items.reduce((s,i)=>s+i.value,0)/items.length*10)/10

  return (
    <div onClick={onClose} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',
      display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'white',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'480px',padding:'24px 20px 40px'
      }}>
        <div style={{width:'40px',height:'4px',borderRadius:'2px',background:'#ddd',margin:'0 auto 20px'}}/>
        <h3 style={{margin:'0 0 6px',fontSize:'18px',fontWeight:'800',color:'#333'}}>
          🍴 맛 분석 리포트
        </h3>
        <p style={{margin:'0 0 18px',fontSize:'13px',color:'#aaa'}}>
          {review.stores?.name} · {review.menu_name||'메뉴 미입력'}
        </p>

        {items.map((item,i)=>(
          <div key={item.label} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
            <span style={{width:'20px',textAlign:'center',fontSize:'16px'}}>{item.emoji}</span>
            <span style={{width:'44px',fontSize:'13px',color:'#555',fontWeight:'600'}}>{item.label}</span>
            <div style={{flex:1,height:'8px',borderRadius:'4px',background:'#f0f0f0',overflow:'hidden'}}>
              <div style={{width:`${item.value*10}%`,height:'100%',background:colors[i],borderRadius:'4px'}}/>
            </div>
            <span style={{width:'28px',textAlign:'right',fontWeight:'700',color:colors[i],fontSize:'14px'}}>
              {item.value}
            </span>
          </div>
        ))}

        <div style={{
          marginTop:'16px',padding:'14px 16px',borderRadius:'14px',
          background:'linear-gradient(135deg,#FF5A3D18,#FF8C4218)',
          display:'flex',justifyContent:'space-between',alignItems:'center'
        }}>
          <span style={{fontWeight:'700',color:'#333',fontSize:'15px'}}>종합 점수</span>
          <span style={{fontWeight:'900',color:'#FF5A3D',fontSize:'24px'}}>{total}</span>
        </div>

        {review.content && (
          <p style={{
            margin:'14px 0 0',fontSize:'14px',color:'#555',
            lineHeight:'1.6',background:'#fafafa',borderRadius:'12px',padding:'12px 14px'
          }}>{review.content}</p>
        )}
        {((review.texture_tags?.length??0)+(review.situation_tags?.length??0))>0 && (
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'12px'}}>
            {review.texture_tags?.map(t=>(
              <span key={t} style={{background:'#fff3f0',color:'#FF5A3D',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>{t}</span>
            ))}
            {review.situation_tags?.map(t=>(
              <span key={t} style={{background:'#f0f7ff',color:'#2196F3',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>{t}</span>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{
          marginTop:'20px',width:'100%',padding:'14px',borderRadius:'14px',border:'none',
          background:'#FF5A3D',color:'white',fontSize:'15px',fontWeight:'700',cursor:'pointer'
        }}>닫기</button>
      </div>
    </div>
  )
}

/* =========================================================
   미니 프로필 팝업
   ========================================================= */
function ProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<{
    nickname:string; bio?:string; taste_mbti?:string;
    review_count:number; follower_count:number; following_count:number;
    reviews: { id:string; menu_name:string|null; stores:{name:string}|null; star_score:number|null }[]
  }|null>(null)

  useEffect(()=>{
    const load = async () => {
      const [{ data: p }, { data: rv }, { data: fwer }, { data: fwing }] = await Promise.all([
        supabase.from('user_taste_profile').select('*').eq('user_id', userId).single(),
        supabase.from('reviews').select('id,menu_name,star_score,stores(name)').eq('user_id', userId).order('created_at',{ascending:false}).limit(5),
        supabase.from('follows').select('id',{count:'exact'}).eq('following_id', userId),
        supabase.from('follows').select('id',{count:'exact'}).eq('follower_id', userId),
      ])
      setProfile({
        nickname: p?.nickname||'익명', bio: p?.bio, taste_mbti: p?.taste_mbti,
        review_count: rv?.length||0,
        follower_count: (fwer as any)?.length||0,
        following_count: (fwing as any)?.length||0,
        reviews: (rv||[]) as any,
      })
    }
    load()
  },[userId])

  return (
    <div onClick={onClose} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',
      display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'white',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:'480px',
        padding:'24px 20px 40px',maxHeight:'80vh',overflowY:'auto'
      }}>
        <div style={{width:'40px',height:'4px',borderRadius:'2px',background:'#ddd',margin:'0 auto 20px'}}/>
        {!profile ? (
          <p style={{textAlign:'center',color:'#aaa'}}>로딩 중...</p>
        ) : (
          <>
            <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'16px'}}>
              <div style={{
                width:'52px',height:'52px',borderRadius:'50%',
                background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',
                display:'flex',alignItems:'center',justifyContent:'center',
                color:'white',fontSize:'22px',fontWeight:'700',flexShrink:0
              }}>{profile.nickname[0]}</div>
              <div>
                <p style={{margin:0,fontWeight:'800',fontSize:'17px',color:'#333'}}>{profile.nickname}</p>
                {profile.taste_mbti && (
                  <span style={{background:'#fff3f0',color:'#FF5A3D',borderRadius:'12px',padding:'2px 10px',fontSize:'11px',fontWeight:'700'}}>
                    {profile.taste_mbti}
                  </span>
                )}
              </div>
            </div>
            {profile.bio && <p style={{fontSize:'13px',color:'#666',lineHeight:'1.5',marginBottom:'14px'}}>{profile.bio}</p>}
            <div style={{display:'flex',gap:'16px',marginBottom:'16px'}}>
              {[
                {label:'리뷰',val:profile.review_count},
                {label:'팔로워',val:profile.follower_count},
                {label:'팔로잉',val:profile.following_count},
              ].map(s=>(
                <div key={s.label} style={{textAlign:'center'}}>
                  <p style={{margin:0,fontWeight:'800',fontSize:'18px',color:'#FF5A3D'}}>{s.val}</p>
                  <p style={{margin:0,fontSize:'11px',color:'#aaa'}}>{s.label}</p>
                </div>
              ))}
            </div>
            <p style={{fontWeight:'700',fontSize:'13px',color:'#333',margin:'0 0 8px'}}>최근 리뷰</p>
            {profile.reviews.map(r=>(
              <div key={r.id} style={{
                display:'flex',justifyContent:'space-between',
                padding:'8px 0',borderBottom:'1px solid #f5f5f5',fontSize:'13px',color:'#555'
              }}>
                <span>{r.stores?.name||'?'} · {r.menu_name||'-'}</span>
                <span>{r.star_score ? '⭐'.repeat(r.star_score) : '-'}</span>
              </div>
            ))}
            <button
              onClick={()=>{ onClose(); router.push(`/profile/${userId}`) }}
              style={{
                marginTop:'16px',width:'100%',padding:'12px',borderRadius:'14px',
                border:'1px solid #FF5A3D',background:'white',color:'#FF5A3D',
                fontSize:'14px',fontWeight:'700',cursor:'pointer'
              }}>전체 프로필 보기</button>
          </>
        )}
      </div>
    </div>
  )
}

/* =========================================================
   팔로우 버튼
   ========================================================= */
function FollowButton({ targetId, currentUserId }: { targetId:string; currentUserId:string|null }) {
  const supabase = createClient()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    if (!currentUserId || currentUserId===targetId) return
    supabase.from('follows').select('id').eq('follower_id',currentUserId).eq('following_id',targetId).maybeSingle()
      .then(({data})=>setFollowing(!!data))
  },[currentUserId,targetId])

  if (!currentUserId || currentUserId===targetId) return null

  const toggle = async (e:React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    if (following) {
      await supabase.from('follows').delete().eq('follower_id',currentUserId).eq('following_id',targetId)
    } else {
      await supabase.from('follows').insert({follower_id:currentUserId,following_id:targetId})
    }
    setFollowing(!following)
    setLoading(false)
  }

  return (
    <button onClick={toggle} disabled={loading} style={{
      padding:'4px 12px',borderRadius:'20px',fontSize:'11px',fontWeight:'700',cursor:'pointer',
      border:`1.5px solid ${following?'#ddd':'#FF5A3D'}`,
      background: following?'#f5f5f5':'#FF5A3D',
      color: following?'#999':'white',
    }}>{loading ? '…' : following ? '팔로잉' : '팔로우'}</button>
  )
}

/* =========================================================
   댓글 섹션
   ========================================================= */
function CommentsSection({ reviewId, currentUserId }: { reviewId:string; currentUserId:string|null }) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('comments').select('*, user_taste_profile(nickname)')
      .eq('review_id', reviewId).order('created_at',{ascending:true}).limit(20)
    setComments((data||[]) as any)
  }

  const submit = async () => {
    if (!text.trim()||!currentUserId) return
    await supabase.from('comments').insert({review_id:reviewId,user_id:currentUserId,content:text.trim()})
    setText(''); load()
  }

  return (
    <div style={{borderTop:'1px solid #f5f5f5',marginTop:'12px',paddingTop:'12px'}}>
      <button onClick={e=>{e.stopPropagation();setOpen(o=>!o);if(!open)load()}} style={{
        border:'none',background:'none',color:'#999',fontSize:'12px',cursor:'pointer',padding:0,fontWeight:'600'
      }}>💬 댓글 {open?'접기':'보기'}</button>

      {open && (
        <div style={{marginTop:'10px'}} onClick={e=>e.stopPropagation()}>
          {comments.map(c=>(
            <div key={c.id} style={{marginBottom:'8px',fontSize:'13px'}}>
              <span style={{fontWeight:'700',color:'#333',marginRight:'6px'}}>
                {c.user_taste_profile?.nickname||'익명'}
              </span>
              <span style={{color:'#555'}}>{c.content}</span>
              <span style={{color:'#ccc',fontSize:'11px',marginLeft:'6px'}}>
                {new Date(c.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          ))}
          {currentUserId && (
            <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
              <input
                value={text} onChange={e=>setText(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&submit()}
                placeholder="댓글을 입력하세요..."
                style={{
                  flex:1,padding:'8px 12px',borderRadius:'20px',
                  border:'1px solid #eee',fontSize:'13px',outline:'none'
                }}
              />
              <button onClick={submit} style={{
                padding:'8px 14px',borderRadius:'20px',border:'none',
                background:'#FF5A3D',color:'white',fontSize:'13px',fontWeight:'600',cursor:'pointer'
              }}>전송</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   메인 MOTD 피드
   ========================================================= */
export default function MOTDPage() {
  const router = useRouter()
  const supabase = createClient()

  const [reviews, setReviews]     = useState<Review[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'all'|'following'|'taste'>('all')
  const [currentUser, setCurrentUser] = useState<string|null>(null)
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [tasteModal, setTasteModal]     = useState<Review|null>(null)
  const [profileModal, setProfileModal] = useState<string|null>(null)

  /* 유저 + 데이터 로드 */
  useEffect(()=>{
    const init = async () => {
      const { data:{ user } } = await supabase.auth.getUser()
      const uid = user?.id ?? null
      setCurrentUser(uid)

      if (uid) {
        const { data: fol } = await supabase.from('follows').select('following_id').eq('follower_id', uid)
        setFollowingIds(fol?.map(f=>f.following_id) ?? [])
      }

      const { data } = await supabase.from('reviews')
        .select('*, stores(id,name,category,address), user_taste_profile(nickname,bio,taste_mbti)')
        .order('created_at',{ascending:false}).limit(50)

      const list = (data || []) as Review[]

      /* 좋아요 수 + 내가 좋아요했는지 */
      const withMeta = await Promise.all(list.map(async r=>{
        const [{ count: lc }, { data: myLike }, { data: mySave }] = await Promise.all([
          supabase.from('review_likes').select('id',{count:'exact'}).eq('review_id',r.id),
          uid ? supabase.from('review_likes').select('id').eq('review_id',r.id).eq('user_id',uid).maybeSingle() : { data:null },
          uid ? supabase.from('saved_stores').select('id').eq('store_id',r.store_id??'').eq('user_id',uid).maybeSingle() : { data:null },
        ])
        return { ...r, like_count:lc??0, is_liked:!!myLike, is_saved:!!mySave }
      }))

      setReviews(withMeta)
      setLoading(false)
    }
    init()
  },[])

  /* 좋아요 토글 */
  const toggleLike = async (e:React.MouseEvent, review:Review) => {
    e.stopPropagation()
    if (!currentUser) return
    if (review.is_liked) {
      await supabase.from('review_likes').delete().eq('review_id',review.id).eq('user_id',currentUser)
    } else {
      await supabase.from('review_likes').insert({review_id:review.id,user_id:currentUser})
    }
    setReviews(rs=>rs.map(r=>r.id===review.id
      ?{...r,is_liked:!r.is_liked,like_count:(r.like_count??0)+(r.is_liked?-1:1)}:r))
  }

  /* 저장 토글 */
  const toggleSave = async (e:React.MouseEvent, review:Review) => {
    e.stopPropagation()
    if (!currentUser || !review.store_id) return
    if (review.is_saved) {
      await supabase.from('saved_stores').delete().eq('store_id',review.store_id).eq('user_id',currentUser)
    } else {
      await supabase.from('saved_stores').insert({store_id:review.store_id,user_id:currentUser})
    }
    setReviews(rs=>rs.map(r=>r.id===review.id?{...r,is_saved:!r.is_saved}:r))
  }

  /* 탭 필터 */
  const filtered = reviews.filter(r=>{
    if (tab==='following') return followingIds.includes(r.user_id)
    return true
  })

  const parsePhotos = (raw: any): string[] => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.filter(Boolean)
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p)?p:[] } catch { return [] }
    }
    return []
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'40px'}}>🍽️</div>
      <p style={{color:'#999',fontSize:'14px'}}>MOTD 불러오는 중...</p>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f5',paddingBottom:'80px'}}>

      {/* ── 헤더 ── */}
      <div style={{
        background:'white',padding:'16px 20px',borderBottom:'1px solid #f0f0f0',
        position:'sticky',top:0,zIndex:100,
        display:'flex',justifyContent:'space-between',alignItems:'center'
      }}>
        <h1
          onClick={()=>router.push('/map')}
          style={{margin:0,fontSize:'20px',fontWeight:'800',color:'#FF5A3D',cursor:'pointer'}}
        >
          🍜 MOTD
        </h1>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <span style={{fontSize:'11px',color:'#bbb'}}>{filtered.length}개</span>
          <button onClick={()=>router.push('/review/write')} style={{
            background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',color:'white',
            border:'none',borderRadius:'20px',padding:'8px 16px',fontSize:'13px',
            fontWeight:'600',cursor:'pointer'
          }}>+ 리뷰</button>
        </div>
      </div>

      {/* ── 탭 ── */}
      <div style={{
        background:'white',display:'flex',padding:'0 16px',
        borderBottom:'1px solid #f0f0f0',position:'sticky',top:'57px',zIndex:99
      }}>
        {(['all','following','taste'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1,padding:'12px 0',border:'none',background:'none',
            fontSize:'13px',fontWeight: tab===t?'700':'400',
            color: tab===t?'#FF5A3D':'#aaa',
            borderBottom: tab===t?'2px solid #FF5A3D':'2px solid transparent',
            cursor:'pointer'
          }}>
            {t==='all'?'전체':t==='following'?'팔로잉':'취향'}
          </button>
        ))}
      </div>

      {/* ── 카드 목록 ── */}
      {filtered.length===0 ? (
        <div style={{textAlign:'center',padding:'60px 20px'}}>
          <div style={{fontSize:'60px',marginBottom:'16px'}}>🍽️</div>
          <p style={{color:'#999',fontSize:'16px'}}>아직 리뷰가 없어요</p>
        </div>
      ) : (
        <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:'16px'}}>
          {filtered.map(review=>{
            const photos = parsePhotos(review.photos)
            const total  = Math.round(
              ((review.taste_score??5)+(review.portion_score??5)+(review.value_score??5)+
               (review.spiciness??5)+(review.saltiness??5)+(review.sweetness??5))/6*10
            )/10

            return (
              <div
                key={review.id}
                onClick={()=>setTasteModal(review)}
                style={{
                  background:'white',borderRadius:'20px',overflow:'hidden',
                  cursor:'pointer',boxShadow:'0 2px 16px rgba(0,0,0,0.08)'
                }}
              >
                {/* 사진 or 컬러 헤더 */}
                {photos.length > 0 ? (
                  <div style={{position:'relative',width:'100%',aspectRatio:'4/3',overflow:'hidden',background:'#f0f0f0'}}>
                    <img src={photos[0]} alt="리뷰 사진"
                      style={{width:'100%',height:'100%',objectFit:'cover'}}
                      onError={e=>{(e.target as HTMLImageElement).style.display='none'}}
                    />
                    {photos.length > 1 && (
                      <div style={{
                        position:'absolute',top:'10px',right:'10px',
                        background:'rgba(0,0,0,0.6)',color:'white',
                        borderRadius:'12px',padding:'3px 8px',fontSize:'11px',fontWeight:'700'
                      }}>+{photos.length-1}</div>
                    )}
                    {/* 총점 배지 */}
                    <div style={{
                      position:'absolute',bottom:'10px',right:'10px',
                      background:'rgba(255,90,61,0.9)',color:'white',
                      borderRadius:'12px',padding:'4px 10px',fontSize:'13px',fontWeight:'800'
                    }}>⭐ {total}</div>
                    {/* 가게 이름 오버레이 */}
                    <div style={{
                      position:'absolute',bottom:0,left:0,right:0,
                      background:'linear-gradient(transparent,rgba(0,0,0,0.7))',
                      padding:'20px 16px 12px'
                    }}>
                      <p style={{margin:0,color:'white',fontWeight:'700',fontSize:'16px'}}>
                        {review.stores?.name||'가게 이름 없음'}
                      </p>
                      <p style={{margin:'2px 0 0',color:'rgba(255,255,255,0.8)',fontSize:'12px'}}>
                        {review.stores?.category}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',padding:'20px 16px',
                    display:'flex',justifyContent:'space-between',alignItems:'center'
                  }}>
                    <div>
                      <p style={{margin:0,color:'white',fontWeight:'700',fontSize:'16px'}}>
                        {review.stores?.name||'가게 이름 없음'}
                      </p>
                      <p style={{margin:'4px 0 0',color:'rgba(255,255,255,0.8)',fontSize:'12px'}}>
                        {review.stores?.category}
                      </p>
                    </div>
                    <div style={{
                      background:'rgba(255,255,255,0.2)',borderRadius:'12px',padding:'6px 12px',
                      color:'white',fontWeight:'800',fontSize:'16px'
                    }}>⭐ {total}</div>
                  </div>
                )}

                {/* 본문 */}
                <div style={{padding:'14px 16px'}}>
                  {/* 유저 행 */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <div style={{
                        width:'32px',height:'32px',borderRadius:'50%',
                        background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        color:'white',fontSize:'13px',fontWeight:'700'
                      }}>
                        {(review.user_taste_profile?.nickname||'익')[0]}
                      </div>
                      <div>
                        <button
                          onClick={e=>{e.stopPropagation();setProfileModal(review.user_id)}}
                          style={{border:'none',background:'none',padding:0,
                            fontSize:'13px',fontWeight:'700',color:'#333',cursor:'pointer'}}
                        >
                          {review.user_taste_profile?.nickname||'익명'}
                        </button>
                        <p style={{margin:0,fontSize:'11px',color:'#aaa'}}>
                          {new Date(review.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    <FollowButton targetId={review.user_id} currentUserId={currentUser}/>
                  </div>

                  {/* 메뉴 + 한줄평 */}
                  {review.menu_name && (
                    <p style={{
                      margin:'0 0 6px',fontSize:'13px',color:'#555',
                      background:'#fff5f3',borderRadius:'8px',padding:'6px 10px'
                    }}>🍴 {review.menu_name}</p>
                  )}
                  {review.one_line_review && (
                    <p style={{
                      margin:'0 0 8px',fontSize:'13px',color:'#444',
                      fontStyle:'italic',lineHeight:'1.5'
                    }}>"{review.one_line_review}"</p>
                  )}

                  {/* 태그 */}
                  {((review.texture_tags?.length??0)+(review.situation_tags?.length??0))>0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}}>
                      {review.texture_tags?.map(t=>(
                        <span key={t} style={{background:'#fff3f0',color:'#FF5A3D',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>{t}</span>
                      ))}
                      {review.situation_tags?.map(t=>(
                        <span key={t} style={{background:'#f0f7ff',color:'#2196F3',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>{t}</span>
                      ))}
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'10px',borderTop:'1px solid #f5f5f5'}}>
                    <div style={{display:'flex',gap:'12px'}}>
                      <button onClick={e=>toggleLike(e,review)} style={{
                        border:'none',background:'none',cursor:'pointer',
                        display:'flex',alignItems:'center',gap:'4px',
                        fontSize:'13px',color: review.is_liked?'#FF5A3D':'#aaa',fontWeight:'600'
                      }}>
                        {review.is_liked?'❤️':'🤍'} {review.like_count??0}
                      </button>
                      <button onClick={e=>toggleSave(e,review)} style={{
                        border:'none',background:'none',cursor:'pointer',
                        fontSize:'13px',color: review.is_saved?'#FF5A3D':'#aaa',fontWeight:'600'
                      }}>
                        {review.is_saved?'🔖':'🔖'} {review.is_saved?'저장됨':'저장'}
                      </button>
                    </div>
                    <span style={{fontSize:'11px',color:'#ccc'}}>탭해서 맛 분석 보기 👆</span>
                  </div>

                  {/* 댓글 */}
                  <CommentsSection reviewId={review.id} currentUserId={currentUser}/>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 하단 내비 ── */}
      <nav style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'white',borderTop:'1px solid #f0f0f0',
        display:'flex',padding:'8px 0',zIndex:100
      }}>
        {[
          {icon:'🗺️',label:'지도',path:'/map'},
          {icon:'🍜',label:'MOTD',path:'/feed'},
          {icon:'✍️',label:'리뷰',path:'/review/write'},
          {icon:'🔖',label:'저장',path:'/saved'},
          {icon:'👤',label:'프로필',path:'/profile'},
        ].map(item=>(
          <button key={item.path} onClick={()=>router.push(item.path)} style={{
            flex:1,border:'none',background:'transparent',
            display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',
            cursor:'pointer',padding:'4px 0'
          }}>
            <span style={{fontSize:'20px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',color:'#999'}}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── 팝업들 ── */}
      {tasteModal  && <TasteModal   review={tasteModal}   onClose={()=>setTasteModal(null)}/>}
      {profileModal && <ProfileModal userId={profileModal} onClose={()=>setProfileModal(null)}/>}
    </div>
  )
}
