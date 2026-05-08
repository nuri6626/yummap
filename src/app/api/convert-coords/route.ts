import { NextRequest, NextResponse } from 'next/server'

// KATEC to WGS84 변환 (간략 공식)
function katecToWgs84(mx: number, my: number): { lat: number; lng: number } {
  // 네이버 좌표 단위: 1e7 스케일
  const x = mx / 1e7
  const y = my / 1e7

  // KATEC 원점 보정값 (근사)
  const RE = 6371.00877
  const GRID = 5.0
  const SLAT1 = 30.0
  const SLAT2 = 60.0
  const OLON = 126.0
  const OLAT = 38.0
  const XO = 210 / GRID
  const YO = 675 / GRID

  const DEGRAD = Math.PI / 180.0

  const re = RE / GRID
  const slat1 = SLAT1 * DEGRAD
  const slat2 = SLAT2 * DEGRAD
  const olon = OLON * DEGRAD
  const olat = OLAT * DEGRAD

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5)
  ro = (re * sf) / Math.pow(ro, sn)

  const xn = x - XO
  const yn = ro - y + YO
  let ra = Math.sqrt(xn * xn + yn * yn)
  if (sn < 0) ra = -ra
  let alat = Math.pow((re * sf) / ra, 1.0 / sn)
  alat = 2.0 * Math.atan(alat) - Math.PI * 0.5

  let theta = 0.0
  if (Math.abs(xn) <= 0.0) {
    theta = 0.0
  } else {
    if (Math.abs(yn) <= 0.0) {
      theta = Math.PI * 0.5
      if (xn < 0.0) theta = -theta
    } else {
      theta = Math.atan2(xn, yn)
    }
  }

  const alon = theta / sn + olon
  const lat = (alat / DEGRAD)
  const lng = (alon / DEGRAD)

  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mx = parseFloat(searchParams.get('mx') || '0')
  const my = parseFloat(searchParams.get('my') || '0')

  if (!mx || !my) return NextResponse.json({ lat: null, lng: null })

  const coords = katecToWgs84(mx, my)
  return NextResponse.json(coords)
}
