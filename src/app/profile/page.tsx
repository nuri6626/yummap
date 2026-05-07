'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

declare global { interface Window { kakao: any } }

// ── 레이더 차트 (인라인) ──────────────────────────────────────────
function RadarChart({ scores, size = 140 }: {
  scores: { taste:number; portion:number; value:number; spiciness:number; saltiness:number; sweetness:number }
  size?: number
}) {
  const c = size/2, r = size/2-24
  const vals = [scores.taste,scores.portion,scores.value,scores.spiciness,scores.saltiness,scores.sweetness]
  const emojis = ['🍽️','🍱','💰','🌶️','🧂','🍯']
  const clrs = ['#FF5A3D','#FF9800','#4CAF50','#F44336','#2196F3','#9C27B0']
  const pt = (i:number, radius:number) => {
    const a = Math.PI*2*i/6 - Math.PI/2
    return { x: c+radius*Math.cos(a), y: c+radius*Math.sin(a) }
  }
  const bg = [2,4,6,8,10].map(l=>Array.from({length:6},(_,i)=>pt(i,r*l/10)).map(p=>`${p.x},${p.y}`).join(' '))
  const dp = vals.map((v,i)=>pt(i,r*Math.max(0,Math.min(10,v||5))/10))
  return (
    <svg width={size} height={size} style={{overflow:'visible'}}>
      {bg.map((pts,i)=><polygon key={i} points={pts} fill="none" stroke="#eee" strokeWidth="1"/>)}
      {Array.from({length:6},(_,i)=>{const e=pt(i,r);return<line key={i} x1={c} y1={c} x2={e.x} y2={e.y} stroke="#eee" strokeWidth="1"/>})}
      <polygon points={dp.map(p=>`${p.x},${p.y}`).join(' ')} fill="rgba(255,90,61,0.15)" stroke="#FF5A3D" strokeWidth="2"/>
      {dp.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill={clrs[i]} stroke="white" strokeWidth="1.5"/>)}
      {Array.from({length:6},(_,i)=>{const lp=pt(i,r+18);return<text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="12">{emojis[i]}</text>})}
    </svg>
  )
}

interface Review {
  id:string; user_id:string; store_id:string
  content:string|null; menu_name:string|null; star_score:number|null
  want_to_go_back:boolean|null
  taste_score:number; portion_score:number; value_score:number
  spiciness:number|null; saltiness:number|null; sweetness:number|null
  texture_tags:string[]|null; situation_tags:string[]|null
  photos:string[]|null; created_at:string
  stores:{ name:string; category:string; address:string; latitude:number|null; longitude:number|null }|null
}

interface TasteProfile {
  nickname:string; spice_level:number; pickiness:number; style_pref:number
  preferred_cuisines:string[]|null; badges:string[]|null
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const mapRef = useRef<HTMLDivElement>(null)
  const kakaoMapRef = useRef<any>(null)

  const [profile, setProfile] = useState<TasteProfile|null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'reviews'|'map'|'saved'>('reviews')
  const [expandedId, setExpandedId] = useState<string|null>(null)

  useEffect(() => {
    const load = async () => {
      const { data:{ user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: tp }, { data: rv }] = await Promise.all([
        supabase.from('user_taste_profile').select('*').eq('user_id', user.id).single(),
        supabase.from('reviews').select(`*, stores(name,category,address,latitude,longitude)`).eq('user_id', user.id).order('created_at',{ascending:false})
      ])
      if (tp) setProfile(tp)
      if (rv) setReviews(rv)
      setLoading(false)
    }
    load()
  }, [])

