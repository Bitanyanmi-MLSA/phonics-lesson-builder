/*
 * Speech helper - wraps the Web Speech API (speechSynthesis) so the app
 * works fully offline, with no API keys, directly in the browser.
 *
 * Voice selection: most operating systems don't ship a Ghanaian-English
 * voice pack, so we automatically prefer the closest practical match -
 * Ghanaian schools follow British English conventions, so we prioritize
 * en-GB (and check for any en-GH voice, in case one is ever installed).
 * Teachers can still override this with whichever installed voice sounds
 * best on their machine via the voice picker in the UI.
 */
(function (global) {
  "use strict";

  const synth = global.speechSynthesis;
  const VOICE_KEY = "phonicsLessonBuilder.voiceURI";

  // Priority order for the "closest to Ghana" auto-pick.
  const ACCENT_PRIORITY = ["en-gh", "en-gb", "en-ng", "en-za", "en-ie", "en-au", "en"];

  let voices = [];
  let readyCallbacks = [];

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices();
    if (voices.length) {
      readyCallbacks.forEach((cb) => cb(voices));
      readyCallbacks = [];
    }
  }

  if (synth) {
    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
  }

  /** Run `cb(voices)` once voices are available (they load async in some browsers). */
  function onVoicesReady(cb) {
    if (voices.length) cb(voices);
    else readyCallbacks.push(cb);
  }

  function getVoices() {
    return voices;
  }

  function recommendedVoice() {
    if (!voices.length) return null;
    for (const lang of ACCENT_PRIORITY) {
      const match = voices.find((v) => v.lang.toLowerCase().startsWith(lang));
      if (match) return match;
    }
    return voices[0];
  }

  function getSelectedVoice() {
    const savedURI = localStorage.getItem(VOICE_KEY);
    if (savedURI) {
      const found = voices.find((v) => v.voiceURI === savedURI);
      if (found) return found;
    }
    return recommendedVoice();
  }

  function setSelectedVoice(voiceURI) {
    if (voiceURI) localStorage.setItem(VOICE_KEY, voiceURI);
    else localStorage.removeItem(VOICE_KEY);
  }

  function applyVoice(utter) {
    const voice = getSelectedVoice();
    if (voice) utter.voice = voice;
  }

  function speak(text, rate = 0.9, pitch = 1.05, onDone) {
    if (!synth) {
      if (onDone) onDone();
      return;
    }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = pitch;
    applyVoice(utter);
    if (onDone) {
      utter.onend = onDone;
      utter.onerror = onDone;
    }
    synth.speak(utter);
  }

  /**
   * Speak a single isolated phonics sound (as opposed to a whole word).
   * Uses a clearly higher pitch than `speak()` so an isolated sound never
   * sounds acoustically identical to "say the whole word" - important
   * because some sounds are respelled using real short words (e.g. the
   * short /a/ sound uses "bag"), which could otherwise coincide with the
   * word actually being taught.
   */
  function speakIsolatedSound(text, rate = 0.85, onDone) {
    speak(text, rate, 1.45, onDone);
  }

  /**
   * Speak a list of sounds one at a time, pausing between each.
   * Each item may be a plain string, or a { text, rate } object (as
   * returned by PhonicsEngine.soundToSpeech). Pass a higher `pitch` when
   * speaking isolated phonics sounds (vs. real word/syllable chunks) so
   * they're clearly distinguishable from normal word speech.
   */
  function speakSounds(items, onDone, pitch = 1.05) {
    if (!synth || items.length === 0) {
      if (onDone) onDone();
      return;
    }
    synth.cancel();
    let i = 0;
    function next() {
      if (i >= items.length) {
        if (onDone) onDone();
        return;
      }
      const item = items[i];
      const text = typeof item === "string" ? item : item.text;
      const rate = typeof item === "string" ? 0.7 : item.rate || 0.7;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rate;
      utter.pitch = pitch;
      applyVoice(utter);
      utter.onend = () => {
        i += 1;
        setTimeout(next, 150);
      };
      synth.speak(utter);
    }
    next();
  }

  global.Speech = {
    speak,
    speakIsolatedSound,
    speakSounds,
    getVoices,
    onVoicesReady,
    recommendedVoice,
    getSelectedVoice,
    setSelectedVoice
  };
})(typeof window !== "undefined" ? window : globalThis);
