import React, { useState, useEffect, useRef } from 'react';
import AIInterviewerAvatar from './AIInterviewerAvatar.jsx';
import QuestionDisplayPanel from './QuestionDisplayPanel.jsx';
import MicrophoneController from './MicrophoneController.jsx';
import LiveTranscriptBox from './LiveTranscriptBox.jsx';
import InterviewReportSummary from './InterviewReportSummary.jsx';
import CandidateThankYouWindow from './CandidateThankYouWindow.jsx';
import { STTListener, TTSPlayer } from '../../utils/speechUtils.js';

/**
 * SpeechToSpeechInterview Main Container Component


 * -------------------------------------------------
 * Manages the Speech-to-Speech interview lifecycle for Data Scientist (Fresher):
 * 1. Checks resume prerequisite and initializes interview session in MySQL.
 * 2. Manages real-time Web Speech STT and natural TTS.
 * 3. Handles sequential predefined question flow and dynamic LLM follow-ups.
 * 4. Displays real-time voice visualizers, live transcripts, progress bars, and timers.
 * 5. Generates end-of-interview report summary upon session completion.
 */
export default function SpeechToSpeechInterview({ candidateProfile, resumeData, onGoBack }) {
  // Session State
  const [sessionData, setSessionData] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [isCompleted, setIsCompleted] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  // Status & Voice State: 'IDLE' | 'AI_SPEAKING' | 'LISTENING' | 'EVALUATING'
  const [voiceState, setVoiceState] = useState('IDLE');
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Speech Transcripts
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  // Timers (in seconds)
  const [sessionTimer, setSessionTimer] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(0);

  // Speech Utility Refs
  const ttsRef = useRef(null);
  const sttRef = useRef(null);

  // Initialize Speech Objects on Mount
  useEffect(() => {
    ttsRef.current = new TTSPlayer();
    sttRef.current = new STTListener();

    return () => {
      if (ttsRef.current) ttsRef.current.stop();
      if (sttRef.current) sttRef.current.stop();
    };
  }, []);

  // Global Session Duration Timer
  useEffect(() => {
    if (isCompleted || loadingSession) return;
    const interval = setInterval(() => {
      setSessionTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted, loadingSession]);

  // Per-Question Timer Reset
  useEffect(() => {
    if (isCompleted) return;
    setQuestionTimer(0);
    const interval = setInterval(() => {
      setQuestionTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuestion, isCompleted]);

  // 1. Initialize Interview Session on Mount
  useEffect(() => {
    if (!resumeData?.id) {
      setErrorMessage('Resume upload is required before starting the interview session.');
      setLoadingSession(false);
      return;
    }

    const initSession = async () => {
      setLoadingSession(true);
      setErrorMessage('');

      try {
        const payload = {
          resume_id: resumeData.id,
          candidate_name: candidateProfile?.name || 'Candidate',
          candidate_email: candidateProfile?.email || 'candidate@example.com',
          role: 'Data Scientist (Fresher)',
        };

        const res = await fetch('/api/interview/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || 'Failed to start interview session.');
        }

        const data = await res.json();
        setSessionData(data);
        setStepIndex(data.current_step_index);
        setTotalQuestions(data.total_predefined_questions);

        if (data.is_completed) {
          // Single Attempt Lock Triggered
          setIsCompleted(true);
          fetchFinalResults(data.session_id);
        } else if (data.active_question) {
          setActiveQuestion(data.active_question);
          speakQuestion(data.active_question.rewritten_question || data.active_question.question_text);
        }
      } catch (err) {
        setErrorMessage(err.message);
      } finally {
        setLoadingSession(false);
      }
    };

    initSession();
  }, [resumeData, candidateProfile]);

  // Helper to fetch final results if already completed
  const fetchFinalResults = async (sessionId) => {
    try {
      const res = await fetch(`/api/interview/results/${sessionId}`);
      if (res.ok) {
        const result = await res.json();
        setReportResult(result);
      }
    } catch (e) {
      console.error('Error fetching interview results:', e);
    }
  };

  // Helper to Speak Question via TTS
  const speakQuestion = (textToSpeak) => {
    if (!textToSpeak || !ttsRef.current) return;

    // Stop STT if listening while AI speaks
    if (sttRef.current) sttRef.current.stop();
    setIsListening(false);

    setVoiceState('AI_SPEAKING');
    ttsRef.current.speak(
      textToSpeak,
      () => setVoiceState('AI_SPEAKING'),
      () => setVoiceState('IDLE'),
      (err) => {
        console.warn('TTS error:', err);
        setVoiceState('IDLE');
      }
    );
  };

  // Toggle Microphone STT Listener
  const handleToggleMic = () => {
    if (voiceState === 'AI_SPEAKING') {
      if (ttsRef.current) ttsRef.current.stop();
    }

    if (isListening) {
      if (sttRef.current) sttRef.current.stop();
      setIsListening(false);
      setVoiceState('IDLE');
    } else {
      if (sttRef.current) {
        setVoiceState('LISTENING');
        setIsListening(true);
        sttRef.current.start(
          (text, interim) => {
            setTranscript(text);
            setInterimTranscript(interim);
          },
          (err) => {
            console.warn('STT listener error:', err);
            setIsListening(false);
            setVoiceState('IDLE');
          },
          () => {
            setIsListening(false);
            setVoiceState((prev) => (prev === 'LISTENING' ? 'IDLE' : prev));
          }
        );
      }
    }
  };

  // Submit Answer Action
  const handleSubmitAnswer = async () => {
    const finalAnswerText = (transcript + ' ' + interimTranscript).trim();
    if (!finalAnswerText) return;

    // Stop recording and speech
    if (sttRef.current) sttRef.current.stop();
    if (ttsRef.current) ttsRef.current.stop();
    setIsListening(false);

    setIsSubmitting(true);
    setVoiceState('EVALUATING');

    try {
      const payload = {
        session_id: sessionData.session_id,
        question_id: activeQuestion.question_id,
        step_type: isFollowUp ? 'FOLLOW_UP' : 'PREDEFINED',
        question_text: activeQuestion.rewritten_question || activeQuestion.question_text,
        candidate_transcript: finalAnswerText,
        audio_metadata: {
          duration_seconds: questionTimer,
          mime_type: 'audio/webm;codecs=opus',
          device: 'Browser Web Speech API',
        },
      };

      const res = await fetch('/api/interview/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to submit answer.');
      }

      const evalResponse = await res.json();

      // Reset transcripts for next question
      setTranscript('');
      setInterimTranscript('');

      // Handle next step transition
      if (evalResponse.next_step_type === 'FOLLOW_UP') {
        setIsFollowUp(true);
        if (evalResponse.next_question) {
          setActiveQuestion(evalResponse.next_question);
          speakQuestion(evalResponse.followup_question_text || evalResponse.next_question.rewritten_question);
        }
      } else if (evalResponse.next_step_type === 'NEXT_PREDEFINED' || evalResponse.next_step_type === 'NEXT_SECTION') {
        setIsFollowUp(false);
        setStepIndex((prev) => prev + 1);
        if (evalResponse.next_question) {
          setActiveQuestion(evalResponse.next_question);
          if (evalResponse.next_question.coding_template) {
            setTranscript(evalResponse.next_question.coding_template);
          }
          speakQuestion(evalResponse.next_question.rewritten_question || evalResponse.next_question.question_text);
        }
      } else if (evalResponse.next_step_type === 'FINISH') {
        // Complete interview & fetch report summary
        await handleFinishInterview();
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
      setVoiceState('IDLE');
    }
  };

  // Complete & Lock Interview Session
  const handleFinishInterview = async () => {
    try {
      const res = await fetch(`/api/interview/finish?session_id=${sessionData.session_id}`, {
        method: 'POST',
      });
      if (res.ok) {
        const result = await res.json();
        setReportResult(result);
        setIsCompleted(true);
      }
    } catch (e) {
      console.error('Error finalizing interview:', e);
    }
  };

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render Loading State
  if (loadingSession) {
    return (
      <div className="card-panel interview-loading-box">
        <div className="spinner-lg"></div>
        <h2>Initializing AI Data Science Speech Interview...</h2>
        <p>Retrieving predefined questions and establishing MySQL session connection...</p>
      </div>
    );
  }

  // Render Error State
  if (errorMessage) {
    return (
      <div className="card-panel interview-error-box">
        <div className="error-icon">⚠️</div>
        <h2>Interview Session Notice</h2>
        <p className="error-desc">{errorMessage}</p>
        <button className="btn-go-back" onClick={onGoBack}>
          ← Return to Dashboard
        </button>
      </div>
    );
  }
  // Render Candidate Thank You Window upon completion (Scorecard hidden from candidate)

  if (isCompleted) {
    return (
      <CandidateThankYouWindow
        candidateName={candidateProfile?.name}
        onReturnHome={onGoBack}
      />
    );
  }


  // Skip Question Action
  const handleSkipQuestion = async () => {
    // Stop recording and speech
    if (sttRef.current) sttRef.current.stop();
    if (ttsRef.current) ttsRef.current.stop();
    setIsListening(false);

    setIsSubmitting(true);
    setVoiceState('EVALUATING');

    try {
      const payload = {
        session_id: sessionData.session_id,
        question_id: activeQuestion.question_id,
        step_type: isFollowUp ? 'FOLLOW_UP' : 'PREDEFINED',
        question_text: activeQuestion.rewritten_question || activeQuestion.question_text,
        candidate_transcript: '[Question Skipped]',
        audio_metadata: {
          duration_seconds: questionTimer,
          mime_type: 'audio/webm;codecs=opus',
          device: 'Browser Web Speech API',
          skipped: true,
        },
      };

      const res = await fetch('/api/interview/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to skip question.');
      }

      const evalResponse = await res.json();

      setTranscript('');
      setInterimTranscript('');

      if (evalResponse.next_step_type === 'FOLLOW_UP') {
        setIsFollowUp(true);
        if (evalResponse.next_question) {
          setActiveQuestion(evalResponse.next_question);
          speakQuestion(evalResponse.followup_question_text || evalResponse.next_question.rewritten_question);
        }
      } else if (evalResponse.next_step_type === 'NEXT_PREDEFINED' || evalResponse.next_step_type === 'NEXT_SECTION') {
        setIsFollowUp(false);
        setStepIndex((prev) => prev + 1);
        if (evalResponse.next_question) {
          setActiveQuestion(evalResponse.next_question);
          if (evalResponse.next_question.coding_template) {
            setTranscript(evalResponse.next_question.coding_template);
          }
          speakQuestion(evalResponse.next_question.rewritten_question || evalResponse.next_question.question_text);
        }
      } else if (evalResponse.next_step_type === 'FINISH') {
        await handleFinishInterview();
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
      setVoiceState('IDLE');
    }
  };

  return (
    <section className="speech-interview-container">
      {/* Top Header Controls Bar */}
      <div className="interview-top-bar card-panel">
        <div className="candidate-badge-info">
          <span className="cand-avatar-icon">👨‍💻</span>
          <div>
            <h3 className="cand-name">{candidateProfile?.name}</h3>
            <span className="cand-role-pill">Target: Data Scientist (Fresher)</span>
          </div>
        </div>

        <div className="global-timer-pill">
          <span>Session Timer:</span>
          <strong>{formatTime(sessionTimer)}</strong>
        </div>

        <button className="btn-end-early" onClick={handleFinishInterview} title="Finish early and view current scorecard">
          🏁 Finish & View Report
        </button>
      </div>

      {/* Main Grid: Left Avatar & Controls | Right Question & Live Transcript */}
      <div className="speech-interview-grid">
        {/* Left Column: AI Interviewer Avatar & Microphone Controls */}
        <div className="interview-left-column">
          <AIInterviewerAvatar state={voiceState} role="Data Scientist (Fresher)" />

          <MicrophoneController
            isListening={isListening}
            onToggleMic={handleToggleMic}
            onSubmitAnswer={handleSubmitAnswer}
            onSkipQuestion={handleSkipQuestion}
            isSubmitting={isSubmitting}
            state={voiceState}
            transcriptLength={(transcript + interimTranscript).trim().length}
            isCodingQuestion={activeQuestion?.question_type === 'CODING' || activeQuestion?.section === 'SECTION_3_CODING'}
          />

        </div>

        {/* Right Column: Question Panel & Live Speech Transcript Box */}
        <div className="interview-right-column">
          <QuestionDisplayPanel
            activeQuestion={activeQuestion}
            stepIndex={stepIndex}
            totalQuestions={totalQuestions}
            isFollowUp={isFollowUp}
            onReplayTTS={() => speakQuestion(activeQuestion?.rewritten_question || activeQuestion?.question_text)}
            isSpeakingTTS={voiceState === 'AI_SPEAKING'}
            questionTimer={questionTimer}
            formatTime={formatTime}
          />

          <LiveTranscriptBox
            transcript={transcript}
            interimTranscript={interimTranscript}
            onTranscriptChange={(val) => setTranscript(val)}
            isListening={isListening}
            isCodingQuestion={activeQuestion?.question_type === 'CODING' || activeQuestion?.section === 'SECTION_3_CODING'}
            initialTemplate={activeQuestion?.coding_template || ''}
          />

        </div>
      </div>
    </section>
  );
}
