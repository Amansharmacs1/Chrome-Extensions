/**
 * WordWise - Audio & Pronunciation Service
 * Handles authentic dictionary audio playback with graceful fallback
 * to browser SpeechSynthesis API. Clearly distinguishes authentic audio
 * from synthesized voice.
 */

let activeAudioElement = null;

/**
 * Checks if browser Speech Synthesis is supported
 * @returns {boolean}
 */
export function isSpeechSynthesisAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Checks audio source availability
 * @param {string|null} audioUrl
 * @returns {{ hasDictionaryAudio: boolean, hasSpeechSynthesis: boolean }}
 */
export function getAudioCapabilities(audioUrl) {
  const hasDictionaryAudio = Boolean(audioUrl && typeof audioUrl === 'string' && audioUrl.trim().length > 0);
  const hasSpeechSynthesis = isSpeechSynthesisAvailable();
  return {
    hasDictionaryAudio,
    hasSpeechSynthesis
  };
}

/**
 * Stops any ongoing audio playback or speech synthesis
 */
export function stopAudio() {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.src = '';
    } catch {}
    activeAudioElement = null;
  }

  if (isSpeechSynthesisAvailable()) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Plays word pronunciation
 * @param {object} options
 * @param {string} [options.audioUrl] Authentic audio URL from dictionary API
 * @param {string} options.word Word to pronounce
 * @param {number} [options.rate=0.9] Speech rate for synthesizer (0.5 to 1.5)
 * @param {function} [options.onStateChange] Callback: ({ state: 'playing'|'ended'|'error', sourceType: 'dictionary'|'synth', label: string })
 * @returns {Promise<boolean>}
 */
export async function playPronunciation({ audioUrl = null, word = '', rate = 0.9, onStateChange = null }) {
  stopAudio();

  const cleanWord = String(word).trim();
  if (!cleanWord) return false;

  const notify = (state, sourceType, label, err = null) => {
    if (typeof onStateChange === 'function') {
      onStateChange({ state, sourceType, label, error: err });
    }
  };

  // 1. Try Authentic Dictionary Audio if available
  if (audioUrl && typeof audioUrl === 'string' && audioUrl.trim() !== '') {
    try {
      const audio = new Audio(audioUrl.trim());
      activeAudioElement = audio;

      audio.addEventListener('play', () => {
        notify('playing', 'dictionary', 'Authentic dictionary audio');
      });

      audio.addEventListener('ended', () => {
        activeAudioElement = null;
        notify('ended', 'dictionary', 'Finished');
      });

      audio.addEventListener('error', (e) => {
        console.warn('[WordWise Audio] Authentic audio playback error, falling back to synthesis:', e);
        activeAudioElement = null;
        // Fallback to synthesis
        speakWithSynthesis(cleanWord, rate, notify);
      });

      await audio.play();
      return true;
    } catch (playErr) {
      console.warn('[WordWise Audio] Audio play() promise rejected:', playErr);
      activeAudioElement = null;
      // Fallback to synthesis
      return speakWithSynthesis(cleanWord, rate, notify);
    }
  }

  // 2. Fallback to Browser Speech Synthesis
  return speakWithSynthesis(cleanWord, rate, notify);
}

/**
 * Synthesizes word using Web Speech API
 * @param {string} word
 * @param {number} rate
 * @param {function} notify
 * @returns {boolean}
 */
function speakWithSynthesis(word, rate = 0.9, notify) {
  if (!isSpeechSynthesisAvailable()) {
    notify('error', 'none', 'Audio playback is unavailable on this system.');
    return false;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = Math.max(0.5, Math.min(1.5, rate));

    utterance.onstart = () => {
      notify('playing', 'synth', 'Browser-generated pronunciation');
    };

    utterance.onend = () => {
      notify('ended', 'synth', 'Finished');
    };

    utterance.onerror = (err) => {
      console.warn('[WordWise Audio] Speech synthesis error:', err);
      notify('error', 'synth', 'Speech synthesis encountered an error.');
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('[WordWise Audio] Speech synthesis failed to start:', err);
    notify('error', 'none', 'Speech synthesis is disabled or unavailable.');
    return false;
  }
}
