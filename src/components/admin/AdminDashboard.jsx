import React, { useState, useEffect } from 'react';
import OverviewDashboard from './OverviewDashboard.jsx';
import CandidateRecordsTable from './CandidateRecordsTable.jsx';
import CandidateDetailReport from './CandidateDetailReport.jsx';
import CodingEvaluationPage from './CodingEvaluationPage.jsx';
import QuestionAnalyticsPage from './QuestionAnalyticsPage.jsx';
import CandidateComparisonPage from './CandidateComparisonPage.jsx';
import RecommendationsPage from './RecommendationsPage.jsx';

/**
 * AdminDashboard Component
 * ------------------------
 * Production-ready HR Analytics Admin Dashboard container featuring sidebar navigation,
 * top navigation with candidate search, notifications, admin profile, and tab state management.
 */
export default function AdminDashboard({ onSwitchToCandidateView }) {
  // Navigation tabs: 'DASHBOARD' | 'CANDIDATES' | 'REPORT_DETAIL' | 'CODING' | 'QUESTIONS' | 'COMPARISON' | 'RECOMMENDATIONS'
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [candidateReportData, setCandidateReportData] = useState(null);
  const [topSearch, setTopSearch] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard-stats');
      if (res.ok) {
        const data = await res.json();
        setDashboardStats(data);
      }
    } catch (e) {
      console.error('Error fetching admin dashboard stats:', e);
    }
  };

  const handleSelectCandidate = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setActiveTab('REPORT_DETAIL');

    // Pre-fetch coding evaluations for Coding tab
    try {
      const res = await fetch(`/api/admin/candidate/${sessionId}`);
      if (res.ok) {
        const json = await res.json();
        setCandidateReportData(json);
      }
    } catch (e) {
      console.error('Error fetching candidate payload:', e);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar Navigation */}
      <aside style={{ width: '260px', background: '#1e293b', borderRight: '1px solid #334155', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Brand Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px' }}>
          <span style={{ fontSize: '1.6rem' }}>👔</span>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>HR Analytics</h2>
            <span style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600 }}>AI Interview Platform</span>
          </div>
        </div>

        {/* Sidebar Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'DASHBOARD' ? '#4f46e5' : 'transparent',
              color: activeTab === 'DASHBOARD' ? '#ffffff' : '#cbd5e1',
              fontWeight: activeTab === 'DASHBOARD' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>📊</span> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('CANDIDATES')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'CANDIDATES' ? '#4f46e5' : 'transparent',
              color: activeTab === 'CANDIDATES' ? '#ffffff' : '#cbd5e1',
              fontWeight: activeTab === 'CANDIDATES' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>👥</span> Candidates
          </button>

          <button
            onClick={() => {
              if (!selectedSessionId && dashboardStats?.recent_interviews?.length > 0) {
                handleSelectCandidate(dashboardStats.recent_interviews[0].session_id);
              } else {
                setActiveTab('REPORT_DETAIL');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'REPORT_DETAIL' ? '#4f46e5' : 'transparent',
              color: activeTab === 'REPORT_DETAIL' ? '#ffffff' : '#cbd5e1',
              fontWeight: activeTab === 'REPORT_DETAIL' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>📑</span> Interview Reports
          </button>

          <button
            onClick={() => setActiveTab('CODING')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'CODING' ? '#4f46e5' : 'transparent',
              color: activeTab === 'CODING' ? '#ffffff' : '#cbd5e1',
              fontWeight: activeTab === 'CODING' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>💻</span> Coding Evaluation
          </button>

          <button
            onClick={() => setActiveTab('QUESTIONS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'QUESTIONS' ? '#4f46e5' : 'transparent',
              color: activeTab === 'QUESTIONS' ? '#ffffff' : '#cbd5e1',
              fontWeight: activeTab === 'QUESTIONS' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>🎯</span> Question Analytics
          </button>

          <button
            onClick={() => setActiveTab('COMPARISON')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'COMPARISON' ? '#4f46e5' : 'transparent',
              color: activeTab === 'COMPARISON' ? '#ffffff' : '#cbd5e1',
              fontWeight: activeTab === 'COMPARISON' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>⚖️</span> Candidate Comparison
          </button>

          <button
            onClick={() => setActiveTab('RECOMMENDATIONS')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'RECOMMENDATIONS' ? '#4f46e5' : 'transparent',
              color: activeTab === 'RECOMMENDATIONS' ? '#ffffff' : '#cbd5e1',
              fontWeight: activeTab === 'RECOMMENDATIONS' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span>🏆</span> Recommendations
          </button>
        </nav>

        {/* Mode Switcher Button */}
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #334155' }}>
          <button
            onClick={onSwitchToCandidateView}
            style={{
              width: '100%',
              background: '#0f172a',
              color: '#818cf8',
              border: '1px solid #6366f1',
              padding: '10px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>👨‍🎓</span> Candidate View
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Navigation Bar */}
        <header style={{ height: '70px', background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Top Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', width: '360px', background: '#0f172a', borderRadius: '8px', padding: '8px 14px', border: '1px solid #334155' }}>
            <span style={{ marginRight: '8px', opacity: 0.7 }}>🔍</span>
            <input
              type="text"
              placeholder="Search candidate name, email, skill..."
              value={topSearch}
              onChange={(e) => {
                setTopSearch(e.target.value);
                if (activeTab !== 'CANDIDATES') setActiveTab('CANDIDATES');
              }}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', width: '100%', fontSize: '0.88rem', outline: 'none' }}
            />
          </div>

          {/* Right Controls: Notifications & Admin Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Notification Indicator */}
            <div style={{ position: 'relative', cursor: 'pointer', fontSize: '1.3rem' }} title="Notifications">
              🔔
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }}></span>
            </div>

            {/* Admin Profile Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                HR
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>Admin Evaluator</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>HR Recruiter</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content Pages */}
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          {activeTab === 'DASHBOARD' && (
            <OverviewDashboard
              stats={dashboardStats}
              onSelectCandidate={handleSelectCandidate}
            />
          )}

          {activeTab === 'CANDIDATES' && (
            <CandidateRecordsTable
              onSelectCandidate={handleSelectCandidate}
              initialSearch={topSearch}
            />
          )}

          {activeTab === 'REPORT_DETAIL' && (
            selectedSessionId ? (
              <CandidateDetailReport
                sessionId={selectedSessionId}
                onBack={() => setActiveTab('CANDIDATES')}
              />
            ) : (
              <CandidateRecordsTable onSelectCandidate={handleSelectCandidate} />
            )
          )}

          {activeTab === 'CODING' && (
            <CodingEvaluationPage
              codingEvals={candidateReportData?.coding_evaluations || []}
            />
          )}

          {activeTab === 'QUESTIONS' && (
            <QuestionAnalyticsPage />
          )}

          {activeTab === 'COMPARISON' && (
            <CandidateComparisonPage />
          )}

          {activeTab === 'RECOMMENDATIONS' && (
            <RecommendationsPage />
          )}
        </main>
      </div>
    </div>
  );
}
