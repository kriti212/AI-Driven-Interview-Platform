import React, { useState, useEffect } from 'react';
import StackedBarChart from './charts/StackedBarChart.jsx';

/**
 * CandidateDetailReport Component
 * -------------------------------
 * Full candidate evaluation detail view for HR / Admin.
 * Displays profile card, recommendation badge, scores, collapsible question cards with color tags,
 * and topic breakdown.
 */
export default function CandidateDetailReport({ sessionId, onBack }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});

  useEffect(() => {
    if (sessionId) fetchReport();
  }, [sessionId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/candidate/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      console.error('Error fetching candidate detail report:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div style={{ padding: '32px', color: '#94a3b8' }}>Loading Candidate Detailed Evaluation Report...</div>;
  if (!report) return <div style={{ padding: '32px', color: '#ef4444' }}>Report not found.</div>;

  const { session, profile, resume_filename, recommendation, scores, question_cards } = report;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onBack}
          style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          ← Back to Candidates List
        </button>

        <button
          onClick={() => window.print()}
          style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
        >
          🖨️ Print Full Evaluation Report
        </button>
      </div>

      {/* Candidate Profile Header Card */}
      <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '28px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>{session.candidate_name}</h1>
            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700, backgroundColor: getBadgeBg(recommendation?.color), color: '#ffffff' }}>
              {recommendation?.label}
            </span>
          </div>

          <p style={{ color: '#94a3b8', margin: '0 0 12px 0', fontSize: '0.95rem' }}>
            📧 {session.candidate_email} | 🎯 Role: <strong>{session.role}</strong>
          </p>
          <p style={{ color: '#cbd5e1', margin: '0 0 12px 0', fontSize: '0.85rem' }}>
            🕒 Interview Timestamp: <strong>{session.created_at ? new Date(session.created_at).toLocaleString() : 'N/A'}</strong>
            {session.start_time && (
              <span style={{ marginLeft: '12px', color: '#94a3b8' }}>
                (Started: {new Date(session.start_time).toLocaleTimeString()}
                {session.end_time ? ` | Ended: ${new Date(session.end_time).toLocaleTimeString()}` : ''})
              </span>
            )}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {profile?.skills && (
              <span style={{ fontSize: '0.82rem', color: '#cbd5e1', background: '#0f172a', padding: '4px 10px', borderRadius: '6px' }}>
                🧠 Skills: {profile.skills}
              </span>
            )}
            <a
              href={`/uploads/${resume_filename}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.82rem', color: '#818cf8', background: '#0f172a', padding: '4px 10px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}
            >
              📄 Download Resume ({resume_filename})
            </a>
          </div>
        </div>

        {/* Big Overall Score Badge */}
        <div style={{ textAlign: 'center', background: '#0f172a', padding: '20px 28px', borderRadius: '14px', border: '2px solid #6366f1' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Score</span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#818cf8', margin: '4px 0 0 0' }}>{scores.overall_score}%</h2>
        </div>
      </div>

      {/* Technical vs Soft Skills Weighting Card */}
      <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px' }}>
          ⚖️ Technical (70%) & Soft Skills (30%) Evaluation Weighting
        </h3>
        <StackedBarChart techScore={scores.technical_score} softScore={scores.soft_skill_score} />
      </div>

      {/* Question-by-Question Evaluation Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
          ❓ Question-wise Evaluation Breakdown ({question_cards.length})
        </h3>

        {question_cards.map((q, idx) => {
          const isExpanded = expandedCards[q.log_id] !== false; // Default expanded

          return (
            <div
              key={idx}
              style={{
                background: '#1e293b',
                borderRadius: '12px',
                border: `1px solid ${getColorBorder(q.color_tag)}`,
                borderLeft: `6px solid ${getColorBorder(q.color_tag)}`,
                padding: '20px',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleCard(q.log_id)}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Question {q.step_index} • {q.question_type}</span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: '4px 0 0 0' }}>{q.question_text}</h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: getColorTagBg(q.color_tag), color: '#ffffff' }}>
                    {q.status_text} ({q.overall_score}%)
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '1.2rem' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Collapsible Card Body */}
              {isExpanded && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Candidate Answer */}
                  <div style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                    <span style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase' }}>Candidate Response / Code</span>
                    <p style={{ color: '#f8fafc', margin: '4px 0 0 0', fontFamily: q.question_type === 'CODING' ? 'monospace' : 'inherit', whiteSpace: 'pre-wrap', fontSize: '0.92rem' }}>
                      {q.candidate_transcript || 'No response provided.'}
                    </p>
                  </div>

                  {/* Golden Reference Answer */}
                  <div style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                    <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Golden Reference Answer</span>
                    <p style={{ color: '#cbd5e1', margin: '4px 0 0 0', fontFamily: q.question_type === 'CODING' ? 'monospace' : 'inherit', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                      {q.golden_answer}
                    </p>
                  </div>

                  {/* Evaluation Remarks */}
                  {q.eval_feedback && (
                    <div style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
                      💬 <strong>Evaluation Remarks:</strong> {q.eval_feedback}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
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

function getColorBorder(tag) {
  switch (tag) {
    case 'green': return '#22c55e';
    case 'yellow': return '#eab308';
    case 'red': return '#ef4444';
    default: return '#6366f1';
  }
}

function getColorTagBg(tag) {
  switch (tag) {
    case 'green': return '#15803d';
    case 'yellow': return '#a16207';
    case 'red': return '#b91c1c';
    default: return '#4338ca';
  }
}
