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

  global.Storage2 = { getWords, addWord, removeWord };
})(typeof window !== "undefined" ? window : globalThis);
