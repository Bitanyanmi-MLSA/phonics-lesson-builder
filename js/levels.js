/*
 * Level definitions for the dropdown. Ages are approximate guides for
 * early-childhood phonemic awareness progression (simple -> complex).
 */
(function (global) {
  "use strict";

  const LEVELS = [
    {
      id: "rhyme",
      label: "Rhyming & First Sounds",
      skills: ["rhyme", "isolation-first"]
    },
    {
      id: "syllables",
      label: "Syllable Clapping",
      skills: ["syllables"]
    },
    {
      id: "isolation",
      label: "Sound Isolation (First / Middle / Last)",
      skills: ["isolation-first", "isolation-middle", "isolation-last"]
    },
    {
      id: "blend-segment",
      label: "Blending & Segmenting Sounds",
      skills: ["segmentation", "blending"]
    },
    {
      id: "manipulation",
      label: "Sound Manipulation (Add / Delete / Swap)",
      skills: ["manipulation"]
    }
  ];

  global.Levels = LEVELS;
})(typeof window !== "undefined" ? window : globalThis);
