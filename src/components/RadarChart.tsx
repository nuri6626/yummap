'use client'

interface RadarChartProps {
  scores: {
    taste: number      // 맛
    portion: number    // 양
    value: number      // 가성비
    spiciness: number  // 맵기
    saltiness: number  // 짠기
    sweetness: number  // 단기
  }
  size?: number
  showLabels?: boolean
}

export default function RadarChart({ scores, size = 160, showLabels = true }: RadarChartProps) {
  const center = size / 2
  const radius = size / 2 - 30
  const labels = ['맛', '양', '가성비', '맵기', '짠기', '단기']
  const emojis = ['🍽️', '🍱', '💰', '🌶️', '🧂', '🍯']
  const values = [
    scores.taste,
    scores.portion,
    scores.value,
    scores.spiciness,
    scores.saltiness,
    scores.sweetness
  ]
  const colors = ['#FF5A3D', '#FF9800', '#4CAF50', '#F44336', '#2196F3', '#9C27B0']

  // 6각형 꼭짓점 각도 계산 (위쪽부터 시계방향)
  const getPoint = (index: number, r: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    }
  }

  // 배경 6각형들 (2, 4, 6, 8, 10 단계)
  const bgPolygons = [2, 4, 6, 8, 10].map(level => {
    const r = (radius * level) / 10
    const points = Array.from({ length: 6 }, (_, i) => getPoint(i, r))
    return points.map(p => `${p.x},${p.y}`).join(' ')
  })

  // 데이터 다각형
  const dataPoints = values.map((v, i) => {
    const r = (radius * Math.max(0, Math.min(10, v))) / 10
    return getPoint(i, r)
  })
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  // 축 선
  const axisLines = Array.from({ length: 6 }, (_, i) => {
    const end = getPoint(i, radius)
    return { x1: center, y1: center, x2: end.x, y2: end.y }
  })

  // 레이블 위치 (바깥쪽)
  const labelPositions = Array.from({ length: 6 }, (_, i) => {
    const p = getPoint(i, radius + 18)
    return p
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* 배경 육각형들 */}
        {bgPolygons.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="1"
          />
        ))}

        {/* 축 선들 */}
        {axisLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1} y1={line.y1}
            x2={line.x2} y2={line.y2}
            stroke="#e0e0e0"
            strokeWidth="1"
          />
        ))}

        {/* 데이터 채우기 */}
        <polygon
          points={dataPolygon}
          fill="rgba(255, 90, 61, 0.15)"
          stroke="#FF5A3D"
          strokeWidth="2"
        />

        {/* 데이터 꼭짓점 점 */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill={colors[i]}
            stroke="white"
            strokeWidth="1.5"
          />
        ))}

        {/* 레이블 */}
        {showLabels && labelPositions.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="#555"
            fontWeight="600"
          >
            {emojis[i]}
          </text>
        ))}
      </svg>

      {/* 수치 범례 */}
      {showLabels && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px 12px',
          marginTop: '8px',
          width: '100%'
        }}>
          {labels.map((label, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px'
            }}>
              <div style={{
                width: '8px', height: '8px',
                borderRadius: '50%',
                background: colors[i],
                flexShrink: 0
              }} />
              <span style={{ color: '#666' }}>{label}</span>
              <span style={{ color: colors[i], fontWeight: '700' }}>{values[i]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
