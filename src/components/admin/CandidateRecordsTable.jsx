import React, { useState, useEffect } from 'react';

/**
 * CandidateRecordsTable Component
 * -------------------------------
 * Professional searchable & filterable table for Candidate Interview Records.
 * Filter parameters: Search string, Status filter, Recommendation badge filter, Score Range.
 */
export default function CandidateRecordsTable({ onSelectCandidate, initialSearch = '' }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState('');
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    fetchCandidates();
  }, [searchQuery, statusFilter, recommendationFilter]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (recommendationFilter) params.append('recommendation_filter', recommendationFilter);

      const res = await fetch(`/api/admin/candidates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (e) {
      console.error('Error fetching candidates list:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => (c.overall_score || 0) >= minScore);

  return (
    <div className="candidate-records-container" style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', padding: '24px' }}>
      {/* Header & Filter Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            👥 Candidate Records Directory ({filteredCandidates.length})
          </h2>

          <a
            href="/api/admin/export/csv"
            download="candidate_records.csv"
            style={{
              background: '#059669',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📥 Export CSV
          </a>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Search Box */}
          <input
            type="text"
            placeholder="🔍 Search Name, Email, Skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f8fafc',
              fontSize: '0.9rem'
            }}
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f8fafc',
              fontSize: '0.9rem'
            }}
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
          </select>

          {/* Recommendation Filter */}
          <select
            value={recommendationFilter}
            onChange={(e) => setRecommendationFilter(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f8fafc',
              fontSize: '0.9rem'
            }}
          >
            <option value="">All Recommendations</option>
            <option value="STRONG_HIRE">Strong Hire (90-100%)</option>
            <option value="HIRE">Hire (75-89%)</option>
            <option value="HOLD">Hold (60-74%)</option>
            <option value="REJECT">Reject (&lt;60%)</option>
          </select>

          {/* Min Score Range Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Min Score: <strong>{minScore}%</strong></span>
            <input
              type="range"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              style={{ accentColor: '#6366f1' }}
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading Candidate Records...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '12px' }}>Candidate Name</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Resume</th>
                <th style={{ padding: '12px' }}>Interview Timestamp</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Overall Score</th>
                <th style={{ padding: '12px' }}>Recommendation</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((c, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e293b', color: '#cbd5e1' }}>
                  <td style={{ padding: '14px 12px', fontWeight: 600, color: '#f8fafc' }}>{c.candidate_name}</td>
                  <td style={{ padding: '14px 12px', color: '#94a3b8' }}>{c.candidate_email}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{ color: '#818cf8', fontSize: '0.85rem' }}>📄 {c.resume_filename}</span>
                  </td>
                  <td style={{ padding: '14px 12px', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500 }}>
                    🕒 {c.formatted_timestamp || (c.created_at ? new Date(c.created_at).toLocaleString() : 'N/A')}
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: c.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: c.status === 'COMPLETED' ? '#22c55e' : '#f59e0b' }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', fontWeight: 800, color: '#818cf8', fontSize: '1rem' }}>
                    {c.overall_score !== null ? `${c.overall_score}%` : 'Pending'}
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, backgroundColor: getBadgeBg(c.recommendation?.color), color: '#ffffff' }}>
                      {c.recommendation?.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <button
                      onClick={() => onSelectCandidate(c.session_id)}
                      style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
