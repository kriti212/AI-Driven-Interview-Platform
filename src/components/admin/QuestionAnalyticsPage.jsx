import React, { useState, useEffect } from 'react';

/**
 * QuestionAnalyticsPage Component
 * -------------------------------
 * Visual question analytics displaying difficulty ratings, average scores per question,
 * lowest/highest scoring questions, and topic performance metrics.
 */
export default function QuestionAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/question-analytics');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching question analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '32px', color: '#94a3b8' }}>Loading Question Analytics...</div>;
  if (!data) return <div style={{ padding: '32px', color: '#ef4444' }}>Unable to load analytics.</div>;

  const { question_statistics, highest_scoring, lowest_scoring } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
        🎯 Question Analytics & Difficulty Distribution
      </h2>

      {/* Highest vs Lowest Scoring Questions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Highest Scoring Questions */}
        <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #10b98144', padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399', marginBottom: '14px' }}>
            🏆 Highest Scoring Questions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {highest_scoring.map((q, idx) => (
              <div key={idx} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{q.topic} • {q.difficulty}</span>
                <p style={{ color: '#f8fafc', margin: '4px 0', fontSize: '0.88rem', fontWeight: 600 }}>{q.rewritten_question}</p>
                <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>Avg Score: {q.average_score}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lowest Scoring / Most Challenging Questions */}
        <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #ef444444', padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f87171', marginBottom: '14px' }}>
            ⚠️ Most Challenging / Lowest Scoring Questions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lowest_scoring.map((q, idx) => (
              <div key={idx} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{q.topic} • {q.difficulty}</span>
                <p style={{ color: '#f8fafc', margin: '4px 0', fontSize: '0.88rem', fontWeight: 600 }}>{q.rewritten_question}</p>
                <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 700 }}>Avg Score: {q.average_score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Questions Table */}
      <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
          📊 Question Performance Metrics Table
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '10px' }}>ID</th>
                <th style={{ padding: '10px' }}>Question Text</th>
                <th style={{ padding: '10px' }}>Topic</th>
                <th style={{ padding: '10px' }}>Difficulty</th>
                <th style={{ padding: '10px' }}>Attempts</th>
                <th style={{ padding: '10px' }}>Average Score</th>
              </tr>
            </thead>
            <tbody>
              {question_statistics.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e293b', color: '#cbd5e1' }}>
                  <td style={{ padding: '10px', color: '#94a3b8' }}>#{row.question_id}</td>
                  <td style={{ padding: '10px', color: '#f8fafc', fontWeight: 600, maxWidth: '360px' }}>{row.rewritten_question}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', background: '#0f172a', color: '#818cf8' }}>
                      {row.topic}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, background: getDifficultyBg(row.difficulty), color: '#ffffff' }}>
                      {row.difficulty}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#94a3b8' }}>{row.total_attempts}</td>
                  <td style={{ padding: '10px', fontWeight: 700, color: '#818cf8' }}>{row.average_score}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getDifficultyBg(diff) {
  switch (diff?.toLowerCase()) {
    case 'easy': return '#15803d';
    case 'medium': return '#a16207';
    case 'hard': return '#b91c1c';
    default: return '#475569';
  }
}
