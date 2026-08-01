import React, { useState, useMemo, useRef, useEffect, useCallback, useContext, createContext } from "react";

/* =========================================================================
   THEORY DESK — a reference manual for music theory and production
   Part 1: theme, music core, reference data, audio, MIDI
   ========================================================================= */

/* ---------------------------------------------------------------------------
   EDIT ME: the link back to your main site, shown at the top left.
   Set HOME_URL to "" to hide the link entirely.
   --------------------------------------------------------------------------- */
const HOME_URL = "https://haiko.be";
const HOME_LABEL = "haiko.be";

const THEME_CSS = `
:root {
  --bg:#101215; --surface:#171A1F; --raised:#1E222A; --line:#2A2F39;
  --text:#E8E6E1; --muted:#98A0AE; --faint:#5D6673;
  --root:#E8B33C; --scale:#6FC3B0; --chord:#A78BFA; --warn:#F08A8A;
  --key-white:#EFEBE4; --key-white-edge:#C9C3BA; --key-black:#22262E;
}
[data-theme="paper"] {
  --bg:#F5F2EB; --surface:#FFFFFF; --raised:#EFEBE2; --line:#DDD6C9;
  --text:#1B1B20; --muted:#63676F; --faint:#8D9199;
  --root:#A9761A; --scale:#1F7D6B; --chord:#6444C7; --warn:#B33A3A;
  --key-white:#FFFFFF; --key-white-edge:#CFC8BB; --key-black:#2A2E36;
}
* { -webkit-tap-highlight-color: transparent; }
button, select, input { touch-action: manipulation; font: inherit; color: inherit; }
a { color: inherit; text-decoration: none; }
a:focus-visible, button:focus-visible, select:focus-visible, input:focus-visible, [tabindex]:focus-visible {
  outline: 2px solid var(--root); outline-offset: 2px; border-radius: 3px;
}
.td-scroll { scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
.td-scroll::-webkit-scrollbar { height: 10px; width: 10px; }
.td-scroll::-webkit-scrollbar-track { background: transparent; }
.td-scroll::-webkit-scrollbar-thumb {
  background: var(--line); border-radius: 6px;
  border: 3px solid transparent; background-clip: padding-box;
}
.td-scroll::-webkit-scrollbar-thumb:hover { background: var(--muted); background-clip: padding-box; }
.td-scroll-x { padding-bottom: 12px; }
.td-scroll-both { scrollbar-gutter: stable; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; scroll-behavior: auto !important; }
}
`;

const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';

/* ============================== NOTES ============================== */
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const MAJREF = [0, 2, 4, 5, 7, 9, 11];
const CHROM_DEG = ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"];
const EXT_DEG = { 13: "♭9", 14: "9", 15: "♯9", 17: "11", 21: "13" };
const BLACK_PCS = [1, 3, 6, 8, 10];

const accVal = (s) => { let v = 0; for (const c of s) { if (c === "♯") v++; if (c === "♭") v--; } return v; };
const accStr = (n) => (n === 0 ? "" : n > 0 ? "♯".repeat(n) : "♭".repeat(-n));
const pcOf = (name) => (((LETTER_PC[LETTERS.indexOf(name[0])] + accVal(name.slice(1))) % 12) + 12) % 12;
const nameOf = (pc, flat) => (flat ? FLATS : SHARPS)[((pc % 12) + 12) % 12];
const octName = (m, flat) => nameOf(m % 12, flat) + (Math.floor(m / 12) - 1);
const uniq = (a) => [...new Set(a)];

function spellScale(rootName, intervals, flat) {
  const li = LETTERS.indexOf(rootName[0]);
  const rootPc = pcOf(rootName);
  if (intervals.length === 7) {
    return intervals.map((iv, i) => {
      const letter = LETTERS[(li + i) % 7];
      const nat = LETTER_PC[LETTERS.indexOf(letter)];
      const target = (rootPc + iv) % 12;
      const d = ((((target - nat + 6) % 12) + 12) % 12) - 6;
      return Math.abs(d) > 2 ? nameOf(target, flat) : letter + accStr(d);
    });
  }
  return intervals.map((iv) => nameOf(rootPc + iv, flat));
}
const degreeLabels = (iv) =>
  iv.length === 7 ? iv.map((v, i) => accStr(v - MAJREF[i]) + (i + 1)) : iv.map((v) => CHROM_DEG[v]);

/* ============================== SCALES ============================== */
const SCALES = [
  { id: "major", name: "Major", iv: [0, 2, 4, 5, 7, 9, 11], parent: "major",
    feel: "Bright, resolved, safe. The default happy sound.", use: "Pop, house, gospel, most radio music." },
  { id: "minor", name: "Natural minor", iv: [0, 2, 3, 5, 7, 8, 10], parent: "minor",
    feel: "Sad, serious, cool. The default sad sound.", use: "Trap, EDM, rock, film scores." },
  { id: "harmonic", name: "Harmonic minor", iv: [0, 2, 3, 5, 7, 8, 11], parent: "minor",
    feel: "Dramatic and tense — a big leap before the octave.", use: "Metal, neoclassical, Middle-Eastern flavour." },
  { id: "melodic", name: "Melodic minor", iv: [0, 2, 3, 5, 7, 9, 11], parent: "minor",
    feel: "Sad but hopeful, slippery.", use: "Jazz lines, sophisticated pop." },
  { id: "dorian", name: "Dorian", iv: [0, 2, 3, 5, 7, 9, 10], parent: "minor",
    feel: "Minor, but funky and hopeful instead of tragic.", use: "Funk, house, lo-fi, Santana, Daft Punk." },
  { id: "phrygian", name: "Phrygian", iv: [0, 1, 3, 5, 7, 8, 10], parent: "minor",
    feel: "Dark and Spanish. The ♭2 is the whole personality.", use: "Metal, flamenco, dark trap." },
  { id: "lydian", name: "Lydian", iv: [0, 2, 4, 6, 7, 9, 11], parent: "major",
    feel: "Major but floating and magical — the ♯4 sparkles.", use: "Film scores, dream pop, video games." },
  { id: "mixo", name: "Mixolydian", iv: [0, 2, 4, 5, 7, 9, 10], parent: "major",
    feel: "Major with a bluesy, unresolved edge.", use: "Rock riffs, funk, Britpop, gospel." },
  { id: "locrian", name: "Locrian", iv: [0, 1, 3, 5, 6, 8, 10], parent: "minor",
    feel: "Unstable, never settles. Rarely used on its own.", use: "Horror stings, experimental metal." },
  { id: "majpent", name: "Major pentatonic", iv: [0, 2, 4, 7, 9], parent: "major",
    feel: "Everything sounds right. No wrong notes.", use: "Melodies, solos, folk, country." },
  { id: "minpent", name: "Minor pentatonic", iv: [0, 3, 5, 7, 10], parent: "minor",
    feel: "The riff scale. Instantly cool.", use: "Rock and blues solos, hip-hop hooks, basslines." },
  { id: "blues", name: "Blues", iv: [0, 3, 5, 6, 7, 10], parent: "minor",
    feel: "Gritty and vocal. Pass through the ♭5, don't sit on it.", use: "Blues, rock, soul, boom-bap." },
  { id: "phrydom", name: "Phrygian dominant", iv: [0, 1, 4, 5, 7, 8, 10], parent: "minor",
    feel: "Exotic, snake-charmer, aggressive.", use: "Flamenco, metal, Middle-Eastern EDM." },
  { id: "hirajoshi", name: "Hirajoshi", iv: [0, 2, 3, 7, 8], parent: "minor",
    feel: "Sparse, ancient, hollow.", use: "Ambient, game music, texture melodies." },
  { id: "wholetone", name: "Whole tone", iv: [0, 2, 4, 6, 8, 10], parent: "major",
    feel: "Weightless, dizzy, dreamlike. No home note.", use: "Dream sequences, transitions, risers." },
  { id: "chromatic", name: "Chromatic", iv: [0,1,2,3,4,5,6,7,8,9,10,11], parent: "major",
    feel: "Every note. Colour, not a home base.", use: "Tension runs, jazz fills, glitch." },
];
const SCALE_BY_ID = Object.fromEntries(SCALES.map((s) => [s.id, s]));

/* ============================== CHORDS ============================== */
const CHORDS = [
  { id: "maj", sym: "", name: "Major", iv: [0, 4, 7], q: "maj", feel: "Happy, stable, open." },
  { id: "min", sym: "m", name: "Minor", iv: [0, 3, 7], q: "min", feel: "Sad, soft, inward." },
  { id: "dim", sym: "dim", name: "Diminished", iv: [0, 3, 6], q: "dim", feel: "Anxious, unstable. Wants to move." },
  { id: "aug", sym: "aug", name: "Augmented", iv: [0, 4, 8], q: "aug", feel: "Eerie, suspended in air." },
  { id: "sus2", sym: "sus2", name: "Suspended 2nd", iv: [0, 2, 7], q: "sus", feel: "Open, neither happy nor sad." },
  { id: "sus4", sym: "sus4", name: "Suspended 4th", iv: [0, 5, 7], q: "sus", feel: "Held breath. Resolve it to a major." },
  { id: "5", sym: "5", name: "Power chord", iv: [0, 7], q: "maj", feel: "Neutral and heavy. No emotion, all weight." },
  { id: "6", sym: "6", name: "Major 6th", iv: [0, 4, 7, 9], q: "maj", feel: "Vintage, sweet, retro pop." },
  { id: "m6", sym: "m6", name: "Minor 6th", iv: [0, 3, 7, 9], q: "min", feel: "Bittersweet, noir." },
  { id: "maj7", sym: "maj7", name: "Major 7th", iv: [0, 4, 7, 11], q: "maj", feel: "Dreamy, warm, lo-fi." },
  { id: "7", sym: "7", name: "Dominant 7th", iv: [0, 4, 7, 10], q: "maj", feel: "Bluesy, restless, funky." },
  { id: "m7", sym: "m7", name: "Minor 7th", iv: [0, 3, 7, 10], q: "min", feel: "Smooth, chilled, neo-soul." },
  { id: "mMaj7", sym: "mMaj7", name: "Minor major 7th", iv: [0, 3, 7, 11], q: "min", feel: "Sinister. Spy movie." },
  { id: "m7b5", sym: "m7♭5", name: "Half-diminished", iv: [0, 3, 6, 10], q: "dim", feel: "Yearning, jazzy sadness." },
  { id: "dim7", sym: "dim7", name: "Diminished 7th", iv: [0, 3, 6, 9], q: "dim", feel: "Pure suspense. Silent-film villain." },
  { id: "7sus4", sym: "7sus4", name: "Dominant 7 sus4", iv: [0, 5, 7, 10], q: "sus", feel: "Groovy hover, gospel and house staple." },
  { id: "add9", sym: "add9", name: "Add 9", iv: [0, 4, 7, 14], q: "maj", feel: "Shimmer without jazz. Big and modern." },
  { id: "madd9", sym: "m(add9)", name: "Minor add 9", iv: [0, 3, 7, 14], q: "min", feel: "Cinematic melancholy." },
  { id: "9", sym: "9", name: "Dominant 9th", iv: [0, 4, 7, 10, 14], q: "maj", feel: "Funk. Stevie Wonder territory." },
  { id: "maj9", sym: "maj9", name: "Major 9th", iv: [0, 4, 7, 11, 14], q: "maj", feel: "Lush, floating, lo-fi hip hop." },
  { id: "m9", sym: "m9", name: "Minor 9th", iv: [0, 3, 7, 10, 14], q: "min", feel: "Deep, velvety, R&B." },
  { id: "11", sym: "11", name: "Dominant 11th", iv: [0, 7, 10, 14, 17], q: "maj", feel: "Wide and washy." },
  { id: "13", sym: "13", name: "Dominant 13th", iv: [0, 4, 7, 10, 14, 21], q: "maj", feel: "Full jazz colour, big band." },
  { id: "7b9", sym: "7♭9", name: "Dominant 7♭9", iv: [0, 4, 7, 10, 13], q: "maj", feel: "Spiky tension before a minor chord." },
  { id: "7s9", sym: "7♯9", name: "Dominant 7♯9", iv: [0, 4, 7, 10, 15], q: "maj", feel: "The Hendrix chord. Dirty and bright at once." },
  { id: "maj7s5", sym: "maj7♯5", name: "Major 7 ♯5", iv: [0, 4, 8, 11], q: "aug", feel: "Floating and unresolved." },
];
const CHORD_BY_ID = Object.fromEntries(CHORDS.map((c) => [c.id, c]));
const CHORD_BY_IV = Object.fromEntries(CHORDS.map((c) => [c.iv.join(","), c]));

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const ROMAN_SUFFIX = { m7b5: "ø7", dim7: "°7", dim: "°", aug: "+", maj7s5: "+maj7", maj7: "maj7", mMaj7: "maj7", "7": "7", m7: "7", "6": "6" };

function buildDiatonic(intervals, sevenths) {
  const n = intervals.length;
  const picks = sevenths ? [0, 2, 4, 6] : [0, 2, 4];
  return intervals.map((_, i) => {
    const notes = picks.map((p) => {
      const idx = i + p;
      return intervals[idx % n] + 12 * Math.floor(idx / n);
    });
    const rel = notes.map((x) => x - notes[0]);
    const chord = CHORD_BY_IV[rel.join(",")];
    const q = chord ? chord.q : "maj";
    let r = ROMAN[i] || String(i + 1);
    if (q === "min" || q === "dim") r = r.toLowerCase();
    if (chord) r += ROMAN_SUFFIX[chord.id] || "";
    else if (q === "dim") r += "°";
    const d = MAJREF[i] === undefined ? 0 : intervals[i] - MAJREF[i];
    return { degree: i, semis: intervals[i], roman: accStr(d) + r, chord, quality: q };
  });
}

/* what each degree does in a key — the part beginners never get told */
const FUNCTIONS = [
  ["I", "Home", "Rest. Start here, end here, and the ear relaxes."],
  ["ii", "Set-up", "Leads to V. The most natural chord to precede the pull home."],
  ["iii", "Colour", "Ambiguous, between home and sadness. Use sparingly."],
  ["IV", "Away", "Lifts and opens. Can go home directly or via V."],
  ["V", "Pull", "Maximum tension toward home. Add a 7th to pull harder."],
  ["vi", "Shadow", "Same notes as home, minor mood. The pop substitute for I."],
  ["vii°", "Edge", "Unstable. A one-beat passing chord, never a resting point."],
];

