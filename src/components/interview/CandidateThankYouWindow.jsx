import React from 'react';

/**
 * CandidateThankYouWindow Component
 * ---------------------------------
 * Rendered when candidate completes the interview round.
 * Displays a professional Thank You message and submission confirmation
 * without exposing internal scorecard/evaluations to the candidate.
 */
export default function CandidateThankYouWindow({ candidateName, onReturnHome }) {
  return (
    <div className="card-panel candidate-thankyou-card" style={{
      maxWidth: '720px',
      margin: '40px auto',
      padding: '40px 32px',
      textAlign: 'center',
      borderRadius: '16px',
      background: 'linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      border: '1px solid #3730a3',
      color: '#f8fafc'
    }}>
      {/* Animated Success Check Icon */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(34, 197, 94, 0.15)',
        color: '#22c55e',
        fontSize: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px auto',
        border: '2px solid #22c55e'
      }}>
        ✓
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px', background: 'linear-gradient(90deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Interview Completed Successfully!
      </h1>

      <p style={{ fontSize: '1.1rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '24px' }}>
        Thank you, <strong>{candidateName || 'Candidate'}</strong>. Your interview responses, audio transcripts, and Python code solutions have been securely recorded and submitted to the hiring team.
      </p>

      {/* Info Badge Box */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px dashed #6366f1',
        borderRadius: '12px',
        padding: '16px 20px',
        textAlign: 'left',
        fontSize: '0.92rem',
        color: '#a5b4fc',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
        <div>
          <strong>What happens next?</strong>
          <p style={{ margin: '4px 0 0 0', color: '#cbd5e1' }}>
            Our HR and Technical evaluation team will review your interview analytics and coding submission. You will receive an official update via email.
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
        <button
          onClick={onReturnHome}
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '14px 32px',
            fontSize: '1rem',
            fontWeight: 700,
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(79, 70, 229, 0.4)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          ← Return to Dashboard
        </button>
      </div>
    </div>
  );
}
