'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DUMMY_REVIEWS = [
  { id: '1', store: '진짜 맛있는 김치찌개', menu: '김치찌개', score: 4.5, content: '국물이 깊고 진해서 정말 맛있었어요!', photo: '🍲', time: '2일 전' },
  { id: '2', store: '숨은 맛집 라멘', menu: '돈코츠 라멘', score: 4.8, content: '국물이 진짜 진하고 면도 탱탱해요', photo: '🍜', time: '5일 전' },
  { id: '3', store: '할머니 손맛 국밥', menu: '순대국밥', score: 4.6, content: '40년 전통의 손맛, 가성비 최고!', photo: '🥣', time: '1주 전' },
]

const DUMMY_SAVED = [
  { id: '1', name: '진짜 맛있는 김치찌개', category: '한식', score: 4.5 },
  { id: '2', name: '숨은 맛집 라멘', category: '일식', score: 4.8 },
  { id: '3', name: '할머니 손맛 국밥', category: '한식', score: 4.6 },
  { id: '4', name: '트렌디 브런치 카페', category: '카페', score: 4.3 },
]

interface TasteProfile {
  nickname: string
  spice_level: number
  pickiness: number
  style_pref: number
  preferred_cuisines: string[]
  reviewer_grade: string
}

const YumLogo = () => (
  <img src="/yum2.png" alt="yummap" style={{ height:'32px' }} />
)


