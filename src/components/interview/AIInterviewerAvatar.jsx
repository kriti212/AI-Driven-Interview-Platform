import React from 'react';

/**
 * AIInterviewerAvatar Component
 * -----------------------------
 * Displays a 3D/SVG AI Interviewer Avatar with dynamic ring visualizers
 * and status indicators for IDLE, AI_SPEAKING, LISTENING, EVALUATING states.
 */
export default function AIInterviewerAvatar({ state = 'IDLE', role = 'Data Scientist (Fresher)' }) {
  // Map state to visual attributes
  const getStateInfo = () => {
    switch (state) {
      case 'AI_SPEAKING':
        return {
          title: 'AI Interviewer Speaking...',
          statusClass: 'status-speaking',
          icon: '🗣️',
          badgeText: 'AI Speaking',
          glowColor: '#3b82f6',
        };
      case 'LISTENING':
        return {
          title: 'Listening to your answer...',
          statusClass: 'status-listening',
          icon: '🎙️',
          badgeText: 'Listening (Mic Active)',
          glowColor: '#10b981',
        };
      case 'EVALUATING':
        return {
          title: 'Evaluating response with LLM...',
          statusClass: 'status-evaluating',
          icon: '⚡',
          badgeText: 'Evaluating Answer',
          glowColor: '#8b5cf6',
        };
      default:
        return {
          title: 'Ready for your answer',
          statusClass: 'status-idle',
          icon: '🤖',
          badgeText: 'Interviewer Ready',
          glowColor: '#64748b',
        };
    }
  };

  const info = getStateInfo();

  return (
    <div className="avatar-card-panel">
      <div className="avatar-wrapper">
        {/* Animated Sound Wave Rings */}
        <div className={`avatar-ring ring-outer ${state.toLowerCase()}`} style={{ borderColor: info.glowColor }}></div>
        <div className={`avatar-ring ring-middle ${state.toLowerCase()}`} style={{ borderColor: info.glowColor }}></div>
        
        {/* Central Avatar Visual */}
        <div className="avatar-core-circle" style={{ boxShadow: `0 0 30px ${info.glowColor}40` }}>
          <div className="avatar-face">
            <div className="avatar-eyes">
              <span className={`eye eye-left ${state === 'AI_SPEAKING' ? 'pulse' : ''}`}></span>
              <span className={`eye eye-right ${state === 'AI_SPEAKING' ? 'pulse' : ''}`}></span>
            </div>
            <div className={`avatar-mouth ${state.toLowerCase()}`}></div>
          </div>
        </div>
      </div>

      {/* Interviewer Metadata */}
      <div className="avatar-info">
        <h3 className="avatar-name">Dr. Sophia AI</h3>
        <p className="avatar-role">Senior AI Data Science Recruiter</p>

        {/* Dynamic Status Badge */}
        <div className={`avatar-status-badge ${info.statusClass}`}>
          <span className="status-dot"></span>
          <span>{info.icon} {info.badgeText}</span>
        </div>
      </div>
    </div>
  );
}