/* ============================== PROGRESSIONS ============================== */
const P = (label, semi, type) => ({ label, semi, type });
const PROGS = [
  { id: "axis", name: "The Axis", mode: "major", tag: "Pop", steps: [P("I",0,"maj"),P("V",7,"maj"),P("vi",9,"min"),P("IV",5,"maj")],
    feel: "Uplifting, anthemic, endlessly reusable.", heard: "Let It Be · Don't Stop Believin' · half of pop radio" },
  { id: "sensitive", name: "Sensitive", mode: "major", tag: "Pop", steps: [P("vi",9,"min"),P("IV",5,"maj"),P("I",0,"maj"),P("V",7,"maj")],
    feel: "Starts sad, ends hopeful. The Axis through a different door.", heard: "Zombie · Grenade · Apologize" },
  { id: "doowop", name: "50s doo-wop", mode: "major", tag: "Retro", steps: [P("I",0,"maj"),P("vi",9,"min"),P("IV",5,"maj"),P("V",7,"maj")],
    feel: "Innocent, nostalgic, slow-dance.", heard: "Stand By Me · Blue Moon" },
  { id: "145", name: "Three chord", mode: "major", tag: "Rock", steps: [P("I",0,"maj"),P("IV",5,"maj"),P("V",7,"maj")],
    feel: "Direct and loud. Nothing to hide behind.", heard: "Rock, punk, country, folk" },
  { id: "blues12", name: "12-bar blues", mode: "major", tag: "Blues", steps: [P("I7",0,"7"),P("I7",0,"7"),P("I7",0,"7"),P("I7",0,"7"),P("IV7",5,"7"),P("IV7",5,"7"),P("I7",0,"7"),P("I7",0,"7"),P("V7",7,"7"),P("IV7",5,"7"),P("I7",0,"7"),P("V7",7,"7")],
    feel: "The oldest loop in popular music. Play it with a shuffle.", heard: "Every blues and early rock record" },
  { id: "251", name: "ii–V–I", mode: "major", tag: "Jazz", steps: [P("ii7",2,"m7"),P("V7",7,"7"),P("Imaj7",0,"maj7")],
    feel: "The strongest coming-home movement there is.", heard: "Standards, city pop, bossa" },
  { id: "turn", name: "Jazz turnaround", mode: "major", tag: "Jazz", steps: [P("Imaj7",0,"maj7"),P("vi7",9,"m7"),P("ii7",2,"m7"),P("V7",7,"7")],
    feel: "Loops forever without getting boring.", heard: "Rhythm changes, jazz outros" },
  { id: "lofi", name: "Lo-fi loop", mode: "major", tag: "Lo-fi", steps: [P("Imaj7",0,"maj7"),P("iii7",4,"m7"),P("vi7",9,"m7"),P("IVmaj7",5,"maj7")],
    feel: "Hazy and warm. Add tape wobble and rain.", heard: "Study-beat channels everywhere" },
  { id: "royal", name: "Royal road", mode: "major", tag: "J-pop", steps: [P("IV",5,"maj"),P("V",7,"maj"),P("iii",4,"min"),P("vi",9,"min")],
    feel: "Emotional swell, then a soft landing on the minor.", heard: "Anime themes, city pop" },
  { id: "mixo", name: "Mixolydian vamp", mode: "major", tag: "Rock", steps: [P("I",0,"maj"),P("♭VII",10,"maj"),P("IV",5,"maj")],
    feel: "Swaggering and slightly unresolved.", heard: "Sweet Home Alabama · Britpop" },
  { id: "borrowed", name: "Borrowed heartbreak", mode: "major", tag: "Emotional", steps: [P("I",0,"maj"),P("iii",4,"min"),P("IV",5,"maj"),P("iv",5,"min")],
    feel: "That final minor iv is the sound of a lump in the throat.", heard: "Creep · countless ballads" },
  { id: "canon", name: "Pachelbel run", mode: "major", tag: "Classical", steps: [P("I",0,"maj"),P("V",7,"maj"),P("vi",9,"min"),P("iii",4,"min"),P("IV",5,"maj"),P("I",0,"maj"),P("IV",5,"maj"),P("V",7,"maj")],
    feel: "Descending, inevitable, tear-jerking.", heard: "Canon in D · Basket Case · Graduation" },
  { id: "epicminor", name: "Epic minor", mode: "minor", tag: "Cinematic", steps: [P("i",0,"min"),P("♭VI",8,"maj"),P("♭III",3,"maj"),P("♭VII",10,"maj")],
    feel: "Heroic and huge. Trailer music in four chords.", heard: "Film trailers, epic EDM" },
  { id: "andalusian", name: "Andalusian cadence", mode: "minor", tag: "Dark", steps: [P("i",0,"min"),P("♭VII",10,"maj"),P("♭VI",8,"maj"),P("V",7,"maj")],
    feel: "Walking downstairs into somewhere dangerous.", heard: "Flamenco · Hit the Road Jack · Sultans of Swing" },
  { id: "minpop", name: "Minor pop drop", mode: "minor", tag: "EDM", steps: [P("i",0,"min"),P("♭VI",8,"maj"),P("♭VII",10,"maj")],
    feel: "Melancholy that still bangs.", heard: "Festival house, future bass" },
  { id: "trap", name: "Dark trap loop", mode: "minor", tag: "Trap", steps: [P("i",0,"min"),P("v",7,"min"),P("♭VI",8,"maj"),P("♭VII",10,"maj")],
    feel: "Brooding and hypnotic. Works with two notes of melody.", heard: "Modern trap and drill" },
  { id: "harm", name: "Harmonic tension", mode: "minor", tag: "Dramatic", steps: [P("i",0,"min"),P("iv",5,"min"),P("V",7,"maj")],
    feel: "The major V in a minor key is pure drama.", heard: "Classical, metal, tango" },
  { id: "min251", name: "Minor ii–V–i", mode: "minor", tag: "Jazz", steps: [P("iiø",2,"m7b5"),P("V7",7,"7"),P("i7",0,"m7")],
    feel: "Sophisticated sadness, resolved properly.", heard: "Autumn Leaves · noir scores" },
  { id: "dorianvamp", name: "Dorian funk vamp", mode: "minor", tag: "Funk", steps: [P("i7",0,"m7"),P("IV9",5,"9")],
    feel: "Two chords, infinite groove. Don't add more.", heard: "Funk, disco, deep house" },
  { id: "flamenco", name: "Phrygian vamp", mode: "minor", tag: "Dark", steps: [P("i",0,"min"),P("♭II",1,"maj")],
    feel: "Menacing and exotic. Very cheap, very effective.", heard: "Metal, dark trap, flamenco" },
  { id: "descpop", name: "Descending pop", mode: "major", tag: "Pop", steps: [P("I",0,"maj"),P("iii",4,"min"),P("vi",9,"min"),P("IV",5,"maj")],
    feel: "Slides downward and never quite settles. Gentler than the Axis.", heard: "Soft pop, singer-songwriter" },
  { id: "secdom", name: "Secondary dominant lift", mode: "major", tag: "Emotional", steps: [P("I",0,"maj"),P("III7",4,"7"),P("vi",9,"min"),P("V",7,"maj")],
    feel: "The III7 is borrowed from outside the key purely to pull harder into the vi. A tiny move with a big effect.", heard: "Beatles, musicals, gospel" },
  { id: "folkvamp", name: "Folk vamp", mode: "major", tag: "Folk", steps: [P("I",0,"maj"),P("IV",5,"maj"),P("I",0,"maj"),P("V",7,"maj")],
    feel: "Plain and sturdy. Leaves all the room for the words.", heard: "Folk, country, campfire songs" },
  { id: "rockborrow", name: "Borrowed rock", mode: "major", tag: "Rock", steps: [P("I",0,"maj"),P("♭III",3,"maj"),P("IV",5,"maj"),P("I",0,"maj")],
    feel: "The ♭III is stolen from the parallel minor. Bluesy swagger in a major key.", heard: "Classic rock, Britpop" },
  { id: "mixoanthem", name: "Mixolydian anthem", mode: "major", tag: "Rock", steps: [P("I",0,"maj"),P("V",7,"maj"),P("♭VII",10,"maj"),P("IV",5,"maj")],
    feel: "Wide and triumphant without turning sweet.", heard: "Stadium rock, film montages" },
  { id: "country", name: "Country shuffle", mode: "major", tag: "Country", steps: [P("I",0,"maj"),P("IV",5,"maj"),P("V",7,"maj"),P("IV",5,"maj")],
    feel: "Ends on the IV so it rolls straight back round.", heard: "Country, rock and roll" },
  { id: "circle", name: "Circle progression", mode: "major", tag: "Jazz", steps: [P("vi7",9,"m7"),P("ii7",2,"m7"),P("V7",7,"7"),P("Imaj7",0,"maj7")],
    feel: "Each root falls a fifth to the next. The strongest possible chain of movement.", heard: "Jazz standards, soul" },
  { id: "rhythmchanges", name: "Rhythm changes", mode: "major", tag: "Jazz", steps: [P("Imaj7",0,"maj7"),P("VI7",9,"7"),P("ii7",2,"m7"),P("V7",7,"7")],
    feel: "The turnaround half of the most-played form in jazz.", heard: "I Got Rhythm and a thousand others" },
  { id: "lydianvamp", name: "Lydian vamp", mode: "major", tag: "Dreamy", steps: [P("I",0,"maj"),P("II",2,"maj")],
    feel: "A major II instead of a minor ii. Two chords that float and never resolve.", heard: "Film scores, dream pop" },
  { id: "ambientfloat", name: "Two-chord float", mode: "major", tag: "Ambient", steps: [P("Imaj7",0,"maj7"),P("IVmaj7",5,"maj7")],
    feel: "Almost no movement. Let it run for eight bars and add texture instead of chords.", heard: "Ambient, post-rock, meditation" },
  { id: "majepic", name: "Major borrowed epic", mode: "major", tag: "Cinematic", steps: [P("I",0,"maj"),P("♭VI",8,"maj"),P("♭VII",10,"maj"),P("I",0,"maj")],
    feel: "Two chords from the parallel minor, then home. Heroic without going sad.", heard: "Trailers, game soundtracks" },
  { id: "blues8", name: "8-bar blues", mode: "major", tag: "Blues", steps: [P("I7",0,"7"),P("V7",7,"7"),P("IV7",5,"7"),P("IV7",5,"7"),P("I7",0,"7"),P("V7",7,"7"),P("I7",0,"7"),P("V7",7,"7")],
    feel: "The 12-bar's shorter cousin. Gets to the tension faster.", heard: "Key to the Highway, early blues" },
  { id: "neosoul", name: "Neo-soul cadence", mode: "major", tag: "Neo-soul", steps: [P("ii9",2,"m9"),P("V13",7,"13"),P("Imaj9",0,"maj9")],
    feel: "The ii–V–I with every extension switched on. Lush and unhurried.", heard: "D'Angelo, Erykah Badu, modern R&B" },
  { id: "mindescent", name: "Minor descent", mode: "minor", tag: "Cinematic", steps: [P("i",0,"min"),P("♭III",3,"maj"),P("♭VII",10,"maj"),P("iv",5,"min")],
    feel: "Falls away from home and lands somewhere colder.", heard: "Film scores, dark synthwave" },
  { id: "mincircle", name: "Minor circle", mode: "minor", tag: "Rock", steps: [P("i",0,"min"),P("iv",5,"min"),P("♭VII",10,"maj"),P("♭III",3,"maj")],
    feel: "Roots falling by fifths in a minor key. Relentless forward motion.", heard: "Rock, metal, drum and bass" },
  { id: "dramatic", name: "Dramatic minor", mode: "minor", tag: "Dramatic", steps: [P("i",0,"min"),P("♭VI",8,"maj"),P("iv",5,"min"),P("V",7,"maj")],
    feel: "Builds to a major V, which in a minor key is the sound of a threat.", heard: "Tango, opera, metal ballads" },
  { id: "modalvamp", name: "Modal minor vamp", mode: "minor", tag: "Dark", steps: [P("i",0,"min"),P("v",7,"min"),P("i",0,"min"),P("iv",5,"min")],
    feel: "All minor, no pull. Hypnotic rather than emotional.", heard: "Post-punk, techno, folk laments" },
  { id: "metalphryg", name: "Phrygian metal", mode: "minor", tag: "Metal", steps: [P("i",0,"min"),P("♭II",1,"maj"),P("i",0,"min"),P("♭VII",10,"maj")],
    feel: "The ♭II gives it the menace. Play it as power chords.", heard: "Thrash, djent, dark orchestral" },
  { id: "deephouse", name: "Deep house loop", mode: "minor", tag: "House", steps: [P("i7",0,"m7"),P("♭VIImaj7",10,"maj7"),P("♭VImaj7",8,"maj7")],
    feel: "Three warm 7th chords that never resolve. Loop it and let the groove carry it.", heard: "Deep and soulful house" },
  { id: "perfectcad", name: "Perfect cadence", mode: "major", tag: "Cadence", steps: [P("V",7,"maj"),P("I",0,"maj")],
    feel: "The full stop. Nothing sounds more finished than this.", heard: "The end of almost everything" },
  { id: "plagalcad", name: "Plagal cadence", mode: "major", tag: "Cadence", steps: [P("IV",5,"maj"),P("I",0,"maj")],
    feel: "The amen ending. Softer and warmer than V–I, with no tension to release.", heard: "Hymns, gospel, Beatles outros" },
  { id: "deceptivecad", name: "Deceptive cadence", mode: "major", tag: "Cadence", steps: [P("V",7,"maj"),P("vi",9,"min")],
    feel: "Sets up the ending and lands on the minor instead. Use it to extend a section.", heard: "Classical, film, prog" },
  { id: "halfcad", name: "Half cadence", mode: "major", tag: "Cadence", steps: [P("I",0,"maj"),P("V",7,"maj")],
    feel: "Stops on the tension on purpose. A question, not an answer — perfect before a chorus.", heard: "Pre-choruses everywhere" },
  { id: "creep", name: "Creep turn", mode: "major", tag: "Emotional", steps: [P("I",0,"maj"),P("III",4,"maj"),P("IV",5,"maj"),P("iv",5,"min")],
    feel: "A major chord where a minor belongs, then a minor where a major belongs. Unsettling and beautiful.", heard: "Creep \u00b7 Space Oddity" },
  { id: "climb", name: "Stepwise climb", mode: "major", tag: "Pop", steps: [P("I",0,"maj"),P("iii",4,"min"),P("IV",5,"maj"),P("V",7,"maj")],
    feel: "The bass walks up one step at a time, so it always feels like it is going somewhere.", heard: "Ballads, musical theatre, gospel" },
  { id: "suspension", name: "Suspension release", mode: "major", tag: "Rock", steps: [P("Isus4",0,"sus4"),P("I",0,"maj"),P("Vsus4",7,"sus4"),P("V",7,"maj")],
    feel: "Tension and release with only two real chords. Cheap, and it always works.", heard: "Stadium rock, worship, Tom Petty" },
  { id: "gospelwalk", name: "Gospel walk-up", mode: "major", tag: "Gospel", steps: [P("I",0,"maj"),P("I7",0,"7"),P("IV",5,"maj"),P("iv",5,"min")],
    feel: "Turning the home chord into a dominant makes it lean into the IV. The minor iv closes the door behind it.", heard: "Gospel, soul, Beatles ballads" },
  { id: "bossa", name: "Bossa nova", mode: "major", tag: "Latin", steps: [P("Imaj7",0,"maj7"),P("II7",2,"7"),P("ii7",2,"m7"),P("V7",7,"7")],
    feel: "Warm and unhurried. The II7 comes from outside the key and is the whole flavour.", heard: "Girl from Ipanema \u00b7 city pop" },
  { id: "backdoor", name: "Backdoor cadence", mode: "major", tag: "Jazz", steps: [P("IVmaj7",5,"maj7"),P("\u266dVII7",10,"7"),P("Imaj7",0,"maj7")],
    feel: "Comes home from the wrong direction. Softer than a V7 and instantly sounds expensive.", heard: "Steely Dan, standards, anime jazz" },
  { id: "tritonesub", name: "Tritone substitution", mode: "major", tag: "Jazz", steps: [P("ii7",2,"m7"),P("\u266dII7",1,"7"),P("Imaj7",0,"maj7")],
    feel: "A ii\u2013V\u2013I with the V swapped for the chord a tritone away, so the bass slides a semitone into home.", heard: "Bebop, neo-soul, film noir" },
  { id: "quickchange", name: "Quick-change blues", mode: "major", tag: "Blues", steps: [P("I7",0,"7"),P("IV7",5,"7"),P("I7",0,"7"),P("I7",0,"7"),P("IV7",5,"7"),P("IV7",5,"7"),P("I7",0,"7"),P("I7",0,"7"),P("V7",7,"7"),P("IV7",5,"7"),P("I7",0,"7"),P("V7",7,"7")],
    feel: "A 12-bar that moves to the IV in bar two. More motion, less waiting around.", heard: "Chicago blues, rock and roll" },
  { id: "latinmin", name: "Latin pop minor", mode: "minor", tag: "Latin", steps: [P("i",0,"min"),P("\u266dVI",8,"maj"),P("\u266dVII",10,"maj"),P("V",7,"maj")],
    feel: "Minor and danceable, ending on a major V that yanks it back to the top.", heard: "Reggaeton, bachata, Latin pop" },
  { id: "aeolian", name: "Aeolian vamp", mode: "minor", tag: "Rock", steps: [P("i",0,"min"),P("\u266dVII",10,"maj")],
    feel: "Two chords rocking back and forth. Sits under a riff without getting in its way.", heard: "Rock, doom, dark synthwave" },
  { id: "liquid", name: "Liquid 7ths", mode: "minor", tag: "EDM", steps: [P("i7",0,"m7"),P("\u266dVImaj7",8,"maj7"),P("\u266dIIImaj7",3,"maj7"),P("\u266dVII7",10,"7")],
    feel: "The epic minor loop with 7ths on everything. Melancholy you can dance to.", heard: "Liquid drum & bass, future garage" },
  { id: "onechord", name: "One-chord vamp", mode: "minor", tag: "Funk", steps: [P("i9",0,"m9")],
    feel: "No progression at all. Everything has to come from the rhythm, which is the point.", heard: "James Brown, Fela Kuti, deep house" },
];
const PROG_BY_ID = Object.fromEntries(PROGS.map((p) => [p.id, p]));

/* ============================== MOODS ============================== */
const MOODS = [
  { id: "happy", name: "Happy / uplifting", scale: "major", prog: "axis", bpm: "110–128", chords: ["maj", "add9", "sus4"],
    tips: ["Keep melodies on beats 1 and 3 — confident, not busy.", "Use sus4 → major for a lift right before the chorus.", "Bright pads, plucks, claps on 2 and 4."] },
  { id: "sad", name: "Sad / heartbroken", scale: "minor", prog: "sensitive", bpm: "70–90", chords: ["min", "m7", "madd9"],
    tips: ["Play chords high and thin; leave the low end almost empty.", "Let notes ring longer than feels comfortable.", "One held vocal or cello note beats a countermelody."] },
  { id: "epic", name: "Epic / cinematic", scale: "minor", prog: "epicminor", bpm: "80–100 half-time", chords: ["min", "5", "madd9"],
    tips: ["Double the chords two octaves apart, nothing in the middle.", "One new instrument every 4 bars.", "Big reverb on everything except the drums."] },
  { id: "dark", name: "Dark / tense", scale: "phrygian", prog: "flamenco", bpm: "60–75, or 140 half-time", chords: ["min", "dim7", "m7b5"],
    tips: ["Lean on the ♭2 — it's the whole mood.", "Detune a second layer by 10–20 cents.", "Silence between hits is the scariest part."] },
  { id: "dreamy", name: "Dreamy / ethereal", scale: "lydian", prog: "lofi", bpm: "75–95", chords: ["maj7", "add9", "maj9"],
    tips: ["The ♯4 is the magic note — melody, not bass.", "Wide, slow-attack pads; no sharp transients.", "Roll off everything below 100 Hz on the pads."] },
  { id: "chill", name: "Chill / lo-fi", scale: "dorian", prog: "lofi", bpm: "70–90", chords: ["maj7", "m9", "m7"],
    tips: ["Swing the hats 55–62%.", "Play chords slightly late — humanise by 10–30 ms.", "Filter the highs off the piano, add vinyl noise."] },
  { id: "funky", name: "Funky / groovy", scale: "mixo", prog: "dorianvamp", bpm: "100–120", chords: ["9", "7", "m7"],
    tips: ["Two chords maximum. The groove is the song.", "Ghost notes on the snare, 16th-note hats.", "Bass locks with the kick on the root and ♭7."] },
  { id: "aggro", name: "Aggressive / heavy", scale: "phrydom", prog: "harm", bpm: "140–175", chords: ["5", "min", "dim"],
    tips: ["Power chords only — thirds turn to mud under distortion.", "Riff on the root, ♭2 and ♭5.", "Leave a full bar of silence before the drop."] },
  { id: "romantic", name: "Romantic / warm", scale: "major", prog: "doowop", bpm: "60–85", chords: ["maj7", "6", "m7"],
    tips: ["Use inversions so the top note barely moves.", "A 6th instead of a 7th feels vintage.", "Real piano or nylon guitar beats a synth here."] },
  { id: "nostalgic", name: "Nostalgic / bittersweet", scale: "major", prog: "borrowed", bpm: "85–105", chords: ["maj", "min", "maj7"],
    tips: ["Borrow the minor iv from the parallel minor.", "Slightly detune and wobble the whole mix.", "A narrow stereo image feels like memory."] },
  { id: "mysterious", name: "Mysterious / exotic", scale: "hirajoshi", prog: "flamenco", bpm: "70–100", chords: ["sus2", "min", "5"],
    tips: ["Use only 4–5 notes and repeat them.", "Open fifths instead of full chords.", "Percussion with no low end: shakers, wood, bells."] },
  { id: "bluesy", name: "Bluesy / soulful", scale: "blues", prog: "blues12", bpm: "70–110", chords: ["7", "9", "m7"],
    tips: ["Bend or slide into the ♭3 and ♭5.", "Dominant 7 chords everywhere, even on the I.", "Play a phrase, then leave a gap the same length."] },
];

