import React from 'react';

/**
 * DonutChart Component
 * --------------------
 * High-performance, responsive SVG Donut Chart for Score Distribution & Hiring Tiers.
 */
export default function DonutChart({ data = [] }) {
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const safeTotal = total > 0 ? total : 1;

  let cumulativeAngle = 0;
  const radius = 65;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: '180px', height: '180px' }}>
        <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          {data.map((item, idx) => {
            const percent = item.value / safeTotal;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeAngle * circumference;
            cumulativeAngle += percent;

            return (
              <circle
                key={idx}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={item.color || '#6366f1'}
                strokeWidth="18"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'all 0.6s ease' }}
              />
            );
          })}
        </svg>

        {/* Center Content */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>{total}</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Candidates</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: '16px', width: '100%' }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }}></span>
            <span>{item.name}: <strong>{item.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}
