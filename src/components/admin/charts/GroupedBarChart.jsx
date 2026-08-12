import React from 'react';

/**
 * GroupedBarChart Component
 * -------------------------
 * Displays multi-candidate score comparison across Overall, Technical, Soft Skills, and Coding.
 */
export default function GroupedBarChart({ candidates = [] }) {
  if (!candidates || candidates.length === 0) return <div style={{ color: '#94a3b8' }}>No candidates selected.</div>;

  const categories = [
    { key: 'overall_score', label: 'Overall' },
    { key: 'technical_score', label: 'Technical' },
    { key: 'soft_skill_score', label: 'Soft Skills' },
    { key: 'coding_score', label: 'Coding' },
  ];

  const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b'];

  return (
    <div style={{ width: '100%', padding: '12px 0' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {candidates.map((c, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#cbd5e1' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: colors[idx % colors.length] }}></span>
            <span>{c.candidate_name} ({Math.round(c.overall_score || 0)}%)</span>
          </div>
        ))}
      </div>

      {/* Grouped Bars Container */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${categories.length}, 1fr)`, gap: '16px', alignItems: 'end', height: '180px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
        {categories.map((cat, catIdx) => (
          <div key={catIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'end', height: '140px', width: '100%', justifyContent: 'center' }}>
              {candidates.map((cand, candIdx) => {
                const val = cand[cat.key] || 0;
                const barHeight = Math.min(100, Math.max(5, (val / 100) * 130));

                return (
                  <div
                    key={candIdx}
                    style={{
                      height: `${barHeight}px`,
                      width: '18px',
                      backgroundColor: colors[candIdx % colors.length],
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease',
                      position: 'relative'
                    }}
                    title={`${cand.candidate_name} - ${cat.label}: ${val}%`}
                  >
                    <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                      {Math.round(val)}
                    </span>
                  </div>
                );
              })}
            </div>
            <span style={{ marginTop: '8px', fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