/* ============================== INTERVALS & CIRCLE ============================== */
const INTERVALS = [
  { s: 0, name: "Unison", short: "P1", feel: "Same note. Doubling and thickness.", song: "—" },
  { s: 1, name: "Minor 2nd", short: "m2", feel: "Maximum tension. Grinding, fearful.", song: "Jaws theme" },
  { s: 2, name: "Major 2nd", short: "M2", feel: "Gentle step. Movement without drama.", song: "Happy Birthday" },
  { s: 3, name: "Minor 3rd", short: "m3", feel: "Sad. The core of every minor chord.", song: "Smoke on the Water" },
  { s: 4, name: "Major 3rd", short: "M3", feel: "Happy. The core of every major chord.", song: "When the Saints Go Marching In" },
  { s: 5, name: "Perfect 4th", short: "P4", feel: "Open, noble, a little suspended.", song: "Here Comes the Bride" },
  { s: 6, name: "Tritone", short: "TT", feel: "Unstable and evil — or delicious, in jazz.", song: "The Simpsons theme" },
  { s: 7, name: "Perfect 5th", short: "P5", feel: "Powerful and hollow. All strength, no emotion.", song: "Star Wars main title" },
  { s: 8, name: "Minor 6th", short: "m6", feel: "Aching, yearning.", song: "The Entertainer" },
  { s: 9, name: "Major 6th", short: "M6", feel: "Sweet and nostalgic.", song: "My Bonnie Lies Over the Ocean" },
  { s: 10, name: "Minor 7th", short: "m7", feel: "Bluesy, groovy, unresolved.", song: "Somewhere (West Side Story)" },
  { s: 11, name: "Major 7th", short: "M7", feel: "Dreamy tension. One step from home.", song: "Take On Me" },
  { s: 12, name: "Octave", short: "P8", feel: "The same note, bigger. Perfect stability.", song: "Somewhere Over the Rainbow" },
];
const CIRCLE = [
  { maj: "C", min: "Am", sig: "no sharps or flats", pc: 0, minPc: 9, flat: false },
  { maj: "G", min: "Em", sig: "1 sharp", pc: 7, minPc: 4, flat: false },
  { maj: "D", min: "Bm", sig: "2 sharps", pc: 2, minPc: 11, flat: false },
  { maj: "A", min: "F♯m", sig: "3 sharps", pc: 9, minPc: 6, flat: false },
  { maj: "E", min: "C♯m", sig: "4 sharps", pc: 4, minPc: 1, flat: false },
  { maj: "B", min: "G♯m", sig: "5 sharps", pc: 11, minPc: 8, flat: false },
  { maj: "G♭", min: "E♭m", sig: "6 flats", pc: 6, minPc: 3, flat: true },
  { maj: "D♭", min: "B♭m", sig: "5 flats", pc: 1, minPc: 10, flat: true },
  { maj: "A♭", min: "Fm", sig: "4 flats", pc: 8, minPc: 5, flat: true },
  { maj: "E♭", min: "Cm", sig: "3 flats", pc: 3, minPc: 0, flat: true },
  { maj: "B♭", min: "Gm", sig: "2 flats", pc: 10, minPc: 7, flat: true },
  { maj: "F", min: "Dm", sig: "1 flat", pc: 5, minPc: 2, flat: true },
];

/* ============================== STUDIO TABLES ============================== */
const GENRE_BPM = [
  ["Hip hop / boom bap", "80–95"], ["Lo-fi", "70–90"], ["Trap", "130–160 (feels 65–80)"],
  ["R&B / neo-soul", "60–90"], ["Pop", "100–130"], ["Rock", "110–140"], ["Ballad", "60–80"],
  ["Disco", "110–130"], ["House", "120–128"], ["Tech house", "125–130"], ["Techno", "128–150"],
  ["Trance", "134–142"], ["Dubstep", "140 half-time"], ["Drum & bass", "170–178"],
  ["Reggaeton", "90–100"], ["Afrobeats", "100–115"], ["Ambient", "50–90"], ["Punk", "150–200"],
];
const TIME_SIGS = [
  { sig: "4/4", say: "four on the floor", feel: "Count 1-2-3-4. Almost everything you've heard.", ex: "Pop, house, rock, hip hop" },
  { sig: "3/4", say: "waltz", feel: "Count 1-2-3, weight on 1. Circular, swaying.", ex: "Waltzes, ballads, Piano Man" },
  { sig: "6/8", say: "six-eight", feel: "Two big beats, each split in three. Rolling.", ex: "Ballads, doo-wop, Irish music" },
  { sig: "2/4", say: "march", feel: "Short and punchy. Left-right-left-right.", ex: "Marches, polka, some Latin" },
  { sig: "5/4", say: "five", feel: "One beat too many — always off-balance.", ex: "Take Five, Mission Impossible" },
  { sig: "7/8", say: "seven-eight", feel: "Grouped 3+2+2 or 2+2+3. Lurching, hypnotic.", ex: "Prog, Balkan, math rock" },
  { sig: "12/8", say: "twelve-eight", feel: "Slow blues shuffle. Four beats in triplets.", ex: "Slow blues, gospel" },
];
const DYNAMICS = [
  ["ppp", "as quiet as possible", 8], ["pp", "very quiet", 24], ["p", "quiet", 40], ["mp", "medium quiet", 56],
  ["mf", "medium loud", 76], ["f", "loud", 96], ["ff", "very loud", 112], ["fff", "as loud as possible", 127],
];
const ARTICULATION = [
  ["Staccato", "Short and detached. Cut note lengths to 25–50% for tightness."],
  ["Legato", "Notes overlap slightly, no gap. Essential for realistic strings and leads."],
  ["Accent", "One note noticeably louder. Marks the start of a phrase."],
  ["Crescendo", "Gets louder over time. Automate volume or filter cutoff into a chorus."],
  ["Sustain", "Let notes ring. Great for pads, dangerous for busy low chords."],
];
const FREQ_BANDS = [
  ["20–60 Hz", "Sub", "Felt, not heard. 808s, kick weight. Keep it mono."],
  ["60–250 Hz", "Bass", "Body and warmth. Where mixes get muddy fastest."],
  ["250–500 Hz", "Low mids", "Boxiness. Usually needs cutting, not boosting."],
  ["500 Hz–2 kHz", "Mids", "Where most instruments live. Fight for space here."],
  ["2–4 kHz", "Upper mids", "Attack and intelligibility. Also ear fatigue."],
  ["4–8 kHz", "Presence", "Clarity, consonants, snare crack. Harsh if overdone."],
  ["8–20 kHz", "Air", "Sheen and space. A gentle shelf goes a long way."],
];
const INSTRUMENT_RANGE = [
  ["Kick", "50–100 Hz body · 3–5 kHz click"], ["808 / sub bass", "30–80 Hz — keep mono"],
  ["Bass", "60–250 Hz body · 700 Hz–2 kHz definition"], ["Snare", "150–250 Hz body · 5 kHz crack"],
  ["Hats / cymbals", "cut below 200 Hz · 8 kHz+ shine"], ["Lead vocal", "100–300 Hz warmth · 1–4 kHz clarity · 10 kHz air"],
  ["Piano", "full range — carve 200–400 Hz to fit vocals"], ["Electric guitar", "cut below 80 Hz · 1–3 kHz bite"],
  ["Pads / strings", "cut below 150 Hz so they don't fight the bass"],
];
const OCTAVE_SLOTS = [
  ["0–1", "16–65 Hz", "Sub. One element only, in mono. Kick fundamental or 808 — not both."],
  ["2", "65–130 Hz", "Bass fundamentals. Everything else high-passed above this."],
  ["3", "130–260 Hz", "Low chords, male vocals, guitar body. Crowds up fast."],
  ["4", "260–520 Hz", "Middle C octave. Main chords and most melodies."],
  ["5", "520–1050 Hz", "Leads, hooks, upper harmonies. Very audible — use sparingly."],
  ["6–7", "1–4 kHz", "Bells, plucks, top layers. The ear is most sensitive here."],
  ["8+", "4 kHz+", "Air and sparkle only. No fundamentals live up here."],
];
const STRUCTURE = [
  ["Intro", "4–8 bars", "Set the mood with one or two elements. Hint at the hook."],
  ["Verse", "8–16 bars", "Lower energy, more words, fewer layers."],
  ["Pre-chorus", "4–8 bars", "Build: filter opens, drums simplify or drop out."],
  ["Chorus / drop", "8–16 bars", "Highest energy, biggest hook, widest stereo."],
  ["Post-chorus", "4–8 bars", "A wordless hook that keeps energy up."],
  ["Bridge / breakdown", "8 bars", "Change something: key, texture, or remove drums."],
  ["Outro", "4–16 bars", "Strip back the way you built up."],
];
const GROOVE = [
  ["Swing", "Delays every off-beat. 50% = straight, 54–58% = subtle, 62–66% = full shuffle."],
  ["Backbeat", "Snare or clap on beats 2 and 4. This is what makes people nod."],
  ["Half-time", "Move the snare to beat 3 only. Instantly heavier at the same tempo."],
  ["Syncopation", "Accent just before a beat instead of on it. Most of what makes a groove."],
  ["Humanising", "Timing ±10–30 ms and velocity ±15 stops the grid sounding robotic."],
];
const HARM_ROLE = {
  1: "The fundamental — the pitch you actually hear.",
  2: "One octave up. Brightness without changing the note.",
  3: "Octave + a fifth. Why fifths sound so stable.",
  4: "Two octaves up.",
  5: "Major 3rd, 14 cents flatter than a piano's. Why real thirds sound sweeter.",
  6: "Fifth again, higher.",
  7: "Flat 7th, 31 cents flat. The natural blue note. Not on a piano at all.",
  8: "Three octaves up.",
  9: "Major 2nd / the 9th. Adds shimmer.",
  10: "Major 3rd again.",
  11: "Halfway between 4 and ♯4 — the alien one. Brass and bells.",
  12: "Fifth.", 13: "Roughly a ♭6. Metallic.", 14: "Flat 7th again.",
  15: "Major 7th.", 16: "Four octaves up.",
};
const WAVEFORMS = [
  ["Sine", "Fundamental only", "Pure, hollow, invisible in a mix. Subs, kick tails, soft pads."],
  ["Triangle", "Odd harmonics, falling fast", "Soft and flutey. Gentle leads, chip bass."],
  ["Square", "Odd harmonics only", "Hollow and woody, like a clarinet. Retro leads, plucks."],
  ["Sawtooth", "Every harmonic", "Brightest and fullest. Supersaws, strings, brass, acid bass."],
  ["Pulse 25%", "All but every 4th harmonic", "Thin and nasal. Cuts through a busy mix."],
  ["Noise", "No harmonic series at all", "No pitch. Percussion, air, risers, transient layers."],
];
const RATIOS = [
  ["Unison", "1:1", "Identical. Two identical sounds = 6 dB louder, or phase problems."],
  ["Octave", "2:1", "So consonant the ear treats it as the same note."],
  ["Perfect 5th", "3:2", "Harmonics line up almost perfectly. Stable, powerful, empty."],
  ["Perfect 4th", "4:3", "Stable but wants to resolve. Feels suspended."],
  ["Major 3rd", "5:4", "Sweet. Equal temperament makes it 14 cents sharp — that beating is normal."],
  ["Minor 3rd", "6:5", "Soft and dark. 16 cents flat in equal temperament."],
  ["Major 6th", "5:3", "Warm and open."],
  ["Minor 7th", "16:9", "Restless. The natural 7:4 version is the bluesy one."],
  ["Tritone", "45:32", "Harmonics never line up. Maximum roughness."],
  ["Minor 2nd", "16:15", "Harmonics close but not equal — you hear the clash as beating."],
];
const FORMANTS = [
  ["ee (see)", "270 Hz", "2290 Hz"], ["ih (sit)", "390 Hz", "1990 Hz"], ["eh (bed)", "530 Hz", "1840 Hz"],
  ["ah (father)", "730 Hz", "1090 Hz"], ["oh (bought)", "570 Hz", "840 Hz"], ["oo (boot)", "300 Hz", "870 Hz"],
];
const HARM_TRICKS = [
  "Distortion adds harmonics that were never there. Even-order (tube, tape) sounds warm; odd-order (transistor, fuzz) sounds hard.",
  "To make a bass audible on a phone, add harmonics at 2× and 3× the fundamental — the ear infers the missing sub.",
  "A high-passed layer two octaves up makes a dull sound read as bright without touching EQ.",
  "Detuning by cents changes width. Detuning by semitones changes harmony. Don't confuse the two.",
  "Reverb and delay tails inherit the harmonics of the source — filter the send, not just the return.",
  "If two sounds fight, move one by an octave before reaching for EQ. Register beats equalisation.",
];
const FIXES = [
  ["Make any chord sadder", "Lower the third by one semitone (major → minor), or add the 9th on top of a minor chord."],
  ["Make any chord bigger", "Don't add notes — move them apart. Root very low, everything else an octave or more above."],
  ["Make a loop feel new", "Keep the chords, change the bass note under one of them. Same harmony, new emotion."],
  ["Stop chords jumping around", "Use inversions so each note moves as little as possible. That's voice leading."],
  ["Melody won't fit", "Land on a chord tone (1, 3, 5) on strong beats, pass through the others."],
  ["Everything sounds boring", "Swap one chord for the same chord from the parallel minor. Try the minor iv or ♭VI."],
  ["Muddy mix", "High-pass everything except kick and bass. Two instruments in one octave is usually the cause, not EQ."],
  ["Build tension before a drop", "Loop shorter and shorter (2 bars → 1 → ½), rise in pitch, then one beat of silence."],
  ["Key change that always works", "Up one whole step for the last chorus, or move to the relative minor for a darker section."],
  ["Sound more human", "Nudge notes off the grid 10–30 ms, vary velocities ±15. Perfect timing sounds fake."],
];
const PRINCIPLES = [
  "Pick a key and stay in it until you have a reason not to.",
  "Four chords is plenty. Repetition is not a weakness.",
  "The bass note under a chord changes its emotion more than any added note.",
  "Space is an instrument. Mute a layer and see if you miss it.",
  "If the loop still feels good after ten plays, it's finished — arrange it.",
];

/* ============================== GLOSSARY ============================== */
const GLOSSARY = [
  ["Root", "notes", "The note a scale or chord is named after and built from."],
  ["Semitone", "notes", "The smallest step on a keyboard — one key to the very next, black or white."],
  ["Whole tone", "notes", "Two semitones. Skipping one key."],
  ["Octave", "notes", "Twelve semitones. The same letter name, higher or lower, at double or half the frequency."],
  ["Interval", "notes", "The distance between two notes, counted in semitones."],
  ["Degree", "notes", "A note's position in a scale, numbered 1 to 7. Degree 1 is home."],
  ["Tonic", "notes", "Another word for degree 1 — the note the music rests on."],
  ["Diatonic", "notes", "Belonging to the current key. Non-diatonic means borrowed or out."],
  ["Accidental", "notes", "A sharp (♯) raises a note one semitone, a flat (♭) lowers it one."],
  ["Enharmonic", "notes", "Two names for the same key: C♯ and D♭ are the same sound."],
  ["Relative minor", "notes", "The minor key using the same notes as a major key, starting three semitones lower."],
  ["Parallel minor", "notes", "The minor key with the same root, e.g. C major and C minor. Great for borrowing chords."],
  ["Mode", "notes", "A scale made by starting a familiar scale on a different degree. Dorian, Lydian and the rest."],
  ["Triad", "chords", "A three-note chord: root, third, fifth."],
  ["Inversion", "chords", "The same chord with a note other than the root at the bottom."],
  ["Voicing", "chords", "How a chord's notes are spread out and ordered. Same chord, different feel."],
  ["Voice leading", "chords", "Moving between chords so each note travels the shortest distance."],
  ["Extension", "chords", "Notes past the 7th — 9ths, 11ths, 13ths. Colour rather than structure."],
  ["sus", "chords", "The third is replaced by the 2nd or 4th, so the chord is neither major nor minor."],
  ["add9", "chords", "A plain triad with the 9th added, no 7th. Shimmer without jazz."],
  ["dim / °", "chords", "Diminished: minor with a flattened fifth. Unstable."],
  ["ø", "chords", "Half-diminished, written m7♭5. A diminished triad with a normal minor 7th."],
  ["Cadence", "chords", "How a phrase ends. V→I sounds final, IV→I sounds gentle, V→vi sounds like a surprise."],
  ["Modulation", "chords", "Changing key inside a song."],
  ["Transpose", "chords", "Move everything up or down by the same interval, keeping the shape."],
  ["BPM", "studio", "Beats per minute. The tempo."],
  ["Bar", "studio", "One group of beats, usually four. Sections are counted in bars."],
  ["Velocity", "studio", "How hard a MIDI note is struck, 1–127. Controls loudness and often tone."],
  ["Quantise", "studio", "Snap notes to the grid. Full quantise sounds tight but robotic."],
  ["Swing", "studio", "Delay every off-beat to create a shuffle feel."],
  ["Sidechain", "studio", "Duck one sound whenever another plays — usually bass under the kick."],
  ["High-pass", "studio", "Remove low frequencies. The single most useful mixing move."],
  ["Q", "studio", "How narrow an EQ band is. High Q = surgical, low Q = musical."],
  ["Cents", "studio", "1/100th of a semitone. The unit of detuning."],
  ["Formant", "studio", "A fixed resonant peak that makes a sound read as vocal."],
  ["Headroom", "studio", "Space left before clipping. Aim to peak around −6 dB while mixing."],
];

