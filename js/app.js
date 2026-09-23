(function () {
  "use strict";

  const levelSelect = document.getElementById("levelSelect");
  const wordInput = document.getElementById("wordInput");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const saveWordBtn = document.getElementById("saveWordBtn");
  const results = document.getElementById("results");
  const levelDescription = document.getElementById("levelDescription");
  const savedWordsList = document.getElementById("savedWordsList");
  const voiceSelect = document.getElementById("voiceSelect");
  const voiceHint = document.getElementById("voiceHint");
  const soundLab = document.getElementById("soundLab");
  const resetAllSoundsBtn = document.getElementById("resetAllSoundsBtn");

  let currentWord = "";

  // Every sound the app can play, with a friendly label for the
  // "Customize Sounds" panel. Grouped so teachers can find one quickly.
  const SOUND_LAB_GROUPS = [
    {
      title: "Stop sounds",
      labels: ["b", "d", "g", "k", "p", "t", "ch", "j", "kw", "ks", "w", "y"]
    },
    {
      title: "Continuant sounds",
      labels: ["f", "l", "m", "n", "r", "s", "v", "z", "sh", "th", "ng", "h"]
    },
    {
      title: "Short vowels",
      labels: ["a", "e", "i", "o", "u"]
    },
    {
      title: "Long vowels & other vowel sounds",
      labels: ["ā", "ē", "ī", "ō", "ū", "oo", "ow", "oy", "aw", "ar", "er", "or"]
    }
  ];

  /** Get the { text, rate } to speak for a sound label, preferring any
   * teacher-saved override over the built-in default. */
  function getSoundSpeech(label) {
    const override = Storage2.getSoundOverride(label);
    return override || PhonicsEngine.soundToSpeech(label);
  }

  /**
   * Play a phonics sound by its label (e.g. "k", "ā", "n"). If the
   * teacher has recorded their own voice for this sound, play that
   * back exactly as recorded - otherwise fall back to text-to-speech.
   * Calls `onDone()` when playback finishes, so sequences (segmenting,
   * blending) can chain sounds one after another.
   */
  function playSoundLabel(label, onDone) {
    const recording = Storage2.getSoundRecording(label);
    if (recording) {
      const audio = new Audio(recording);
      if (onDone) {
        audio.addEventListener("ended", onDone, { once: true });
        audio.addEventListener("error", onDone, { once: true });
      }
      audio.play();
      return;
    }
    const info = getSoundSpeech(label);
    Speech.speakIsolatedSound(info.text, info.rate, onDone);
  }

  /** Play a list of sound labels one after another (mixing recordings
   * and text-to-speech seamlessly), with a short pause between each. */
  function playSoundSequence(labels, index) {
    index = index || 0;
    if (index >= labels.length) return;
    playSoundLabel(labels[index], () => {
      setTimeout(() => playSoundSequence(labels, index + 1), 150);
    });
  }

  function init() {
    Levels.forEach((lvl) => {
      const opt = document.createElement("option");
      opt.value = lvl.id;
      opt.textContent = lvl.label;
      levelSelect.appendChild(opt);
    });
    levelSelect.value = "isolation";
    updateLevelDescription();
    renderSavedWords();
    initVoicePicker();
    initSoundLab();

    levelSelect.addEventListener("change", () => {
      updateLevelDescription();
      renderSavedWords();
      if (currentWord) analyze();
    });
    analyzeBtn.addEventListener("click", analyze);
    saveWordBtn.addEventListener("click", () => {
      if (!currentWord) return;
      Storage2.addWord(levelSelect.value, currentWord);
      renderSavedWords();
    });
    wordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") analyze();
    });
  }

  function initSoundLab() {
    if (!soundLab) return;
    soundLab.innerHTML = "";
    SOUND_LAB_GROUPS.forEach((group) => {
      const heading = document.createElement("h4");
      heading.className = "sound-lab-group-title";
      heading.textContent = group.title;
      soundLab.appendChild(heading);

      group.labels.forEach((label) => {
        soundLab.appendChild(soundLabRow(label));
      });
    });

    if (resetAllSoundsBtn) {
      resetAllSoundsBtn.addEventListener("click", () => {
        if (
          !confirm(
            "This will reset all custom text-to-speech tweaks AND delete all your recorded voice clips. Continue?"
          )
        )
          return;
        Storage2.resetAllSoundOverrides();
        Storage2.resetAllSoundRecordings();
        initSoundLab();
      });
    }
  }

  function soundLabRow(label) {
    const row = document.createElement("div");
    row.className = "sound-lab-row";

    const tag = document.createElement("span");
    tag.className = "sound-lab-label";
    tag.textContent = `/${label}/`;
    row.appendChild(tag);

    const current = getSoundSpeech(label);

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.className = "sound-lab-text";
    textInput.value = current.text;

    const rateInput = document.createElement("input");
    rateInput.type = "number";
    rateInput.className = "sound-lab-rate";
    rateInput.min = "0.5";
    rateInput.max = "1.5";
    rateInput.step = "0.05";
    rateInput.value = current.rate;
    rateInput.title = "Speed";

    const testBtn = document.createElement("button");
    testBtn.className = "play-btn";
    testBtn.textContent = "🔊 Test";
    testBtn.addEventListener("click", () => {
      Speech.speakIsolatedSound(textInput.value, Number(rateInput.value) || 0.85);
    });

    const saveBtn = document.createElement("button");
    saveBtn.className = "secondary-btn";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
      Storage2.setSoundOverride(label, {
        text: textInput.value,
        rate: Number(rateInput.value) || 0.85
      });
      saveBtn.textContent = "Saved ✓";
      setTimeout(() => (saveBtn.textContent = "Save"), 1200);
    });

    const resetBtn = document.createElement("button");
    resetBtn.className = "secondary-btn";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", () => {
      Storage2.resetSoundOverride(label);
      const def = PhonicsEngine.soundToSpeech(label);
      textInput.value = def.text;
      rateInput.value = def.rate;
    });

    row.appendChild(textInput);
    row.appendChild(rateInput);
    row.appendChild(testBtn);
    row.appendChild(saveBtn);
    row.appendChild(resetBtn);
    row.appendChild(recordingControls(label, { textInput, rateInput }));
    return row;
  }

  /** Builds the "record your own voice" controls for one sound-lab row:
   * a status badge, Record/Stop toggle button, Play button (to preview
   * the saved recording), and a Remove button. When a recording exists
   * it takes priority over the TTS text/rate controls next to it. */
  function recordingControls(label, ttsControls) {
    const wrap = document.createElement("span");
    wrap.className = "sound-lab-recording";

    const status = document.createElement("span");
    status.className = "sound-lab-rec-status";

    const recordBtn = document.createElement("button");
    recordBtn.className = "secondary-btn sound-lab-rec-btn";

    const playBtn = document.createElement("button");
    playBtn.className = "play-btn";
    playBtn.textContent = "▶ My voice";

    const removeBtn = document.createElement("button");
    removeBtn.className = "secondary-btn";
    removeBtn.textContent = "Remove voice";

    let activeHandle = null;

    function refresh() {
      const hasRecording = !!Storage2.getSoundRecording(label);
      status.textContent = hasRecording ? "🎙️ Using your voice" : "Using text-to-speech";
      status.classList.toggle("sound-lab-rec-active", hasRecording);
      playBtn.style.display = hasRecording ? "" : "none";
      removeBtn.style.display = hasRecording ? "" : "none";
      if (ttsControls) {
        ttsControls.textInput.disabled = hasRecording;
        ttsControls.rateInput.disabled = hasRecording;
      }
    }

    recordBtn.textContent = "🔴 Record";
    recordBtn.addEventListener("click", () => {
      if (activeHandle) {
        // Currently recording -> stop it.
        activeHandle.stop();
        activeHandle = null;
        recordBtn.textContent = "🔴 Record";
        return;
      }
      if (!Recorder.isSupported()) {
        alert(
          "Recording isn't available here. It needs a microphone and a secure page (works on the live GitHub Pages site)."
        );
        return;
      }
      recordBtn.textContent = "⏹ Stop";
      status.textContent = "Recording… speak the sound now";
      activeHandle = Recorder.record(
        (dataUrl) => {
          activeHandle = null;
          recordBtn.textContent = "🔴 Record";
          if (!Storage2.setSoundRecording(label, dataUrl)) {
            alert("Could not save the recording (it may be too long). Try a shorter recording.");
          }
          refresh();
        },
        (err) => {
          activeHandle = null;
          recordBtn.textContent = "🔴 Record";
          alert("Recording failed: " + err.message);
          refresh();
        }
      );
    });

    playBtn.addEventListener("click", () => {
      const dataUrl = Storage2.getSoundRecording(label);
      if (dataUrl) new Audio(dataUrl).play();
    });

    removeBtn.addEventListener("click", () => {
      Storage2.resetSoundRecording(label);
      refresh();
    });

    wrap.appendChild(status);
    wrap.appendChild(recordBtn);
    wrap.appendChild(playBtn);
    wrap.appendChild(removeBtn);
    refresh();
    return wrap;
  }

  function initVoicePicker() {
    if (!voiceSelect) return;
    Speech.onVoicesReady((voices) => {
      voiceSelect.innerHTML = "";
      const recommended = Speech.recommendedVoice();
      voices.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} (${v.lang})${v === recommended ? " — recommended" : ""}`;
        voiceSelect.appendChild(opt);
      });
      const selected = Speech.getSelectedVoice();
      if (selected) voiceSelect.value = selected.voiceURI;

      if (voiceHint) {
        const hasGhana = voices.some((v) => v.lang.toLowerCase().startsWith("en-gh"));
        voiceHint.textContent = hasGhana
          ? "A Ghanaian English voice was found and selected automatically."
          : "No Ghanaian voice pack was found on this device, so a British English voice (closest to Ghanaian classroom pronunciation) is selected automatically. Pick a different one below if you prefer.";
      }
    });
    voiceSelect.addEventListener("change", () => {
      Speech.setSelectedVoice(voiceSelect.value);
      Speech.speak("Hello, this is how I will sound.");
    });
  }

  function updateLevelDescription() {
    const lvl = currentLevel();
    const descriptions = {
      rhyme:
        "Say the word, isolate the first sound, then brainstorm words that rhyme with it.",
      syllables:
        "Clap once for each syllable chunk while saying the word slowly.",
      isolation:
        "Identify the very first sound, the sound(s) in the middle, and the very last sound.",
      "blend-segment":
        "Stretch the word into its individual sounds (segmenting), then blend them back together.",
      manipulation:
        "Practice adding, deleting, or swapping a sound to build a new word."
    };
    levelDescription.textContent = descriptions[lvl.id] || "";
  }

  function currentLevel() {
    return Levels.find((l) => l.id === levelSelect.value) || Levels[0];
  }

  function analyze() {
    const word = wordInput.value.trim();
    if (!word) {
      results.innerHTML =
        '<p class="hint">Type a word above and press "Analyze" to build the lesson.</p>';
      return;
    }
    currentWord = word.toLowerCase();
    render();
  }

  function render() {
    const lvl = currentLevel();
    const word = currentWord;
    results.innerHTML = "";

    if (lvl.skills.includes("rhyme")) results.appendChild(renderRhymeCard(word));
    if (
      lvl.skills.includes("isolation-first") &&
      !lvl.skills.includes("isolation-middle")
    ) {
      results.appendChild(renderIsolationCard(word, ["first"]));
    }
    if (lvl.skills.includes("syllables"))
      results.appendChild(renderSyllableCard(word));
    if (
      lvl.skills.includes("isolation-first") &&
      lvl.skills.includes("isolation-middle")
    ) {
      results.appendChild(renderIsolationCard(word, ["first", "middle", "last"]));
    }
    if (lvl.skills.includes("segmentation"))
      results.appendChild(renderSegmentationCard(word));
    if (lvl.skills.includes("blending"))
      results.appendChild(renderBlendingCard(word));
    if (lvl.skills.includes("manipulation"))
      results.appendChild(renderManipulationCard(word));
  }

  function card(title) {
    const el = document.createElement("div");
    el.className = "card";
    const h = document.createElement("h3");
    h.textContent = title;
    el.appendChild(h);
    return el;
  }

  /** Play a phonics "sound label" (e.g. "k", "ā") - recorded voice if
   * the teacher saved one, otherwise text-to-speech. */
  function speakSound(soundLabel) {
    playSoundLabel(soundLabel);
  }

  function soundBubble(phoneme) {
    const span = document.createElement("span");
    span.className = "bubble";
    span.innerHTML = `<span class="bubble-letters">${phoneme.text}</span><span class="bubble-sound">/${phoneme.sound}/</span>`;
    span.title = "Click to hear this sound";
    span.addEventListener("click", () => speakSound(phoneme.sound));
    return span;
  }

  function playButton(label, onClick) {
    const btn = document.createElement("button");
    btn.className = "play-btn";
    btn.textContent = "🔊 " + label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function renderIsolationCard(word, which) {
    const c = card("Sound Isolation");
    const iso = PhonicsEngine.isolateSounds(word);
    const wordRow = document.createElement("div");
    wordRow.className = "word-row";
    wordRow.appendChild(playButton("Say the word", () => Speech.speak(word)));
    c.appendChild(wordRow);

    const grid = document.createElement("div");
    grid.className = "iso-grid";

    if (which.includes("first")) {
      grid.appendChild(isoBlock("First Sound", iso.first ? [iso.first] : []));
    }
    if (which.includes("middle")) {
      grid.appendChild(isoBlock("Middle Sound(s)", iso.middle));
    }
    if (which.includes("last")) {
      grid.appendChild(isoBlock("Last Sound", iso.last ? [iso.last] : []));
    }
    c.appendChild(grid);
    return c;
  }

  function isoBlock(label, phonemes) {
    const wrap = document.createElement("div");
    wrap.className = "iso-block";
    const l = document.createElement("div");
    l.className = "iso-label";
    l.textContent = label;
    wrap.appendChild(l);

    const b = document.createElement("div");
    b.className = "iso-value";
    if (phonemes.length === 0) {
      b.textContent = "(none - word is very short)";
    } else {
      phonemes.forEach((p) => {
        const unit = document.createElement("span");
        unit.className = "sound-unit";
        unit.innerHTML = `<span class="sound-letters">${p.text}</span><span class="sound-phoneme">/${p.sound}/</span>`;
        unit.title = "Click to hear";
        unit.addEventListener("click", () => speakSound(p.sound));
        b.appendChild(unit);
      });
    }
    wrap.appendChild(b);
    return wrap;
  }

  function renderSyllableCard(word) {
    const c = card("Syllables (clap for each part)");
    const syllables = PhonicsEngine.getSyllables(word);
    const row = document.createElement("div");
    row.className = "syllable-row";
    syllables.forEach((s) => {
      const chip = document.createElement("span");
      chip.className = "syllable-chip";
      chip.textContent = s;
      chip.addEventListener("click", () => Speech.speak(s));
      row.appendChild(chip);
    });
    c.appendChild(row);
    const count = document.createElement("p");
    count.className = "hint";
    count.textContent = `${syllables.length} syllable${
      syllables.length === 1 ? "" : "s"
    } — clap it out!`;
    c.appendChild(count);
    c.appendChild(
      playButton("Say it slowly, syllable by syllable", () =>
        Speech.speakSounds(syllables)
      )
    );
    return c;
  }

  function renderSegmentationCard(word) {
    const c = card("Sound Segmentation (Elkonin boxes)");
    const phonemes = PhonicsEngine.getPhonemes(word);
    const row = document.createElement("div");
    row.className = "box-row";
    phonemes.forEach((p) => {
      const box = document.createElement("div");
      box.className = "sound-box" + (p.silent ? " sound-box-silent" : "");
      box.innerHTML = p.silent
        ? `<span class="sound-letters">${p.text}</span>`
        : `<span class="sound-letters">${p.text}</span><span class="sound-phoneme">/${p.sound}/</span>`;
      if (!p.silent) {
        box.title = "Click to hear";
        box.addEventListener("click", () => speakSound(p.sound));
      } else {
        box.title = "Silent letter - not pronounced";
      }
      row.appendChild(box);
    });
    c.appendChild(row);
    c.appendChild(
      playButton("Segment it (stretch each sound)", () =>
        playSoundSequence(phonemes.filter((p) => !p.silent).map((p) => p.sound))
      )
    );
    return c;
  }

  function renderBlendingCard(word) {
    const c = card("Sound Blending");
    const phonemes = PhonicsEngine.getPhonemes(word).filter((p) => !p.silent);
    const row = document.createElement("div");
    row.className = "box-row";
    phonemes.forEach((p) => row.appendChild(soundBubble(p)));
    c.appendChild(row);
    const btnRow = document.createElement("div");
    btnRow.className = "btn-row";
    btnRow.appendChild(
      playButton("Play sounds separately", () =>
        playSoundSequence(phonemes.map((p) => p.sound))
      )
    );
    btnRow.appendChild(
      playButton("Blend into the whole word", () => Speech.speak(word))
    );
    c.appendChild(btnRow);
    return c;
  }

  function renderRhymeCard(word) {
    const c = card("Rhyme Time");
    const rime = PhonicsEngine.getRime(word);
    const p = document.createElement("p");
    p.innerHTML = `Onset: <strong>${rime.onset || "(none)"}</strong> &nbsp;|&nbsp; Rime: <strong>${rime.rime}</strong>`;
    c.appendChild(p);
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = `Ask: "What other words end in -${rime.rime}?" (e.g. change the first sound to make a new rhyme)`;
    c.appendChild(hint);
    c.appendChild(playButton("Say the word", () => Speech.speak(word)));
    return c;
  }

  function renderManipulationCard(word) {
    const c = card("Sound Manipulation");
    const list = document.createElement("div");
    list.className = "manip-list";

    const noFirst = PhonicsEngine.deleteFirstSound(word);
    const noLast = PhonicsEngine.deleteLastSound(word);

    list.appendChild(
      manipRow(
        `Remove the first sound from "${word}"`,
        noFirst || "(too short)",
        noFirst
      )
    );
    list.appendChild(
      manipRow(
        `Remove the last sound from "${word}"`,
        noLast || "(too short)",
        noLast
      )
    );

    const subInput = document.createElement("input");
    subInput.type = "text";
    subInput.maxLength = 3;
    subInput.placeholder = "new first sound";
    subInput.className = "manip-input";
    const subRow = document.createElement("div");
    subRow.className = "manip-row";
    const subLabel = document.createElement("span");
    subLabel.textContent = `Swap the first sound of "${word}" for: `;
    const subResult = document.createElement("span");
    subResult.className = "manip-result";
    subRow.appendChild(subLabel);
    subRow.appendChild(subInput);
    subRow.appendChild(subResult);
    const subPlay = playButton("Hear it", () => {
      const val = subInput.value.trim().toLowerCase();
      if (!val) return;
      const newWord = PhonicsEngine.substituteFirstSound(word, val);
      subResult.textContent = "→ " + newWord;
      Speech.speak(newWord);
    });
    subRow.appendChild(subPlay);
    list.appendChild(subRow);

    c.appendChild(list);
    return c;
  }

  function manipRow(label, resultText, speakText) {
    const row = document.createElement("div");
    row.className = "manip-row";
    const l = document.createElement("span");
    l.textContent = label + ": ";
    const r = document.createElement("span");
    r.className = "manip-result";
    r.textContent = resultText;
    row.appendChild(l);
    row.appendChild(r);
    if (speakText) {
      row.appendChild(playButton("Hear it", () => Speech.speak(speakText)));
    }
    return row;
  }

  function renderSavedWords() {
    const words = Storage2.getWords(levelSelect.value);
    savedWordsList.innerHTML = "";
    if (words.length === 0) {
      const li = document.createElement("li");
      li.className = "hint";
      li.textContent = "No saved words yet for this level.";
      savedWordsList.appendChild(li);
      return;
    }
    words.forEach((w) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "word-chip";
      btn.textContent = w;
      btn.addEventListener("click", () => {
        wordInput.value = w;
        analyze();
      });
      const del = document.createElement("button");
      del.className = "word-del";
      del.textContent = "✕";
      del.title = "Remove";
      del.addEventListener("click", () => {
        Storage2.removeWord(levelSelect.value, w);
        renderSavedWords();
      });
      li.appendChild(btn);
      li.appendChild(del);
      savedWordsList.appendChild(li);
    });
  }

  init();
})();
