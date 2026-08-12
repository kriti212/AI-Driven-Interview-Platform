import React from 'react';

/**
 * MicrophoneController Component
 * ------------------------------
 * Microphone input control, audio waveform visualization, submit answer trigger,
 * skip question action, and voice status indicator.
 */
export default function MicrophoneController({
  isListening,
  onToggleMic,
  onSubmitAnswer,
  onSkipQuestion,
  isSubmitting,
  state = 'IDLE',
  transcriptLength = 0,
  isCodingQuestion = false,
}) {
  return (
    <div className="mic-controller-panel">
      {/* Waveform Visualization Bars */}
      <div className="waveform-container">
        <div className={`wave-bar ${isListening ? 'animating bar-1' : ''}`}></div>
        <div className={`wave-bar ${isListening ? 'animating bar-2' : ''}`}></div>
        <div className={`wave-bar ${isListening ? 'animating bar-3' : ''}`}></div>
        <div className={`wave-bar ${isListening ? 'animating bar-4' : ''}`}></div>
        <div className={`wave-bar ${isListening ? 'animating bar-5' : ''}`}></div>
        <div className={`wave-bar ${isListening ? 'animating bar-6' : ''}`}></div>
        <div className={`wave-bar ${isListening ? 'animating bar-7' : ''}`}></div>
      </div>

      {/* Main Action Controls */}
      <div className="mic-controls-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {/* Toggle Microphone Button (Disabled for Coding Questions) */}
        {!isCodingQuestion ? (
          <button
            className={`btn-mic-toggle ${isListening ? 'active-recording' : ''}`}
            onClick={onToggleMic}
            disabled={state === 'AI_SPEAKING' || isSubmitting}
            title={isListening ? 'Stop Microphone' : 'Start Speaking'}
          >
            <span className="mic-icon">{isListening ? '⏹️' : '🎙️'}</span>
            <span>{isListening ? 'Stop Recording' : 'Start Speaking'}</span>
          </button>
        ) : (
          <div
            className="btn-mic-toggle disabled-coding-mic"
            style={{
              opacity: 0.6,
              background: '#334155',
              color: '#94a3b8',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'not-allowed',
              fontSize: '0.88rem',
              fontWeight: 600
            }}
          >
            <span>🚫 Voice Recording Disabled for Coding Round</span>
          </div>
        )}

        {/* Submit Answer Button */}
        <button
          className="btn-submit-answer"
          onClick={onSubmitAnswer}
          disabled={isSubmitting || transcriptLength === 0}
          style={isCodingQuestion ? { background: '#6366f1', color: '#ffffff', fontWeight: 700 } : {}}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-sm"></span> Submitting Solution...
            </>
          ) : isCodingQuestion ? (
            <>💻 Submit Python Code Solution</>
          ) : (
            <>🚀 Submit Spoken Answer</>
          )}
        </button>

        {/* Skip Question Button */}
        <button
          className="btn-skip-question"
          onClick={onSkipQuestion}
          disabled={isSubmitting}
          title="Skip this question and move to next"
          style={{
            backgroundColor: '#475569',
            color: '#f8fafc',
            border: '1px solid #64748b',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>⏭️ Skip Question</span>
        </button>
      </div>

      {/* Helper text */}
      <div className="mic-helper-text" style={{ marginTop: '10px' }}>
        {isCodingQuestion ? (
          <span className="idle-text" style={{ color: '#818cf8' }}>
            Write your complete Python code in the IDE box on the right and click <strong>Submit Python Code Solution</strong> or <strong>Skip Question</strong>.
          </span>
        ) : isListening ? (
          <span className="recording-text">🔴 Recording live speech... Speak clearly into your mic.</span>
        ) : (
          <span className="idle-text">Click <strong>Start Speaking</strong> or type in the transcript box below, or click <strong>Skip Question</strong>.</span>
        )}
      </div>
    </div>
  );
}
