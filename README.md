# Phonics Lesson Builder

A lightweight, offline web app for delivering phonemic awareness lessons to
children ages 3–8. Type any word and the app automatically generates:

- **Sound Isolation** – first, middle, and last sounds
- **Syllables** – broken into clappable chunks
- **Sound Segmentation** – Elkonin-style sound boxes
- **Sound Blending** – hear individual sounds, then the whole word
- **Rhyming** – onset/rime breakdown for rhyme practice
- **Sound Manipulation** – delete/add/swap sounds to build new words
- **Customize Sounds** – fine-tune exactly how any sound is spoken and
  test it instantly, right on your own device/voice

## How to use

1. Double-click `index.html` to open it in any browser (Chrome/Edge
   recommended for best text-to-speech voices). No install, no internet
   required after the page loads.
2. Pick a **Lesson Level** from the dropdown — each level unlocks a
   different set of activities:
   - Rhyming & First Sounds
   - Syllable Clapping
   - Sound Isolation (First/Middle/Last)
   - Blending & Segmenting
   - Sound Manipulation
3. Type a word and press **Analyze** (or Enter). The app builds the whole
   lesson for you — you only ever need to supply the word.
4. Click any sound bubble, syllable chip, or "🔊 Play" button to hear it
   spoken aloud — great for projecting on a screen for the class.
5. Click **💾 Save to Word List** to keep a running list of words for that
   level (saved in the browser, so it's ready next time you open the app on
   this computer).
6. If a sound doesn't sound right on your device or voice (text-to-speech
   varies by browser/OS), open **🔧 Customize Sounds** at the bottom,
   edit the respelling and/or speed for that sound, click **🔊 Test**
   until it sounds right, then **Save** — it's remembered on this
   computer from then on. **Reset** puts one sound back to the default;
   **Reset All to Defaults** clears every custom sound.

## Notes on accuracy

The sound/syllable breakdown uses classroom-style phonics rules (digraphs
like `sh`/`ch`/`th`, vowel teams like `ai`/`oa`, silent final "e", and
consonant+"le" endings like *apple*/*table*). It's tuned for common
early-childhood vocabulary. For unusual or very advanced words, you can
always double check with your own pronunciation before presenting to
students.

Every sound bubble/box shows the **written letter(s)** on top and the
**actual spoken phoneme** in slashes underneath (e.g. "c" → `/k/` in
*cut*, "c" → `/s/` in *city*, "g" → `/j/` in *gem*). Context rules handle
the common cases: soft/hard `c` and `g`, `x` as `/ks/` or `/z/`, silent
letters (`kn`, `wr`, `gn`, `mb`, silent final "e"), and long vs. short
vowels. (Fixed: word-final `c`/`g` — as in *dog*, *pig*, *bag*, *music*,
*attic* — used to be wrongly detected as "soft" due to a blank-string
edge case; they now correctly stay hard `/g/`/`/k/` unless truly
followed by `e`/`i`/`y` within the word.)

## Voice and pronunciation

- **Reading voice**: browsers don't ship a Ghanaian-English voice pack,
  so the app automatically checks for one and, if none is found, falls
  back to a **British English** voice (`en-GB`) since Ghanaian schools
  follow British English conventions. Use the **Reading Voice** dropdown
  to try every voice installed on your computer and pick whichever
  sounds closest to how you want the lessons read aloud — your choice is
  remembered for next time.
- **Real phonemes, not spelled-out letters**: when you click a sound, the
  app doesn't just say the letter (which could be misread as its
  alphabet name, e.g. "c" → "see"). It uses articulation-aware playback:
  - **Continuant sounds** you can hold on their own (`f`, `l`, `m`, `n`,
    `r`, `s`, `v`, `z`, `sh`, `th`, `ng`, `h`) are spoken as a held sound
    (e.g. "sss", "mmm") at a slower rate — this is genuinely how those
    sounds work, with no added vowel needed. (`n` is the one exception:
    "nnn" was often misread by TTS engines as spelled-out letter names,
    so it uses a brief, slow "nuh" release instead.)
  - **Stop sounds** (`b`, `d`, `g`, `k`, `p`, `t`, `ch`, `j`) can't be
    heard at all without a release into a vowel — that's basic
    articulatory phonetics, not a workaround — so the app uses the
    smallest possible release and speaks it *fast* to keep it clipped,
    matching how reading-science programs teach these sounds (a quick
    "kuh", never a drawn-out one).
  - **Short vowels** (`a`, `e`, `i`, `o`, `u`) are spoken as short
    interjections — *ah, ehh, ihh, aw, uh* — read consistently by every
    voice without being mistaken for a spelled-out letter name. (`i`
    uses "ihh" rather than "ih", which some engines auto-corrected to
    the pronoun "I" - sounding like the long-i vowel instead.)

    Simple concrete nouns with one crisp final consonant avoid pitfalls
    1-3, since they're always spoken in full, stressed form.
  - **Isolated sounds vs. whole words are pitched differently**: every
    single-sound click (isolation, segmentation, blending) is spoken at
    a noticeably higher pitch than "Say the word" playback, so a sound
    demo never sounds like it's just saying the whole word out loud -
    important because vowel sounds are respelled using real short
    words, which could otherwise coincide with the actual word being
    taught.

## Folder structure

```
PhonicsLessonBuilder/
├── index.html          Main app page
├── css/style.css        Kid-friendly styling
└── js/
    ├── phonics-engine.js  Core word analysis (syllables, phonemes, isolation)
    ├── speech.js          Text-to-speech via the browser's Web Speech API
    ├── storage.js         Saves word lists locally per level
    ├── levels.js          The 5 lesson levels shown in the dropdown
    └── app.js             UI wiring
```
