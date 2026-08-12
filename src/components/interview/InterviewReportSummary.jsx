import React from 'react';

/**
 * InterviewReportSummary Component
 * --------------------------------
 * End-of-Interview Scorecard displaying overall score, rubric metrics,
 * transcript logs, LLM feedback, and interview completion status.
 */
export default function InterviewReportSummary({ resultData, onRestartNewCandidate }) {
  if (!resultData) return null;

  const score = Math.round(resultData.overall_score || 0);

  const getScoreColor = (s) => {
    if (s >= 75) return '#10b981';
    if (s >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="report-summary-card">
      {/* Top Banner & Attempt Status Badge */}
      <div className="report-header-banner">
        <div className="report-badge-locked">
          <span>✅ Attempt Completed</span>
        </div>
        <h1 className="report-title">AI Interview Performance Report</h1>
        <p className="report-subtitle">
          Data Scientist (Fresher) Role Evaluation • Candidate: <strong>{resultData.candidate_name}</strong> ({resultData.candidate_email})
        </p>
      </div>

      {/* Main Score & Metrics Summary Grid */}
      <div className="report-score-grid">
        {/* Score Radial Ring Card */}
        <div className="score-ring-card">
          <div className="score-circle-wrapper" style={{ borderColor: getScoreColor(score) }}>
            <span className="score-number" style={{ color: getScoreColor(score) }}>{score}%</span>
            <span className="score-label">Overall Match</span>
          </div>
          <div className="score-status-text">
            {score >= 75 ? '🌟 Recommended for Next Round' : score >= 50 ? '📈 Moderate Performance' : '📚 Requires Skill Strengthening'}
          </div>
        </div>

        {/* Executive Feedback Box */}
        <div className="feedback-summary-card">
          <h3>📋 AI Evaluation Executive Summary</h3>
          <p className="summary-text">{resultData.feedback_summary || 'Evaluation completed successfully.'}</p>
          <div className="candidate-meta-pills">
            <span><strong>Target Role:</strong> {resultData.role}</span>
            <span><strong>Questions Answered:</strong> {resultData.total_questions_answered}</span>
            <span><strong>Status:</strong> {resultData.status}</span>
          </div>
        </div>
      </div>

      {/* Question-by-Question Evaluation Table */}
      <div className="question-logs-section">
        <h3>🔍 Question-by-Question Transcripts & Rubric Breakdown</h3>

        <div className="logs-cards-list">
          {resultData.logs?.map((log, idx) => (
            <div key={idx} className="log-card-item">
              <div className="log-card-header">
                <span className={`log-step-badge ${log.step_type === 'FOLLOW_UP' ? 'badge-followup' : 'badge-predefined'}`}>
                  {log.step_type === 'FOLLOW_UP' ? '⚡ LLM Follow-Up' : `Question #${log.question_id}`}
                </span>
                <span className="log-score-badge" style={{ backgroundColor: getScoreColor(log.overall_question_score) }}>
                  Score: {Math.round(log.overall_question_score)}%
                </span>
              </div>

              <h4 className="log-question-text">Q: {log.question_text}</h4>

              <div className="log-transcript-box">
                <strong>🎙️ Candidate Spoken Transcript:</strong>
                <p>"{log.candidate_transcript}"</p>
              </div>

              {log.golden_answer && (
                <div className="log-golden-box">
                  <strong>💡 Golden Reference Answer:</strong>
                  <p>{log.golden_answer}</p>
                </div>
              )}

              {/* Rubric Score Metrics Grid */}
              <div className="rubric-metrics-grid">
                <div className="rubric-metric-item">
                  <span className="metric-name">Keyword Match:</span>
                  <span className="metric-val">{Math.round(log.keyword_match_score)}%</span>
                </div>
                <div className="rubric-metric-item">
                  <span className="metric-name">Semantic Similarity:</span>
                  <span className="metric-val">{Math.round(log.semantic_similarity_score)}%</span>
                </div>
                <div className="rubric-metric-item">
                  <span className="metric-name">Concept Score:</span>
                  <span className="metric-val">{Math.round(log.concept_score)}%</span>
                </div>
                <div className="rubric-metric-item">
                  <span className="metric-name">Rubric Score:</span>
                  <span className="metric-val">{Math.round(log.rubric_score)}%</span>
                </div>
              </div>

              {log.eval_feedback && (
                <div className="log-feedback-box">
                  <strong>🤖 AI Feedback:</strong> {log.eval_feedback}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="report-footer-actions">
        <button className="btn-finish-dashboard" onClick={onRestartNewCandidate}>
          🏠 Return to Student Dashboard (New Candidate Upload)
        </button>
      </div>
    </div>
  );
}
