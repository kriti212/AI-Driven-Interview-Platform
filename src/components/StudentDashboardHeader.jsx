import React from 'react';

export default function StudentDashboardHeader({ onSwitchToAdminView }) {
  return (
    <header className="dashboard-header">
      <div className="header-inner">
        <div className="brand-logo">
          <div className="brand-icon-wrapper">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
              <path d="M12 12L2.5 7.5"></path>
              <path d="m12 12 8.5-4.5"></path>
              <path d="m12 12 0 10"></path>
            </svg>
          </div>
          <span>DataSci<span className="gradient-text">AI</span> Interview</span>
        </div>

        <nav className="nav-links">
          <a href="#dashboard" className="nav-item">Dashboard</a>
          <a href="#upload" className="nav-item active">Resume Upload</a>
          <a href="#mock-interviews" className="nav-item">Mock Interviews</a>
          <a href="#analytics" className="nav-item">Analytics</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onSwitchToAdminView}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
            }}
          >
            <span>👔</span> HR Admin Dashboard
          </button>

          <div className="user-profile-badge">
            <div className="user-avatar">SP</div>
            <div className="user-info-text">
              <span className="user-name">Swikriti Paul</span>
              <span className="user-role">Data Science Candidate</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

