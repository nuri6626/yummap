import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  if (!query.trim()) {
    return NextResponse.json({ items: [] })
  }

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=10&sort=random`,
      {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_SEARCH_CLIENT_ID || '',
          'X-Naver-Client-Secret': process.env.NAVER_SEARCH_CLIENT_SECRET || '',
        },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      console.error('네이버 검색 API 오류:', res.status)
      return NextResponse.json({ items: [] })
    }

    const data = await res.json()

    // HTML 태그 제거 함수
    const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '')

    const items = (data.items || []).map((item: any) => ({
      name: stripHtml(item.title),
      category: item.category || null,
      address: item.roadAddress || item.address || null,
      phone: item.telephone || null,
      // 네이버 좌표는 KATEC 계열 → 변환 필요
      mapx: item.mapx,
      mapy: item.mapy,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('검색 오류:', err)
    return NextResponse.json({ items: [] })
  }
}
