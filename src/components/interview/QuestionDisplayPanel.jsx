import React from 'react';

/**
 * QuestionDisplayPanel Component
 * ------------------------------
 * Displays current question text, topic, difficulty, progress bar, timer,
 * and Text-to-Speech audio replay control.
 */
export default function QuestionDisplayPanel({
  activeQuestion,
  stepIndex,
  totalQuestions,
  isFollowUp = false,
  onReplayTTS,
  isSpeakingTTS,
  questionTimer,
  formatTime,
}) {
  if (!activeQuestion) return null;

  const topic = activeQuestion.topic || 'Data Science';
  const difficulty = activeQuestion.difficulty || 'Medium';
  const text = activeQuestion.rewritten_question || activeQuestion.question_text || '';
  const sectionTitle = activeQuestion.section_title || (activeQuestion.section ? activeQuestion.section.replace('_', ' ') : 'AI Interview');

  // Progress percentage
  const progressPercent = Math.min(100, Math.round(((stepIndex + (isFollowUp ? 0.5 : 0)) / totalQuestions) * 100));

  return (
    <div className="question-display-card">
      {/* Top Header Bar with Badges and Timer */}
      <div className="question-card-header">
        <div className="question-badges-group">
          <span className="badge-section" style={{ background: '#4f46e5', color: '#ffffff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
            🏷️ {sectionTitle}
          </span>
          <span className={`step-type-badge ${isFollowUp ? 'badge-followup' : 'badge-predefined'}`}>
            {isFollowUp ? '⚡ Dynamic Gemma4 Follow-Up' : `Question ${stepIndex + 1}`}
          </span>
          <span className="badge-topic">📌 {topic}</span>
          <span className={`badge-difficulty diff-${difficulty.toLowerCase()}`}>
            ⚡ {difficulty}
          </span>
        </div>

        {/* Question Timer */}
        <div className="question-timer-box" title="Time elapsed on current question">
          <span className="timer-icon">⏱️</span>
          <span className="timer-text">{formatTime(questionTimer)}</span>
        </div>
      </div>

      {/* Main Question Text Container */}
      <div className="question-body">
        <h2 className="question-prompt-text">{text}</h2>

        {/* TTS Control Button */}
        <button
          className={`btn-tts-replay ${isSpeakingTTS ? 'speaking-active' : ''}`}
          onClick={onReplayTTS}
          title="Listen to question audio again"
        >
          <span>{isSpeakingTTS ? '🔊 AI Speaking...' : '🔊 Read Aloud'}</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="interview-progress-bar-container">
        <div className="progress-bar-info">
          <span>Interview Progress</span>
          <span>{progressPercent}% Complete</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
    </div>
  );
}
