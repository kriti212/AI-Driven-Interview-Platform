/**
 * speechUtils.js
 * --------------
 * Web Speech API wrappers for Speech-to-Text (STT) and Text-to-Speech (TTS).
 * Provides streaming transcript callbacks, silence detection, and natural voice synthesis.
 */

// --- Speech Synthesis (Text-to-Speech) ---

export class TTSPlayer {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.currentUtterance = null;
    this.selectedVoice = null;
    this.initVoice();
  }

  initVoice() {
    if (!this.synth) return;

    const loadVoices = () => {
      const voices = this.synth.getVoices();
      // Select a natural sounding English voice
      this.selectedVoice =
        voices.find((v) => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Natural')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  speak(text, onStart, onEnd, onError) {
    if (!this.synth) {
      if (onError) onError('Speech synthesis not supported in this browser.');
      return;
    }

    this.stop(); // Stop any ongoing speech

    // Clean text of markdown formatting for speech
    const cleanText = text.replace(/[*_#`~]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.currentUtterance = null;
      if (onError) onError(e);
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }
}


// --- Speech Recognition (Speech-to-Text) ---

export class STTListener {
  constructor() {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    this.isSupported = !!SpeechRecognition;
    this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
    this.isListening = false;
    this.transcript = '';
    this.interimTranscript = '';

    if (this.recognition) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  start(onResultCallback, onErrorCallback, onEndCallback) {
    if (!this.isSupported || !this.recognition) {
      if (onErrorCallback) onErrorCallback('Speech recognition is not supported in this browser. Please use Chrome/Edge.');
      return;
    }

    this.transcript = '';
    this.interimTranscript = '';

    this.recognition.onresult = (event) => {
      let finalStr = '';
      let interimStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript + ' ';
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }

      if (finalStr) {
        this.transcript += finalStr;
      }
      this.interimTranscript = interimStr;

      if (onResultCallback) {
        onResultCallback(this.transcript.trim(), interimStr.trim());
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && onErrorCallback) {
        onErrorCallback(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEndCallback) onEndCallback();
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e) {
      console.warn('STT start exception:', e);
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
  }
}
