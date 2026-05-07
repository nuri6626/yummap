'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function parsePhotos(photos: any): string[] {
  if (!photos) return []
  if (Array.isArray(photos)) return photos.filter(Boolean)
  if (typeof photos === 'string') {
    try { const p = JSON.parse(photos); return Array.isArray(p) ? p.filter(Boolean) : [] }
    catch { return [] }
  }
  return []
}

// 5번: 맛 점수 팝업 모달
function TasteModal({ review, onClose }: { review: any; onClose: () => void }) {
  const items = [
    { label:'맛',    emoji:'🍽️', value:review.taste_score||5,   color:'#FF5A3D' },
    { label:'양',    emoji:'🍱', value:review.portion_score||5,  color:'#FF9800' },
    { label:'가성비', emoji:'💰', value:review.value_score||5,    color:'#4CAF50' },
    { label:'맵기',  emoji:'🌶️', value:review.spiciness||5,      color:'#F44336' },
    { label:'짠기',  emoji:'🧂', value:review.saltiness||5,       color:'#2196F3' },
    { label:'단기',  emoji:'🍯', value:review.sweetness||5,       color:'#9C27B0' },
  ]
  const total = Math.round(items.reduce((s,i)=>s+i.value,0)/items.length*10)/10

  return (
    <div onClick={onClose} style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',
      backdropFilter:'blur(4px)',zIndex:999,
      display:'flex',alignItems:'flex-end',justifyContent:'center'
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'white',borderRadius:'24px 24px 0 0',
        padding:'24px 20px 48px',width:'100%',maxWidth:'480px',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.18)'
      }}>
        <div style={{width:'36px',height:'4px',background:'#e0e0e0',borderRadius:'2px',margin:'0 auto 20px'}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <h3 style={{margin:0,fontSize:'17px',fontWeight:'800',color:'#1A1A1A'}}>🍴 맛 상세 점수</h3>
          <div style={{background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',color:'white',borderRadius:'20px',padding:'6px 16px',fontSize:'15px',fontWeight:'800'}}>
            총점 {total}
          </div>
        </div>
        {items.map(item=>(
          <div key={item.label} style={{marginBottom:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
              <span style={{fontSize:'14px',fontWeight:'600',color:'#333'}}>{item.emoji} {item.label}</span>
              <span style={{fontSize:'14px',fontWeight:'800',color:item.color}}>{item.value} / 10</span>
            </div>
            <div style={{height:'10px',background:'#f0f0f0',borderRadius:'5px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${item.value*10}%`,background:`linear-gradient(90deg,${item.color}88,${item.color})`,borderRadius:'5px',transition:'width 0.5s ease'}}/>
            </div>
          </div>
        ))}
        {review.content && (
          <div style={{marginTop:'16px',background:'#fafafa',borderRadius:'14px',padding:'14px'}}>
            <p style={{margin:'0 0 6px',fontSize:'11px',color:'#bbb',fontWeight:'600'}}>✍️ 리뷰</p>
            <p style={{margin:0,fontSize:'14px',color:'#444',lineHeight:'1.65'}}>{review.content}</p>
          </div>
        )}
        {((review.texture_tags?.length||0)+(review.situation_tags?.length||0))>0 && (
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'12px'}}>
            {review.texture_tags?.map((t:string)=><span key={t} style={{background:'#fff3f0',color:'#FF5A3D',borderRadius:'20px',padding:'4px 12px',fontSize:'12px',fontWeight:'600'}}>{t}</span>)}
            {review.situation_tags?.map((t:string)=><span key={t} style={{background:'#f0f7ff',color:'#2196F3',borderRadius:'20px',padding:'4px 12px',fontSize:'12px',fontWeight:'600'}}>{t}</span>)}
          </div>
        )}
        <button onClick={onClose} style={{marginTop:'20px',width:'100%',padding:'14px',background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',color:'white',border:'none',borderRadius:'14px',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}>닫기</button>
      </div>
    </div>
  )
}

// 1번: 팔로우 버튼
function FollowButton({ myId, targetId, followingIds, onToggle }: {
  myId:string; targetId:string; followingIds:string[]
  onToggle:(id:string,follow:boolean)=>void
}) {
  const supabase = createClient()
  const isFollowing = followingIds.includes(targetId)
  const [busy, setBusy] = useState(false)
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setBusy(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id',myId).eq('following_id',targetId)
      onToggle(targetId,false)
    } else {
      await supabase.from('follows').insert({ follower_id:myId, following_id:targetId })
      onToggle(targetId,true)
    }
    setBusy(false)
  }
  return (
    <button onClick={toggle} disabled={busy} style={{
      width:'32px',height:'32px',borderRadius:'50%',border:'none',cursor:'pointer',
      background: isFollowing ? '#f0f0f0' : 'linear-gradient(135deg,#FF5A3D,#FF8C42)',
      color: isFollowing ? '#999' : 'white',
      fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',
      flexShrink:0,transition:'all 0.2s'
    }}>{busy ? '…' : isFollowing ? '✓' : '+'}</button>
  )
}

interface Review {
  id:string; user_id:string; store_id:string
  content:string|null; menu_name:string|null
  star_score:number|null; want_to_go_back:boolean|null
  taste_score:number; portion_score:number; value_score:number
  spiciness:number|null; saltiness:number|null; sweetness:number|null
  texture_tags:string[]|null; situation_tags:string[]|null
  photos:any; created_at:string
  stores:{ name:string; category:string; address:string }|null
  user_taste_profile:{ nickname:string; spice_level?:number; pickiness?:number; style_pref?:number; preferred_cuisines?:string[] }|null
}

export default function FeedPage() {
  const router = useRouter()
  const supabase = createClient()
  const [reviews,       setReviews]       = useState<Review[]>([])
  const [loading,       setLoading]       = useState(true)
  const [tab,           setTab]           = useState<'all'|'following'|'taste'>('all')
  const [myUserId,      setMyUserId]      = useState<string|null>(null)
  const [followingIds,  setFollowingIds]  = useState<string[]>([])
  const [myProfile,     setMyProfile]     = useState<any>(null)
  const [likedIds,      setLikedIds]      = useState<string[]>([])
  const [savedStoreIds, setSavedStoreIds] = useState<string[]>([])
  const [modalReview,   setModalReview]   = useState<Review|null>(null)

  useEffect(()=>{
    const load = async () => {
      try {
        const { data:{ user } } = await supabase.auth.getUser()
        if (user) {
          setMyUserId(user.id)
          const { data:fol } = await supabase.from('follows').select('following_id').eq('follower_id',user.id)
          setFollowingIds(fol?.map(f=>f.following_id)||[])
          const { data:tp } = await supabase.from('user_taste_profile').select('spice_level,pickiness,style_pref,preferred_cuisines').eq('user_id',user.id).single()
          setMyProfile(tp)
          // 좋아요 목록
          const { data:likes } = await supabase.from('review_likes').select('review_id').eq('user_id',user.id)
          setLikedIds(likes?.map(l=>l.review_id)||[])
          // 저장된 가게 목록
          const { data:saved } = await supabase.from('saved_stores').select('store_id').eq('user_id',user.id)
          setSavedStoreIds(saved?.map(s=>String(s.store_id))||[])
        }
      } catch {}

      const { data:revData, error } = await supabase
        .from('reviews').select('*,stores(name,category,address)')
        .order('created_at',{ ascending:false }).limit(50)
      if (error||!revData) { setLoading(false); return }

      const userIds = [...new Set(revData.map((r:any)=>r.user_id))]
      const { data:profiles } = await supabase.from('user_taste_profile')
        .select('user_id,nickname,spice_level,pickiness,style_pref,preferred_cuisines').in('user_id',userIds)
      const pMap:Record<string,any> = {}
      profiles?.forEach(p=>{ pMap[p.user_id]=p })
      setReviews(revData.map((r:any)=>({ ...r, user_taste_profile:pMap[r.user_id]||{ nickname:'익명' } })) as Review[])
      setLoading(false)
    }
    load()
  },[])

  function tasteMatch(my:any,other:any):number {
    if (!my||!other) return 0
    const diff = Math.abs((my.spice_level||5)-(other.spice_level||5))+Math.abs((my.pickiness||5)-(other.pickiness||5))+Math.abs((my.style_pref||5)-(other.style_pref||5))
    const bonus = (my.preferred_cuisines||[]).some((c:string)=>(other.preferred_cuisines||[]).includes(c))?20:0
    return Math.max(0,100-diff*5+bonus)
  }

  const displayed = tab==='following'
    ? reviews.filter(r=>followingIds.includes(r.user_id))
    : tab==='taste'
    ? [...reviews].sort((a,b)=>tasteMatch(myProfile,b.user_taste_profile)-tasteMatch(myProfile,a.user_taste_profile))
    : reviews

  // 1번: 좋아요 토글
  const toggleLike = async (e:React.MouseEvent, reviewId:string) => {
    e.stopPropagation()
    if (!myUserId) { router.push('/login'); return }
    const liked = likedIds.includes(reviewId)
    if (liked) {
      await supabase.from('review_likes').delete().eq('user_id',myUserId).eq('review_id',reviewId)
      setLikedIds(prev=>prev.filter(id=>id!==reviewId))
    } else {
      await supabase.from('review_likes').insert({ user_id:myUserId, review_id:reviewId })
      setLikedIds(prev=>[...prev,reviewId])
    }
  }

  // 1번: 가게 저장 토글
  const toggleSaveStore = async (e:React.MouseEvent, review:Review) => {
    e.stopPropagation()
    if (!myUserId) { router.push('/login'); return }
    const storeId = String(review.store_id)
    const saved = savedStoreIds.includes(storeId)
    if (saved) {
      await supabase.from('saved_stores').delete().eq('user_id',myUserId).eq('store_id',storeId)
      setSavedStoreIds(prev=>prev.filter(id=>id!==storeId))
    } else {
      await supabase.from('saved_stores').insert({
        user_id:myUserId, store_id:storeId,
        store_name:review.stores?.name||'', store_category:review.stores?.category||'',
        store_address:review.stores?.address||''
      })
      setSavedStoreIds(prev=>[...prev,storeId])
    }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'48px'}}>🍜</div>
      <p style={{color:'#bbb',fontSize:'14px'}}>피드 불러오는 중...</p>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f5',paddingBottom:'80px'}}>

      {/* 5번 팝업 */}
      {modalReview && <TasteModal review={modalReview} onClose={()=>setModalReview(null)}/>}

      {/* 헤더 - 2번: 로고 클릭 시 맵으로 이동 */}
      <div style={{background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',padding:'48px 20px 20px',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <div onClick={()=>router.push('/map')} style={{cursor:'pointer'}}>
          <h1 style={{margin:0,fontSize:'22px',fontWeight:'800',color:'white',letterSpacing:'-0.5px'}}>🍜 맛지도 피드</h1>
          <p style={{margin:'4px 0 0',fontSize:'12px',color:'rgba(255,255,255,0.7)'}}>탭해서 지도로 이동 · 리뷰 {reviews.length}개</p>
        </div>
        <button onClick={()=>router.push('/review/write')} style={{background:'rgba(255,255,255,0.25)',backdropFilter:'blur(8px)',color:'white',border:'1.5px solid rgba(255,255,255,0.5)',borderRadius:'20px',padding:'8px 18px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>+ 리뷰 작성</button>
      </div>

      {/* 탭 */}
      <div style={{background:'white',display:'flex',borderBottom:'1px solid #f0f0f0',position:'sticky',top:0,zIndex:10}}>
        {([['all','🕐 전체'],['following','👥 팔로잉'],['taste','👅 입맛순']] as const).map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:'13px 0',border:'none',background:'transparent',fontSize:'13px',fontWeight:tab===key?'700':'400',color:tab===key?'#FF5A3D':'#aaa',cursor:'pointer',borderBottom:tab===key?'2px solid #FF5A3D':'2px solid transparent',transition:'all 0.2s'}}>{label}</button>
        ))}
      </div>

      {/* 팔로잉 빈 상태 */}
      {tab==='following'&&displayed.length===0&&(
        <div style={{textAlign:'center',padding:'60px 20px'}}>
          <div style={{fontSize:'60px',marginBottom:'16px'}}>👥</div>
          <p style={{color:'#999',fontSize:'16px'}}>팔로잉한 사람의 리뷰가 없어요</p>
          <button onClick={()=>router.push('/users')} style={{marginTop:'16px',background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',color:'white',border:'none',borderRadius:'14px',padding:'12px 28px',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>사용자 탐색</button>
        </div>
      )}

      {/* 리뷰 없음 */}
      {tab!=='following'&&displayed.length===0&&!loading&&(
        <div style={{textAlign:'center',padding:'80px 20px'}}>
          <div style={{fontSize:'64px',marginBottom:'16px'}}>🍽️</div>
          <p style={{color:'#bbb',fontSize:'16px',fontWeight:'500'}}>아직 리뷰가 없어요</p>
          <button onClick={()=>router.push('/review/write')} style={{marginTop:'20px',background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',color:'white',border:'none',borderRadius:'14px',padding:'12px 28px',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>리뷰 작성하기</button>
        </div>
      )}

      {/* 리뷰 카드 */}
      {displayed.length>0&&(
        <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:'18px'}}>
          {displayed.map(review=>{
            const photos  = parsePhotos(review.photos)
            const items   = [review.taste_score||5, review.portion_score||5, review.value_score||5, review.spiciness||5, review.saltiness||5, review.sweetness||5]
            const total   = Math.round(items.reduce((s,v)=>s+v,0)/items.length*10)/10
            const init    = (review.user_taste_profile?.nickname||'익')[0]
            const isLiked = likedIds.includes(review.id)
            const isSaved = savedStoreIds.includes(String(review.store_id))

            return (
              <div key={review.id} style={{background:'white',borderRadius:'22px',overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.07)'}}>

                {/* 5번: 사진 + 총점만 표시, 클릭 시 팝업 */}
                <div onClick={()=>setModalReview(review)} style={{cursor:'pointer'}}>
                  {photos.length>0 ? (
                    <div style={{position:'relative',width:'100%',aspectRatio:'4/3',background:'#efefef'}}>
                      <img src={photos[0]} alt="리뷰 사진" style={{width:'100%',height:'100%',objectFit:'cover'}}
                        onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none'}}/>
                      {/* 총점 배지 */}
                      <div style={{position:'absolute',top:'12px',left:'12px',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(4px)',color:'white',borderRadius:'20px',padding:'5px 12px',fontSize:'13px',fontWeight:'800'}}>
                        ⭐ {total}
                      </div>
                      {photos.length>1&&(
                        <div style={{position:'absolute',top:'12px',right:'12px',background:'rgba(0,0,0,0.55)',color:'white',borderRadius:'14px',padding:'3px 9px',fontSize:'11px',fontWeight:'700'}}>+{photos.length-1}</div>
                      )}
                      <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,0.72))',padding:'24px 16px 14px'}}>
                        <p style={{margin:0,color:'white',fontWeight:'800',fontSize:'17px',letterSpacing:'-0.3px'}}>{review.stores?.name||'가게 이름 없음'}</p>
                        <p style={{margin:'3px 0 0',color:'rgba(255,255,255,0.75)',fontSize:'12px'}}>{review.stores?.category}</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',padding:'22px 18px',position:'relative'}}>
                      <div style={{position:'absolute',top:'14px',right:'16px',background:'rgba(255,255,255,0.25)',borderRadius:'20px',padding:'4px 12px',fontSize:'13px',fontWeight:'800',color:'white'}}>⭐ {total}</div>
                      <p style={{margin:0,color:'white',fontWeight:'800',fontSize:'17px'}}>{review.stores?.name||'가게 이름 없음'}</p>
                      <p style={{margin:'4px 0 0',color:'rgba(255,255,255,0.8)',fontSize:'12px'}}>{review.stores?.category}</p>
                    </div>
                  )}
                  {/* 점수 미리보기 힌트 */}
                  <div style={{padding:'8px 16px 0',display:'flex',alignItems:'center',gap:'6px'}}>
                    <span style={{fontSize:'11px',color:'#bbb'}}>탭해서 맛 점수 상세 보기 →</span>
                  </div>
                </div>

                {/* 유저 정보 + 액션 버튼들 */}
                <div style={{padding:'12px 16px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    {/* 유저 */}
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'15px',fontWeight:'800',flexShrink:0}}>{init}</div>
                      <div>
                        <p style={{margin:0,fontSize:'13px',fontWeight:'700',color:'#222'}}>{review.user_taste_profile?.nickname||'익명'}</p>
                        <p style={{margin:0,fontSize:'11px',color:'#bbb'}}>{new Date(review.created_at).toLocaleDateString('ko-KR')}</p>
                      </div>
                    </div>

                    {/* 1번: 액션 버튼들 (좋아요, 저장, 팔로우) */}
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      {/* 좋아요 */}
                      <button onClick={e=>toggleLike(e,review.id)} style={{width:'36px',height:'36px',borderRadius:'50%',border:'1.5px solid',borderColor:isLiked?'#FF5A3D':'#eee',background:isLiked?'#fff3f0':'white',fontSize:'17px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {isLiked?'❤️':'🤍'}
                      </button>
                      {/* 가게 저장 */}
                      <button onClick={e=>toggleSaveStore(e,review)} style={{width:'36px',height:'36px',borderRadius:'50%',border:'1.5px solid',borderColor:isSaved?'#FF9800':'#eee',background:isSaved?'#fff8f0':'white',fontSize:'17px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {isSaved?'🔖':'🏷️'}
                      </button>
                      {/* 팔로우 */}
                      {myUserId&&review.user_id!==myUserId&&(
                        <FollowButton myId={myUserId} targetId={review.user_id} followingIds={followingIds}
                          onToggle={(id,f)=>setFollowingIds(prev=>f?[...prev,id]:prev.filter(x=>x!==id))}/>
                      )}
                    </div>
                  </div>

                  {/* 메뉴 이름 */}
                  {review.menu_name&&(
                    <p style={{margin:'10px 0 0',fontSize:'13px',color:'#555',background:'#fff5f3',borderRadius:'10px',padding:'7px 12px',display:'inline-block'}}>🍴 {review.menu_name}</p>
                  )}

                  {/* 재방문 + 별점 */}
                  <div style={{display:'flex',gap:'8px',marginTop:'10px',flexWrap:'wrap'}}>
                    {review.star_score&&review.star_score>0&&(
                      <span style={{fontSize:'13px',background:'#fffbe6',borderRadius:'10px',padding:'4px 10px'}}>{'⭐'.repeat(review.star_score)}</span>
                    )}
                    {review.want_to_go_back&&(
                      <span style={{background:'#fff3f0',color:'#FF5A3D',borderRadius:'10px',padding:'4px 10px',fontSize:'12px',fontWeight:'700'}}>🙋 또 갈래요!</span>
                    )}
                    {review.want_to_go_back===false&&(
                      <span style={{background:'#f5f5f5',color:'#999',borderRadius:'10px',padding:'4px 10px',fontSize:'12px',fontWeight:'700'}}>🙅 글쎄요</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 하단 네비게이션 */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'white',borderTop:'1px solid #f0f0f0',display:'flex',paddingTop:'8px',paddingBottom:'calc(8px + env(safe-area-inset-bottom))',zIndex:100}}>
        {[{icon:'🗺️',label:'지도',path:'/map'},{icon:'🍜',label:'피드',path:'/feed'},{icon:'✍️',label:'리뷰',path:'/review/write'},{icon:'🔖',label:'저장',path:'/saved'},{icon:'👤',label:'프로필',path:'/profile'}].map(item=>(
          <button key={item.path} onClick={()=>router.push(item.path)} style={{flex:1,border:'none',background:'transparent',display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',cursor:'pointer',padding:'0 4px',minHeight:'44px',WebkitTapHighlightColor:'transparent'}}>
            <span style={{fontSize:'24px',lineHeight:'1'}}>{item.icon}</span>
            <span style={{fontSize:'10px',color:'#999',fontWeight:'500'}}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
