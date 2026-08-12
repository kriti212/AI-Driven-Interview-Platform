import React, { useState, useEffect } from 'react';
import GroupedBarChart from './charts/GroupedBarChart.jsx';

/**
 * CandidateComparisonPage Component
 * ---------------------------------
 * Multi-candidate comparison view:
 * - Candidate selection checkboxes
 * - Leaderboard ranking table
 * - Grouped Bar Chart comparison (Overall, Technical, Soft Skill, Coding)
 * - Highlights: Best performer, highest coding score, highest communication score
 */
export default function CandidateComparisonPage() {
  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidatesList();
  }, []);

  useEffect(() => {
    if (selectedIds.length > 0) {
      fetchComparisonData();
    } else {
      setComparison(null);
    }
  }, [selectedIds]);

  const fetchCandidatesList = async () => {
    try {
      const res = await fetch('/api/admin/candidates');
      if (res.ok) {
        const json = await res.json();
        const list = json.candidates || [];
        setCandidates(list);
        // Pre-select first 2 candidates for instant comparison view
        if (list.length >= 2) {
          setSelectedIds([list[0].session_id, list[1].session_id]);
        } else if (list.length === 1) {
          setSelectedIds([list[0].session_id]);
        }
      }
    } catch (e) {
      console.error('Error fetching candidates for comparison:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonData = async () => {
    try {
      const idsStr = selectedIds.join(',');
      const res = await fetch(`/api/admin/candidate-comparison?session_ids=${idsStr}`);
      if (res.ok) {
        const json = await res.json();
        setComparison(json);
      }
    } catch (e) {
      console.error('Error fetching candidate comparison:', e);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= 4) {
        alert('You can compare up to 4 candidates at once.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  if (loading) return <div style={{ padding: '32px', color: '#94a3b8' }}>Loading Candidates Comparison...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
        ⚖️ Multi-Candidate Side-by-Side Comparison
      </h2>

      {/* Candidate Selection Bar */}
      <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
          Select Candidates to Compare (Max 4):
        </h3>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {candidates.map((c, idx) => {
            const isSelected = selectedIds.includes(c.session_id);
            return (
              <button
                key={idx}
                onClick={() => toggleSelect(c.session_id)}
                style={{
                  background: isSelected ? '#4f46e5' : '#0f172a',
                  color: isSelected ? '#ffffff' : '#cbd5e1',
                  border: `1px solid ${isSelected ? '#6366f1' : '#334155'}`,
                  padding: '8px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{isSelected ? '☑️' : '⏹️'}</span>
                <span>{c.candidate_name} ({Math.round(c.overall_score || 0)}%)</span>
              </button>
            );
          })}
        </div>
      </div>

      {comparison && comparison.leaderboard && comparison.leaderboard.length > 0 ? (
        <>
          {/* Best Performer Highlight Banner */}
          {comparison.best_performer && (
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #064e3b 100%)',
              borderRadius: '14px',
              border: '1px solid #10b981',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏆 Top Performer Winner</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 0 0' }}>{comparison.best_performer.candidate_name}</h3>
                <p style={{ color: '#cbd5e1', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                  Highest Overall Score: <strong>{comparison.best_performer.overall_score}%</strong> • Recommendation: <strong>{comparison.best_performer.recommendation?.label}</strong>
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ padding: '6px 14px', borderRadius: '12px', fontSize: '0.88rem', fontWeight: 800, backgroundColor: '#10b981', color: '#ffffff' }}>
                  Strongest Candidate
                </span>
              </div>
            </div>
          )}

          {/* Grouped Bar Chart Comparison */}
          <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
              📊 Category-wise Score Comparison Chart
            </h3>
            <GroupedBarChart candidates={comparison.leaderboard} />
          </div>

          {/* Comparison Leaderboard Table */}
          <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
              📋 Detailed Comparison Leaderboard Table
            </h3>


            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>Rank</th>
                    <th style={{ padding: '10px' }}>Candidate Name</th>
                    <th style={{ padding: '10px' }}>Overall Score</th>
                    <th style={{ padding: '10px' }}>Technical (70%)</th>
                    <th style={{ padding: '10px' }}>Soft Skills (30%)</th>
                    <th style={{ padding: '10px' }}>Coding Score</th>
                    <th style={{ padding: '10px' }}>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.leaderboard.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b', color: '#cbd5e1' }}>
                      <td style={{ padding: '12px', fontWeight: 800, color: idx === 0 ? '#f59e0b' : '#94a3b8' }}>
                        #{idx + 1} {idx === 0 && '🥇'}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#f8fafc' }}>{row.candidate_name}</td>
                      <td style={{ padding: '12px', fontWeight: 800, color: '#818cf8', fontSize: '1rem' }}>{row.overall_score}%</td>
                      <td style={{ padding: '12px', color: '#cbd5e1' }}>{row.technical_score}%</td>
                      <td style={{ padding: '12px', color: '#cbd5e1' }}>{row.soft_skill_score}%</td>
                      <td style={{ padding: '12px', color: '#34d399', fontWeight: 700 }}>{row.coding_score}%</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: getBadgeBg(row.recommendation?.color), color: '#ffffff' }}>
                          {row.recommendation?.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: '#1e293b', borderRadius: '14px', padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
          Select candidate checkboxes above to view side-by-side comparison charts and leaderboard rankings.
        </div>
      )}
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
