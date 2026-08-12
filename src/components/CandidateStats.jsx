import React from 'react';

export default function CandidateStats({ uploadSuccess, resumeData }) {
  return (
    <aside className="sidebar-stack">
      {/* Platform Status Widget */}
      <div className="widget-card">
        <div className="widget-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          Candidate Pipeline Status
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Resume Step:</span>
            <span className="status-indicator">
              <span className="status-dot" style={{ backgroundColor: uploadSuccess ? '#10B981' : '#F59E0B' }}></span>
              {uploadSuccess ? 'Resume Ready' : 'Pending Upload'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>AI Model Target:</span>
            <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>Senior Data Scientist</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Max Upload Size:</span>
            <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>5.0 MB</span>
          </div>
        </div>
      </div>

      {/* Guidelines Widget */}
      <div className="widget-card">
        <div className="widget-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          Resume Best Practices
        </div>
        <ul className="guide-list">
          <li className="guide-item">
            <span className="guide-step-num">1</span>
            <div>Ensure your file format is <strong>PDF</strong> or <strong>DOCX</strong> under 5 MB.</div>
          </li>
          <li className="guide-item">
            <span className="guide-step-num">2</span>
            <div>Include clear Data Science sections: Machine Learning, Python/R, SQL, and LLM projects.</div>
          </li>
          <li className="guide-item">
            <span className="guide-step-num">3</span>
            <div>Click <strong>"Process Resume"</strong> after successful upload to extract skills for AI interview personalization.</div>
          </li>
        </ul>
      </div>
    </aside>
  );
}
