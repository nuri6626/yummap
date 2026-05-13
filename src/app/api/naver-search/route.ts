import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query')
  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Missing Naver API credentials' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`,
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

    const results = (data.items || []).map((item: {
      title: string
      category: string
      address: string
      roadAddress: string
      telephone: string
      mapx: string
      mapy: string
    }) => ({
      name: item.title.replace(/<[^>]+>/g, ''),
      category: item.category || null,
      address: item.roadAddress || item.address || null,
      phone: item.telephone || null,
      latitude: item.mapy ? parseFloat(item.mapy) : null,
      longitude: item.mapx ? parseFloat(item.mapx) : null,
    }))

    return NextResponse.json({ results })
  } catch (e) {
    console.error('네이버 검색 실패:', e)
    return NextResponse.json({ results: [] })
  }
}
