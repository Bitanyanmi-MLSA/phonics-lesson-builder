/*
 * Level definitions for the dropdown. Ages are approximate guides for
 * early-childhood phonemic awareness progression (simple -> complex).
 */
(function (global) {
  "use strict";

  const LEVELS = [
    {
      id: "rhyme",
      label: "Level 1 (Ages 3-4): Rhyming & First Sounds",
      skills: ["rhyme", "isolation-first"]
    },
    {
      id: "syllables",
      label: "Level 2 (Ages 4-5): Syllable Clapping",
      skills: ["syllables"]
    },
    {
      id: "isolation",
      label: "Level 3 (Ages 5-6): Sound Isolation (First / Middle / Last)",
      skills: ["isolation-first", "isolation-middle", "isolation-last"]
    },
    {
      id: "blend-segment",
      label: "Level 4 (Ages 6-7): Blending & Segmenting Sounds",
      skills: ["segmentation", "blending"]
    },
    {
      id: "manipulation",
      label: "Level 5 (Ages 7-8): Sound Manipulation (Add / Delete / Swap)",
      skills: ["manipulation"]
    }
  ];

  global.Levels = LEVELS;
})(typeof window !== "undefined" ? window : globalThis);
