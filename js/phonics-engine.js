/*
 * Phonics Engine
 * -----------------
 * Rule-based grapheme/phoneme analysis for English words, tuned for
 * early-childhood phonics instruction (ages 3-8). This is NOT a full IPA
 * transcriber — it chunks spelling into the "sound units" (phonograms)
 * used in classroom phonics: digraphs (sh, ch, th), vowel teams (ai, oa),
 * silent-e, r-controlled vowels, etc. Good enough for CVC/CVCC/CVCe words
 * and common multisyllabic classroom vocabulary.
 *
 * Exposed as a global `PhonicsEngine` object (works in <script> tags) and
 * also as a CommonJS export for quick node-based testing.
 */
(function (global) {
  "use strict";

  const VOWELS = "aeiouy";
  const PLAIN_VOWEL_TEXT = new Set(["a", "e", "i", "o", "u"]);
  const RCONTROLLED = new Set(["ar", "er", "ir", "or", "ur"]);

  // Multi-letter graphemes that represent a single sound, longest first.
  const MULTI_GRAPHEMES = [
    "eigh", "tch", "dge", "igh",
    "sh", "ch", "th", "ph", "wh", "ck", "ng", "qu", "mb",
    "ai", "ay", "ee", "ea", "oa", "oe", "ow", "ou",
    "oo", "oi", "oy", "ar", "er", "ir", "or", "ur",
    "ie", "ue", "ei", "ey", "au", "aw", "kn", "wr", "gn"
  ];

  // Simple 1-sound-per-letter consonants that never change sound.
  const SIMPLE_CONSONANT_SOUND = {
    b: "b", d: "d", f: "f", h: "h", j: "j", k: "k", l: "l", m: "m",
    n: "n", p: "p", r: "r", s: "s", t: "t", v: "v", w: "w", z: "z"
  };

  // Multi-letter graphemes with a fixed sound (no context needed).
  const FIXED_GRAPHEME_SOUND = {
    sh: "sh", ng: "ng", qu: "kw", ck: "k", tch: "ch", dge: "j",
    ph: "f", wh: "w", kn: "n", wr: "r", gn: "n", mb: "m",
    ai: "ā", ay: "ā", oa: "ō", oe: "ō", igh: "ī",
    oi: "oy", oy: "oy", au: "aw", aw: "aw", ue: "oo",
    ar: "ar", er: "er", ir: "er", ur: "er", or: "or"
  };

  // Words where "g"/"c" stay HARD even though followed by e/i/y
  // (breaks the usual soft-c/soft-g-before-e-i-y rule).
  const HARD_G_EXCEPTIONS = new Set([
    "get", "give", "girl", "gift", "gear", "tiger", "forget", "together",
    "anger", "finger", "linger", "hunger", "longer", "stronger", "younger",
    "eager", "target", "burger", "tigers"
  ]);
  const HARD_C_EXCEPTIONS = new Set(["soccer"]);

  // Common sight/function words where "th" is voiced (this bundles both
  // voiced/voiceless th under one label pair for classroom simplicity).
  const VOICED_TH_WORDS = new Set([
    "the", "this", "that", "these", "those", "they", "their", "them",
    "then", "than", "there", "though", "thus", "mother", "father",
    "brother", "other", "another", "together", "weather", "feather",
    "bathe", "breathe", "smooth", "with", "clothes", "rather", "gather",
    "whether", "leather", "either", "neither", "further", "worthy"
  ]);

  // "ch" that sounds like /k/ or /sh/ instead of the usual /ch/.
  const CH_AS_K_WORDS = new Set([
    "school", "chorus", "christmas", "chemist", "chemistry", "echo",
    "stomach", "character", "chaos", "chord", "ache", "anchor", "orchid"
  ]);
  const CH_AS_SH_WORDS = new Set([
    "chef", "chic", "machine", "chalet", "chute", "brochure", "parachute"
  ]);

  // "ea" that sounds short /e/ instead of the usual long /ē/.
  const EA_SHORT_WORDS = new Set([
    "bread", "head", "dead", "lead", "spread", "thread", "tread", "dread",
    "sweat", "sweater", "feather", "weather", "leather", "heather",
    "breath", "health", "wealth", "wealthy", "meant", "dealt",
    "breakfast", "heavy", "ready", "already", "instead", "pleasant",
    "treasure", "measure", "pleasure", "weapon", "jealous"
  ]);

  // "ow" that's a diphthong /ow/ (cow, how) instead of long /ō/ (snow, grow).
  const OW_DIPHTHONG_WORDS = new Set([
    "cow", "how", "now", "down", "town", "brown", "crown", "frown",
    "clown", "gown", "owl", "howl", "growl", "prowl", "power", "tower",
    "flower", "shower", "crowd", "allow", "plow", "vowel", "towel"
  ]);

  // "ou" exceptions - default is the /ow/ diphthong (out, loud, house).
  const OU_AS_OO_WORDS = new Set(["soup", "group", "you", "youth", "wound", "route", "through"]);
  const OU_AS_SHORT_U_WORDS = new Set([
    "would", "could", "should", "young", "touch", "country", "double",
    "trouble", "cousin", "famous", "enough", "rough", "tough", "couple"
  ]);

  // "ey" exceptions - default is long /ē/ (key, monkey, honey).
  const EY_AS_LONG_A_WORDS = new Set([
    "they", "hey", "obey", "prey", "survey", "convey", "grey"
  ]);

  // "ei" exceptions - default is long /ē/ (receive, either, ceiling).
  const EI_AS_LONG_A_WORDS = new Set([
    "eight", "weigh", "weight", "vein", "veil", "reindeer", "neighbor",
    "neighbour", "sleigh", "freight", "eighty"
  ]);
  const EI_AS_LONG_I_WORDS = new Set(["height"]);

  /**
   * Split a word into "phonogram" chunks (approximate phonemes), each
   * carrying both the written grapheme (`text`) and the spoken sound
   * (`sound`), e.g. the letter "c" in "cut" has text "c" but sound "k".
   * Silent letters (e.g. the "e" in "cake", the "k" in "knee") are
   * flagged with silent:true and have no `sound`.
   */
  function getPhonemes(word) {
    const w = word.toLowerCase().replace(/[^a-z']/g, "");
    if (!w) return [];

    const chunks = [];
    let i = 0;
    while (i < w.length) {
      let matched = null;
      for (const g of MULTI_GRAPHEMES) {
        if (w.startsWith(g, i)) {
          matched = g;
          break;
        }
      }
      if (matched) {
        chunks.push({ text: matched, start: i, end: i + matched.length, silent: false });
        i += matched.length;
      } else {
        chunks.push({ text: w[i], start: i, end: i + 1, silent: false });
        i += 1;
      }
    }

    // Mark silent final "e" (CVCe pattern), e.g. cake, bike, cute, home.
    // Exception: consonant+"le" endings (apple, table, little) - that "e"
    // carries the final syllable's sound, so it stays audible.
    let magicE = false;
    if (chunks.length >= 2 && !/[^aeiouy]le$/.test(w)) {
      const last = chunks[chunks.length - 1];
      if (last.text === "e") {
        const hasEarlierVowel = chunks
          .slice(0, -1)
          .some((c) => isVowelChunk(c.text));
        if (hasEarlierVowel) {
          last.silent = true;
          // "Magic e" only lengthens the vowel when exactly ONE consonant
          // sits between that vowel and the final e (cake, not little).
          const beforeLast = chunks.slice(0, -1);
          const lastVowelIdx = [...beforeLast].reverse().findIndex((c) => isVowelChunk(c.text));
          if (lastVowelIdx !== -1) {
            const idx = beforeLast.length - 1 - lastVowelIdx;
            const consonantsBetween = beforeLast.length - 1 - idx;
            const vowelChunk = beforeLast[idx];
            if (consonantsBetween === 1 && !RCONTROLLED.has(vowelChunk.text)) {
              magicE = true;
              vowelChunk._magicE = true;
            }
          }
        }
      }
    }

    // Mark silent "k"/"w"/"g" in kn/wr/gn (already single chunks) and
    // silent "b" in "mb" - handled directly by FIXED_GRAPHEME_SOUND.

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      if (chunk.silent) continue;
      chunk.sound = computeSound(chunk, chunks, idx, w);
      delete chunk._magicE;
    }

    return chunks;
  }

  /** Work out the spoken sound for one grapheme chunk, using context. */
  function computeSound(chunk, chunks, idx, word) {
    const text = chunk.text;
    const nextChar = word[chunk.end] || "";

    // --- Fixed multi-letter graphemes -------------------------------
    if (text === "th") {
      chunk.voiced = VOICED_TH_WORDS.has(word);
      return "th";
    }
    if (Object.prototype.hasOwnProperty.call(FIXED_GRAPHEME_SOUND, text)) {
      return FIXED_GRAPHEME_SOUND[text];
    }
    if (text === "ch") {
      if (CH_AS_K_WORDS.has(word)) return "k";
      if (CH_AS_SH_WORDS.has(word)) return "sh";
      return "ch";
    }
    if (text === "ee") return "ē";
    if (text === "ea") return EA_SHORT_WORDS.has(word) ? "e" : "ē";
    if (text === "oo") return "oo";
    if (text === "ow") return OW_DIPHTHONG_WORDS.has(word) ? "ow" : "ō";
    if (text === "ou") {
      if (OU_AS_OO_WORDS.has(word)) return "oo";
      if (OU_AS_SHORT_U_WORDS.has(word)) return "u";
      return "ow";
    }
    if (text === "ey") return EY_AS_LONG_A_WORDS.has(word) ? "ā" : "ē";
    if (text === "eigh") return EI_AS_LONG_I_WORDS.has(word) ? "ī" : "ā";
    if (text === "ei") {
      if (EI_AS_LONG_A_WORDS.has(word)) return "ā";
      if (EI_AS_LONG_I_WORDS.has(word)) return "ī";
      return "ē";
    }
    if (text === "ie") {
      const isWordFinal = chunk.end === word.length;
      return isWordFinal ? "ī" : "ē";
    }

    // --- Simple consonants -------------------------------------------
    if (Object.prototype.hasOwnProperty.call(SIMPLE_CONSONANT_SOUND, text)) {
      return SIMPLE_CONSONANT_SOUND[text];
    }

    // --- Context-sensitive consonants ---------------------------------
    if (text === "c") {
      const isSoft = nextChar !== "" && "eiy".includes(nextChar) && !HARD_C_EXCEPTIONS.has(word);
      return isSoft ? "s" : "k";
    }
    if (text === "g") {
      const isSoft = nextChar !== "" && "eiy".includes(nextChar) && !HARD_G_EXCEPTIONS.has(word);
      return isSoft ? "j" : "g";
    }
    if (text === "x") {
      return chunk.start === 0 ? "z" : "ks";
    }
    if (text === "y") {
      const isWordInitial = chunk.start === 0;
      if (isWordInitial) return "y";
      const isWordFinal = chunk.end === word.length;
      if (!isWordFinal) return "i"; // e.g. gym, myth
      const vowelGroups = countVowelGroups(word);
      return vowelGroups <= 1 ? "ī" : "ē"; // fly vs. happy
    }

    // --- Plain vowels ---------------------------------------------------
    if (PLAIN_VOWEL_TEXT.has(text)) {
      if (chunk._magicE) {
        return { a: "ā", e: "ē", i: "ī", o: "ō", u: "ū" }[text];
      }
      return text; // short vowel sound, same as the letter
    }

    return text; // fallback - shouldn't normally hit this
  }

  /** Count vowel groups in a word (consecutive vowel letters = 1 group). */
  function countVowelGroups(w) {
    let count = 0;
    let i = 0;
    while (i < w.length) {
      if (VOWELS.includes(w[i])) {
        count++;
        while (i < w.length && VOWELS.includes(w[i])) i++;
      } else {
        i++;
      }
    }
    return count;
  }

  function isVowelChunk(text) {
    return VOWELS.includes(text[0]);
  }

  /**
   * Isolation: first sound, last (audible) sound, and the "middle" sound(s).
   * For simple 3-phoneme words the middle sound is the vowel; for longer
   * words we return every sound between the first and last as "middle".
   */
  function isolateSounds(word) {
    const phonemes = getPhonemes(word).filter((p) => !p.silent);
    if (phonemes.length === 0) return { first: null, middle: [], last: null };
    if (phonemes.length === 1) {
      return { first: phonemes[0], middle: [], last: phonemes[0] };
    }
    const first = phonemes[0];
    const last = phonemes[phonemes.length - 1];
    const middle = phonemes.slice(1, phonemes.length - 1);
    return { first, middle, last };
  }

  /**
   * Very small heuristic syllable splitter using vowel-group counting and
   * standard VC/CV, V/CV division rules, with silent-e merging.
   */
  function getSyllables(word) {
    const w = word.toLowerCase().replace(/[^a-z']/g, "");
    if (!w) return [];

    // Locate vowel groups (consecutive vowel letters = 1 group).
    const groups = [];
    let i = 0;
    while (i < w.length) {
      if (VOWELS.includes(w[i])) {
        let j = i;
        while (j < w.length && VOWELS.includes(w[j])) j++;
        groups.push([i, j - 1]);
        i = j;
      } else {
        i++;
      }
    }

    if (groups.length <= 1) return [w];

    // Consonant + "le" endings (apple, table, little, purple) form their
    // own syllable - the "e" is NOT silent in the CVCe sense here, so we
    // must not merge it away.
    const isConsonantLeEnding = /[^aeiouy]le$/.test(w);

    // Silent trailing "e": drop its vowel group before splitting so it
    // merges into the previous syllable (cake -> "cake", not "ca-ke").
    const lastGroup = groups[groups.length - 1];
    const isTrailingSilentE =
      !isConsonantLeEnding &&
      lastGroup[0] === lastGroup[1] &&
      w[lastGroup[0]] === "e" &&
      lastGroup[1] === w.length - 1 &&
      groups.length > 1;
    if (isTrailingSilentE) groups.pop();
    if (groups.length <= 1) return [w];

    const boundaries = [];
    for (let g = 0; g < groups.length - 1; g++) {
      const vowelEnd = groups[g][1];
      const nextVowelStart = groups[g + 1][0];
      const consonants = nextVowelStart - vowelEnd - 1;

      if (consonants <= 0) {
        // Vowels touching (rare after grouping) - split right between them.
        boundaries.push(vowelEnd + 1);
      } else if (consonants === 1) {
        // V/CV - single consonant goes with the following syllable.
        boundaries.push(vowelEnd + 1);
      } else {
        // VC/CV (or more) - split before the last consonant, unless the
        // final two consonants form a digraph, or this is the final
        // "consonant + le" syllable (apple, table) - those stay together.
        const seg = w.slice(vowelEnd + 1, nextVowelStart);
        const lastTwo = seg.slice(-2);
        const digraphs = ["sh", "ch", "th", "ck", "ng", "ph", "wh"];
        const isFinalCle =
          g === groups.length - 2 && isConsonantLeEnding && lastTwo.endsWith("l");
        const splitAt =
          digraphs.includes(lastTwo) || isFinalCle
            ? nextVowelStart - 2
            : nextVowelStart - 1;
        boundaries.push(Math.max(splitAt, vowelEnd + 1));
      }
    }

    const syllables = [];
    let start = 0;
    for (const b of boundaries) {
      syllables.push(w.slice(start, b));
      start = b;
    }
    syllables.push(w.slice(start));
    return syllables.filter((s) => s.length > 0);
  }

  /** Remove the first audible sound from a word's phoneme list. */
  function deleteFirstSound(word) {
    const phonemes = getPhonemes(word);
    const audible = phonemes.filter((p) => !p.silent);
    if (audible.length <= 1) return "";
    return phonemes
      .slice(phonemes.indexOf(audible[0]) + 1)
      .map((p) => p.text)
      .join("");
  }

  /** Remove the last audible sound from a word's phoneme list. */
  function deleteLastSound(word) {
    const phonemes = getPhonemes(word);
    const audible = phonemes.filter((p) => !p.silent);
    if (audible.length <= 1) return "";
    const lastAudibleIndex = phonemes.lastIndexOf(audible[audible.length - 1]);
    return phonemes
      .slice(0, lastAudibleIndex)
      .map((p) => p.text)
      .join("");
  }

  /** Replace the first sound with a new letter/blend (for substitution drills). */
  function substituteFirstSound(word, newSound) {
    const rest = deleteFirstSound(word);
    return `${newSound}${rest}`;
  }

  /** Identify the "rime" (vowel + everything after) for rhyme practice. */
  function getRime(word) {
    const w = word.toLowerCase().replace(/[^a-z']/g, "");
    for (let i = 0; i < w.length; i++) {
      if (VOWELS.includes(w[i])) {
        return { onset: w.slice(0, i), rime: w.slice(i) };
      }
    }
    return { onset: "", rime: w };
  }

  // TTS-friendly respellings for each sound label, designed around real
  // articulatory phonetics rather than just "letter + schwa":
  //
  // - STOP consonants (b,d,g,k,p,t,ch,j,kw) are physically impossible to
  //   hear in true isolation - the vocal tract must release into a vowel
  //   to be audible at all. We keep the smallest possible release vowel
  //   and speak it FAST (rate > 1) so the "uh" is clipped as short as
  //   possible, closer to how reading-science programs teach these
  //   sounds ("quick kuh", not a drawn-out "kuuuh").
  // - CONTINUANT consonants (f,l,m,n,r,s,v,z,sh,th,ng,h) CAN be held and
  //   heard on their own, so we spell them as a held/repeated sound
  //   (e.g. "fff", "sss", "mmm") and speak them SLOWLY - this is much
  //   closer to the true isolated phoneme than any letter-plus-vowel
  //   spelling, and avoids being misread as a spelled-out abbreviation.
  // - Vowels use real, unambiguous English words/interjections (ah, ee,
  //   oh, ow, oy...) that every voice reads the same way, so nothing
  //   here can be mistaken for a different word or a letter name.
  const SOUND_TO_SPEECH = {
    // Stop consonants / affricates - fast, clipped release.
    b: { text: "buh", rate: 1.25 },
    d: { text: "duh", rate: 1.25 },
    g: { text: "guh", rate: 1.25 },
    k: { text: "kuh", rate: 1.25 },
    p: { text: "puh", rate: 1.25 },
    t: { text: "tuh", rate: 1.25 },
    ch: { text: "chuh", rate: 1.2 },
    j: { text: "juh", rate: 1.2 },
    kw: { text: "kwuh", rate: 1.15 },
    ks: { text: "ks", rate: 0.9 },
    w: { text: "wuh", rate: 1.05 },
    y: { text: "yuh", rate: 1.05 },

    // Continuants - held, slow, no added vowel needed to be audible.
    f: { text: "fff", rate: 0.7 },
    l: { text: "lll", rate: 0.7 },
    m: { text: "mmm", rate: 0.7 },
    n: { text: "nnn", rate: 0.7 },
    r: { text: "rrr", rate: 0.7 },
    s: { text: "sss", rate: 0.7 },
    v: { text: "vvv", rate: 0.7 },
    z: { text: "zzz", rate: 0.7 },
    sh: { text: "shh", rate: 0.7 },
    th: { text: "thh", rate: 0.7 },
    ng: { text: "ing", rate: 0.7 },
    h: { text: "hhh", rate: 0.7 },

    // Vowels - real words/interjections every voice reads consistently.
    a: { text: "ah", rate: 0.85 },
    e: { text: "eh", rate: 0.85 },
    i: { text: "ih", rate: 0.85 },
    o: { text: "aw", rate: 0.85 },
    u: { text: "uh", rate: 0.85 },
    "ā": { text: "ay", rate: 0.85 },
    "ē": { text: "ee", rate: 0.85 },
    "ī": { text: "eye", rate: 0.85 },
    "ō": { text: "oh", rate: 0.85 },
    "ū": { text: "you", rate: 0.85 },
    oo: { text: "oo", rate: 0.85 },
    ow: { text: "ow", rate: 0.85 },
    oy: { text: "oy", rate: 0.85 },
    aw: { text: "aw", rate: 0.85 },
    ar: { text: "ar", rate: 0.85 },
    er: { text: "er", rate: 0.85 },
    or: { text: "or", rate: 0.85 }
  };

  /** Convert a sound label (e.g. "k", "ā") into { text, rate } for the
   * speech synthesizer, so it says the actual phoneme (e.g. a clipped
   * "kuh") instead of the letter name (e.g. "see" for the letter "c"). */
  function soundToSpeech(soundLabel) {
    return SOUND_TO_SPEECH[soundLabel] || { text: soundLabel, rate: 0.85 };
  }

  const api = {
    getPhonemes,
    isolateSounds,
    getSyllables,
    deleteFirstSound,
    deleteLastSound,
    substituteFirstSound,
    getRime,
    soundToSpeech
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.PhonicsEngine = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