/* ============================== AUDIO ============================== */
let AC = null;
let TUNING = 440;
let VOL = 0.85;
const setTuning = (v) => { TUNING = v; };
const setVolume = (v) => { VOL = v; };
function ctx() {
  if (!AC) {
    const K = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!K) return null;
    AC = new K();
  }
  return AC;
}

/* iOS Safari requires AudioContext.resume() to finish inside a user gesture.
   Queue audio creation until the context is genuinely running. */
function withAudioContext(play) {
  const c = ctx();
  if (!c) return;

  if (c.state === "running") {
    play(c);
    return;
  }

  c.resume()
    .then(() => {
      if (c.state === "running") play(c);
    })
    .catch(() => {});
}
const freq = (m) => TUNING * Math.pow(2, (m - 69) / 12);
const fOf = (m, a4) => a4 * Math.pow(2, (m - 69) / 12);
const hz = (f) => (f >= 1000 ? (f / 1000).toFixed(2) + " kHz" : f >= 100 ? f.toFixed(0) + " Hz" : f.toFixed(2) + " Hz");
function nearestNote(f, a4) {
  const m = Math.round(69 + 12 * Math.log2(f / a4));
  return { m, cents: Math.round(1200 * Math.log2(f / fOf(m, a4))), name: octName(m, false) };
}
function tone(midi, dur = 0.9, when = 0, vol = 0.18) {
  withAudioContext((c) => {
    const t = c.currentTime + Math.max(0, when);
    const V = Math.max(0.00012, vol * VOL);
    const g = c.createGain();
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.exponentialRampToValueAtTime(1100, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(V, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g); g.connect(c.destination);
    const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = freq(midi);
    const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = freq(midi) * 2.002;
    const g2 = c.createGain(); g2.gain.value = 0.3;
    o2.connect(g2); g2.connect(lp); o.connect(lp);
    o.start(t); o2.start(t); o.stop(t + dur + 0.06); o2.stop(t + dur + 0.06);
  });
}
const strum = (midis, dur = 1.1, when = 0, vol = 0.15) => midis.forEach((m, i) => tone(m, dur, when + i * 0.012, vol));
function sine(f, dur, when, vol = 0.13) {
  withAudioContext((c) => {
    const t = c.currentTime + Math.max(0, when);
    const g = c.createGain(); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * VOL, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = c.createOscillator(); o.type = "sine"; o.frequency.value = f;
    o.connect(g); o.start(t); o.stop(t + dur + 0.05);
  });
}
function voice(rootPc, iv) {
  let base = 60 + rootPc;
  if (base > 66) base -= 12;
  return iv.map((x) => base + x);
}

/* ============================== MIDI EXPORT ============================== */
const PPQ = 480;
function vlq(n) {
  const b = [n & 0x7f];
  n >>= 7;
  while (n > 0) { b.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return b;
}
function buildMidi(items, bpm, name) {
  const ev = [];
  items.forEach((n) => {
    ev.push({ t: n.tick, o: 1, d: [0x90, n.midi & 127, n.vel || 100] });
    ev.push({ t: n.tick + n.dur, o: 0, d: [0x80, n.midi & 127, 64] });
  });
  ev.sort((a, b) => a.t - b.t || a.o - b.o);
  const trk = [];
  const mpq = Math.round(60000000 / bpm);
  trk.push(0x00, 0xff, 0x51, 0x03, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255);
  const title = (name || "Theory Desk").replace(/[^\x20-\x7e]/g, "").slice(0, 40);
  trk.push(0x00, 0xff, 0x03, title.length, ...title.split("").map((c) => c.charCodeAt(0)));
  let last = 0;
  ev.forEach((e) => { trk.push(...vlq(e.t - last)); last = e.t; trk.push(...e.d); });
  trk.push(0x00, 0xff, 0x2f, 0x00);
  const L = trk.length;
  return new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (PPQ >> 8) & 255, PPQ & 255,
    0x4d, 0x54, 0x72, 0x6b, (L >>> 24) & 255, (L >>> 16) & 255, (L >>> 8) & 255, L & 255, ...trk,
  ]);
}
const safeName = (s) => s.replace(/♯/g, "sharp").replace(/♭/g, "flat").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
function downloadMidi(items, bpm, name) {
  try {
    const url = URL.createObjectURL(new Blob([buildMidi(items, bpm, name)], { type: "audio/midi" }));
    const a = document.createElement("a");
    a.href = url; a.download = safeName(name) + ".mid";
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    return true;
  } catch (e) { return false; }
}

/* ============================== MATCHING ============================== */
const pcsOf = (root, iv) => uniq(iv.map((x) => (root + x) % 12)).sort((a, b) => a - b);
function matchChords(sel) {
  const exact = [], partial = [];
  if (sel.length < 2) return { exact, partial };
  const key = sel.join(",");
  const low = sel[0];
  for (let r = 0; r < 12; r++) {
    CHORDS.forEach((c, ci) => {
      const pcs = pcsOf(r, c.iv);
      if (pcs.length < sel.length) return;
      const k = pcs.join(",");
      if (k === key) exact.push({ root: r, c, ci, inv: r !== low });
      else if (sel.every((p) => pcs.includes(p)) && pcs.length - sel.length <= 2)
        partial.push({ root: r, c, ci, extra: pcs.length - sel.length });
    });
  }
  exact.sort((a, b) => a.c.iv.length - b.c.iv.length || a.inv - b.inv || a.ci - b.ci);
  partial.sort((a, b) => a.extra - b.extra || a.ci - b.ci);
  return { exact, partial: partial.slice(0, 10) };
}
function matchScales(sel) {
  const out = [];
  if (!sel.length) return out;
  for (let r = 0; r < 12; r++) {
    SCALES.forEach((s, si) => {
      if (s.id === "chromatic") return;
      const pcs = pcsOf(r, s.iv);
      if (!sel.every((p) => pcs.includes(p))) return;
      out.push({ root: r, s, si, extra: s.iv.length - sel.length, rooted: sel.includes(r) });
    });
  }
  out.sort((a, b) => a.s.iv.length - b.s.iv.length || b.rooted - a.rooted || a.si - b.si);
  return out;
}

/* ============================== NAVIGATION MODEL ============================== */
const CATS = [
  { id: "start", name: "Start here" },
  { id: "notes", name: "Notes & keys" },
  { id: "chords", name: "Chords" },
  { id: "sound", name: "Sound" },
  { id: "studio", name: "Studio" },
];
const MODULES = [
  { id: "identify", cat: "start", name: "Identify notes", lede: "Tap the notes you heard and find out what chord or scale they are.",
    kw: "reverse lookup what chord is this find key notes name" },
  { id: "tempopitch", cat: "start", name: "Note ↔ tempo", lede: "Turn a note into a tempo, or find out which note your tempo already is.",
    kw: "tempo bpm note pitch frequency hz convert tune kick lfo reverse" },
  { id: "feel", cat: "start", name: "Start from a feeling", lede: "Pick a mood and get the scale, chords, tempo and production moves that make it.",
    kw: "mood emotion happy sad dark epic dreamy recipe" },
  { id: "scales", cat: "notes", name: "Scales", lede: "Which notes belong together, and what each set of them sounds like.",
    kw: "scale mode major minor dorian pentatonic blues notes" },
  { id: "intervals", cat: "notes", name: "Intervals", lede: "The distance between two notes, and the feeling each distance carries.",
    kw: "interval third fifth tritone octave semitone distance" },
  { id: "circle", cat: "notes", name: "Circle of fifths", lede: "Which keys are neighbours, and how to move between them.",
    kw: "circle fifths key signature relative minor modulation sharps flats" },
  { id: "chordtypes", cat: "chords", name: "Chord types", lede: "Every chord shape, its notes, and what it is for.",
    kw: "chord major minor seventh sus add9 diminished augmented voicing" },
  { id: "inkey", cat: "chords", name: "Chords in the key", lede: "The chords that fit your key, and what each one does.",
    kw: "diatonic roman numeral function key chords fit" },
  { id: "progressions", cat: "chords", name: "Progressions", lede: "Chord sequences that already work, in your key.",
    kw: "progression sequence loop pop jazz blues axis 251 turnaround" },
  { id: "frequencies", cat: "sound", name: "Frequencies & tuning", lede: "Notes as numbers: Hz, tempo, delay times, detune.",
    kw: "hz frequency tuning 440 432 kick tune tempo lfo delay comb cents" },
  { id: "harmonics", cat: "sound", name: "Harmonics", lede: "Why instruments sound the way they do, and how to use it.",
    kw: "harmonic overtone undertone partial waveform resonance formant timbre" },
  { id: "rhythm", cat: "studio", name: "Rhythm & tempo", lede: "Note lengths, time signatures, groove and genre tempos.",
    kw: "rhythm tempo bpm time signature swing groove note length ms" },
  { id: "mixing", cat: "studio", name: "Dynamics & mixing", lede: "How loud, and where in the frequency spectrum.",
    kw: "dynamics velocity mixing eq frequency range instrument articulation" },
  { id: "arrangement", cat: "studio", name: "Arrangement", lede: "How a track is put together, section by section.",
    kw: "arrangement structure intro verse chorus bridge bars sections" },
  { id: "fixes", cat: "studio", name: "Fixes", lede: "Common problems and the fastest way out of each.",
    kw: "fix problem boring muddy sad bigger tension stuck help" },
  { id: "glossary", cat: "studio", name: "Glossary", lede: "Plain-English definitions of every term in this app.",
    kw: "glossary definition meaning term symbol what does mean" },
];
const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m]));
const SEE_ALSO = {
  identify: ["scales", "chordtypes"], feel: ["progressions", "scales"],
  tempopitch: ["frequencies", "rhythm"],
  scales: ["inkey", "circle", "intervals"], intervals: ["harmonics", "chordtypes"],
  circle: ["scales", "inkey"], chordtypes: ["inkey", "identify"],
  inkey: ["progressions", "circle"], progressions: ["inkey", "feel"],
  frequencies: ["harmonics", "tempopitch"], harmonics: ["frequencies", "mixing"],
  rhythm: ["arrangement", "frequencies"], mixing: ["harmonics", "arrangement"],
  arrangement: ["rhythm", "fixes"], fixes: ["inkey", "mixing"], glossary: ["scales", "chordtypes"],
};

/* ============================== CONTEXT ============================== */
const Ctx = createContext(null);
const useDesk = () => useContext(Ctx);

