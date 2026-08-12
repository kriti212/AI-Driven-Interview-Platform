import React from 'react';

/**
 * StackedBarChart Component
 * -------------------------
 * Visualizes Technical vs Soft Skills breakdown (70% Technical, 30% Soft Skills).
 */
export default function StackedBarChart({ techScore = 75, softScore = 80 }) {
  const weightedTech = roundScore(techScore * 0.7);
  const weightedSoft = roundScore(softScore * 0.3);
  const totalWeighted = roundScore(weightedTech + weightedSoft);

  function roundScore(val) {
    return Math.min(100, Math.max(0, Math.round(val * 10) / 10));
  }

  return (
    <div style={{ width: '100%', padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
        <span style={{ color: '#818cf8', fontWeight: 600 }}>🛠️ Technical (70% weight): {techScore}%</span>
        <span style={{ color: '#c084fc', fontWeight: 600 }}>💬 Soft Skills (30% weight): {softScore}%</span>
      </div>

      {/* Stacked Bar Track */}
      <div style={{
        height: '24px',
        width: '100%',
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        border: '1px solid #334155'
      }}>
        <div
          style={{
            width: `${weightedTech}%`,
            backgroundColor: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 700
          }}
          title={`Technical Weighted Contribution: ${weightedTech} pts`}
        >
          {weightedTech > 12 && `${weightedTech} pts`}
        </div>
        <div
          style={{
            width: `${weightedSoft}%`,
            backgroundColor: '#a855f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 700
          }}
          title={`Soft Skills Weighted Contribution: ${weightedSoft} pts`}
        >
          {weightedSoft > 8 && `${weightedSoft} pts`}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
        <span>0 pts</span>
        <span>Composite Score: <strong>{totalWeighted} / 100</strong></span>
        <span>100 pts</span>
      </div>
    </div>
  );
}
