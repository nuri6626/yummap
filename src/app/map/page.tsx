'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

declare global { interface Window { kakao: any } }

interface Store {
  id: number
  name: string
  category: string
  address: string
  latitude: number
  longitude: number
  phone: string
  business_hours: string
  editor_score: number
  user_score: number
  review_count: number
}

export default function MapPage() {
  const router = useRouter()
  const supabase = createClient()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [activeCategory, setActiveCategory] = useState('전체')

  const CATEGORIES = ['전체','한식','일식','중식','양식','고기','카페','분식','해산물','디저트']

  // Supabase에서 가게 데이터 불러오기
  useEffect(() => {
    const fetchStores = async () => {
      const { data, error } = await supabase.from('stores').select('*')
      if (error) { console.error('가게 데이터 오류:', error); return }
      if (data) setStores(data)
    }
    fetchStores()
  }, [])

  // 카카오맵 초기화
  useEffect(() => {
    const initMap = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => setMapReady(true))
      } else {
        setTimeout(initMap, 500)
      }
    }
    setTimeout(initMap, 300)
  }, [])

  // 마커 표시
  useEffect(() => {
    if (!mapReady || !mapRef.current || stores.length === 0) return

    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(37.4979, 127.0276),
      level: 5
    })
    mapInstanceRef.current = map

    const filtered = activeCategory === '전체'
      ? stores
      : stores.filter(s => s.category === activeCategory)

    filtered.forEach(store => {
      const pos = new window.kakao.maps.LatLng(store.latitude, store.longitude)
      const marker = new window.kakao.maps.Marker({ position: pos, map })

      const label = document.createElement('div')
      label.style.cssText = `
        background:white;
        border:2px solid #FF5A3D;
        border-radius:8px;
        padding:4px 8px;
        font-size:12px;
        font-weight:bold;
        white-space:nowrap;
        cursor:pointer;
        box-shadow:0 2px 6px rgba(0,0,0,0.15);
        color:#1A1A1A;
      `
      label.innerText = store.name
      const overlay = new window.kakao.maps.CustomOverlay({
        position: pos, content: label, yAnchor: 2.8
      })
      overlay.setMap(map)

      window.kakao.maps.event.addListener(marker, 'click', () => setSelectedStore(store))
      label.onclick = () => setSelectedStore(store)
    })
  }, [mapReady, stores, activeCategory])

  const moveToCurrentLocation = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)
      mapInstanceRef.current.setCenter(loc)
    })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', fontFamily:'Pretendard, -apple-system, sans-serif' }}>

      {/* 헤더 */}
      <div style={{ background:'white', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.08)', zIndex:10 }}>
        <img src="/yum2.png" alt="yummap" style={{ height:'32px' }} />
        <button
          onClick={() => router.push('/review/write')}
          style={{ background:'linear-gradient(135deg, #FF5A3D, #FF8560)', color:'white', padding:'8px 16px', borderRadius:'20px', fontSize:'13px', fontWeight:'800', border:'none', cursor:'pointer', boxShadow:'0 4px 12px rgba(255,90,61,0.35)' }}
        >
          + 리뷰 작성
        </button>
      </div>

      {/* 카테고리 필터 */}
      <div style={{ background:'white', padding:'8px 12px', display:'flex', gap:'6px', overflowX:'auto', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', zIndex:9 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              whiteSpace:'nowrap', padding:'6px 14px', borderRadius:'99px', fontSize:'13px', fontWeight:'700', border:'none', cursor:'pointer', transition:'all 0.2s',
              background: activeCategory === cat ? 'linear-gradient(135deg, #FF5A3D, #FF8560)' : '#F2F2F2',
              color: activeCategory === cat ? 'white' : '#666',
              boxShadow: activeCategory === cat ? '0 4px 12px rgba(255,90,61,0.3)' : 'none'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 지도 */}
      <div style={{ position:'relative', flex:1 }}>
        <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

        {!mapReady && (
          <div style={{ position:'absolute', inset:0, background:'#FFF5F3', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>🗺️</div>
              <p style={{ color:'#FF5A3D', fontWeight:'bold' }}>지도 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 현재 위치 버튼 */}
        <button
          onClick={moveToCurrentLocation}
          style={{ position:'absolute', bottom:'16px', right:'16px', background:'white', width:'48px', height:'48px', borderRadius:'50%', boxShadow:'0 4px 12px rgba(0,0,0,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', zIndex:10, border:'none', cursor:'pointer' }}
        >
          📍
        </button>

        {/* 가게 수 표시 */}
        <div style={{ position:'absolute', top:'12px', left:'12px', background:'white', borderRadius:'12px', padding:'6px 12px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', zIndex:10 }}>
          <span style={{ fontSize:'12px', fontWeight:'700', color:'#FF5A3D' }}>
            {activeCategory === '전체' ? stores.length : stores.filter(s => s.category === activeCategory).length}개 맛집
          </span>
        </div>
      </div>

      {/* 가게 상세 카드 */}
      {selectedStore && (
        <div style={{ background:'white', borderRadius:'24px 24px 0 0', padding:'20px', boxShadow:'0 -4px 24px rgba(0,0,0,0.12)', zIndex:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                <span style={{ background:'#FFE7DF', color:'#FF5A3D', fontSize:'11px', fontWeight:'700', padding:'3px 8px', borderRadius:'99px' }}>
                  {selectedStore.category}
                </span>
                {selectedStore.business_hours && (
                  <span style={{ fontSize:'11px', color:'#999' }}>🕐 {selectedStore.business_hours}</span>
                )}
              </div>
              <h3 style={{ fontSize:'18px', fontWeight:'800', color:'#1A1A1A', margin:'0 0 4px', letterSpacing:'-0.3px' }}>
                {selectedStore.name}
              </h3>
              <p style={{ color:'#999', fontSize:'13px', margin:0 }}>📍 {selectedStore.address}</p>
              {selectedStore.phone && (
                <p style={{ color:'#999', fontSize:'13px', margin:'2px 0 0' }}>📞 {selectedStore.phone}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedStore(null)}
              style={{ background:'#F2F2F2', border:'none', borderRadius:'50%', width:'32px', height:'32px', fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
            >
              ✕
            </button>
          </div>

          {/* 평점 */}
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
            <div style={{ flex:1, background:'#EFF6FF', borderRadius:'14px', padding:'12px', textAlign:'center' }}>
              <p style={{ fontSize:'11px', color:'#2563EB', fontWeight:'700', margin:'0 0 4px' }}>에디터 평점</p>
              <p style={{ fontSize:'22px', fontWeight:'900', color:'#2563EB', margin:0 }}>★ {selectedStore.editor_score}</p>
            </div>
            <div style={{ flex:1, background:'#FFE7DF', borderRadius:'14px', padding:'12px', textAlign:'center' }}>
              <p style={{ fontSize:'11px', color:'#FF5A3D', fontWeight:'700', margin:'0 0 4px' }}>소비자 평점</p>
              <p style={{ fontSize:'22px', fontWeight:'900', color:'#FF5A3D', margin:0 }}>★ {selectedStore.user_score}</p>
            </div>
            <div style={{ flex:1, background:'#F2F2F2', borderRadius:'14px', padding:'12px', textAlign:'center' }}>
              <p style={{ fontSize:'11px', color:'#666', fontWeight:'700', margin:'0 0 4px' }}>리뷰 수</p>
              <p style={{ fontSize:'22px', fontWeight:'900', color:'#1A1A1A', margin:0 }}>{selectedStore.review_count}</p>
            </div>
          </div>

          {/* 버튼 */}
          <div style={{ display:'flex', gap:'10px' }}>
            <button
              onClick={() => router.push(`/store/${selectedStore.id}`)}
              style={{ flex:1, background:'linear-gradient(135deg, #FF5A3D, #FF8560)', color:'white', padding:'13px', borderRadius:'14px', fontWeight:'800', fontSize:'14px', border:'none', cursor:'pointer', boxShadow:'0 4px 12px rgba(255,90,61,0.35)' }}
            >
              상세 보기
            </button>
            <button
              onClick={() => router.push(`/review/write?store_id=${selectedStore.id}&store_name=${selectedStore.name}`)}
              style={{ flex:1, background:'white', color:'#FF5A3D', padding:'13px', borderRadius:'14px', fontWeight:'800', fontSize:'14px', border:'2px solid #FF5A3D', cursor:'pointer' }}
            >
              리뷰 쓰기
            </button>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 */}
      <div style={{ background:'white', borderTop:'1px solid #F2F2F2', padding:'10px 24px', display:'flex', justifyContent:'space-around', zIndex:10 }}>
        {[
          { icon:'🗺️', label:'지도', path:'/map', active:true },
          { icon:'📰', label:'피드', path:'/feed' },
          { icon:'✏️', label:'리뷰', path:'/review/write' },
          { icon:'🗂️', label:'저장', path:'/saved' },
          { icon:'👤', label:'프로필', path:'/profile' },
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
