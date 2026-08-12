import React from 'react';
import DonutChart from './charts/DonutChart.jsx';
import RadarChart from './charts/RadarChart.jsx';
import StackedBarChart from './charts/StackedBarChart.jsx';

/**
 * OverviewDashboard Component
 * --------------------------
 * Visual analytics overview page displaying colorful KPI cards, charts,
 * score distribution, and recent interviews.
 */
export default function OverviewDashboard({ stats, onSelectCandidate }) {
  if (!stats) return <div style={{ padding: '24px', color: '#94a3b8' }}>Loading Dashboard Insights...</div>;

  const kpi = stats.kpi || {};

  const kpiCards = [
    { label: 'Total Interviews', value: kpi.total_interviews || 0, icon: '📊', color: '#4f46e5' },
    { label: 'Completed Interviews', value: kpi.completed_interviews || 0, icon: '✅', color: '#22c55e' },
    { label: 'Pending Interviews', value: kpi.pending_interviews || 0, icon: '⏱️', color: '#f59e0b' },
    { label: 'Avg Overall Score', value: `${kpi.avg_overall_score || 0}%`, icon: '⭐', color: '#8b5cf6' },
    { label: 'Avg Technical Score', value: `${kpi.avg_technical_score || 0}%`, icon: '🛠️', color: '#06b6d4' },
    { label: 'Avg Soft Skill Score', value: `${kpi.avg_soft_score || 0}%`, icon: '💬', color: '#ec4899' },
    { label: 'Hiring Rate', value: `${kpi.hiring_rate_percent || 0}%`, icon: '🎯', color: '#10b981' },
    { label: "Today's Interviews", value: kpi.today_interviews || 0, icon: '📅', color: '#3b82f6' },
  ];

  return (
    <div className="admin-overview-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            style={{
              background: '#1e293b',
              border: `1px solid ${card.color}33`,
              borderLeft: `4px solid ${card.color}`,
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 0 0' }}>{card.value}</h3>
            </div>
            <span style={{ fontSize: '2rem', opacity: 0.9 }}>{card.icon}</span>
          </div>
        ))}
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Donut Chart: Score Distribution */}
        <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🍩 Overall Score Distribution</span>
          </h3>
          <DonutChart data={stats.score_distribution} />
        </div>

        {/* Radar Chart: Topic Performance */}
        <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯 Topic-wise Performance Radar</span>
          </h3>
          <RadarChart data={stats.radar_topics} />
        </div>

        {/* Stacked Bar: Technical vs Soft Skills */}
        <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊 Technical vs Soft Skills Weighting</span>
          </h3>
          <StackedBarChart techScore={kpi.avg_technical_score || 75} softScore={kpi.avg_soft_score || 80} />
        </div>
      </div>

      {/* Recent Interviews Table */}
      <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📑 Recent Interview Records</span>
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '10px 12px' }}>Candidate Name</th>
                <th style={{ padding: '10px 12px' }}>Email</th>
                <th style={{ padding: '10px 12px' }}>Timestamp</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Overall Score</th>
                <th style={{ padding: '10px 12px' }}>Recommendation</th>
                <th style={{ padding: '10px 12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(stats.recent_interviews || []).map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e293b', color: '#cbd5e1' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc' }}>{row.candidate_name}</td>
                  <td style={{ padding: '12px', color: '#94a3b8' }}>{row.candidate_email}</td>
                  <td style={{ padding: '12px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                    🕒 {row.formatted_timestamp || (row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A')}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: row.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: row.status === 'COMPLETED' ? '#22c55e' : '#f59e0b' }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#818cf8' }}>
                    {row.overall_score !== null ? `${row.overall_score}%` : 'N/A'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: getBadgeBg(row.recommendation?.color), color: '#ffffff' }}>
                      {row.recommendation?.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => onSelectCandidate(row.session_id)}
                      style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getBadgeBg(color) {
  switch (color) {
    case 'green': return '#16a34a';
    case 'blue': return '#2563eb';
    case 'orange': return '#ea580c';
    case 'red': return '#dc2626';
    default: return '#64748b';
  }
}
