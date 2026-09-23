/*
 * Storage helper - localStorage persistence for the teacher's saved
 * word lists per level (no backend, works fully offline like a
 * classroom teaching tool should).
 */
(function (global) {
  "use strict";

  const KEY = "phonicsLessonBuilder.wordLists.v1";

  function loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveAll(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function getWords(levelId) {
    const all = loadAll();
    return all[levelId] || [];
  }

  function addWord(levelId, word) {
    const all = loadAll();
    if (!all[levelId]) all[levelId] = [];
    const clean = word.trim().toLowerCase();
    if (clean && !all[levelId].includes(clean)) {
      all[levelId].push(clean);
      saveAll(all);
    }
    return all[levelId];
  }

  function removeWord(levelId, word) {
    const all = loadAll();
    if (!all[levelId]) return [];
    all[levelId] = all[levelId].filter((w) => w !== word);
    saveAll(all);
    return all[levelId];
  }

  // --- Custom sound respellings ------------------------------------
  // Lets a teacher override how any phonics sound is spoken (text +
  // rate) and instantly test it, since only the teacher can actually
  // hear whether a respelling sounds right on their device/voice.
  const SOUND_KEY = "phonicsLessonBuilder.soundOverrides.v1";

  function loadSoundOverrides() {
    try {
      const raw = localStorage.getItem(SOUND_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function getSoundOverride(label) {
    const all = loadSoundOverrides();
    return all[label] || null;
  }

  function setSoundOverride(label, info) {
    const all = loadSoundOverrides();
    all[label] = info;
    localStorage.setItem(SOUND_KEY, JSON.stringify(all));
  }

  function resetSoundOverride(label) {
    const all = loadSoundOverrides();
    delete all[label];
    localStorage.setItem(SOUND_KEY, JSON.stringify(all));
  }

  function resetAllSoundOverrides() {
    localStorage.removeItem(SOUND_KEY);
  }

  // --- Custom sound recordings (real voice) -------------------------
  // Stores a base64 data: URL per sound label, recorded via the mic
  // (see recorder.js). When present, this takes priority over any
  // text-to-speech respelling/override for that sound.
  const RECORDING_KEY = "phonicsLessonBuilder.soundRecordings.v1";

  function loadSoundRecordings() {
    try {
      const raw = localStorage.getItem(RECORDING_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function getSoundRecording(label) {
    const all = loadSoundRecordings();
    return all[label] || null;
  }

  function setSoundRecording(label, dataUrl) {
    const all = loadSoundRecordings();
    all[label] = dataUrl;
    try {
      localStorage.setItem(RECORDING_KEY, JSON.stringify(all));
      return true;
    } catch (e) {
      // Likely a quota error (localStorage is usually ~5-10MB) - the
      // recording was too long/large to store.
      return false;
    }
  }

  function resetSoundRecording(label) {
    const all = loadSoundRecordings();
    delete all[label];
    localStorage.setItem(RECORDING_KEY, JSON.stringify(all));
  }

  function resetAllSoundRecordings() {
    localStorage.removeItem(RECORDING_KEY);
  }

  global.Storage2 = {
    getWords,
    addWord,
    removeWord,
    getSoundOverride,
    setSoundOverride,
    resetSoundOverride,
    resetAllSoundOverrides,
    getSoundRecording,
    setSoundRecording,
    resetSoundRecording,
    resetAllSoundRecordings
  };
})(typeof window !== "undefined" ? window : globalThis);