/* ============================== UI ATOMS ============================== */
function Card({ title, hint, children, accent }) {
  return (
    <section className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
      {title && (
        <header className="mb-3">
          <h2 style={{ fontFamily: SERIF, fontSize: 16, color: accent || "var(--text)", lineHeight: 1.3 }}>{title}</h2>
          {hint && <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>{hint}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

function Line({ label, value, sub, onClick, active }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button", onClick } : {})}
      className="flex w-full items-baseline justify-between gap-3 border-b py-2 text-left"
      style={{ borderColor: "var(--line)" }}
    >
      <span className="min-w-0">
        <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "var(--root)" : "var(--text)" }}>{label}</span>
        {sub && <span className="block text-xs" style={{ color: "var(--muted)" }}>{sub}</span>}
      </span>
      {value != null && (
        <span className="shrink-0" style={{ fontFamily: MONO, fontSize: 12, color: "var(--scale)" }}>{value}</span>
      )}
    </Tag>
  );
}

function Def({ term, children }) {
  return (
    <div className="flex gap-3 py-1">
      <div className="shrink-0" style={{ width: 104, fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em", paddingTop: 3 }}>{term}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}

function Btn({ onClick, children, tone = "line", size = "md", label, pressed, style }) {
  const tones = {
    line: { bg: "transparent", fg: "var(--text)", bd: "var(--line)" },
    quiet: { bg: "transparent", fg: "var(--muted)", bd: "var(--line)" },
    play: { bg: "transparent", fg: "var(--scale)", bd: "var(--scale)" },
    chord: { bg: "transparent", fg: "var(--chord)", bd: "var(--chord)" },
    root: { bg: "var(--root)", fg: "var(--bg)", bd: "var(--root)" },
    warn: { bg: "transparent", fg: "var(--warn)", bd: "var(--warn)" },
  };
  const t = tones[tone] || tones.line;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="rounded-lg"
      style={{
        height: size === "sm" ? 30 : 36, padding: size === "sm" ? "0 10px" : "0 12px",
        fontSize: size === "sm" ? 12 : 13, background: t.bg, color: t.fg, border: "1px solid " + t.bd,
        whiteSpace: "nowrap", ...style,
      }}
    >
      {children}
    </button>
  );
}

function Choice({ options, value, onChange, ariaLabel, tone = "root" }) {
  const fg = tone === "chord" ? "var(--chord)" : "var(--root)";
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={ariaLabel}>
      {options.map(([v, l]) => {
        const on = v === value;
        return (
          <button
            type="button"
            key={v}
            aria-pressed={on}
            onClick={() => onChange(v)}
            className="rounded-md"
            style={{
              height: 30, padding: "0 10px", fontSize: 12,
              background: on ? fg : "var(--raised)", color: on ? "var(--bg)" : "var(--text)",
              border: "1px solid " + (on ? fg : "var(--line)"), fontWeight: on ? 700 : 500,
            }}
          >{l}</button>
        );
      })}
    </div>
  );
}

/* a note or chord name that plays when tapped — the app-wide convention */
function Sound({ onPlay, children, big, tone = "chord", sub }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="rounded-lg text-left"
      style={{
        background: "var(--raised)", border: "1px solid var(--line)",
        padding: big ? "8px 12px" : "6px 10px", minWidth: big ? 84 : 56,
      }}
    >
      <span className="block" style={{ fontFamily: MONO, fontSize: big ? 17 : 14, fontWeight: 700, color: "var(--" + tone + ")" }}>
        {children}
      </span>
      {sub && <span className="block" style={{ fontSize: 10, color: "var(--muted)" }}>{sub}</span>}
    </button>
  );
}

function BpmControl({ bpm, setBpm }) {
  const [txt, setTxt] = useState(String(bpm));
  useEffect(() => { setTxt(String(bpm)); }, [bpm]);
  const clamp = (n) => Math.min(500, Math.max(20, n));
  const commit = (raw) => {
    const n = parseFloat(raw);
    if (isNaN(n)) { setTxt(String(bpm)); return; }
    setBpm(clamp(Math.round(n * 10) / 10));
  };
  const nudge = (d) => setBpm(clamp(Math.round((bpm + d) * 10) / 10));
  const stepBtn = {
    width: 32, height: 34, background: "var(--raised)", border: "1px solid var(--line)",
    borderRadius: 8, fontSize: 16, lineHeight: 1, color: "var(--text)",
  };
  return (
    <div className="flex items-center gap-1" style={{ flex: "1 1 230px" }}>
      <button type="button" onClick={() => nudge(-1)} aria-label="Tempo down one BPM" style={stepBtn}>−</button>
      <input
        type="text" inputMode="decimal" value={txt} aria-label="Tempo in BPM"
        onChange={(e) => setTxt(e.target.value.replace(/[^0-9.]/g, "").slice(0, 5))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { commit(e.currentTarget.value); e.currentTarget.blur(); } }}
        className="rounded-lg text-center"
        style={{ height: 34, width: 58, background: "var(--raised)", border: "1px solid var(--line)", fontFamily: MONO, fontSize: 13 }}
      />
      <button type="button" onClick={() => nudge(1)} aria-label="Tempo up one BPM" style={stepBtn}>+</button>
      <span className="text-xs" style={{ color: "var(--muted)" }}>BPM</span>
      <input type="range" min={20} max={500} step={1} value={Math.round(bpm)} onChange={(e) => setBpm(+e.target.value)}
        aria-label="Tempo slider" className="flex-1" style={{ accentColor: "var(--root)", minWidth: 56 }} />
    </div>
  );
}

/* ============================== KEYBOARD ============================== */
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_DEFS = [{ after: 0, pc: 1 }, { after: 1, pc: 3 }, { after: 3, pc: 6 }, { after: 4, pc: 8 }, { after: 5, pc: 10 }];

function Keyboard({ octaves = 2, base = 60, paint, onKey, height = 96, flat }) {
  const whites = [];
  for (let o = 0; o < octaves; o++) WHITE_PCS.forEach((pc) => whites.push({ pc, midi: base + o * 12 + pc }));
  const blacks = [];
  for (let o = 0; o < octaves; o++) BLACK_DEFS.forEach((b) => blacks.push({ pc: b.pc, midi: base + o * 12 + b.pc, idx: o * 7 + b.after }));
  const bw = (100 / whites.length) * 0.58;
  return (
    <div className="relative w-full select-none" style={{ height }}>
      <div className="flex h-full w-full" style={{ gap: 2 }}>
        {whites.map((k, i) => {
          const m = paint(k.pc);
          return (
            <button
              type="button"
              key={"w" + i}
              onPointerDown={() => onKey(k.midi)}
              aria-label={octName(k.midi, flat)}
              className="relative flex-1"
              style={{
                background: m ? m.color : "var(--key-white)",
                border: "1px solid var(--key-white-edge)", borderTop: "none",
                borderRadius: "0 0 4px 4px",
              }}
            >
              <span className="absolute inset-x-0 bottom-1 text-center"
                style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: m ? "#141019" : "var(--faint)" }}>
                {m ? m.label : nameOf(k.pc, flat)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-0">
        {blacks.map((k, i) => {
          const m = paint(k.pc);
          return (
            <button
              type="button"
              key={"b" + i}
              onPointerDown={() => onKey(k.midi)}
              aria-label={octName(k.midi, flat)}
              className="pointer-events-auto absolute top-0"
              style={{
                left: `calc(${((k.idx + 1) / whites.length) * 100}% - ${bw / 2}%)`,
                width: bw + "%", height: height * 0.6,
                background: m ? m.color : "var(--key-black)",
                border: "1px solid var(--key-black)", borderRadius: "0 0 3px 3px",
                boxShadow: "0 2px 4px rgba(0,0,0,.45)",
              }}
            >
              <span className="absolute inset-x-0 bottom-1 text-center"
                style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: m ? "#141019" : "transparent" }}>
                {m ? m.label : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== MODULE: IDENTIFY ============================== */
function IdentifyModule() {
  const { sel, setSel, flat, setRootPc, setScaleId, setChordId, go, scratch } = useDesk();
  const [more, setMore] = useState(false);
  const sorted = useMemo(() => [...sel].sort((a, b) => a - b), [sel]);
  const { exact, partial } = useMemo(() => matchChords(sorted), [sorted]);
  const scales = useMemo(() => matchScales(sorted), [sorted]);
  const gap = sorted.length === 2 ? (sorted[1] - sorted[0]) % 12 : null;
  const iv = gap !== null ? INTERVALS.find((x) => x.s === gap) : null;
  const useChord = (m) => { setRootPc(m.root); setChordId(m.c.id); go("chordtypes"); };
  const useScale = (m) => { setRootPc(m.root); setScaleId(m.s.id); go("scales"); };

  return (
    <>
      <Card title="Pick the notes you heard" hint="Tap here, or tap the keyboard at the top — it is in selection mode while this page is open.">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Select notes">
          {Array.from({ length: 12 }, (_, pc) => {
            const on = sel.includes(pc);
            return (
              <button
                type="button" key={pc} aria-pressed={on}
                onClick={() => { setSel(on ? sel.filter((p) => p !== pc) : [...sel, pc]); tone(60 + pc, 0.6); }}
                className="rounded-md"
                style={{
                  height: 40, minWidth: 46, fontFamily: MONO, fontSize: 14, fontWeight: on ? 700 : 500,
                  background: on ? "var(--warn)" : BLACK_PCS.includes(pc) ? "var(--raised)" : "var(--surface)",
                  color: on ? "var(--bg)" : "var(--text)",
                  border: "1px solid " + (on ? "var(--warn)" : "var(--line)"),
                }}
              >{nameOf(pc, flat)}</button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {sel.length === 0 ? "Nothing selected yet."
              : sel.length === 1 ? "One note fits everything — add two more."
              : sel.length + " notes selected."}
          </span>
          {sel.length > 0 && <Btn size="sm" tone="warn" onClick={() => setSel([])}>Clear</Btn>}
        </div>
      </Card>

      {iv && (
        <Card title="Two notes — that is an interval">
          <div className="flex items-baseline gap-3">
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: "var(--root)" }}>{iv.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--scale)" }}>{gap} semitones</span>
          </div>
          <p className="mt-1" style={{ fontSize: 14 }}>{iv.feel}</p>
        </Card>
      )}

      {sel.length >= 2 && (
        <Card title={exact.length ? "This is" : "No exact chord match"}
          hint={exact.length > 1 ? "The same notes spell more than one chord. Whichever note is lowest in the bass is the one the ear hears as the root." : undefined}>
          {exact.length === 0 && <p style={{ fontSize: 14, color: "var(--muted)" }}>Try the chords below that contain your notes, or remove a note.</p>}
          <div className="flex flex-wrap gap-2">
            {exact.slice(0, 6).map((m, i) => (
              <div key={i} className="flex items-stretch gap-1">
                <Sound big onPlay={() => useChord(m)} sub={m.c.name + (m.inv ? " · inversion" : "")}>
                  {nameOf(m.root, flat)}{m.c.sym}
                </Sound>
                <button type="button" onClick={() => scratch.addChord(m.root, m.c.iv, nameOf(m.root, flat) + m.c.sym)}
                  aria-label={"Add " + nameOf(m.root, flat) + m.c.sym + " to the scratchpad"} className="rounded-lg"
                  style={{ width: 30, fontSize: 16, background: "var(--raised)", border: "1px solid var(--line)", color: "var(--chord)" }}>+</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {sel.length >= 2 && partial.length > 0 && (
        <Card title="Chords that contain these notes" hint="+1 means the chord adds one note you did not select. Useful for growing a voicing.">
          <div className="flex flex-wrap gap-2">
            {partial.map((m, i) => (
              <Sound key={i} onPlay={() => useChord(m)} sub={"+" + m.extra}>
                {nameOf(m.root, flat)}{m.c.sym}
              </Sound>
            ))}
          </div>
        </Card>
      )}

      {sel.length >= 1 && (
        <Card title={`Scales that contain all ${sel.length} note${sel.length === 1 ? "" : "s"}`} hint={scales.length + " matches, tightest fit first"}>
          {scales.length === 0 && (
            <p style={{ fontSize: 14, color: "var(--muted)" }}>
              No named scale holds all of those — normal once you pass seven notes. You are either changing key or using chromatic passing notes.
            </p>
          )}
          {scales.slice(0, more ? 40 : 8).map((m, i) => (
            <Line key={i} active={i === 0}
              label={nameOf(m.root, flat) + " " + m.s.name.toLowerCase()}
              sub={spellScale(nameOf(m.root, flat), m.s.iv, flat).join("  ")}
              value={m.extra === 0 ? "exact" : "+" + m.extra}
              onClick={() => useScale(m)} />
          ))}
          {scales.length > 8 && (
            <button type="button" onClick={() => setMore(!more)} className="mt-2 text-xs" style={{ color: "var(--scale)" }}>
              {more ? "Show fewer" : `Show all ${scales.length}`}
            </button>
          )}
        </Card>
      )}

      <Card title="What this is for">
        <Def term="Name a chord">Tap the notes of a voicing you like and read the top result.</Def>
        <Def term="Find the key">Tap the notes of a melody or sample. The shortest scale that fits is usually the key.</Def>
        <Def term="Fix a clash">Tap the notes of two parts that fight. If nothing sensible matches, one is out of key.</Def>
        <Def term="Pick a solo scale">Tap the notes of the chord you are playing over. Any matching scale will work.</Def>
      </Card>
    </>
  );
}

/* ============================== MODULE: FEELING ============================== */
function FeelModule() {
  const { rootName, rootPc, setScaleId, setProgId, go, hear } = useDesk();
  const [id, setId] = useState(null);
  const m = MOODS.find((x) => x.id === id);
  return (
    <>
      <Card title="What should it feel like?" hint="Choosing a feeling sets the scale and progression for the whole app.">
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((x) => (
            <Btn key={x.id} size="sm" pressed={x.id === id}
              tone={x.id === id ? "root" : "line"}
              onClick={() => { setId(x.id); setScaleId(x.scale); setProgId(x.prog); }}>
              {x.name}
            </Btn>
          ))}
        </div>
      </Card>

      {m && (
        <>
          <Card title={`${m.name} in ${rootName}`} accent="var(--root)">
            <Def term="Scale">{rootName} {SCALE_BY_ID[m.scale].name.toLowerCase()} — loaded above.</Def>
            <Def term="Progression">{PROG_BY_ID[m.prog].name}</Def>
            <Def term="Tempo">{m.bpm} BPM</Def>
            <div className="mt-3 flex flex-wrap gap-2">
              {m.chords.map((cid) => {
                const c = CHORD_BY_ID[cid];
                return <Sound key={cid} onPlay={() => hear.chord(rootPc, c.iv)} sub={c.name}>{rootName}{c.sym}</Sound>;
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn size="sm" onClick={() => go("progressions")}>Open the progression</Btn>
              <Btn size="sm" onClick={() => go("inkey")}>Chords in this key</Btn>
            </div>
          </Card>
          <Card title="Production moves">
            {m.tips.map((t, i) => (
              <p key={i} className="flex gap-2 py-1" style={{ fontSize: 14 }}>
                <span style={{ color: "var(--scale)" }}>—</span><span>{t}</span>
              </p>
            ))}
          </Card>
        </>
      )}
    </>
  );
}

/* ============================== MODULE: SCALES ============================== */
function ScalesModule() {
  const { scale, scaleId, setScaleId, notes, degs, rootName, rootPc, flat, hear } = useDesk();
  const relPc = scale.parent === "major" ? (rootPc + 9) % 12 : (rootPc + 3) % 12;
  const relName = scale.parent === "major" ? "minor" : "major";
  return (
    <>
      <Card title={`${rootName} ${scale.name.toLowerCase()}`} hint={scale.feel}>
        <div className="flex flex-wrap gap-1.5">
          {notes.map((n, i) => (
            <Sound key={i} big tone={i === 0 ? "root" : "scale"} sub={degs[i]}
              onPlay={() => tone(60 + rootPc + scale.iv[i], 0.8)}>{n}</Sound>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn size="sm" tone="play" onClick={hear.scale}>▶ Hear the scale</Btn>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Used in: {scale.use}</p>
      </Card>

      <Card title="Quick facts">
        <Def term="Home note">{rootName} — start and end here and it sounds finished.</Def>
        <Def term="Note count">{scale.iv.length} of the 12. The others are usable as passing colour, not as places to land.</Def>
        {scale.iv.length === 7 && (
          <Def term="Relative key">Same notes as {nameOf(relPc, flat)} {relName}. Same set, different home, opposite mood.</Def>
        )}
        <Def term="Melody rule">Land on 1, 3 or 5 on strong beats. Everything else is passing motion.</Def>
      </Card>

      <Card title="Browse by sound" hint="Every scale in the app, with what it is for.">
        {SCALES.map((s) => (
          <Line key={s.id} active={s.id === scaleId} label={s.name} sub={s.feel} value={s.iv.length + " notes"}
            onClick={() => setScaleId(s.id)} />
        ))}
      </Card>
    </>
  );
}

/* ============================== MODULE: INTERVALS ============================== */
function IntervalsModule() {
  const { rootPc, rootName, flat, flash } = useDesk();
  return (
    <>
      <Card title={`Distances from ${rootName}`} hint="An interval is how many keys apart two notes are, counting black keys. Tap to hear it.">
        {INTERVALS.map((iv) => {
          const top = (rootPc + iv.s) % 12;
          return (
            <button key={iv.s} type="button" aria-label={"Hear " + iv.name}
              onClick={() => {
                tone(60 + rootPc, 1.1); tone(60 + rootPc + iv.s, 1.1, 0.06);
                flash(uniq([rootPc, top]), [rootName, nameOf(top, flat)], "var(--scale)", rootPc);
              }}
              className="flex w-full items-center gap-3 border-b py-2 text-left" style={{ borderColor: "var(--line)" }}>
              <span className="shrink-0 rounded-md px-2 py-1 text-center"
                style={{ background: "var(--raised)", border: "1px solid var(--line)", minWidth: 48 }}>
                <span className="block" style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "var(--root)" }}>{iv.short}</span>
                <span className="block" style={{ fontFamily: MONO, fontSize: 9, color: "var(--muted)" }}>{iv.s}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-2">
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{iv.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--scale)" }}>{rootName} → {nameOf(top, flat)}</span>
                </span>
                <span className="block" style={{ fontSize: 13 }}>{iv.feel}</span>
                <span className="block text-xs" style={{ color: "var(--muted)" }}>{iv.song}</span>
              </span>
            </button>
          );
        })}
      </Card>
    </>
  );
}

/* ============================== MODULE: CIRCLE ============================== */
function CircleModule() {
  const { rootPc, setRootPc, setFlat, setScaleId } = useDesk();
  const idx = CIRCLE.findIndex((c) => c.pc === rootPc);
  const cur = idx >= 0 ? CIRCLE[idx] : null;
  const R = 128, r1 = 100, r2 = 62;
  const pos = (i, r) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return [R + r * Math.cos(a), R + r * Math.sin(a)];
  };
  const near = idx >= 0 ? [(idx + 11) % 12, (idx + 1) % 12] : [];
  const pick = (pc, flatKey, sid) => { setRootPc(pc); setFlat(flatKey); setScaleId(sid); };
  return (
    <>
      <Card title="Which keys are neighbours" hint="Outer ring: major keys. Inner ring: their relative minors. Tap to switch key.">
        <div className="flex justify-center">
          <svg viewBox="0 0 256 256" style={{ width: "100%", maxWidth: 330 }} role="group" aria-label="Circle of fifths">
            <circle cx={R} cy={R} r={122} fill="none" stroke="var(--line)" />
            <circle cx={R} cy={R} r={82} fill="none" stroke="var(--line)" />
            {CIRCLE.map((c, i) => {
              const [x, y] = pos(i, r1), [mx, my] = pos(i, r2);
              const isCur = i === idx, isNear = near.includes(i);
              return (
                <g key={c.maj}>
                  <circle cx={x} cy={y} r={20} style={{ cursor: "pointer" }}
                    fill={isCur ? "var(--root)" : "var(--raised)"}
                    stroke={isCur ? "var(--root)" : isNear ? "var(--scale)" : "var(--line)"}
                    role="button" tabIndex={0} aria-label={c.maj + " major"}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(c.pc, c.flat, "major"); } }}
                    onClick={() => pick(c.pc, c.flat, "major")} />
                  <text x={x} y={y + 5} textAnchor="middle" pointerEvents="none"
                    style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, fill: isCur ? "var(--bg)" : "var(--text)" }}>{c.maj}</text>
                  <circle cx={mx} cy={my} r={15} fill="var(--surface)" stroke="var(--line)" style={{ cursor: "pointer" }}
                    role="button" tabIndex={0} aria-label={c.min + " minor"}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(c.minPc, c.flat, "minor"); } }}
                    onClick={() => pick(c.minPc, c.flat, "minor")} />
                  <text x={mx} y={my + 4} textAnchor="middle" pointerEvents="none"
                    style={{ fontFamily: MONO, fontSize: 11, fill: "var(--muted)" }}>{c.min}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>
      <Card title="How to use it">
        {cur && <Def term="You are here">{cur.maj} major has {cur.sig}. Its relative minor is {cur.min} — identical notes, sadder home.</Def>}
        {cur && <Def term="Neighbours">{CIRCLE[(idx + 11) % 12].maj} and {CIRCLE[(idx + 1) % 12].maj} share all but one note with {cur.maj}. Ideal for a key change or a borrowed chord.</Def>}
        <Def term="Six chords">Your key, its two neighbours, and the three minors beneath them are the six main chords of the key.</Def>
        <Def term="Modulation">One step clockwise lifts the energy, one step anticlockwise relaxes it.</Def>
        <Def term="Sampling">If two tracks sit next to each other here, they will layer with almost no clashing.</Def>
      </Card>
    </>
  );
}

/* ============================== MODULE: CHORD TYPES ============================== */
const CHORD_GROUPS = [
  ["Triads", ["maj", "min", "dim", "aug", "sus2", "sus4", "5"]],
  ["Sixths & sevenths", ["6", "m6", "maj7", "7", "m7", "mMaj7", "m7b5", "dim7", "7sus4", "maj7s5"]],
  ["Extensions", ["add9", "madd9", "9", "maj9", "m9", "11", "13"]],
  ["Altered", ["7b9", "7s9"]],
];
function ChordTypesModule() {
  const { chordId, setChordId, rootPc, rootName, flat, scalePcs, scale, hear, scratch } = useDesk();
  const c = CHORD_BY_ID[chordId] || CHORDS[0];
  const noteNames = c.iv.map((x) => nameOf(rootPc + x, flat));
  const inKey = c.iv.every((x) => scalePcs.includes((rootPc + x) % 12));
  return (
    <>
      <Card title={`${rootName}${c.sym}`} hint={c.name} accent="var(--chord)">
        <div className="flex flex-wrap gap-1.5">
          {c.iv.map((x, i) => (
            <Sound key={i} big tone={i === 0 ? "root" : "chord"} sub={EXT_DEG[x] || CHROM_DEG[x % 12]}
              onPlay={() => tone(voice(rootPc, c.iv)[i], 0.9)}>{noteNames[i]}</Sound>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Btn size="sm" tone="chord" onClick={() => hear.chord(rootPc, c.iv, noteNames)}>▶ Hear it</Btn>
          <Btn size="sm" onClick={() => scratch.addChord(rootPc, c.iv, rootName + c.sym)}>+ Scratchpad</Btn>
          <span className="text-xs" style={{ color: inKey ? "var(--scale)" : "var(--warn)" }}>
            {inKey ? `Fits ${rootName} ${scale.name.toLowerCase()}` : `Has notes outside ${rootName} ${scale.name.toLowerCase()} — fine as colour`}
          </span>
        </div>
        <p className="mt-3" style={{ fontSize: 14 }}>{c.feel}</p>
      </Card>

      <Card title="Pick a chord type">
        {CHORD_GROUPS.map(([title, ids]) => (
          <div key={title} className="mb-3">
            <div className="mb-1.5 text-xs uppercase" style={{ letterSpacing: ".14em", color: "var(--muted)" }}>{title}</div>
            <div className="flex flex-wrap gap-1">
              {ids.map((id) => {
                const on = id === chordId;
                const ch = CHORD_BY_ID[id];
                return (
                  <button type="button" key={id} aria-pressed={on} onClick={() => setChordId(id)}
                    className="rounded-md"
                    style={{
                      height: 32, padding: "0 10px", fontFamily: MONO, fontSize: 12, fontWeight: on ? 700 : 500,
                      background: on ? "var(--chord)" : "var(--raised)", color: on ? "var(--bg)" : "var(--text)",
                      border: "1px solid " + (on ? "var(--chord)" : "var(--line)"),
                    }}>{ch.sym === "" ? "maj" : ch.sym}</button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      <Card title="How chords are built" hint="Start on a note, skip one scale note, take the next. Keep skipping to add colour.">
        <Def term="3rd">Decides happy (major) or sad (minor). The most important note after the root.</Def>
        <Def term="5th">Adds power. Safe to remove if the chord feels crowded.</Def>
        <Def term="7th">Adds sophistication: maj7 dreamy, dom7 bluesy, m7 smooth.</Def>
        <Def term="9th and up">Pure flavour. Put them at the top, never next to the root.</Def>
        <Def term="Spacing">A chord sounds bigger when its notes are further apart, not when you add more.</Def>
      </Card>
    </>
  );
}

/* ============================== MODULE: CHORDS IN KEY ============================== */
function InKeyModule() {
  const { scale, rootPc, rootName, flat, sevenths, setSevenths, hear, go, scratch } = useDesk();
  const src = scale.iv.length === 7 ? scale : SCALE_BY_ID[scale.parent];
  const list = useMemo(() => buildDiatonic(src.iv, sevenths), [src, sevenths]);
  return (
    <>
      <Card title={`The chords of ${rootName} ${scale.name.toLowerCase()}`}
        hint={scale.iv.length === 7 ? "Any of these in any order will sound acceptable. Start and end on the first." : `${scale.name} has ${scale.iv.length} notes, so these come from its parent ${src.name.toLowerCase()} scale.`}>
        <div className="mb-3"><Choice ariaLabel="Chord size" value={sevenths ? "7" : "3"}
          onChange={(v) => setSevenths(v === "7")} options={[["3", "Triads"], ["7", "7th chords"]]} /></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {list.map((d, i) => {
            const pc = (rootPc + d.semis) % 12;
            const iv = d.chord ? d.chord.iv : [0, 4, 7];
            const nm = nameOf(pc, flat) + (d.chord ? d.chord.sym : "");
            return (
              <div key={i} className="relative rounded-lg"
                style={{ background: "var(--raised)", border: "1px solid " + (i === 0 ? "var(--root)" : "var(--line)") }}>
                <button type="button" onClick={() => hear.chord(pc, iv)} aria-label={"Hear " + nm}
                  className="w-full p-2 text-left" style={{ paddingRight: 30 }}>
                  <span className="block" style={{ fontFamily: MONO, fontSize: 11, color: "var(--muted)" }}>{d.roman}</span>
                  <span className="block" style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: i === 0 ? "var(--root)" : "var(--text)" }}>{nm}</span>
                  <span className="block" style={{ fontSize: 10, color: "var(--muted)" }}>{d.chord ? d.chord.name : ""}</span>
                </button>
                <button type="button" onClick={() => scratch.addChord(pc, iv, nm)} aria-label={"Add " + nm + " to the scratchpad"}
                  className="absolute rounded"
                  style={{
                    top: 4, right: 4, width: 26, height: 26, fontSize: 16, lineHeight: 1,
                    background: "var(--surface)", border: "1px solid var(--line)", color: "var(--chord)",
                  }}>+</button>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          Tap a chord to hear it, or <span style={{ color: "var(--chord)" }}>+</span> to drop it into the scratchpad at the bottom of the page. Add several to build a sequence.
        </p>
      </Card>

      <Card title="What each one does" hint="The job a chord has in a key, in a major scale. Minor keys work the same way one row down.">
        {FUNCTIONS.map(([r, role, txt]) => (
          <div key={r} className="flex gap-3 border-b py-2" style={{ borderColor: "var(--line)" }}>
            <span className="shrink-0" style={{ width: 40, fontFamily: MONO, fontSize: 13, fontWeight: 700, color: "var(--root)" }}>{r}</span>
            <span className="shrink-0" style={{ width: 62, fontSize: 12, color: "var(--scale)" }}>{role}</span>
            <span style={{ fontSize: 13 }}>{txt}</span>
          </div>
        ))}
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn size="sm" onClick={() => go("progressions")}>See these in real progressions</Btn>
        </div>
      </Card>

      <Card title="Rules of thumb">
        <Def term="Strongest pull">The V chord pulls hardest back to I. Put it just before the loop restarts.</Def>
        <Def term="Emotional pair">I and vi are the same notes with a different mood. Swap them to change a section.</Def>
        <Def term="The odd one">The diminished chord is unstable. Use it as a passing chord, not a destination.</Def>
        <Def term="Borrowing">Taking one chord from the parallel minor (often the iv or ♭VI) is the cheapest way to add emotion.</Def>
      </Card>
    </>
  );
}

/* ============================== MODULE: PROGRESSIONS ============================== */
function ProgressionsModule() {
  const { progId, setProgId, rootPc, rootName, flat, bpm, hear, playingStep, scratch } = useDesk();
  const [tag, setTag] = useState("all");
  const [msg, setMsg] = useState("");
  const prog = PROG_BY_ID[progId] || PROGS[0];
  const tags = useMemo(() => ["all", ...uniq(PROGS.map((p) => p.tag))], []);
  const list = tag === "all" ? PROGS : PROGS.filter((p) => p.tag === tag);
  const exportProg = () => {
    const items = [];
    prog.steps.forEach((s, i) => {
      const ct = CHORD_BY_ID[s.type] || CHORDS[0];
      voice((rootPc + s.semi) % 12, ct.iv).forEach((m) => items.push({ tick: i * PPQ * 2, dur: PPQ * 2 - 20, midi: m, vel: 96 }));
    });
    const nm = `${rootName}-${prog.name}`;
    setMsg(downloadMidi(items, bpm, nm) ? "Saved " + safeName(nm) + ".mid" : "Your browser blocked the download — open this page in its own window.");
  };
  return (
    <>
      <Card title={prog.name} hint={`${prog.tag} · ${prog.mode} key · ${bpm} BPM`} accent="var(--chord)">
        <div className="flex flex-wrap gap-2">
          {prog.steps.map((s, i) => {
            const ct = CHORD_BY_ID[s.type] || CHORDS[0];
            const pc = (rootPc + s.semi) % 12;
            const on = playingStep === i;
            return (
              <div key={i} className="rounded-lg px-3 py-2" style={{
                background: on ? "var(--chord)" : "var(--raised)",
                border: "1px solid " + (on ? "var(--chord)" : "var(--line)"), minWidth: 68,
              }}>
                <span className="block" style={{ fontFamily: MONO, fontSize: 10, color: on ? "var(--bg)" : "var(--muted)" }}>{s.label}</span>
                <span className="block" style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: on ? "var(--bg)" : "var(--text)" }}>
                  {nameOf(pc, flat)}{ct.sym}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3" style={{ fontSize: 14 }}>{prog.feel}</p>
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Heard in: {prog.heard}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn size="sm" tone="chord" onClick={() => hear.prog(prog)}>▶ Hear it</Btn>
          <Btn size="sm" onClick={exportProg}>↓ Export .mid</Btn>
          <Btn size="sm" tone="quiet" onClick={() => scratch.loadProg(prog)}>Send to scratchpad</Btn>
        </div>
        {msg && <p className="mt-2 text-xs" style={{ color: "var(--scale)" }}>{msg}</p>}
      </Card>

      <Card title="Browse" hint="Everything transposes to the key at the top of the page.">
        <div className="mb-3"><Choice ariaLabel="Filter by style" value={tag} onChange={setTag} options={tags.map((t) => [t, t])} /></div>
        {[["major", "In a major key"], ["minor", "In a minor key"]].map(([m, heading]) => {
          const rows = list.filter((p) => p.mode === m);
          if (!rows.length) return null;
          return (
            <div key={m} className="mb-3">
              <div className="mb-1 text-xs uppercase" style={{ letterSpacing: ".14em", color: "var(--muted)" }}>{heading}</div>
              {rows.map((p) => (
                <Line key={p.id} active={p.id === progId} label={p.name} sub={p.feel}
                  value={p.steps.map((s) => s.label).join(" ")} onClick={() => setProgId(p.id)} />
              ))}
            </div>
          );
        })}
      </Card>
    </>
  );
}

/* ============================== MODULE: FREQUENCIES ============================== */
function FrequenciesModule() {
  const { a4, rootPc, rootName, scale, notes, flat, bpm } = useDesk();
  const [oct, setOct] = useState(4);
  const beatHz = bpm / 60;
  const divs = [["1 bar", 0.25], ["1/2", 0.5], ["1/4", 1], ["1/4 triplet", 1.5], ["1/8 dotted", 4 / 3], ["1/8", 2], ["1/16", 4], ["1/32", 8]];
  const rootAt = (o) => fOf(12 * (o + 1) + rootPc, a4);
  return (
    <>
      <Card title="Note frequencies" hint={`Every note of ${rootName} ${scale.name.toLowerCase()}, in Hz. Tuning reference A4 = ${a4} Hz.`}>
        <div className="mb-3"><Choice ariaLabel="Octave" value={oct} onChange={setOct}
          options={[1, 2, 3, 4, 5, 6].map((o) => [o, "Oct " + o])} /></div>
        {notes.map((n, i) => {
          const m = 12 * (oct + 1) + ((rootPc + scale.iv[i]) % 12);
          const f = fOf(m, a4);
          return <Line key={i} label={n + "  " + octName(m, flat)} value={hz(f)} sub={"one octave up: " + hz(f * 2)}
            onClick={() => sine(f, 1, 0)} active={i === 0} />;
        })}
      </Card>

      <Card title="Tuning the low end to the key" hint="A kick tuned to the key stops it fighting the bass.">
        <Def term="Kick body">{rootName} at {hz(rootAt(0))} (octave 0) or {hz(rootAt(1))} (octave 1).</Def>
        <Def term="Sub / 808">{rootName}1 = {hz(rootAt(1))}, {rootName}2 = {hz(rootAt(2))}. Below about 35 Hz most speakers give you cone movement, not sound.</Def>
        <Def term="If it clashes">Tune to the fifth instead: {nameOf(rootPc + 7, flat)} at {hz(fOf(24 + ((rootPc + 7) % 12), a4))}.</Def>
        <Def term="Filter resonance">Park a resonant peak on a scale note and sweeps stay in key. Root peak: {hz(rootAt(3))}.</Def>
      </Card>

      <Card title={`Tempo as a frequency · ${bpm} BPM`} hint={`${bpm} beats per minute is ${beatHz.toFixed(3)} Hz. Every rhythmic setting follows from that.`}>
        {divs.map(([l, mult]) => (
          <Line key={l} label={"LFO at " + l} value={(beatHz * mult).toFixed(3) + " Hz"} sub={Math.round(1000 / (beatHz * mult)) + " ms per cycle"} />
        ))}
      </Card>

      <Card title="Tempo pushed into the audio range" hint="Double the beat rate enough times and it becomes a pitch. Useful for locking tremolo, FM rates and drones to the grid.">
        {[5, 6, 7, 8, 9].map((n) => {
          const f = beatHz * Math.pow(2, n);
          const nn = nearestNote(f, a4);
          return <Line key={n} label={`Beat × 2^${n}`} value={hz(f)} sub={`≈ ${octName(nn.m, flat)} ${nn.cents >= 0 ? "+" : ""}${nn.cents} cents`} />;
        })}
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          Cents near 0 means that pitch is already in tune with standard pitch. Far off, nudge the tempo until it lands —
          the Note ↔ tempo page does that for you.
        </p>
      </Card>

      <Card title="Delay, comb filtering and detune">
        <Def term="Delay to pitch">Any delay under about 30 ms stops being an echo and becomes a pitch. {(1000 / fOf(48 + rootPc, a4)).toFixed(2)} ms rings at {rootName}3 — that is how plucked-string synthesis works.</Def>
        <Def term="Comb notches">A delay of D ms mixed with the dry signal cancels every 1000/D Hz. A 5 ms doubling notches at 200, 400, 600 Hz — the hollow flanger sound.</Def>
        <Def term="Safe doubling">Offset a doubled layer 15–35 ms and it reads as width. Under 10 ms it thins out in mono.</Def>
        <Def term="Detune beating">Two oscillators c cents apart beat at f × (2^(c/1200) − 1). At {rootName}3: 5¢ ≈ {(fOf(48 + rootPc, a4) * (Math.pow(2, 5 / 1200) - 1)).toFixed(2)} Hz, 15¢ ≈ {(fOf(48 + rootPc, a4) * (Math.pow(2, 15 / 1200) - 1)).toFixed(2)} Hz, 25¢ ≈ {(fOf(48 + rootPc, a4) * (Math.pow(2, 25 / 1200) - 1)).toFixed(2)} Hz.</Def>
        <Def term="Rule of thumb">Under 10 cents is thickness. 10–25 is supersaw width. Over 30 is out of tune.</Def>
      </Card>

      <Card title="Which octave to put things in">
        {OCTAVE_SLOTS.map(([o, r, d]) => <Line key={o} label={"Octave " + o} value={r} sub={d} />)}
      </Card>
    </>
  );
}

/* ============================== MODULE: HARMONICS ============================== */
function HarmonicsModule() {
  const { a4, rootPc, rootName, flat } = useDesk();
  const baseM = 36 + rootPc;
  const f0 = fOf(baseM, a4);
  const overs = Array.from({ length: 16 }, (_, i) => ({ n: i + 1, f: f0 * (i + 1), nn: nearestNote(f0 * (i + 1), a4) }));
  const unders = Array.from({ length: 8 }, (_, i) => {
    const f = fOf(baseM + 24, a4) / (i + 1);
    return { n: i + 1, f, nn: nearestNote(f, a4) };
  });
  const playSeries = (list) => list.slice(0, 12).forEach((o, i) => sine(o.f, 0.5, i * 0.34));
  const ratioOf = (r) => { const m = r.match(/(\d+):(\d+)/); return m ? +m[1] / +m[2] : 1; };
  return (
    <>
      <Card title={`Overtones of ${rootName}2 · ${hz(f0)}`}
        hint="Every real instrument playing this note also produces all of these, quietly, at the same time. This is where timbre comes from.">
        <div className="mb-3"><Btn size="sm" tone="play" onClick={() => playSeries(overs)}>▶ Hear the series</Btn></div>
        {overs.map((o) => (
          <div key={o.n} className="border-b py-1.5" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-baseline justify-between gap-3">
              <button type="button" onClick={() => sine(o.f, 0.8, 0)}
                style={{ fontFamily: MONO, fontSize: 12, color: o.n === 1 ? "var(--root)" : "var(--text)" }}>
                {o.n}× · {hz(o.f)}
              </button>
              <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--scale)" }}>
                {octName(o.nn.m, flat)}
                <span style={{ color: Math.abs(o.nn.cents) > 12 ? "var(--warn)" : "var(--muted)" }}>
                  {" "}{o.nn.cents >= 0 ? "+" : ""}{o.nn.cents}¢
                </span>
              </span>
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>{HARM_ROLE[o.n]}</div>
          </div>
        ))}
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          Red cent values are harmonics a piano cannot play. The 7th and 11th are why brass, bells and overdriven guitars sound the way they do.
        </p>
      </Card>

      <Card title="Undertones" hint="Divide instead of multiply. Nothing in nature does this, but sub oscillators and pitch-down effects do — and it spells a minor chord.">
        <div className="mb-3"><Btn size="sm" tone="play" onClick={() => playSeries(unders)}>▶ Hear it</Btn></div>
        {unders.map((o) => <Line key={o.n} label={"÷ " + o.n} value={hz(o.f)} sub={octName(o.nn.m, flat) + " " + (o.nn.cents >= 0 ? "+" : "") + o.nn.cents + "¢"} />)}
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          A sub one or two octaves down (÷2, ÷4) is always safe. ÷3 and ÷5 give fifths and thirds below the note — huge, but they muddy fast.
        </p>
      </Card>

      <Card title="Why intervals sound the way they do" hint="Simple ratios share harmonics, which the ear reads as consonance. Complex ratios leave harmonics slightly apart, and those near-misses beat as roughness.">
        {RATIOS.map(([n, r, d]) => <Line key={n} label={n} value={r + " · " + hz(f0 * ratioOf(r))} sub={d} />)}
      </Card>

      <Card title="Waveforms and what is inside them">
        {WAVEFORMS.map(([w, h, u]) => <Line key={w} label={w} value={h} sub={u} />)}
      </Card>

      <Card title="Resonance and filters">
        <Def term="What it is">A filter boosting a narrow band at its cutoff. Turned up far enough it self-oscillates into a sine wave at the cutoff pitch.</Def>
        <Def term="Keep it musical">Park the peak on a note of the key and sweeps stay in tune.</Def>
        <Def term="Q values">0.7 gentle and natural · 2–4 obvious character · 8+ a whistle. High Q to cut problems, low Q to shape tone.</Def>
        <Def term="Find a problem">Boost 12 dB with a narrow band, sweep until it screams, then cut 3–6 dB there.</Def>
        <Def term="Formants">Two resonant peaks in the low mids make anything sound vocal:</Def>
        <div className="mt-1">{FORMANTS.map(([v, f1, f2]) => <Line key={v} label={v} value={"F1 " + f1 + " · F2 " + f2} />)}</div>
      </Card>

      <Card title="Harmonic tricks worth stealing">
        {HARM_TRICKS.map((t, i) => (
          <p key={i} className="flex gap-2 py-1" style={{ fontSize: 14 }}>
            <span style={{ color: "var(--scale)" }}>—</span><span>{t}</span>
          </p>
        ))}
      </Card>
    </>
  );
}

/* ============================== MODULE: RHYTHM ============================== */
function RhythmModule() {
  const { bpm } = useDesk();
  const beat = 60000 / bpm;
  const rows = [["Whole note", 4], ["Half note", 2], ["Quarter note — 1 beat", 1], ["Eighth note", 0.5],
    ["Dotted eighth", 0.75], ["Eighth triplet", 1 / 3], ["Sixteenth note", 0.25]];
  return (
    <>
      <Card title={`Note lengths at ${bpm} BPM`} hint="Also your delay times. Change the tempo at the top of the page.">
        {rows.map(([n, b]) => <Line key={n} label={n} value={Math.round(beat * b) + " ms"} />)}
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          Set a delay to the eighth-note value for a rhythmic echo, or the dotted eighth for the classic wide guitar and synth sound.
          A reverb pre-delay of one sixteenth keeps things from smearing.
        </p>
      </Card>

      <Card title="Time signatures, in plain terms">
        {TIME_SIGS.map((t) => (
          <div key={t.sig} className="border-b py-2" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-baseline gap-2">
              <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: "var(--root)" }}>{t.sig}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>“{t.say}”</span>
            </div>
            <div style={{ fontSize: 13 }}>{t.feel}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>{t.ex}</div>
          </div>
        ))}
      </Card>

      <Card title="Groove">
        {GROOVE.map(([k, v]) => <Def key={k} term={k}>{v}</Def>)}
      </Card>

      <Card title="Typical tempo by genre">
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {GENRE_BPM.map(([g, b]) => <Line key={g} label={g} value={b} />)}
        </div>
      </Card>
    </>
  );
}

/* ============================== MODULE: MIXING ============================== */
function MixingModule() {
  return (
    <>
      <Card title="Dynamics — how loud to play" hint="The number is MIDI velocity, what you draw into a piano roll. Most DAWs default to 100, which is why programmed parts sound flat.">
        {DYNAMICS.map(([sym, mean, vel]) => (
          <div key={sym} className="flex items-center gap-3 border-b py-2" style={{ borderColor: "var(--line)" }}>
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: "var(--root)", minWidth: 38 }}>{sym}</span>
            <span className="flex-1" style={{ fontSize: 13 }}>{mean}</span>
            <span className="rounded" style={{ width: 84, height: 6, background: "var(--raised)" }}>
              <span className="block rounded" style={{ width: (vel / 127) * 100 + "%", height: 6, background: "var(--scale)" }} />
            </span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--muted)", minWidth: 26, textAlign: "right" }}>{vel}</span>
          </div>
        ))}
      </Card>
      <Card title="Articulation">{ARTICULATION.map(([k, v]) => <Def key={k} term={k}>{v}</Def>)}</Card>
      <Card title="Frequency ranges">{FREQ_BANDS.map(([r, n, d]) => <Line key={r} label={n} value={r} sub={d} />)}</Card>
      <Card title="Where each instrument lives">{INSTRUMENT_RANGE.map(([i, r]) => <Line key={i} label={i} value={r} />)}</Card>
    </>
  );
}

/* ============================== MODULE: ARRANGEMENT ============================== */
function ArrangementModule() {
  return (
    <>
      <Card title="Sections of a track" hint="Sections almost always come in 4, 8 or 16 bars. Change something every 8th bar or attention drifts.">
        {STRUCTURE.map(([s, len, d]) => <Line key={s} label={s} value={len} sub={d} />)}
      </Card>
      <Card title="The five things that matter most">
        {PRINCIPLES.map((p, i) => (
          <p key={i} className="flex gap-3 py-1.5" style={{ fontSize: 14 }}>
            <span style={{ fontFamily: MONO, color: "var(--scale)" }}>{i + 1}</span><span>{p}</span>
          </p>
        ))}
      </Card>
    </>
  );
}

/* ============================== MODULE: FIXES ============================== */
function FixesModule() {
  return (
    <Card title="When something is not working" hint="The fastest way out of each common problem.">
      {FIXES.map(([t, b]) => (
        <div key={t} className="border-b py-2.5" style={{ borderColor: "var(--line)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--root)" }}>{t}</div>
          <div style={{ fontSize: 14 }}>{b}</div>
        </div>
      ))}
    </Card>
  );
}

/* ============================== MODULE: GLOSSARY ============================== */
function GlossaryModule() {
  const [q, setQ] = useState("");
  const groups = [["notes", "Notes and keys"], ["chords", "Chords"], ["studio", "Studio"]];
  const hit = (t) => !q || (t[0] + " " + t[2]).toLowerCase().includes(q.toLowerCase());
  return (
    <>
      <Card title="Glossary" hint="Plain-English definitions for everything this app uses.">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter terms…" aria-label="Filter glossary"
          className="w-full rounded-lg px-3"
          style={{ height: 38, background: "var(--raised)", border: "1px solid var(--line)", fontSize: 14 }} />
      </Card>
      {groups.map(([g, title]) => {
        const items = GLOSSARY.filter((t) => t[1] === g && hit(t));
        if (!items.length) return null;
        return (
          <Card key={g} title={title}>
            {items.map(([term, , def]) => <Def key={term} term={term}>{def}</Def>)}
          </Card>
        );
      })}
    </>
  );
}

/* ============================== MODULE: NOTE ↔ TEMPO ============================== */
/* A tempo is a very slow frequency. Double it enough times and it becomes a pitch,
   so every note has a family of tempos that are literally in tune with it. */
function tempoForPc(pc, a4, lo = 80) {
  let b = 60 * fOf(60 + pc, a4);
  while (b >= lo * 2) b /= 2;
  while (b < lo) b *= 2;
  return b;
}
function noteForBpm(bpm, a4) {
  const beat = bpm / 60;
  const n = Math.max(0, Math.round(Math.log2(90 / beat)));
  const f = beat * Math.pow(2, n);
  const nn = nearestNote(f, a4);
  return { n, f, nn, exact: bpm * (fOf(nn.m, a4) / f) };
}
function TempoPitchModule() {
  const { rootPc, flat, a4, bpm, setBpm, go } = useDesk();
  const noteName = (m) => octName(m, flat);
  const [pc, setPc] = useState(rootPc);
  const base = tempoForPc(pc, a4);
  const rev = noteForBpm(bpm, a4);
  const off = Math.abs(rev.nn.cents);
  const click = (t) => { for (let i = 0; i < 4; i++) sine(i === 0 ? 1400 : 900, 0.05, i * (60 / t), 0.1); };
  return (
    <>
      <Card title="Tempo from a note" hint="Pick a note and get the tempos whose beat is that note, several octaves down.">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Note">
          {Array.from({ length: 12 }, (_, p) => {
            const on = p === pc;
            return (
              <button type="button" key={p} aria-pressed={on} onClick={() => { setPc(p); tone(60 + p, 0.7); }}
                className="rounded-md"
                style={{
                  height: 40, minWidth: 46, fontFamily: MONO, fontSize: 14, fontWeight: on ? 700 : 500,
                  background: on ? "var(--root)" : BLACK_PCS.includes(p) ? "var(--raised)" : "var(--surface)",
                  color: on ? "var(--bg)" : "var(--text)",
                  border: "1px solid " + (on ? "var(--root)" : "var(--line)"),
                }}>{nameOf(p, flat)}</button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, color: "var(--root)", lineHeight: 1 }}>
              {base.toFixed(2)}
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>BPM for {nameOf(pc, flat)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Sound tone="scale" sub="half-time" onPlay={() => setBpm(Math.round(base / 2 * 10) / 10)}>{(base / 2).toFixed(2)}</Sound>
            <Sound tone="scale" sub="double-time" onPlay={() => setBpm(Math.round(base * 2 * 10) / 10)}>{(base * 2).toFixed(2)}</Sound>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Btn size="sm" tone="root" onClick={() => setBpm(Math.round(base * 10) / 10)}>Use {base.toFixed(1)} BPM</Btn>
          <Btn size="sm" tone="play" onClick={() => click(base)}>▶ Hear the click</Btn>
          <Btn size="sm" tone="quiet" onClick={() => { tone(60 + pc, 1.1); }}>▶ Hear the note</Btn>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          Set to {base.toFixed(2)} and the beat, its subdivisions, and any tempo-synced LFO all line up with
          {" "}{nameOf(pc, flat)} — {hz(fOf(24 + pc, a4))} at octave 1. Most DAWs accept two decimal places;
          rounding to a whole number puts you a few cents out, which only matters if something is meant to resonate.
        </p>
      </Card>

      <Card title="All twelve notes as tempos" hint={`Tuning reference A4 = ${a4} Hz. Tap to set the tempo.`}>
        {Array.from({ length: 12 }, (_, p) => {
          const b = tempoForPc(p, a4);
          return (
            <Line key={p} active={p === pc}
              label={nameOf(p, flat)}
              sub={`half ${(b / 2).toFixed(2)} · double ${(b * 2).toFixed(2)}`}
              value={b.toFixed(2) + " BPM"}
              onClick={() => { setPc(p); setBpm(Math.round(b * 10) / 10); }} />
          );
        })}
      </Card>

      <Card title="Note from your tempo" hint={`Working backwards from ${bpm} BPM.`}>
        <Def term="Beat rate">{(bpm / 60).toFixed(3)} Hz — that is the tempo expressed as a frequency.</Def>
        <Def term="Doubled up">× 2^{rev.n} = {hz(rev.f)}, which lands in the bass register.</Def>
        <Def term="Nearest note">
          <span style={{ fontFamily: MONO, color: "var(--scale)" }}>{noteName(rev.nn.m)}</span>{" "}
          <span style={{ color: off > 10 ? "var(--warn)" : "var(--muted)" }}>
            {rev.nn.cents >= 0 ? "+" : ""}{rev.nn.cents} cents
          </span>
          {off <= 3 ? " — effectively in tune already." : " — audible as detuning if something resonates at this pitch."}
        </Def>
        <Def term="Exact tempo">{rev.exact.toFixed(2)} BPM would put the beat exactly in tune with {noteName(rev.nn.m)}.</Def>
        <div className="mt-2 flex flex-wrap gap-2">
          <Btn size="sm" tone="root" onClick={() => setBpm(Math.round(rev.exact * 10) / 10)}>Snap to {rev.exact.toFixed(1)}</Btn>
          <Btn size="sm" tone="quiet" onClick={() => go("frequencies")}>Full frequency table</Btn>
        </div>
      </Card>

      <Card title="What this is for">
        <Def term="Kick and 808">Tune the kick to the key, then set the tempo from the same note, and the low end stops beating against the pulse.</Def>
        <Def term="LFOs and tremolo">A free-running LFO set in Hz will drift against the grid. Derive its rate from the beat and it never does.</Def>
        <Def term="Drones and risers">A drone at the tempo's own pitch sits under everything without ever clashing.</Def>
        <Def term="Repitching samples">Speeding a sample up by n semitones multiplies its tempo by 2^(n/12). Use the table to find the target.</Def>
        <Def term="Honestly">This is a subtle effect. Use it when something feels almost-but-not-quite locked, not as a rule.</Def>
      </Card>
    </>
  );
}

/* ============================== SCRATCHPAD ============================== */
const ROWS = 25, CW = 24, CH = 14;
const ScratchGrid = React.memo(function ScratchGrid({ steps, base, notes, scalePcs, flat, onToggle, onPreview }) {
  const cells = {};
  notes.forEach((n) => { for (let k = 0; k < n.len; k++) cells[n.row + ":" + (n.step + k)] = true; });
  return (
    <div style={{ width: 42 + steps * CW }}>
      {Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i).map((row) => {
        const midi = base + row, pc = midi % 12;
        const inScale = scalePcs.includes(pc), isRoot = pc === scalePcs[0];
        const black = BLACK_PCS.includes(pc);
        const label = octName(midi, flat);
        return (
          <div key={row} className="flex" style={{ height: CH }}>
            <button type="button" onPointerDown={() => onPreview(row)} aria-label={"Preview " + label}
              className="sticky left-0 z-10 shrink-0"
              style={{
                width: 42, background: black ? "var(--surface)" : "var(--raised)",
                borderTop: "1px solid var(--bg)", borderRight: "1px solid var(--line)",
                color: isRoot ? "var(--root)" : inScale ? "var(--text)" : "var(--faint)",
                fontFamily: MONO, fontSize: 9, textAlign: "right", paddingRight: 4,
              }}>{label}</button>
            {Array.from({ length: steps }, (_, s) => (
              <button type="button" key={s} onPointerDown={() => onToggle(row, s)}
                aria-label={label + " step " + (s + 1)} aria-pressed={!!cells[row + ":" + s]}
                style={{
                  width: CW, height: CH, flexShrink: 0,
                  background: cells[row + ":" + s] ? (isRoot ? "var(--root)" : "var(--chord)")
                    : inScale ? (black ? "var(--surface)" : "var(--raised)") : "var(--bg)",
                  borderTop: "1px solid var(--bg)",
                  borderLeft: "1px solid " + (s % 16 === 0 ? "var(--line)" : s % 4 === 0 ? "var(--surface)" : "transparent"),
                }} />
            ))}
          </div>
        );
      })}
    </div>
  );
});

function Scratchpad({ state, set, base, scalePcs, scale, flat, rootName, bpm, setKeys, panelRef }) {
  const { notes, bars, open } = state;
  const steps = bars * 16;
  const [len, setLen] = useState(4);
  const [playStep, setPlayStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const msg = state.msg || "";
  const setMsg = useCallback((m) => set((s) => ({ ...s, msg: m })), [set]);
  const iv = useRef(null);
  const live = useRef({});
  live.current = { notes, steps, len, base, bpm };

  useEffect(() => () => clearInterval(iv.current), []);
  useEffect(() => { set((s) => (s.notes.some((n) => n.step >= steps) ? { ...s, notes: s.notes.filter((n) => n.step < steps) } : s)); }, [steps, set]);

  const stop = useCallback(() => { clearInterval(iv.current); iv.current = null; setPlaying(false); setPlayStep(-1); setKeys(null); }, [setKeys]);
  useEffect(() => { if (playing) stop(); /* eslint-disable-next-line */ }, [bpm, steps]);

  const play = () => {
    if (playing) return stop();
    const c = ctx();
    if (!c) { setMsg("This browser has no Web Audio support."); return; }
    const stepDur = 60 / live.current.bpm / 4;
    const t0 = c.currentTime + 0.12;
    const fire = (s, abs) => {
      const due = live.current.notes.filter((n) => n.step === s);
      due.forEach((n) => tone(live.current.base + n.row, stepDur * n.len * 0.92, Math.max(0, t0 + abs * stepDur - ctx().currentTime), 0.15));
      if (due.length) setKeys(uniq(due.map((n) => (live.current.base + n.row) % 12)).sort((a, b) => a - b));
    };
    setPlaying(true); setPlayStep(0); fire(0, 0);
    let abs = 0;
    iv.current = setInterval(() => { abs += 1; const s = abs % live.current.steps; setPlayStep(s); fire(s, abs); }, stepDur * 1000);
  };

  const onToggle = useCallback((row, s) => {
    set((st) => {
      const hit = st.notes.find((n) => n.row === row && s >= n.step && s < n.step + n.len);
      if (hit) return { ...st, notes: st.notes.filter((n) => n !== hit) };
      return { ...st, notes: [...st.notes, { row, step: s, len: Math.max(1, Math.min(live.current.len, live.current.steps - s)) }] };
    });
    tone(live.current.base + row, 0.45);
  }, [set]);
  const onPreview = useCallback((row) => tone(live.current.base + row, 0.7), []);

  const loadScale = () => {
    const seq = [...scale.iv, 12];
    set({ open: true, msg: "Scale written to the scratchpad", bars: Math.min(4, Math.max(1, Math.ceil((seq.length * 2) / 16))), notes: seq.map((x, i) => ({ row: Math.min(24, x + 12), step: i * 2, len: 2 })) });
  };
  const exportMidi = () => {
    if (!notes.length) { setMsg("Nothing to export — tap the grid first."); return; }
    const nm = `${rootName}-${scale.name}-sketch`;
    setMsg(downloadMidi(notes.map((n) => ({ tick: n.step * (PPQ / 4), dur: Math.max(20, n.len * (PPQ / 4) - 10), midi: base + n.row, vel: 100 })), bpm, nm)
      ? "Saved " + safeName(nm) + ".mid" : "Your browser blocked the download — open this page in its own window.");
  };

  return (
    <section ref={panelRef} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px dashed var(--line)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => set((s) => ({ ...s, open: !s.open }))} aria-expanded={open} className="flex items-center gap-2">
          <span style={{ color: "var(--muted)", fontSize: 12 }}>{open ? "▾" : "▸"}</span>
          <span style={{ fontFamily: SERIF, fontSize: 15 }}>Scratchpad</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--muted)" }}>{notes.length} notes · {bars} bar{bars > 1 ? "s" : ""}</span>
        </button>
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" tone="play" onClick={play}>{playing ? "■ Stop" : "▶ Play"}</Btn>
          <Btn size="sm" onClick={exportMidi}>↓ .mid</Btn>
        </div>
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
        Not a sequencer — somewhere to try a lookup out and export it as MIDI.
        {notes.length === 0 && " Use the + button on any chord to drop it in."}
      </p>
      {open && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--muted)" }}>Bars</span>
              <Choice ariaLabel="Bars" value={bars} onChange={(v) => set((s) => ({ ...s, bars: v }))} options={[1, 2, 3, 4].map((b) => [b, String(b)])} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--muted)" }}>Note</span>
              <Choice ariaLabel="Note length" tone="chord" value={len} onChange={setLen}
                options={[[1, "1/16"], [2, "1/8"], [4, "1/4"], [8, "1/2"], [16, "bar"]]} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--muted)" }}>Added chords</span>
              <Choice ariaLabel="Chord length" value={state.chordLen || 16} onChange={(v) => set((s) => ({ ...s, chordLen: v }))}
                options={[[4, "1 beat"], [8, "½ bar"], [16, "1 bar"]]} />
            </div>
          </div>
          <div className="td-scroll td-scroll-both relative mt-2 overflow-auto rounded-lg" style={{ maxHeight: 250, border: "1px solid var(--line)" }}>
            <div className="relative" style={{ width: 42 + steps * CW, paddingBottom: 4 }}>
              {playStep >= 0 && (
                <div className="pointer-events-none absolute top-0 z-20" aria-hidden="true"
                  style={{ left: 42 + playStep * CW, width: CW, height: "100%", background: "rgba(232,179,60,.18)", borderLeft: "1px solid var(--root)" }} />
              )}
              <ScratchGrid {...{ steps, base, notes, scalePcs, flat, onToggle, onPreview }} />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn size="sm" tone="quiet" onClick={loadScale}>Load the scale</Btn>
            <Btn size="sm" tone="warn" onClick={() => { stop(); set((s) => ({ ...s, notes: [], msg: "" })); }}>Clear</Btn>
          </div>
        </>
      )}
      {msg && <p className="mt-2 text-xs" style={{ color: "var(--scale)" }}>{msg}</p>}
    </section>
  );
}

/* ============================== SEARCH ============================== */
const SEARCH_INDEX = [
  ...MODULES.map((m) => ({ kind: "Page", label: m.name, sub: m.lede, extra: m.kw, act: { go: m.id } })),
  ...SCALES.map((s) => ({ kind: "Scale", label: s.name, sub: s.feel, extra: s.use, act: { scale: s.id, go: "scales" } })),
  ...CHORDS.map((c) => ({ kind: "Chord", label: (c.sym === "" ? "major" : c.sym) + " · " + c.name, sub: c.feel, extra: c.id, act: { chord: c.id, go: "chordtypes" } })),
  ...PROGS.map((p) => ({ kind: "Progression", label: p.name, sub: p.feel, extra: p.tag + " " + p.heard, act: { prog: p.id, go: "progressions" } })),
  ...MOODS.map((m) => ({ kind: "Feeling", label: m.name, sub: "Scale, chords, tempo and tips for this mood", extra: "mood", act: { go: "feel" } })),
  ...INTERVALS.map((i) => ({ kind: "Interval", label: i.name, sub: i.feel, extra: i.short + " " + i.song, act: { go: "intervals" } })),
  ...GLOSSARY.map((g) => ({ kind: "Term", label: g[0], sub: g[2], extra: "glossary definition", act: { go: "glossary" } })),
];
function search(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const score = (e) => {
    const l = e.label.toLowerCase();
    if (l === s) return 0;
    if (l.startsWith(s)) return 1;
    if (l.includes(s)) return 2;
    if ((e.sub + " " + (e.extra || "")).toLowerCase().includes(s)) return 3;
    return 99;
  };
  return SEARCH_INDEX.map((e) => ({ e, s: score(e) })).filter((x) => x.s < 99)
    .sort((a, b) => a.s - b.s).slice(0, 12).map((x) => x.e);
}

/* ============================== APP SHELL ============================== */
const PANES = {
  identify: IdentifyModule, tempopitch: TempoPitchModule, feel: FeelModule, scales: ScalesModule, intervals: IntervalsModule,
  circle: CircleModule, chordtypes: ChordTypesModule, inkey: InKeyModule, progressions: ProgressionsModule,
  frequencies: FrequenciesModule, harmonics: HarmonicsModule, rhythm: RhythmModule,
  mixing: MixingModule, arrangement: ArrangementModule, fixes: FixesModule, glossary: GlossaryModule,
};

export default function App() {
  const [theme, setTheme] = useState("dark");
  const [rootPc, setRootPc] = useState(0);
  const [flat, setFlat] = useState(false);
  const [scaleId, setScaleId] = useState("minor");
  const [chordId, setChordId] = useState("min");
  const [sevenths, setSevenths] = useState(false);
  const [progId, setProgId] = useState("axis");
  const [bpm, setBpm] = useState(100);
  const [a4, setA4] = useState(440);
  const [vol, setVol] = useState(0.85);
  const [showKeys, setShowKeys] = useState(true);
  const [settings, setSettings] = useState(false);
  const [query, setQuery] = useState(null);
  const [mod, setMod] = useState("scales");
  const [sel, setSel] = useState([]);
  const [held, setHeld] = useState(null);
  const [playingStep, setPlayingStep] = useState(-1);
  const [pad, setPad] = useState({ notes: [], bars: 2, open: false, msg: "", chordLen: 16 });
  const timers = useRef([]);
  const padRef = useRef(null);
  const guard = useRef({ t: 0, k: "" });

  useEffect(() => { setTuning(a4); }, [a4]);
  useEffect(() => { setVolume(vol); }, [vol]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const scale = SCALE_BY_ID[scaleId] || SCALES[0];
  const rootName = nameOf(rootPc, flat);
  const notes = useMemo(() => spellScale(rootName, scale.iv, flat), [rootName, scale, flat]);
  const degs = useMemo(() => degreeLabels(scale.iv), [scale]);
  const scalePcs = useMemo(() => scale.iv.map((x) => (rootPc + x) % 12), [scale, rootPc]);
  const picking = mod === "identify";
  const module = MODULE_BY_ID[mod];
  const Pane = PANES[mod];

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; setPlayingStep(-1); };
  const flash = (pcs, labels, color, root) => {
    clearTimers();
    setHeld({ pcs, labels, color, root });
    timers.current.push(setTimeout(() => setHeld(null), 1700));
  };
  const setKeys = useCallback((pcs) => {
    if (!pcs) { guard.current = { t: 0, k: "" }; setHeld(null); return; }
    const k = pcs.join(","), now = Date.now();
    if (k === guard.current.k || now - guard.current.t < 90) return;
    guard.current = { t: now, k };
    setHeld({ pcs, labels: pcs.map((p) => nameOf(p, flat)), color: "var(--chord)", root: rootPc });
  }, [flat, rootPc]);

  const hear = useMemo(() => ({
    chord: (pc, iv, labels) => {
      strum(voice(pc, iv), 1.5);
      const u = [], lab = [];
      iv.map((x) => (pc + x) % 12).forEach((p, i) => { if (!u.includes(p)) { u.push(p); lab.push(labels ? labels[i] : nameOf(p, flat)); } });
      flash(u, lab, "var(--chord)", pc);
    },
    scale: () => {
      const base = 60 + rootPc > 66 ? 48 + rootPc : 60 + rootPc;
      [...scale.iv, 12].forEach((x, i) => tone(base + x, 0.5, i * 0.26));
      flash(scalePcs, notes, "var(--scale)", rootPc);
    },
    prog: (prog) => {
      clearTimers();
      const step = (60 / bpm) * 2;
      prog.steps.forEach((s, i) => {
        const ct = CHORD_BY_ID[s.type] || CHORDS[0];
        const pc = (rootPc + s.semi) % 12;
        strum(voice(pc, ct.iv), step * 1.15, i * step);
        timers.current.push(setTimeout(() => {
          setPlayingStep(i);
          const pcs = uniq(ct.iv.map((x) => (pc + x) % 12));
          setHeld({ pcs, labels: pcs.map((p) => nameOf(p, flat)), color: "var(--chord)", root: pc });
        }, i * step * 1000));
      });
      timers.current.push(setTimeout(() => { setPlayingStep(-1); setHeld(null); }, prog.steps.length * step * 1000 + 400));
    },
  }), [rootPc, scale, scalePcs, notes, flat, bpm]);

  const go = useCallback((id) => { clearTimers(); setHeld(null); setMod(id); setQuery(null); if (typeof window !== "undefined" && window.scrollTo) { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {} } }, []);
  const padBase = 48 + rootPc;
  const revealPad = () => setTimeout(() => { const el = padRef.current; if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 60);
  const scratch = useMemo(() => ({
    addChord: (pc, iv, label) => {
      const base = 48 + rootPc;
      const rows = uniq(voice(pc, iv).map((m) => { let r = m - base; while (r > 24) r -= 12; while (r < 0) r += 12; return r; }));
      setPad((p) => {
        const len = p.chordLen || 16;
        const used = p.notes.reduce((m, n) => Math.max(m, n.step + n.len), 0);
        const start = Math.ceil(used / len) * len;
        let bars = p.bars;
        while (start + len > bars * 16 && bars < 4) bars += 1;
        if (start + len > bars * 16)
          return { ...p, open: true, msg: "Scratchpad is full — clear it, or set a shorter chord length." };
        return {
          ...p, open: true, bars,
          notes: [...p.notes, ...rows.map((r) => ({ row: r, step: start, len }))],
          msg: (label || "Chord") + " added at bar " + (Math.floor(start / 16) + 1) + ", beat " + ((start % 16) / 4 + 1),
        };
      });
      strum(voice(pc, iv), 1.1);
      revealPad();
    },
    loadProg: (prog) => {
      const bars = Math.min(4, Math.max(1, prog.steps.length));
      const out = [];
      prog.steps.slice(0, bars).forEach((s, i) => {
        const ct = CHORD_BY_ID[s.type] || CHORDS[0];
        voice((rootPc + s.semi) % 12, ct.iv).forEach((m) => {
          let r = m - (48 + rootPc);
          while (r > 24) r -= 12;
          while (r < 0) r += 12;
          if (!out.some((n) => n.row === r && n.step === i * 16)) out.push({ row: r, step: i * 16, len: 16 });
        });
      });
      setPad({ notes: out, bars, open: true, msg: prog.name + " written to the scratchpad" });
      revealPad();
    },
  }), [rootPc]);

  const paint = (pc) => {
    if (picking) return sel.includes(pc) ? { color: "var(--warn)", label: nameOf(pc, flat) } : null;
    if (held) {
      const i = held.pcs.indexOf(pc);
      return i >= 0 ? { color: pc === held.root ? "var(--root)" : held.color, label: held.labels[i] } : null;
    }
    const i = scalePcs.indexOf(pc);
    return i < 0 ? null : { color: i === 0 ? "var(--root)" : "var(--scale)", label: notes[i] };
  };

  const results = query ? search(query) : [];
  const applyResult = (e) => {
    if (e.act.scale) setScaleId(e.act.scale);
    if (e.act.chord) setChordId(e.act.chord);
    if (e.act.prog) setProgId(e.act.prog);
    go(e.act.go);
  };

  const ctxValue = {
    rootPc, setRootPc, rootName, flat, setFlat, scaleId, setScaleId, scale, notes, degs, scalePcs,
    chordId, setChordId, sevenths, setSevenths, progId, setProgId, bpm, setBpm, a4, setA4,
    sel, setSel, picking, go, hear, flash, playingStep, scratch,
  };

  return (
    <Ctx.Provider value={ctxValue}>
      <div data-theme={theme} className="min-h-screen w-full" style={{ background: "var(--bg)", color: "var(--text)", fontFamily: SANS }}>
        <style>{THEME_CSS}</style>

        {/* ---------- header: the constant readout ---------- */}
        <header className="sticky top-0 z-30" style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)" }}>
          <div className="mx-auto max-w-3xl px-3 pt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {HOME_URL && (
                  <a href={HOME_URL} aria-label={"Back to " + HOME_LABEL} className="shrink-0 rounded-md px-2"
                    style={{
                      display: "inline-block", height: 24, lineHeight: "22px", fontSize: 11,
                      color: "var(--muted)", border: "1px solid var(--line)", whiteSpace: "nowrap",
                    }}>
                    ← {HOME_LABEL}
                  </a>
                )}
                <span className="truncate" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".28em", color: "var(--muted)" }}>THEORY DESK</span>
              </div>
              <div className="flex items-center gap-1">
                <Btn size="sm" tone="quiet" label="Search" onClick={() => setQuery(query === null ? "" : null)}>Search</Btn>
                <Btn size="sm" tone="quiet" label={vol > 0 ? "Mute" : "Unmute"} onClick={() => setVol(vol > 0 ? 0 : 0.85)}>{vol > 0 ? "♪" : "✕♪"}</Btn>
                <Btn size="sm" tone="quiet" label="Settings" pressed={settings} onClick={() => setSettings(!settings)}>⚙</Btn>
              </div>
            </div>

            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3">
              <span style={{ fontFamily: SERIF, fontSize: 26, color: "var(--root)", lineHeight: 1.2 }}>{rootName}</span>
              <span style={{ fontFamily: SERIF, fontSize: 17 }}>{scale.name.toLowerCase()}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{notes.join(" ")}</span>
            </div>

            {showKeys && (
              <div className="mt-2">
                <Keyboard octaves={2} base={60} paint={paint} flat={flat} height={92}
                  onKey={(m) => { tone(m, 0.9); if (picking) setSel((p) => (p.includes(m % 12) ? p.filter((x) => x !== m % 12) : [...p, m % 12])); }} />
              </div>
            )}

            {picking && (
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md px-2 py-1"
                style={{ border: "1px solid var(--warn)" }}>
                <span style={{ fontSize: 11, color: "var(--warn)" }}>Selection mode — tap keys to pick notes ({sel.length})</span>
                {sel.length > 0 && <Btn size="sm" tone="quiet" onClick={() => setSel([])}>Clear</Btn>}
              </div>
            )}

            <div className="td-scroll td-scroll-x mt-2 flex gap-1 overflow-x-auto" role="group" aria-label="Root note">
              {Array.from({ length: 12 }, (_, pc) => {
                const on = pc === rootPc;
                return (
                  <button type="button" key={pc} onClick={() => setRootPc(pc)} aria-pressed={on} aria-label={"Key of " + nameOf(pc, flat)}
                    className="shrink-0 rounded-md"
                    style={{
                      height: 32, minWidth: 40, fontFamily: MONO, fontSize: 12, fontWeight: on ? 700 : 500,
                      background: on ? "var(--root)" : "transparent", color: on ? "var(--bg)" : BLACK_PCS.includes(pc) ? "var(--muted)" : "var(--text)",
                      border: "1px solid " + (on ? "var(--root)" : "var(--line)"),
                    }}>{nameOf(pc, flat)}</button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 pb-2.5">
              <select aria-label="Scale" value={scaleId} onChange={(e) => setScaleId(e.target.value)}
                className="rounded-lg px-2"
                style={{ height: 34, flex: "1 1 150px", background: "var(--raised)", border: "1px solid var(--line)", fontSize: 13 }}>
                {SCALES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <BpmControl bpm={bpm} setBpm={setBpm} />
            </div>

            {settings && (
              <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg p-2"
                style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Names</span>
                  <Choice ariaLabel="Note names" value={flat ? "b" : "s"} onChange={(v) => setFlat(v === "b")} options={[["s", "♯"], ["b", "♭"]]} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>A4</span>
                  <Choice ariaLabel="Tuning reference" value={a4} onChange={setA4} options={[432, 440, 442, 444].map((v) => [v, String(v)])} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Theme</span>
                  <Choice ariaLabel="Theme" value={theme} onChange={setTheme} options={[["dark", "Dark"], ["paper", "Paper"]]} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Keyboard</span>
                  <Choice ariaLabel="Show keyboard" value={showKeys ? "y" : "n"} onChange={(v) => setShowKeys(v === "y")} options={[["y", "Show"], ["n", "Hide"]]} />
                </div>
                <div className="flex flex-1 items-center gap-2" style={{ minWidth: 140 }}>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Volume</span>
                  <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(+e.target.value)}
                    aria-label="Volume" className="flex-1" style={{ accentColor: "var(--scale)" }} />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ---------- search ---------- */}
        {query !== null && (
          <div className="mx-auto max-w-3xl px-3 pt-3">
            <Card>
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the reference"
                placeholder="Search scales, chords, terms, tempos…" className="w-full rounded-lg px-3"
                style={{ height: 40, background: "var(--raised)", border: "1px solid var(--line)", fontSize: 15 }} />
              {query.trim() !== "" && (
                <div className="mt-2">
                  {results.length === 0 && <p className="py-2 text-sm" style={{ color: "var(--muted)" }}>Nothing found.</p>}
                  {results.map((e, i) => (
                    <Line key={i} label={e.label} sub={e.sub} value={e.kind} onClick={() => applyResult(e)} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ---------- navigation ---------- */}
        <nav className="mx-auto max-w-3xl px-3 pt-3">
          <div className="td-scroll td-scroll-x flex gap-1 overflow-x-auto" role="group" aria-label="Sections">
            {CATS.map((c) => {
              const on = module.cat === c.id;
              return (
                <button type="button" key={c.id} aria-pressed={on}
                  onClick={() => go(MODULES.find((m) => m.cat === c.id).id)}
                  className="shrink-0 rounded-lg px-3"
                  style={{
                    height: 34, fontSize: 13, fontFamily: SERIF,
                    background: on ? "var(--text)" : "transparent", color: on ? "var(--bg)" : "var(--muted)",
                    border: "1px solid " + (on ? "var(--text)" : "var(--line)"),
                  }}>{c.name}</button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            {MODULES.filter((m) => m.cat === module.cat).map((m) => {
              const on = m.id === mod;
              return (
                <button type="button" key={m.id} aria-current={on ? "page" : undefined} onClick={() => go(m.id)}
                  className="rounded-md px-2.5"
                  style={{
                    height: 30, fontSize: 12, fontWeight: on ? 700 : 500,
                    background: on ? "var(--raised)" : "transparent",
                    color: on ? "var(--text)" : "var(--muted)",
                    border: "1px solid " + (on ? "var(--line)" : "transparent"),
                  }}>{m.name}</button>
              );
            })}
          </div>
        </nav>

        {/* ---------- the reference page ---------- */}
        <main className="mx-auto max-w-3xl px-3 pb-6 pt-4">
          <h1 style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.2 }}>{module.name}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{module.lede}</p>
          <div className="mt-4 space-y-3">
            <Pane />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase" style={{ letterSpacing: ".14em", color: "var(--muted)" }}>See also</span>
            {(SEE_ALSO[mod] || []).map((id) => (
              <Btn key={id} size="sm" tone="quiet" onClick={() => go(id)}>{MODULE_BY_ID[id].name}</Btn>
            ))}
          </div>
        </main>

        {/* ---------- scratchpad ---------- */}
        <div className="mx-auto max-w-3xl px-3 pb-10">
          <Scratchpad state={pad} set={setPad} base={padBase} scalePcs={scalePcs} scale={scale}
            flat={flat} rootName={rootName} bpm={bpm} setKeys={setKeys} panelRef={padRef} />
        </div>
      </div>
    </Ctx.Provider>
  );
}