  // 지도 탭 초기화
  useEffect(() => {
    if (activeTab !== 'map' || !mapRef.current) return
    const tryInit = () => {
      if (!window.kakao?.maps) { setTimeout(tryInit, 300); return }
      window.kakao.maps.load(() => {
        if (kakaoMapRef.current) return
        const first = reviews.find(r => r.stores?.latitude && r.stores?.longitude)
        const center = first?.stores
          ? new window.kakao.maps.LatLng(first.stores.latitude, first.stores.longitude)
          : new window.kakao.maps.LatLng(35.5384, 129.3114)
        const map = new window.kakao.maps.Map(mapRef.current!, { center, level: 5 })
        kakaoMapRef.current = map
        reviews.forEach(rv => {
          if (!rv.stores?.latitude || !rv.stores?.longitude) return
          const avg = Math.round(((rv.taste_score||5)+(rv.portion_score||5)+(rv.value_score||5))/3*10)/10
          const el = document.createElement('div')
          el.innerHTML = `<div style="background:linear-gradient(135deg,#FF5A3D,#FF8C42);color:white;padding:6px 10px;border-radius:20px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(255,90,61,0.4);white-space:nowrap;cursor:pointer">📍 ${rv.stores.name}<br/><span style="font-size:10px;opacity:0.9">⭐ ${avg}</span></div>`
          new window.kakao.maps.CustomOverlay({
            map, position: new window.kakao.maps.LatLng(rv.stores.latitude, rv.stores.longitude),
            content: el, yAnchor: 1
          })
        })
      })
    }
    tryInit()
  }, [activeTab, reviews])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'40px'}}>👤</div>
      <p style={{color:'#999',fontSize:'14px'}}>프로필 불러오는 중...</p>
    </div>
  )

  const overallAvg = reviews.length
    ? Math.round(reviews.reduce((s,r)=>s+((r.taste_score||5)+(r.portion_score||5)+(r.value_score||5))/3, 0)/reviews.length*10)/10
    : 0

  return (
    <div style={{minHeight:'100vh',background:'#f5f5f5',paddingBottom:'80px'}}>
      {/* 헤더 배너 */}
      <div style={{
        background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',
        padding:'40px 20px 24px', color:'white'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <div style={{
            width:'64px',height:'64px',borderRadius:'50%',
            background:'rgba(255,255,255,0.3)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:'28px',fontWeight:'700'
          }}>{(profile?.nickname||'?')[0]}</div>
          <div>
            <h2 style={{margin:0,fontSize:'22px',fontWeight:'800'}}>{profile?.nickname||'닉네임 없음'}</h2>
            <p style={{margin:'4px 0 0',opacity:0.85,fontSize:'13px'}}>
              리뷰 {reviews.length}개 · 평균 ⭐ {overallAvg}
            </p>
          </div>
        </div>
        {profile?.preferred_cuisines && (
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'14px'}}>
            {profile.preferred_cuisines.map(c=>(
              <span key={c} style={{
                background:'rgba(255,255,255,0.25)',color:'white',
                borderRadius:'20px',padding:'3px 10px',fontSize:'12px',fontWeight:'600'
              }}>{c}</span>
            ))}
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{
        background:'white',display:'flex',
        borderBottom:'1px solid #f0f0f0',position:'sticky',top:0,zIndex:10
      }}>
        {(['reviews','map','saved'] as const).map(tab => (
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{
            flex:1,padding:'14px 0',border:'none',background:'transparent',
            fontSize:'13px',fontWeight:activeTab===tab?'700':'400',
            color:activeTab===tab?'#FF5A3D':'#999',cursor:'pointer',
            borderBottom:activeTab===tab?'2px solid #FF5A3D':'2px solid transparent'
          }}>
            {tab==='reviews'?'🍽️ 내 리뷰':tab==='map'?'🗺️ 리뷰 지도':'🔖 저장'}
          </button>
        ))}
      </div>

      {/* ── 내 리뷰 탭 ───────────────────────────────────── */}
      {activeTab === 'reviews' && (
        <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:'16px'}}>
          {reviews.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:'60px',marginBottom:'16px'}}>🍜</div>
              <p style={{color:'#999',fontSize:'16px'}}>아직 리뷰가 없어요</p>
            </div>
          ) : reviews.map(review => {
            const isExp = expandedId === review.id
            const avg = Math.round(((review.taste_score||5)+(review.portion_score||5)+(review.value_score||5))/3*10)/10
            return (
              <div key={review.id} onClick={()=>setExpandedId(isExp?null:review.id)}
                style={{background:'white',borderRadius:'20px',overflow:'hidden',cursor:'pointer',boxShadow:'0 2px 16px rgba(0,0,0,0.08)'}}>

                {/* K: 사진 먼저 */}
                {review.photos && review.photos.length > 0 ? (
                  <div style={{position:'relative',width:'100%',aspectRatio:'4/3',overflow:'hidden',background:'#f0f0f0'}}>
                    <img src={review.photos[0]} alt="리뷰 사진"
                      style={{width:'100%',height:'100%',objectFit:'cover'}}
                      onError={e=>{(e.target as HTMLImageElement).style.display='none'}}
                    />
                    {review.photos.length > 1 && (
                      <div style={{position:'absolute',top:'10px',right:'10px',background:'rgba(0,0,0,0.6)',color:'white',borderRadius:'12px',padding:'3px 8px',fontSize:'11px',fontWeight:'700'}}>
                        +{review.photos.length-1}
                      </div>
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
                  {/* 별점 + 재방문 */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                    <span style={{fontSize:'12px',color:'#aaa'}}>{new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
                    <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                      {review.star_score && <span>{'⭐'.repeat(review.star_score)}</span>}
                      {review.want_to_go_back && (
                        <span style={{background:'#FF5A3D',color:'white',borderRadius:'10px',padding:'2px 8px',fontSize:'10px',fontWeight:'700'}}>또 갈래요!</span>
                      )}
                    </div>
                  </div>
                  {review.menu_name && (
                    <p style={{margin:'0 0 8px',fontSize:'13px',color:'#555',background:'#fff5f3',borderRadius:'8px',padding:'6px 10px'}}>🍴 {review.menu_name}</p>
                  )}
                  {review.content && (
                    <p style={{margin:'0 0 10px',fontSize:'14px',color:'#444',lineHeight:'1.6',
                      display:'-webkit-box',WebkitLineClamp:isExp?'unset':2,WebkitBoxOrient:'vertical' as any,overflow:'hidden'}}>
                      {review.content}
                    </p>
                  )}
                  {/* 태그 */}
                  {((review.texture_tags?.length||0)>0||(review.situation_tags?.length||0)>0) && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}}>
                      {review.texture_tags?.map(t=><span key={t} style={{background:'#fff3f0',color:'#FF5A3D',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>{t}</span>)}
                      {review.situation_tags?.map(t=><span key={t} style={{background:'#f0f7ff',color:'#2196F3',borderRadius:'20px',padding:'3px 10px',fontSize:'11px',fontWeight:'600'}}>{t}</span>)}
                    </div>
                  )}

                  {/* K: 디테일 평점 (레이더 차트) */}
                  <div style={{background:'#fafafa',borderRadius:'14px',padding:'16px',display:'flex',flexDirection:'column',alignItems:'center',marginTop:'4px'}}>
                    <p style={{margin:'0 0 8px',fontSize:'11px',color:'#bbb',fontWeight:'600'}}>🕸️ 맛 레이더</p>
                    <RadarChart scores={{taste:review.taste_score||5,portion:review.portion_score||5,value:review.value_score||5,spiciness:review.spiciness||5,saltiness:review.saltiness||5,sweetness:review.sweetness||5}} size={140}/>
                    {/* 수치 */}
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

                  {/* 여러 장 사진 (펼쳤을 때) */}
                  {isExp && review.photos && review.photos.length > 1 && (
                    <div style={{display:'flex',gap:'6px',overflowX:'auto',marginTop:'12px',paddingBottom:'4px'}}>
                      {review.photos.slice(1).map((url,i)=>(
                        <img key={i} src={url} alt={`사진${i+2}`} style={{width:'80px',height:'80px',objectFit:'cover',borderRadius:'10px',flexShrink:0}}/>
                      ))}
                    </div>
                  )}
                  {review.content && review.content.length > 60 && (
                    <p style={{margin:'8px 0 0',fontSize:'12px',color:'#FF5A3D',fontWeight:'600',textAlign:'center'}}>
                      {isExp?'접기 ▲':'더보기 ▼'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 리뷰 지도 탭 ─────────────────────────────────── */}
      {activeTab === 'map' && (
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

      {/* ── 저장 탭 ──────────────────────────────────────── */}
      {activeTab === 'saved' && (
        <div style={{padding:'20px',textAlign:'center'}}>
          <div style={{fontSize:'60px',marginBottom:'16px'}}>🔖</div>
          <p style={{color:'#999'}}>저장 탭은 /saved 페이지에서 확인하세요</p>
          <button onClick={()=>router.push('/saved')} style={{
            background:'linear-gradient(135deg,#FF5A3D,#FF8C42)',color:'white',
            border:'none',borderRadius:'12px',padding:'12px 24px',
            fontSize:'14px',fontWeight:'700',cursor:'pointer',marginTop:'12px'
          }}>저장 목록 보기</button>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'white',borderTop:'1px solid #f0f0f0',display:'flex',padding:'8px 0',zIndex:100}}>
        {[{icon:'🗺️',label:'지도',path:'/map'},{icon:'🍜',label:'피드',path:'/feed'},{icon:'✍️',label:'리뷰',path:'/review/write'},{icon:'🔖',label:'저장',path:'/saved'},{icon:'👤',label:'프로필',path:'/profile'}].map(item=>(
          <button key={item.path} onClick={()=>router.push(item.path)} style={{flex:1,border:'none',background:'transparent',display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',cursor:'pointer',padding:'4px 0'}}>
            <span style={{fontSize:'20px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',color:'#999'}}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
