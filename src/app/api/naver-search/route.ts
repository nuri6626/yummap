import { NextRequest, NextResponse } from 'next/server'

function getRegionFromCoords(lat: number, lng: number): string | null {
  if (lat >= 35.3 && lat <= 35.7 && lng >= 128.9 && lng <= 129.5) return '울산'
  if (lat >= 35.0 && lat <= 35.3 && lng >= 128.9 && lng <= 129.3) return '부산'
  if (lat >= 35.7 && lat <= 36.1 && lng >= 128.4 && lng <= 128.9) return '대구'
  if (lat >= 36.2 && lat <= 36.6 && lng >= 127.2 && lng <= 127.6) return '대전'
  if (lat >= 35.1 && lat <= 35.3 && lng >= 126.7 && lng <= 127.0) return '광주'
  if (lat >= 37.4 && lat <= 37.7 && lng >= 126.8 && lng <= 127.2) return '서울'
  if (lat >= 37.3 && lat <= 37.5 && lng >= 126.6 && lng <= 127.0) return '인천'
  if (lat >= 37.2 && lat <= 37.5 && lng >= 126.9 && lng <= 127.4) return '수원'
  if (lat >= 36.6 && lat <= 37.0 && lng >= 127.3 && lng <= 127.7) return '청주'
  if (lat >= 37.7 && lat <= 38.1 && lng >= 127.0 && lng <= 127.5) return '춘천'
  if (lat >= 37.4 && lat <= 37.8 && lng >= 127.9 && lng <= 128.4) return '원주'
  if (lat >= 35.8 && lat <= 36.2 && lng >= 129.1 && lng <= 129.6) return '포항'
  if (lat >= 35.8 && lat <= 36.1 && lng >= 128.5 && lng <= 128.9) return '경주'
  if (lat >= 34.8 && lat <= 35.1 && lng >= 126.3 && lng <= 126.7) return '목포'
  if (lat >= 34.9 && lat <= 35.2 && lng >= 127.4 && lng <= 127.8) return '순천'
  return null
}

function normalizeCategory(category: string | null): string | null {
  if (!category) return null
  const c = category.toLowerCase()

  if (c.includes('한식') || c.includes('국밥') || c.includes('탕') || c.includes('찌개') ||
      c.includes('고기') || c.includes('삼겹') || c.includes('갈비') || c.includes('족발') ||
      c.includes('보쌈') || c.includes('냉면') || c.includes('설렁') || c.includes('해장') ||
      c.includes('김치') || c.includes('비빔') || c.includes('돌솥') || c.includes('순대') ||
      c.includes('떡볶') || c.includes('칼국수') || c.includes('해산물') || c.includes('생선') ||
      c.includes('회') || c.includes('조개') || c.includes('치킨') || c.includes('닭') ||
      c.includes('곱창') || c.includes('막창') || c.includes('포차') || c.includes('분식')) {
    return '한식'
  }
  if (c.includes('중식') || c.includes('중국') || c.includes('짜장') || c.includes('짬뽕') ||
      c.includes('마라') || c.includes('양꼬치') || c.includes('딤섬')) {
    return '중식'
  }
  if (c.includes('일식') || c.includes('일본') || c.includes('초밥') || c.includes('스시') ||
      c.includes('라멘') || c.includes('돈가스') || c.includes('우동') || c.includes('덮밥') ||
      c.includes('규동') || c.includes('야키') || c.includes('오마카세')) {
    return '일식'
  }
  if (c.includes('양식') || c.includes('이탈리아') || c.includes('파스타') || c.includes('피자') ||
      c.includes('스테이크') || c.includes('햄버거') || c.includes('샌드위치') || c.includes('브런치') ||
      c.includes('멕시코') || c.includes('스페인') || c.includes('프랑스')) {
    return '양식'
  }
  if (c.includes('카페') || c.includes('커피') || c.includes('디저트') || c.includes('베이커리') ||
      c.includes('케이크') || c.includes('빵') || c.includes('아이스크림') || c.includes('음료')) {
    return '카페'
  }
  if (c.includes('분식') || c.includes('떡볶이') || c.includes('순대') || c.includes('튀김') ||
      c.includes('김밥')) {
    return '분식'
  }
  if (c.includes('패스트푸드') || c.includes('버거')) {
    return '패스트푸드'
  }
  return '기타'
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')

  if (!query) return NextResponse.json({ results: [] })

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Missing Naver API credentials' }, { status: 500 })
  }

  try {
    // ✅ 위치 기반 지역명 자동 추가
    let searchQuery = query
    if (lat && lng) {
      const userLat = parseFloat(lat)
      const userLng = parseFloat(lng)
      const region = getRegionFromCoords(userLat, userLng)
      if (region && !query.includes(region)) {
        searchQuery = `${region} ${query}`
      }
    }

    console.log('🔍 최종 검색어:', searchQuery)

    const res = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(searchQuery)}&display=20&sort=random`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error('네이버 API 오류:', errText)
      return NextResponse.json({ results: [] }, { status: res.status })
    }

    const data = await res.json()

    let results = (data.items || []).map((item: {
      title: string
      category: string
      address: string
      roadAddress: string
      telephone: string
      mapx: string
      mapy: string
    }) => ({
      name: item.title.replace(/<[^>]+>/g, ''),
      category: normalizeCategory(item.category),
      address: item.roadAddress || item.address || null,
      phone: item.telephone || null,
      latitude: item.mapy ? parseFloat(item.mapy) / 1e7 : null,
      longitude: item.mapx ? parseFloat(item.mapx) / 1e7 : null,
    }))

    // ✅ 위치 기반 거리 정렬
    if (lat && lng) {
      const userLat = parseFloat(lat)
      const userLng = parseFloat(lng)

      results = results
        .map((r: { name: string; category: string | null; address: string | null; phone: string | null; latitude: number | null; longitude: number | null }) => {
          if (r.latitude && r.longitude) {
            const dLat = (r.latitude - userLat) * Math.PI / 180
            const dLng = (r.longitude - userLng) * Math.PI / 180
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(userLat * Math.PI / 180) * Math.cos(r.latitude * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
            const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            return { ...r, dist }
          }
          return { ...r, dist: 9999 }
        })
        .sort((a: { dist: number }, b: { dist: number }) => a.dist - b.dist)
    }

    return NextResponse.json({ results })
  } catch (e) {
    console.error('네이버 검색 실패:', e)
    return NextResponse.json({ results: [] })
  }
}