export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'reviews' | 'saved' | 'collections'>('reviews')
  const [profile, setProfile] = useState<TasteProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data, error } = await supabase
        .from('user_taste_profile')
        .select('nickname, spice_level, pickiness, style_pref, preferred_cuisines, reviewer_grade')
        .eq('user_id', user.id)
        .single()
      console.log('프로필 데이터:', data, '오류:', error)
      if (data) setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#FFF5F3', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'40px', marginBottom:'12px' }}>🍜</div>
          <p style={{ color:'#FF5A3D', fontWeight:'bold' }}>불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#F2F2F2', fontFamily:'Pretendard, -apple-system, sans-serif', paddingBottom:'80px' }}>

      {/* 헤더 */}
      <div style={{ background:'white', padding:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 0 #eee' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <YumLogo />
          <span style={{ fontSize:'20px', fontWeight:'900', color:'#1A1A1A', letterSpacing:'-0.5px' }}>yummap</span>
        </div>
        <button style={{ background:'none', border:'none', fontSize:'22px', cursor:'pointer' }}>⚙️</button>
      </div>

      {/* 프로필 상단 배너 */}
      <div style={{ background:'linear-gradient(135deg, #FF5A3D 0%, #FF8560 100%)', padding:'32px 20px 24px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'120px', height:'120px', background:'rgba(255,255,255,0.1)', borderRadius:'50%' }}/>
        <div style={{ position:'absolute', bottom:'-30px', left:'10px', width:'80px', height:'80px', background:'rgba(255,255,255,0.07)', borderRadius:'50%' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:'16px', position:'relative' }}>
          <div style={{ width:'76px', height:'76px', background:'white', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'36px', boxShadow:'0 4px 12px rgba(0,0,0,0.15)' }}>
            👨‍🍳
          </div>
          <div>
            <h2 style={{ color:'white', fontSize:'22px', fontWeight:'800', margin:'0 0 4px', letterSpacing:'-0.5px' }}>
              {profile?.nickname || '닉네임 없음'}
            </h2>
            <div style={{ display:'inline-block', background:'rgba(255,255,255,0.25)', borderRadius:'20px', padding:'3px 10px' }}>
              <span style={{ color:'white', fontSize:'13px', fontWeight:'600' }}>🍜 맛집 탐험가</span>
            </div>
            <div style={{ display:'flex', gap:'20px', marginTop:'12px' }}>
              {[{ v:'32', l:'리뷰' }, { v:'128', l:'팔로워' }, { v:'64', l:'팔로잉' }].map(i => (
                <div key={i.l} style={{ textAlign:'center' }}>
                  <p style={{ color:'white', fontWeight:'800', fontSize:'18px', margin:0 }}>{i.v}</p>
                  <p style={{ color:'rgba(255,255,255,0.8)', fontSize:'12px', margin:0 }}>{i.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px' }}>

        {/* 입맛 프로필 카드 */}
        <div style={{ background:'white', borderRadius:'20px', padding:'20px', marginBottom:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <p style={{ fontWeight:'800', fontSize:'16px', color:'#1A1A1A', margin:0 }}>🌶️ 내 입맛 프로필</p>
            <button onClick={() => router.push('/onboarding')} style={{ background:'#FFE7DF', color:'#FF5A3D', border:'none', borderRadius:'12px', padding:'6px 12px', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
              수정 →
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            {[
              { label:'🌶️ 자극도', value: profile?.spice_level ?? 5, left:'순한맛', right:'강한맛' },
              { label:'🎯 입맛 기준', value: profile?.pickiness ?? 5, left:'관대한 입', right:'까다로운 입' },
              { label:'✨ 음식 스타일', value: profile?.style_pref ?? 5, left:'전통/담백', right:'트렌디/퓨전' },
            ].map(({ label, value, left, right }) => (
              <div key={label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                  <span style={{ fontSize:'13px', fontWeight:'700', color:'#1A1A1A' }}>{label}</span>
                  <span style={{ fontSize:'13px', fontWeight:'800', color:'#FF5A3D' }}>{value}/10</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ fontSize:'11px', color:'#999' }}>{left}</span>
                  <span style={{ fontSize:'11px', color:'#999' }}>{right}</span>
                </div>
                <div style={{ background:'#F2F2F2', borderRadius:'99px', height:'8px' }}>
                  <div style={{ background:'linear-gradient(90deg, #FF5A3D, #FF8560)', height:'8px', borderRadius:'99px', width:`${value * 10}%`, transition:'width 0.3s' }}/>
                </div>
              </div>
            ))}
          </div>

          {profile?.preferred_cuisines && profile.preferred_cuisines.length > 0 && (
            <div style={{ marginTop:'16px', paddingTop:'16px', borderTop:'1px solid #F2F2F2' }}>
              <p style={{ fontSize:'13px', fontWeight:'700', color:'#1A1A1A', marginBottom:'8px' }}>🍽️ 선호 음식</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {profile.preferred_cuisines.map((c: string) => (
                  <span key={c} style={{ background:'#FFE7DF', color:'#FF5A3D', fontSize:'12px', fontWeight:'700', padding:'4px 10px', borderRadius:'99px' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 맛슐랭 등급 카드 */}
        <div style={{ background:'linear-gradient(135deg, #1A1A1A 0%, #333 100%)', borderRadius:'20px', padding:'20px', marginBottom:'16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <div>
              <p style={{ color:'white', fontWeight:'800', fontSize:'16px', margin:'0 0 4px' }}>🍜 맛집 탐험가</p>
              <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'12px', margin:0 }}>다음 등급까지 355점</p>
            </div>
            <div style={{ fontSize:'36px' }}>🍱</div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:'99px', height:'8px', marginBottom:'8px' }}>
            <div style={{ background:'linear-gradient(90deg, #FF5A3D, #FF8560)', height:'8px', borderRadius:'99px', width:'40%' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
            <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'12px' }}>245점</span>
            <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'12px' }}>600점</span>
          </div>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {['🌶️ 매운맛 마스터', '🔍 신상 헌터', '🏘️ 지역 토박이'].map(b => (
              <span key={b} style={{ background:'rgba(255,90,61,0.3)', color:'#FF8560', fontSize:'11px', fontWeight:'700', padding:'4px 10px', borderRadius:'99px' }}>{b}</span>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
          {[{ key:'reviews', label:'📝 리뷰' }, { key:'saved', label:'🗂️ 저장' }, { key:'collections', label:'📚 컬렉션' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              style={{ flex:1, padding:'10px', borderRadius:'14px', fontSize:'13px', fontWeight:'700', border:'none', cursor:'pointer',
                background: activeTab === tab.key ? '#FF5A3D' : 'white',
                color: activeTab === tab.key ? 'white' : '#999',
                boxShadow: activeTab === tab.key ? '0 4px 12px rgba(255,90,61,0.35)' : 'none'
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 리뷰 탭 */}
        {activeTab === 'reviews' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {DUMMY_REVIEWS.map(r => (
              <div key={r.id} style={{ background:'white', borderRadius:'16px', padding:'14px', display:'flex', gap:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ width:'60px', height:'60px', background:'#FFE7DF', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', flexShrink:0 }}>
                  {r.photo}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                    <p style={{ fontWeight:'700', fontSize:'14px', color:'#1A1A1A', margin:0 }}>{r.store}</p>
                    <span style={{ fontSize:'11px', color:'#999' }}>{r.time}</span>
                  </div>
                  <p style={{ fontSize:'12px', color:'#FF5A3D', margin:'0 0 4px' }}>🍽️ {r.menu} · ⭐ {r.score}</p>
                  <p style={{ fontSize:'12px', color:'#666', margin:0 }}>{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 저장 탭 */}
        {activeTab === 'saved' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {DUMMY_SAVED.map(s => (
              <div key={s.id} style={{ background:'white', borderRadius:'16px', padding:'14px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                <div>
                  <p style={{ fontWeight:'700', color:'#1A1A1A', margin:'0 0 6px' }}>{s.name}</p>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <span style={{ background:'#FFE7DF', color:'#FF5A3D', fontSize:'11px', fontWeight:'700', padding:'3px 8px', borderRadius:'99px' }}>{s.category}</span>
                    <span style={{ fontSize:'12px', color:'#666' }}>⭐ {s.score}</span>
                  </div>
                </div>
                <span style={{ fontSize:'20px' }}>🗂️</span>
              </div>
            ))}
          </div>
        )}

        {/* 컬렉션 탭 */}
        {activeTab === 'collections' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <button style={{ background:'linear-gradient(135deg, #FF5A3D, #FF8560)', color:'white', fontWeight:'800', fontSize:'15px', padding:'14px', borderRadius:'16px', border:'none', cursor:'pointer', boxShadow:'0 4px 12px rgba(255,90,61,0.35)' }}>
              + 새 컬렉션 만들기
            </button>
            {[
              { id:'1', title:'강남 점심 가성비 맛집', count:12, likes:45, emoji:'🍱' },
              { id:'2', title:'혼밥 가능한 라멘 맛집', count:8, likes:32, emoji:'🍜' },
              { id:'3', title:'데이트 코스 레스토랑', count:6, likes:78, emoji:'🥂' },
            ].map(c => (
              <div key={c.id} style={{ background:'white', borderRadius:'16px', padding:'14px', display:'flex', gap:'14px', alignItems:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ width:'52px', height:'52px', background:'#FFE7DF', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26px' }}>
                  {c.emoji}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:'700', color:'#1A1A1A', margin:'0 0 4px' }}>{c.title}</p>
                  <div style={{ display:'flex', gap:'12px' }}>
                    <span style={{ fontSize:'12px', color:'#999' }}>📍 {c.count}곳</span>
                    <span style={{ fontSize:'12px', color:'#999' }}>♥ {c.likes}</span>
                  </div>
                </div>
                <span style={{ color:'#ccc', fontSize:'20px' }}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'1px solid #F2F2F2', padding:'10px 24px', display:'flex', justifyContent:'space-around', zIndex:100 }}>
        {[
          { icon:'🗺️', label:'지도', path:'/map' },
          { icon:'📰', label:'피드', path:'/feed' },
          { icon:'✏️', label:'리뷰', path:'/review/write' },
          { icon:'🗂️', label:'저장', path:'/saved' },
          { icon:'👤', label:'프로필', path:'/profile', active:true },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', background:'none', border:'none', cursor:'pointer' }}>
            <span style={{ fontSize:'24px' }}>{item.icon}</span>
            <span style={{ fontSize:'11px', fontWeight: item.active ? '700' : '500', color: item.active ? '#FF5A3D' : '#999' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
