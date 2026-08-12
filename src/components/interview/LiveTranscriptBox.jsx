import React from 'react';
import CodeEditor from './CodeEditor.jsx';

/**
 * LiveTranscriptBox Component
 * ----------------------------
 * Displays real-time Speech-to-Text transcript or Python Code Editor for coding questions.
 */
export default function LiveTranscriptBox({
  transcript,
  interimTranscript,
  onTranscriptChange,
  isListening,
  isCodingQuestion = false,
  initialTemplate = ''
}) {
  const fullText = (transcript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
  const wordCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;

  if (isCodingQuestion) {
    return (
      <div className="transcript-panel code-editor-panel" style={{ marginTop: '16px' }}>
        <CodeEditor
          value={transcript}
          onChange={onTranscriptChange}
          initialTemplate={initialTemplate}
          placeholder="# Write your complete Python code solution here...\n# Include imports (pandas, numpy, torch, sklearn, etc.) and optimal algorithms."
        />
      </div>
    );
  }

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <div className="transcript-title">
          <span>📝 Live Speech Transcript</span>
          {isListening && <span className="live-pulsing-badge">LIVE STT</span>}
        </div>
        <div className="transcript-word-count">
          <span>{wordCount} words</span>
        </div>
      </div>

      <div className="transcript-box-wrapper">
        <textarea
          className="transcript-textarea"
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder={isListening ? "Listening... Speak now and your words will appear here in real time..." : "Your spoken answer will appear here automatically. You can also edit or type manually..."}
          rows={4}
        />
        {interimTranscript && (
          <div className="interim-preview">
            <span className="interim-label">Transcribing:</span> <em>"{interimTranscript}"</em>
          </div>
        )}
      </div>
    </div>
  );
}
