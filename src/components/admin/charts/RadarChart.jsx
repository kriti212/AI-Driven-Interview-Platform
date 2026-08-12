import React from 'react';

/**
 * RadarChart Component
 * --------------------
 * Responsive SVG Radar / Spider Chart for Topic Performance & Skills Breakdown.
 */
export default function RadarChart({ data = [] }) {
  if (!data || data.length === 0) return <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No topic data available.</div>;

  const size = 220;
  const center = size / 2;
  const maxRadius = 75;
  const totalAxes = data.length;
  const angleStep = (2 * Math.PI) / totalAxes;

  // Grid levels (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Calculate polygon points for data
  const dataPoints = data.map((item, idx) => {
    const angle = idx * angleStep - Math.PI / 2;
    const valueRatio = Math.min(100, Math.max(0, item.score || 0)) / 100;
    const r = valueRatio * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: '240px', overflow: 'visible' }}>
        {/* Radar Concentric Web Circles */}
        {levels.map((level, lIdx) => (
          <circle
            key={lIdx}
            cx={center}
            cy={center}
            r={level * maxRadius}
            fill="none"
            stroke="#334155"
            strokeDasharray={lIdx === levels.length - 1 ? 'none' : '2 2'}
            strokeWidth="1"
          />
        ))}

        {/* Axes lines & Labels */}
        {data.map((item, idx) => {
          const angle = idx * angleStep - Math.PI / 2;
          const x2 = center + maxRadius * Math.cos(angle);
          const y2 = center + maxRadius * Math.sin(angle);

          // Label placement offset
          const labelRadius = maxRadius + 16;
          const lx = center + labelRadius * Math.cos(angle);
          const ly = center + labelRadius * Math.sin(angle);

          return (
            <g key={idx}>
              <line x1={center} y1={center} x2={x2} y2={y2} stroke="#334155" strokeWidth="1" />
              <text
                x={lx}
                y={ly}
                fill="#94a3b8"
                fontSize="9"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {item.topic} ({Math.round(item.score || 0)}%)
              </text>
            </g>
          );
        })}

        {/* Data Radar Polygon */}
        <polygon
          points={dataPoints}
          fill="rgba(99, 102, 241, 0.3)"
          stroke="#6366f1"
          strokeWidth="2"
        />

        {/* Data Vertices */}
        {data.map((item, idx) => {
          const angle = idx * angleStep - Math.PI / 2;
          const valueRatio = Math.min(100, Math.max(0, item.score || 0)) / 100;
          const r = valueRatio * maxRadius;
          const cx = center + r * Math.cos(angle);
          const cy = center + r * Math.sin(angle);
          return <circle key={idx} cx={cx} cy={cy} r="3" fill="#818cf8" stroke="#ffffff" strokeWidth="1" />;
        })}
      </svg>
    </div>
  );
}
