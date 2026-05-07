'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

declare global { interface Window { kakao: any } }

function RadarChart({ scores, size = 140 }: {
  scores: { taste:number; portion:number; value:number; spiciness:number; saltiness:number; sweetness:number }
  size?: number
}) {
  const c = size/2, r = size/2-24
  const vals = [scores.taste,scores.portion,scores.value,scores.spiciness,scores.saltiness,scores.sweetness]
  const emojis = ['🍽️','🍱','💰','🌶️','🧂','🍯']
  const clrs = ['#FF5A3D','#FF9800','#4CAF50','#F44336','#2196F3','#9C27B0']
  const labels = ['맛','양','가성비','맵기','짠기','단기']
  const pt = (i:number, rad:number) => {
    const a = Math.PI*2*i/6 - Math.PI/2
    return { x: c+rad*Math.cos(a), y: c+rad*Math.sin(a) }
  }
  const bg = [2,4,6,8,10].map(l=>Array.from({length:6},(_,i)=>pt(i,r*l/10)).map(p=>`${p.x},${p.y}`).join(' '))
  const dp = vals.map((v,i)=>pt(i,r*Math.max(0,Math.min(10,v||5))/10))
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

function parsePhotos(photos: any): string[] {
  if (!photos) return []
  if (Array.isArray(photos)) return photos.filter(Boolean)
  if (typeof photos === 'string') {
    try { const p = JSON.parse(photos); return Array.isArray(p) ? p.filter(Boolean) : [] }
    catch { return [] }
  }
  return []
}

interface Review {
  id:string; user_id:string; store_id:string
  content:string|null; menu_name:string|null
  star_score:number|null; want_to_go_back:boolean|null
  taste_score:number; portion_score:number; value_score:number
  spiciness:number|null; saltiness:number|null; sweetness:number|null
  texture_tags:string[]|null; situation_tags:string[]|null
  photos:any; created_at:string
  stores:{ name:string; category:string; address:string; latitude:number|null; longitude:number|null }|null
}

interface TasteProfile {
  nickname:string; spice_level:number; pickiness:number; style_pref:number
  preferred_cuisines:string[]|null; badges:any[]|null; bio:string|null; taste_mbti:string|null
}

function calcTasteMBTI(profile: TasteProfile): { mbti:string; desc:string; emoji:string } {
  const spice = profile.spice_level||5
  const picky = profile.pickiness||5
  const style = profile.style_pref||5
  const cuisines = profile.preferred_cuisines||[]
  const S = spice>=6 ? 'H' : 'M'
  const P = picky>=6 ? 'F' : 'E'
  const T = style>=6 ? 'T' : 'C'
  const V = cuisines.includes('비건')||cuisines.includes('채식') ? 'V' : 'O'
  const key = `${S}${P}${T}${V}`
  const descMap: Record<string,{desc:string;emoji:string}> = {
    'HFTO':{ desc:'불맛 마니아 파인다이너', emoji:'🌶️🍷' },
    'HFTV':{ desc:'열정적인 미식 탐험가', emoji:'🌶️🔍' },
    'HFCO':{ desc:'클래식 매운맛 고수', emoji:'🌶️👑' },
    'HFCV':{ desc:'전통 매운맛 수호자', emoji:'🌶️🏛️' },
    'HETO':{ desc:'뭐든 맵게 먹는 탐식가', emoji:'🌶️😋' },
    'HETV':{ desc:'트렌디한 매운맛 채식러', emoji:'🌶️🌱' },
    'HECO':{ desc:'매운 거 잘 먹는 현실파', emoji:'🌶️💪' },
    'MFTO':{ desc:'까다로운 트렌드세터', emoji:'✨🍽️' },
    'MFTV':{ desc:'섬세한 비건 미식가', emoji:'🌿🔍' },
    'MFCO':{ desc:'정통 맛집만 가는 원칙파', emoji:'📍👨‍🍳' },
    'METO':{ desc:'맛있으면 다 좋아', emoji:'😄🍜' },
    'METV':{ desc:'가벼운 채식주의 탐식가', emoji:'🌱😊' },
    'MECO':{ desc:'소박한 단골 맛집러', emoji:'🏠🍚' },
  }
  const info = descMap[key]||{ desc:'나만의 독특한 입맛', emoji:'🍴✨' }
  return { mbti:key, desc:info.desc, emoji:info.emoji }
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const mapRef = useRef<HTMLDivElement>(null)
  const kakaoMapRef = useRef<any>(null)

  const [profile,        setProfile]        = useState<TasteProfile|null>(null)
  const [reviews,        setReviews]        = useState<Review[]>([])
  const [loading,        setLoading]        = useState(true)
  const [activeTab,      setActiveTab]      = useState<'reviews'|'map'|'saved'>('reviews')
  const [expandedId,     setExpandedId]     = useState<string|null>(null)
  const [editingBio,     setEditingBio]     = useState(false)
  const [bioText,        setBioText]        = useState('')
  const [followerCount,  setFollowerCount]  = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  useEffect(()=>{
    const load = async () => {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data:tp },{ data:rv }] = await Promise.all([
        supabase.from('user_taste_profile').select('*').eq('user_id',user.id).single(),
        supabase.from('reviews').select('*,stores(name,category,address,latitude,longitude)')
          .eq('user_id',user.id).order('created_at',{ ascending:false })
      ])
      if (tp) { setProfile(tp); setBioText(tp.bio||'') }
      if (rv) setReviews(rv)

      const { count:fc } = await supabase.from('follows').select('id',{ count:'exact',head:true }).eq('following_id',user.id)
      const { count:fg } = await supabase.from('follows').select('id',{ count:'exact',head:true }).eq('follower_id',user.id)
      setFollowerCount(fc||0)
      setFollowingCount(fg||0)
      setLoading(false)
    }
    load()
  },[])

  useEffect(()=>{
    if (activeTab!=='map'||!mapRef.current) return
    const tryInit = () => {
      if (!window.kakao?.maps) { setTimeout(tryInit,300); return }
      window.kakao.maps.load(()=>{
        if (kakaoMapRef.current) return
        const first = reviews.find(r=>r.stores?.latitude&&r.stores?.longitude)
        const center = first?.stores
          ? new window.kakao.maps.LatLng(first.stores.latitude,first.stores.longitude)
          : new window.kakao.maps.LatLng(35.5384,129.3114)
        const map = new window.kakao.maps.Map(mapRef.current!,{ center, level:5 })
        kakaoMapRef.current = map
        reviews.forEach(rv=>{
          if (!rv.stores?.latitude||!rv.stores?.longitude) return
          const avg = Math.round(((rv.taste_score||5)+(rv.portion_score||5)+(rv.value_score||5))/3*10)/10
          const el = document.createElement('div')
          el.innerHTML = `<div style="background:linear-gradient(135deg,#FF5A3D,#FF8C42);color:white;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(255,90,61,0.4);cursor:pointer;white-space:nowrap">📍 ${rv.stores.name}<br><span style="font-size:10px;opacity:0.9">⭐ ${avg}</span></div>`
          new window.kakao.maps.CustomOverlay({ map, position:new window.kakao.maps.LatLng(rv.stores.latitude,rv.stores.longitude), content:el, yAnchor:1 })
        })
      })
    }
    tryInit()
  },[activeTab,reviews])

  const saveBio = async () => {
    const { data:{ user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_taste_profile').update({ bio:bioText }).eq('user_id',user.id)
    setProfile(prev=>prev?{ ...prev, bio:bioText }:prev)
    setEditingBio(false)
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'40px'}}>👤</div>
      <p style={{color:'#999',fontSize:'14px'}}>프로필 불러오는 중...</p>
    </div>
  )

  const overallAvg = reviews.length
    ? Math.round(reviews.reduce((s,r)=>s+((r.taste_score||5)+(r.portion_score||5)+(r.value_score||5))/3,0)/reviews.length*10)/10
    : 0

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f5',paddingBottom:'80px'}}>

      {/* 헤더 배너 */}
      <div style={{background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',padding:'44px 20px 24px',color:'white'}}>
        <div style={{display:'flex',alignItems:'center',gap:'16px',marginBottom:'16px'}}>
          <div style={{width:'68px',height:'68px',borderRadius:'50%',background:'rgba(255,255,255,0.28)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'30px',fontWeight:'800',flexShrink:0}}>
            {(profile?.nickname||'?')[0]}
          </div>
          <div style={{flex:1}}>
            <h2 style={{margin:0,fontSize:'22px',fontWeight:'800',letterSpacing:'-0.5px'}}>{profile?.nickname||'닉네임 없음'}</h2>
            <p style={{margin:'4px 0 0',opacity:0.8,fontSize:'13px'}}>
              리뷰 {reviews.length}개 · ⭐ {overallAvg} · 팔로워 {followerCount} · 팔로잉 {followingCount}
            </p>
            <button onClick={()=>router.push('/users')} style={{
              marginTop:'6px',background:'rgba(255,255,255,0.22)',color:'white',
              border:'1px solid rgba(255,255,255,0.4)',borderRadius:'20px',
              padding:'4px 12px',fontSize:'12px',fontWeight:'600',cursor:'pointer'
            }}>👥 사용자 탐색</button>
          </div>
        </div>

        {/* 입맛 MBTI */}
        {profile && (()=>{
          const { mbti, desc, emoji } = calcTasteMBTI(profile)
          return (
            <div style={{background:'rgba(255,255,255,0.18)',backdropFilter:'blur(8px)',borderRadius:'16px',padding:'12px 16px',marginBottom:'14px'}}>
              <p style={{margin:'0 0 4px',fontSize:'11px',opacity:0.75,fontWeight:'600',letterSpacing:'0.5px'}}>🧬 나의 입맛 MBTI</p>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'20px',fontWeight:'900',letterSpacing:'2px',background:'rgba(255,255,255,0.25)',borderRadius:'8px',padding:'4px 10px'}}>{mbti}</span>
                <p style={{margin:0,fontSize:'14px',fontWeight:'700'}}>{emoji} {desc}</p>
              </div>
            </div>
          )
        })()}

        {/* 자기소개 */}
        <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'14px',padding:'12px 14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
            <p style={{margin:0,fontSize:'11px',opacity:0.75,fontWeight:'600',letterSpacing:'0.5px'}}>✍️ 자기소개</p>
            <button onClick={e=>{e.stopPropagation();setEditingBio(!editingBio)}} style={{
              background:'rgba(255,255,255,0.25)',color:'white',border:'none',
              borderRadius:'8px',padding:'3px 8px',fontSize:'11px',fontWeight:'600',cursor:'pointer'
            }}>{editingBio?'취소':'수정'}</button>
          </div>
          {editingBio ? (
            <div>
              <textarea value={bioText} onChange={e=>setBioText(e.target.value)}
                placeholder="나의 입맛을 소개해보세요" maxLength={100}
                style={{width:'100%',background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.4)',borderRadius:'10px',padding:'8px 10px',color:'white',fontSize:'13px',lineHeight:'1.5',resize:'none',outline:'none',boxSizing:'border-box',minHeight:'60px'}}/>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'6px'}}>
                <span style={{fontSize:'11px',opacity:0.6}}>{bioText.length}/100</span>
                <button onClick={saveBio} style={{background:'rgba(255,255,255,0.35)',color:'white',border:'none',borderRadius:'8px',padding:'4px 12px',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>저장</button>
              </div>
            </div>
          ) : (
            <p style={{margin:0,fontSize:'13px',lineHeight:'1.6',opacity:profile?.bio?1:0.55}}>
              {profile?.bio||'아직 자기소개가 없어요. 수정을 눌러 작성해보세요!'}
            </p>
          )}
        </div>

        {/* 선호 음식 태그 */}
        {profile?.preferred_cuisines && profile.preferred_cuisines.length>0 && (
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'12px'}}>
            {profile.preferred_cuisines.map(c=>(
              <span key={c} style={{background:'rgba(255,255,255,0.22)',color:'white',borderRadius:'20px',padding:'4px 12px',fontSize:'12px',fontWeight:'600'}}>{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* 추천 맛집 바로가기 */}
      <div style={{background:'white',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #f5f5f5'}}>
        <div>
          <p style={{margin:0,fontSize:'14px',fontWeight:'700',color:'#333'}}>🎯 내 입맛 맞춤 추천</p>
          <p style={{margin:'2px 0 0',fontSize:'12px',color:'#aaa'}}>입맛 프로필 기반 맛집 추천</p>
        </div>
        <button onClick={()=>router.push('/recommend')} style={{
          background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',color:'white',
          border:'none',borderRadius:'20px',padding:'8px 16px',fontSize:'13px',fontWeight:'700',cursor:'pointer'
        }}>추천 보기 →</button>
      </div>

      {/* 탭 */}
      <div style={{background:'white',display:'flex',borderBottom:'1px solid #f0f0f0',position:'sticky',top:0,zIndex:10}}>
        {(['reviews','map','saved'] as const).map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{
            flex:1,padding:'14px 0',border:'none',background:'transparent',
            fontSize:'13px',fontWeight:activeTab===t?'700':'400',
            color:activeTab===t?'#FF5A3D':'#999',cursor:'pointer',
            borderBottom:activeTab===t?'2px solid #FF5A3D':'2px solid transparent'
          }}>
            {t==='reviews'?'🍽️ 내 리뷰':t==='map'?'🗺️ 리뷰 지도':'🔖 저장'}
          </button>
        ))}
      </div>

      {/* 내 리뷰 탭 */}
      {activeTab==='reviews' && (
        <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:'16px'}}>
          {reviews.length===0 ? (
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:'60px',marginBottom:'16px'}}>🍜</div>
              <p style={{color:'#999',fontSize:'16px'}}>아직 리뷰가 없어요</p>
            </div>
          ) : reviews.map(review=>{
            const isExp = expandedId===review.id
            const photos = parsePhotos(review.photos)
            const avg = Math.round(((review.taste_score||5)+(review.portion_score||5)+(review.value_score||5))/3*10)/10
            return (
              <div key={review.id} onClick={()=>setExpandedId(isExp?null:review.id)}
                style={{background:'white',borderRadius:'20px',overflow:'hidden',cursor:'pointer',boxShadow:'0 2px 16px rgba(0,0,0,0.08)'}}>

                {/* 사진 먼저 */}
                {photos.length>0 ? (
                  <div style={{position:'relative',width:'100%',aspectRatio:'4/3',overflow:'hidden',background:'#f0f0f0'}}>
                    <img src={photos[0]} alt="리뷰 사진" style={{width:'100%',height:'100%',objectFit:'cover'}}
                      onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none'}}/>
                    {photos.length>1 && (
                      <div style={{position:'absolute',top:'10px',right:'10px',background:'rgba(0,0,0,0.6)',color:'white',borderRadius:'12px',padding:'3px 8px',fontSize:'11px',fontWeight:'700'}}>+{photos.length-1}</div>
                    )}
                    <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,0.7))',padding:'20px 16px 12px'}}>
                      <p style={{margin:0,color:'white',fontWeight:'700',fontSize:'16px'}}>{review.stores?.name||'가게 이름 없음'}</p>
                      <p style={{margin:'2px 0 0',color:'rgba(255,255,255,0.8)',fontSize:'12px'}}>{review.stores?.category}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',padding:'20px 16px'}}>
                    <p style={{margin:0,color:'white',fontWeight:'700',fontSize:'16px'}}>{review.stores?.name||'가게 이름 없음'}</p>
                    <p style={{margin:'4px 0 0',color:'rgba(255,255,255,0.8)',fontSize:'12px'}}>{review.stores?.category} · ⭐ {avg}</p>
                  </div>
                )}

                {/* 본문 */}
                <div style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                    <span style={{fontSize:'12px',color:'#aaa'}}>{new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
                    <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                      {review.star_score && <span>{'⭐'.repeat(review.star_score)}</span>}
                      {review.want_to_go_back && <span style={{background:'#FF5A3D',color:'white',borderRadius:'10px',padding:'2px 8px',fontSize:'10px',fontWeight:'700'}}>또 갈래요!</span>}
                    </div>
                  </div>
                  {review.menu_name && (
                    <p style={{margin:'0 0 8px',fontSize:'13px',color:'#555',background:'#fff5f3',borderRadius:'8px',padding:'6px 10px'}}>🍴 {review.menu_name}</p>
                  )}
                  {review.content && (
                    <p style={{margin:'0 0 10px',fontSize:'14px',color:'#444',lineHeight:'1.6',display:'-webkit-box',WebkitLineClamp:isExp?'unset':2,WebkitBoxOrient:'vertical' as any,overflow:'hidden'}}>{review.content}</p>
                  )}
                  {((review.texture_tags?.length||0)+(review.situation_tags?.length||0))>0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}}>
                      {review.texture_tags?.map(t=><span key={t} style={{background:'#fff3f0',color:'#FF5A3D',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>{t}</span>)}
                      {review.situation_tags?.map(t=><span key={t} style={{background:'#f0f7ff',color:'#2196F3',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>{t}</span>)}
                    </div>
                  )}

                  {/* 레이더 차트 */}
                  <div style={{background:'#fafafa',borderRadius:'14px',padding:'16px',display:'flex',flexDirection:'column',alignItems:'center',marginTop:'4px'}}>
                    <p style={{margin:'0 0 8px',fontSize:'11px',color:'#bbb',fontWeight:'600'}}>🕸️ 맛 레이더</p>
                    <RadarChart scores={{taste:review.taste_score||5,portion:review.portion_score||5,value:review.value_score||5,spiciness:review.spiciness||5,saltiness:review.saltiness||5,sweetness:review.sweetness||5}} size={140}/>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'4px 8px',marginTop:'8px',width:'100%'}}>
                      {[['맛','#FF5A3D',review.taste_score],['양','#FF9800',review.portion_score],['가성비','#4CAF50',review.value_score],['맵기','#F44336',review.spiciness],['짠기','#2196F3',review.saltiness],['단기','#9C27B0',review.sweetness]].map(([l,c,v])=>(
                        <div key={String(l)} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px'}}>
                          <div style={{width:'7px',height:'7px',borderRadius:'50%',background:String(c)}}/>
                          <span style={{color:'#888'}}>{l}</span>
                          <span style={{color:String(c),fontWeight:'700'}}>{v||5}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isExp && photos.length>1 && (
                    <div style={{display:'flex',gap:'6px',overflowX:'auto',marginTop:'12px',paddingBottom:'4px'}}>
                      {photos.slice(1).map((url,i)=><img key={i} src={url} alt={`사진${i+2}`} style={{width:'80px',height:'80px',objectFit:'cover',borderRadius:'10px',flexShrink:0}}/>)}
                    </div>
                  )}
                  {(review.content?.length||0)>60 && (
                    <p style={{margin:'8px 0 0',fontSize:'12px',color:'#FF5A3D',fontWeight:'600',textAlign:'center'}}>{isExp?'접기 ▲':'더보기 ▼'}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 리뷰 지도 탭 */}
      {activeTab==='map' && (
        <div>
          {reviews.some(r=>r.stores?.latitude) ? (
            <div ref={mapRef} style={{width:'100%',height:'calc(100vh - 200px)'}}/>
          ) : (
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:'60px',marginBottom:'16px'}}>🗺️</div>
              <p style={{color:'#999',fontSize:'16px'}}>위치 정보가 있는 리뷰가 없어요</p>
            </div>
          )}
        </div>
      )}

      {/* 저장 탭 */}
      {activeTab==='saved' && (
        <div style={{padding:'20px',textAlign:'center'}}>
          <div style={{fontSize:'60px',marginBottom:'16px'}}>🔖</div>
          <p style={{color:'#999'}}>저장한 맛집은 아래 버튼에서 확인하세요</p>
          <button onClick={()=>router.push('/saved')} style={{
            background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',color:'white',
            border:'none',borderRadius:'12px',padding:'12px 24px',
            fontSize:'14px',fontWeight:'700',cursor:'pointer',marginTop:'12px'
          }}>저장 목록 보기</button>
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
