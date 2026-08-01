import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

/* ============================== PALETTE / TYPE ============================== */
const C = {
  ink: "#14111A",
  panel: "#1E1A26",
  panel2: "#262031",
  line: "#3A3247",
  bone: "#EDE7DE",
  dim: "#968CA6",
  amber: "#F5A524",
  mint: "#5BD6BE",
  orchid: "#B98CFF",
  rose: "#FF7A8A",
};
const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/* ============================== MUSIC CORE ============================== */
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLATS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const MAJREF = [0, 2, 4, 5, 7, 9, 11];
const CHROM_DEG = ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"];
const EXT_DEG = { 13: "♭9", 14: "9", 15: "♯9", 17: "11", 21: "13" };

const accVal = (s) => {
  let v = 0;
  for (const ch of s) {
    if (ch === "♯" || ch === "#") v++;
    if (ch === "♭" || ch === "b") v--;
  }
  return v;
};
const accStr = (n) => (n === 0 ? "" : n > 0 ? "♯".repeat(n) : "♭".repeat(-n));
const pcOf = (name) =>
  (((LETTER_PC[LETTERS.indexOf(name[0])] + accVal(name.slice(1))) % 12) + 12) % 12;
const nameOf = (pc, flat) => (flat ? FLATS : SHARPS)[((pc % 12) + 12) % 12];

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

/* ---- scales ---- */
const SCALES = [
  { id: "major", name: "Major", alt: "Ionian", iv: [0, 2, 4, 5, 7, 9, 11], parent: "major",
    feel: "Bright, resolved, safe. The default happy sound.", use: "Pop, house, gospel, most radio music." },
  { id: "minor", name: "Natural minor", alt: "Aeolian", iv: [0, 2, 3, 5, 7, 8, 10], parent: "minor",
    feel: "Sad, serious, cool. The default sad sound.", use: "Trap, EDM, rock, film scores." },
  { id: "harmonic", name: "Harmonic minor", alt: "", iv: [0, 2, 3, 5, 7, 8, 11], parent: "minor",
    feel: "Dramatic and tense — that big leap before the 8th note.", use: "Metal, neoclassical, Middle-Eastern flavour." },
  { id: "melodic", name: "Melodic minor", alt: "jazz minor", iv: [0, 2, 3, 5, 7, 9, 11], parent: "minor",
    feel: "Sad but hopeful, slippery.", use: "Jazz lines, sophisticated pop." },
  { id: "dorian", name: "Dorian", alt: "minor with a lift", iv: [0, 2, 3, 5, 7, 9, 10], parent: "minor",
    feel: "Minor, but funky and hopeful instead of tragic.", use: "Funk, house, lo-fi, Santana, Daft Punk." },
  { id: "phrygian", name: "Phrygian", alt: "", iv: [0, 1, 3, 5, 7, 8, 10], parent: "minor",
    feel: "Dark and Spanish. That ♭2 is the whole personality.", use: "Metal, flamenco, dark trap." },
  { id: "lydian", name: "Lydian", alt: "", iv: [0, 2, 4, 6, 7, 9, 11], parent: "major",
    feel: "Major but floating and magical — the ♯4 sparkles.", use: "Film scores, dream pop, video games." },
  { id: "mixo", name: "Mixolydian", alt: "", iv: [0, 2, 4, 5, 7, 9, 10], parent: "major",
    feel: "Major with a bluesy, unresolved edge.", use: "Rock riffs, funk, Britpop, gospel." },
  { id: "locrian", name: "Locrian", alt: "", iv: [0, 1, 3, 5, 6, 8, 10], parent: "minor",
    feel: "Unstable, never settles. Rarely used on its own.", use: "Horror stings, experimental metal." },
  { id: "majpent", name: "Major pentatonic", alt: "5 notes", iv: [0, 2, 4, 7, 9], parent: "major",
    feel: "Everything sounds right. No wrong notes.", use: "Melodies, solos, folk, country, kids' songs." },
  { id: "minpent", name: "Minor pentatonic", alt: "5 notes", iv: [0, 3, 5, 7, 10], parent: "minor",
    feel: "The riff scale. Instantly cool.", use: "Rock/blues solos, hip-hop hooks, basslines." },
  { id: "blues", name: "Blues", alt: "minor pent + ♭5", iv: [0, 3, 5, 6, 7, 10], parent: "minor",
    feel: "Gritty and vocal. The ♭5 is the 'blue note' — pass through it, don't sit on it.", use: "Blues, rock, soul, boom-bap." },
  { id: "phrydom", name: "Phrygian dominant", alt: "Spanish", iv: [0, 1, 4, 5, 7, 8, 10], parent: "minor",
    feel: "Exotic, snake-charmer, aggressive.", use: "Flamenco, metal, Middle-Eastern EDM." },
  { id: "hirajoshi", name: "Hirajoshi", alt: "Japanese", iv: [0, 2, 3, 7, 8], parent: "minor",
    feel: "Sparse, ancient, hollow.", use: "Ambient, game music, texture melodies." },
  { id: "wholetone", name: "Whole tone", alt: "", iv: [0, 2, 4, 6, 8, 10], parent: "major",
    feel: "Weightless, dizzy, dreamlike. No home note.", use: "Dream sequences, transitions, risers." },
  { id: "chromatic", name: "Chromatic", alt: "all 12", iv: [0,1,2,3,4,5,6,7,8,9,10,11], parent: "major",
    feel: "Every note. Use as passing colour, not as a home base.", use: "Tension runs, jazz fills, glitch." },
];

/* ---- chord types ---- */
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
  { id: "7sus4", sym: "7sus4", name: "Dominant 7 sus4", iv: [0, 5, 7, 10], q: "sus", feel: "Groovy hover, gospel/house staple." },
  { id: "add9", sym: "add9", name: "Add 9", iv: [0, 4, 7, 14], q: "maj", feel: "Shimmer without jazz. Big and modern." },
  { id: "madd9", sym: "m(add9)", name: "Minor add 9", iv: [0, 3, 7, 14], q: "min", feel: "Cinematic melancholy." },
  { id: "9", sym: "9", name: "Dominant 9th", iv: [0, 4, 7, 10, 14], q: "maj", feel: "Funk. Stevie Wonder territory." },
  { id: "maj9", sym: "maj9", name: "Major 9th", iv: [0, 4, 7, 11, 14], q: "maj", feel: "Lush, floating, lo-fi hip hop." },
  { id: "m9", sym: "m9", name: "Minor 9th", iv: [0, 3, 7, 10, 14], q: "min", feel: "Deep, velvety, R&B." },
  { id: "11", sym: "11", name: "Dominant 11th", iv: [0, 7, 10, 14, 17], q: "maj", feel: "Wide and washy." },
  { id: "13", sym: "13", name: "Dominant 13th", iv: [0, 4, 7, 10, 14, 21], q: "maj", feel: "Full jazz colour, big band." },
  { id: "7b9", sym: "7♭9", name: "Dominant 7♭9", iv: [0, 4, 7, 10, 13], q: "maj", feel: "Spiky tension before a minor chord." },
  { id: "7s9", sym: "7♯9", name: "Dominant 7♯9", iv: [0, 4, 7, 10, 15], q: "maj", feel: "The 'Hendrix chord'. Dirty and bright at once." },
  { id: "maj7s5", sym: "maj7♯5", name: "Major 7 ♯5", iv: [0, 4, 8, 11], q: "aug", feel: "Floating and unresolved. Appears in minor keys." },
];
const CHORD_BY_IV = {};
CHORDS.forEach((c) => { CHORD_BY_IV[c.iv.join(",")] = c; });

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

function buildDiatonic(intervals, sevenths) {
  const n = intervals.length;
  const picks = sevenths ? [0, 2, 4, 6] : [0, 2, 4];
  const out = [];
  for (let i = 0; i < n; i++) {
    const notes = picks.map((p) => {
      const idx = i + p;
      return intervals[idx % n] + 12 * Math.floor(idx / n);
    });
    const rel = notes.map((x) => x - notes[0]);
    const found = CHORD_BY_IV[rel.join(",")];
    const sym = found ? found.sym : "?";
    const q = found ? found.q : "maj";
    const d = intervals[i] - (MAJREF[i] !== undefined ? MAJREF[i] : intervals[i]);
    let r = ROMAN[i] || String(i + 1);
    if (q === "min" || q === "dim") r = r.toLowerCase();
    const SUF = { m7b5: "ø7", dim7: "°7", dim: "°", aug: "+", maj7s5: "+maj7", maj7: "maj7", mMaj7: "maj7", "7": "7", m7: "7", "6": "6" };
    if (found) r += SUF[found.id] || "";
    else if (q === "dim") r += "°";
    out.push({
      degree: i,
      semis: intervals[i],
      roman: accStr(d) + r,
      sym,
      quality: q,
      iv: rel,
      chord: found,
    });
  }
  return out;
}

/* ---- progressions: semitone offset from the key's root ---- */
const P = (label, semi, type) => ({ label, semi, type });
const PROGS = [
  { id: "axis", name: "The Axis", mode: "major", tag: "Pop", steps: [P("I",0,"maj"),P("V",7,"maj"),P("vi",9,"min"),P("IV",5,"maj")],
    feel: "Uplifting, anthemic, endlessly reusable.", heard: "Let It Be · Don't Stop Believin' · half of pop radio" },
  { id: "sensitive", name: "Sensitive female", mode: "major", tag: "Pop", steps: [P("vi",9,"min"),P("IV",5,"maj"),P("I",0,"maj"),P("V",7,"maj")],
    feel: "Starts sad, ends hopeful. Same chords as the Axis, different door.", heard: "Zombie · Grenade · Apologize" },
  { id: "doowop", name: "50s doo-wop", mode: "major", tag: "Retro", steps: [P("I",0,"maj"),P("vi",9,"min"),P("IV",5,"maj"),P("V",7,"maj")],
    feel: "Innocent, nostalgic, slow-dance.", heard: "Stand By Me · Blue Moon" },
  { id: "145", name: "Three chord", mode: "major", tag: "Rock", steps: [P("I",0,"maj"),P("IV",5,"maj"),P("V",7,"maj")],
    feel: "Direct and loud. Nothing to hide behind.", heard: "Rock, punk, country, folk" },
  { id: "blues12", name: "12-bar blues", mode: "major", tag: "Blues", steps: [P("I7",0,"7"),P("I7",0,"7"),P("I7",0,"7"),P("I7",0,"7"),P("IV7",5,"7"),P("IV7",5,"7"),P("I7",0,"7"),P("I7",0,"7"),P("V7",7,"7"),P("IV7",5,"7"),P("I7",0,"7"),P("V7",7,"7")],
    feel: "The oldest loop in popular music. Play it with a shuffle.", heard: "Every blues and early rock record" },
  { id: "251", name: "ii–V–I", mode: "major", tag: "Jazz", steps: [P("ii7",2,"m7"),P("V7",7,"7"),P("Imaj7",0,"maj7")],
    feel: "The strongest 'coming home' movement there is.", heard: "Standards, city pop, bossa" },
  { id: "turn", name: "Jazz turnaround", mode: "major", tag: "Jazz", steps: [P("Imaj7",0,"maj7"),P("vi7",9,"m7"),P("ii7",2,"m7"),P("V7",7,"7")],
    feel: "Loops forever without getting boring.", heard: "Rhythm changes, jazz outros" },
  { id: "lofi", name: "Lo-fi loop", mode: "major", tag: "Lo-fi", steps: [P("Imaj7",0,"maj7"),P("iii7",4,"m7"),P("vi7",9,"m7"),P("IVmaj7",5,"maj7")],
    feel: "Hazy and warm. Add tape wobble and rain.", heard: "Study-beat channels everywhere" },
  { id: "royal", name: "Royal road", mode: "major", tag: "J-pop", steps: [P("IV",5,"maj"),P("V",7,"maj"),P("iii",4,"min"),P("vi",9,"min")],
    feel: "Emotional swell, then a soft landing on the minor.", heard: "Anime themes, city pop, J-pop" },
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
  { id: "min251", name: "Minor ii–V–i", mode: "minor", tag: "Jazz", steps: [P("ii ø",2,"m7b5"),P("V7",7,"7"),P("i7",0,"m7")],
    feel: "Sophisticated sadness, resolved properly.", heard: "Autumn Leaves · noir scores" },
  { id: "dorian", name: "Dorian funk vamp", mode: "minor", tag: "Funk", steps: [P("i7",0,"m7"),P("IV9",5,"9")],
    feel: "Two chords, infinite groove. Don't add more.", heard: "Funk, disco, deep house" },
  { id: "flamenco", name: "Phrygian vamp", mode: "minor", tag: "Dark", steps: [P("i",0,"min"),P("♭II",1,"maj")],
    feel: "Menacing and exotic. Very cheap, very effective.", heard: "Metal, dark trap, flamenco" },
];

/* ---- moods ---- */
const MOODS = [
  { id: "happy", name: "Happy / uplifting", scale: "major", prog: "axis", bpm: "110–128",
    chords: ["maj", "add9", "sus4"],
    tips: ["Keep melodies on beats 1 and 3 — confident, not busy.", "Use sus4 → major to add a lift right before the chorus.", "Bright pads, plucks, claps on 2 and 4."] },
  { id: "sad", name: "Sad / heartbroken", scale: "minor", prog: "sensitive", bpm: "70–90",
    chords: ["min", "m7", "madd9"],
    tips: ["Play chords high and thin; leave the low end almost empty.", "Let notes ring longer than feels comfortable.", "A single held vocal or cello note over the whole loop does more than a countermelody."] },
  { id: "epic", name: "Epic / cinematic", scale: "minor", prog: "epicminor", bpm: "80–100 (half-time feel)",
    chords: ["min", "5", "madd9"],
    tips: ["Double the chords two octaves apart, nothing in the middle.", "Use a slow build: one instrument per 4 bars.", "Big reverb on everything except the drums."] },
  { id: "dark", name: "Dark / tense", scale: "phrygian", prog: "flamenco", bpm: "60–75 or 140 half-time",
    chords: ["min", "dim7", "m7b5"],
    tips: ["Lean on the ♭2 — it's the whole mood.", "Detune a second layer by 10–20 cents.", "Silence between hits is the scariest part."] },
  { id: "dreamy", name: "Dreamy / ethereal", scale: "lydian", prog: "lofi", bpm: "75–95",
    chords: ["maj7", "add9", "maj9"],
    tips: ["The ♯4 is the magic note — put it in the melody, not the bass.", "Wide, slow-attack pads; no sharp transients.", "Roll off everything below 100 Hz on the pads."] },
  { id: "chill", name: "Chill / lo-fi", scale: "dorian", prog: "lofi", bpm: "70–90",
    chords: ["maj7", "m9", "m7"],
    tips: ["Swing the hats 55–62%.", "Play the chords slightly late — humanise by 10–30 ms.", "Filter the highs off the piano, add vinyl noise."] },
  { id: "funky", name: "Funky / groovy", scale: "mixo", prog: "dorian", bpm: "100–120",
    chords: ["9", "7", "m7"],
    tips: ["Two chords maximum. The groove is the song.", "Ghost notes on the snare, 16th-note hats.", "Bass locks with the kick, plays the root and the ♭7."] },
  { id: "aggro", name: "Aggressive / heavy", scale: "phrydom", prog: "harm", bpm: "140–175",
    chords: ["5", "min", "dim"],
    tips: ["Power chords only — thirds turn to mud under distortion.", "Riff on the root, ♭2 and ♭5.", "Leave a full bar of silence before the drop."] },
  { id: "romantic", name: "Romantic / warm", scale: "major", prog: "doowop", bpm: "60–85",
    chords: ["maj7", "6", "m7"],
    tips: ["Use inversions so the top note barely moves between chords.", "Add a 6th instead of a 7th for a vintage feel.", "Real-sounding piano or nylon guitar beats a synth here."] },
  { id: "nostalgic", name: "Nostalgic / bittersweet", scale: "major", prog: "borrowed", bpm: "85–105",
    chords: ["maj", "min", "maj7"],
    tips: ["Borrow the minor iv from the parallel minor — instant nostalgia.", "Slightly detune and wobble the whole mix (tape).", "Mono-ish, narrow stereo image feels like memory."] },
  { id: "mysterious", name: "Mysterious / exotic", scale: "hirajoshi", prog: "flamenco", bpm: "70–100",
    chords: ["sus2", "min", "5"],
    tips: ["Use only 4–5 notes and repeat them — restraint sounds ancient.", "Open fifths instead of full chords.", "Percussion with no low end: shakers, wood, bells."] },
  { id: "bluesy", name: "Bluesy / soulful", scale: "blues", prog: "blues12", bpm: "70–110",
    chords: ["7", "9", "m7"],
    tips: ["Bend or slide into the ♭3 and ♭5 rather than landing on them.", "Dominant 7 chords everywhere, even on the I.", "Call and response: play a phrase, then leave a gap the same length."] },
];

/* ---- intervals ---- */
const INTERVALS = [
  { s: 0, name: "Unison", short: "P1", feel: "Same note. Used for doubling and thickness.", song: "—" },
  { s: 1, name: "Minor 2nd", short: "m2", feel: "Maximum tension. Grinding, fearful.", song: "Jaws theme" },
  { s: 2, name: "Major 2nd", short: "M2", feel: "Gentle step. Movement without drama.", song: "Happy Birthday (first two notes)" },
  { s: 3, name: "Minor 3rd", short: "m3", feel: "Sad. The core of every minor chord.", song: "Smoke on the Water" },
  { s: 4, name: "Major 3rd", short: "M3", feel: "Happy. The core of every major chord.", song: "When the Saints Go Marching In" },
  { s: 5, name: "Perfect 4th", short: "P4", feel: "Open, noble, a little suspended.", song: "Here Comes the Bride" },
  { s: 6, name: "Tritone", short: "TT", feel: "Unstable and evil — or delicious, in jazz.", song: "The Simpsons theme" },
  { s: 7, name: "Perfect 5th", short: "P5", feel: "Powerful and hollow. Zero emotion, all strength.", song: "Star Wars main title" },
  { s: 8, name: "Minor 6th", short: "m6", feel: "Aching, yearning.", song: "The Entertainer" },
  { s: 9, name: "Major 6th", short: "M6", feel: "Sweet and nostalgic.", song: "My Bonnie Lies Over the Ocean" },
  { s: 10, name: "Minor 7th", short: "m7", feel: "Bluesy, groovy, unresolved.", song: "Somewhere (West Side Story)" },
  { s: 11, name: "Major 7th", short: "M7", feel: "Dreamy tension. One step from home.", song: "Take On Me (chorus leap)" },
  { s: 12, name: "Octave", short: "P8", feel: "The same note, bigger. Perfect stability.", song: "Somewhere Over the Rainbow" },
];

/* ---- circle of fifths ---- */
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

/* ---- rhythm / production reference ---- */
const GENRE_BPM = [
  ["Hip hop / boom bap", "80–95"], ["Lo-fi", "70–90"], ["Trap", "130–160 (feels like 65–80)"],
  ["R&B / neo-soul", "60–90"], ["Pop", "100–130"], ["Rock", "110–140"], ["Ballad", "60–80"],
  ["Disco", "110–130"], ["House", "120–128"], ["Tech house", "125–130"], ["Techno", "128–150"],
  ["Trance", "134–142"], ["Dubstep", "140 (half-time)"], ["Drum & bass", "170–178"],
  ["Reggaeton", "90–100"], ["Afrobeats", "100–115"], ["Ambient", "50–90"], ["Punk", "150–200"],
];
const TIME_SIGS = [
  { sig: "4/4", say: "four on the floor", feel: "Count 1-2-3-4. Almost everything you've ever heard.", ex: "Pop, house, rock, hip hop" },
  { sig: "3/4", say: "waltz", feel: "Count 1-2-3, with weight on 1. Circular, swaying.", ex: "Waltzes, ballads, Piano Man" },
  { sig: "6/8", say: "six-eight", feel: "Two big beats, each split in three. Rolling and lilting.", ex: "Ballads, doo-wop, Irish music" },
  { sig: "2/4", say: "march", feel: "Short and punchy. Left-right-left-right.", ex: "Marches, polka, some Latin" },
  { sig: "5/4", say: "five", feel: "One beat too many — always slightly off-balance.", ex: "Take Five, Mission Impossible" },
  { sig: "7/8", say: "seven-eight", feel: "Grouped 3+2+2 or 2+2+3. Lurching, hypnotic.", ex: "Prog, Balkan, math rock" },
  { sig: "12/8", say: "twelve-eight", feel: "Slow blues shuffle. Four beats in triplets.", ex: "Slow blues, gospel" },
];
const DYNAMICS = [
  ["ppp", "as quiet as possible", 8], ["pp", "very quiet", 24], ["p", "quiet", 40],
  ["mp", "medium quiet", 56], ["mf", "medium loud", 76], ["f", "loud", 96],
  ["ff", "very loud", 112], ["fff", "as loud as possible", 127],
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
  ["Bass guitar / synth", "60–250 Hz body · 700 Hz–2 kHz definition"], ["Snare", "150–250 Hz body · 5 kHz crack"],
  ["Hats / cymbals", "200 Hz cut · 8 kHz+ shine"], ["Lead vocal", "100–300 Hz warmth · 1–4 kHz clarity · 10 kHz air"],
  ["Piano", "Full range — carve 200–400 Hz to fit vocals"], ["Electric guitar", "80 Hz cut · 1–3 kHz bite"],
  ["Pads / strings", "Cut below 150 Hz so they don't fight the bass"],
];
const STRUCTURE = [
  ["Intro", "4–8 bars", "Set the mood with one or two elements. Hint at the hook."],
  ["Verse", "8–16 bars", "Lower energy, more words, fewer layers."],
  ["Pre-chorus", "4–8 bars", "Build: filter opens, drums simplify or drop out."],
  ["Chorus / drop", "8–16 bars", "Highest energy, biggest hook, widest stereo."],
  ["Post-chorus", "4–8 bars", "A wordless hook that keeps the energy up."],
  ["Bridge / breakdown", "8 bars", "Change something: key, texture, or remove drums."],
  ["Outro", "4–16 bars", "Strip back the way you built up."],
];
const TIPS = [
  { t: "Make any chord sadder", b: "Lower the third by one semitone (major → minor), or add the 9th on top of a minor chord." },
  { t: "Make any chord bigger", b: "Don't add notes — move them apart. Put the root very low and the rest an octave or more above it." },
  { t: "Make a loop feel new", b: "Keep the same chords and change the bass note under one of them. Same harmony, new emotion." },
  { t: "Stop chords jumping around", b: "Use inversions so each note moves as little as possible to the next chord. That's voice leading." },
  { t: "Melody won't fit", b: "Land on a chord tone (1, 3, 5) on strong beats and use the other scale notes to pass between them." },
  { t: "Everything sounds boring", b: "Change one chord to the same chord from the parallel minor. Try the minor iv or the ♭VI." },
  { t: "Muddy mix", b: "High-pass everything except kick and bass. Two instruments in the same octave is the usual culprit, not EQ." },
  { t: "Build tension before a drop", b: "Loop shorter and shorter (2 bars → 1 → ½), rise in pitch, then leave one beat of total silence." },
  { t: "Key change that always works", b: "Go up one whole step for the last chorus, or move to the relative minor for a darker section." },
  { t: "Sound more human", b: "Nudge notes off the grid by 10–30 ms and vary velocities by ±15. Perfect timing sounds fake." },
];

/* ---- sound design reference ---- */
const HARM_ROLE = {
  1: "The fundamental — the pitch you actually hear.",
  2: "One octave up. Adds brightness without changing the note.",
  3: "Octave + a fifth. This is why fifths sound so stable.",
  4: "Two octaves up.",
  5: "Major 3rd — 14 cents flatter than a piano's. Why real thirds sound sweeter.",
  6: "Fifth again, higher.",
  7: "Flat 7th, 31 cents flat. The natural blue note. Not on a piano at all.",
  8: "Three octaves up.",
  9: "Major 2nd / the 9th. Adds shimmer.",
  10: "Major 3rd again.",
  11: "Halfway between 4 and ♯4 — the alien one. Brass and bells.",
  12: "Fifth.",
  13: "Roughly a ♭6. Metallic.",
  14: "Flat 7th again.",
  15: "Major 7th.",
  16: "Four octaves up.",
};
const WAVEFORMS = [
  ["Sine", "Fundamental only", "Pure, hollow, invisible in a mix. Subs, kick tails, soft pads."],
  ["Triangle", "Odd harmonics, falling fast (1/n²)", "Soft and flutey. Gentle leads, chip bass."],
  ["Square", "Odd harmonics only (1/n)", "Hollow and woody, like a clarinet. Retro leads, plucks."],
  ["Sawtooth", "Every harmonic (1/n)", "The brightest and fullest. Supersaws, strings, brass, acid bass."],
  ["Pulse 25%", "Every harmonic except each 4th", "Thin and nasal. Great for cutting through a busy mix."],
  ["Pulse 10%", "Very dense, thin fundamental", "Reedy and buzzy. Sweep the width for movement."],
  ["Noise", "No harmonic series at all", "No pitch. Percussion, air, risers, transient layers."],
];
const RATIOS = [
  ["Unison", "1:1", 0, "Identical. Two identical sounds = 6 dB louder, or phase problems."],
  ["Octave", "2:1", 12, "So consonant the ear treats it as the same note."],
  ["Perfect 5th", "3:2", 7, "Harmonics line up almost perfectly. Stable, powerful, empty."],
  ["Perfect 4th", "4:3", 5, "Stable but wants to resolve. Feels suspended."],
  ["Major 3rd", "5:4", 4, "Sweet. Equal temperament makes it 14 cents sharp — that beating is normal."],
  ["Minor 3rd", "6:5", 3, "Soft and dark. 16 cents flat in equal temperament."],
  ["Major 6th", "5:3", 9, "Warm and open."],
  ["Minor 7th", "16:9 (or 7:4)", 10, "Restless. The natural 7:4 version is the bluesy one."],
  ["Tritone", "45:32", 6, "Harmonics never line up. Maximum roughness."],
  ["Minor 2nd", "16:15", 1, "Harmonics are close but not equal — you hear the clash as beating."],
];
const FORMANTS = [
  ["ee (as in see)", "270 Hz", "2290 Hz"], ["ih (sit)", "390 Hz", "1990 Hz"],
  ["eh (bed)", "530 Hz", "1840 Hz"], ["ah (father)", "730 Hz", "1090 Hz"],
  ["oh (bought)", "570 Hz", "840 Hz"], ["oo (boot)", "300 Hz", "870 Hz"],
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
/* ============================== AUDIO ============================== */
let AC = null;
function ctx() {
  if (!AC) {
    const K = window.AudioContext || window.webkitAudioContext;
    if (!K) return null;
    AC = new K();
  }
  if (AC.state === "suspended") AC.resume();
  return AC;
}
let TUNING = 440;
let VOL = 0.85;
const setTuning = (v) => { TUNING = v; };
const setVolume = (v) => { VOL = v; };
const freq = (m) => TUNING * Math.pow(2, (m - 69) / 12);
const fOf = (m, a4) => a4 * Math.pow(2, (m - 69) / 12);
const octName = (m, flat) => nameOf(m % 12, flat) + (Math.floor(m / 12) - 1);
function nearestNote(f, a4) {
  const m = Math.round(69 + 12 * Math.log2(f / a4));
  const cents = Math.round(1200 * Math.log2(f / fOf(m, a4)));
  return { m, cents, name: octName(m, false) };
}
const hz = (f) => (f >= 1000 ? (f / 1000).toFixed(2) + " kHz" : f >= 100 ? f.toFixed(0) + " Hz" : f.toFixed(2) + " Hz");
function tone(midi, dur = 0.9, when = 0, vol = 0.18) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + when;
  const V = Math.max(0.00012, vol * VOL);
  const g = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(4200, t);
  lp.frequency.exponentialRampToValueAtTime(1100, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(V, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  lp.connect(g);
  g.connect(c.destination);
  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq(midi);
  const o2 = c.createOscillator();
  o2.type = "sine";
  o2.frequency.value = freq(midi) * 2.002;
  const g2 = c.createGain();
  g2.gain.value = 0.3;
  o2.connect(g2);
  g2.connect(lp);
  o.connect(lp);
  o.start(t); o2.start(t);
  o.stop(t + dur + 0.06); o2.stop(t + dur + 0.06);
}
const strum = (midis, dur = 1.1, when = 0, vol = 0.15) =>
  midis.forEach((m, i) => tone(m, dur, when + i * 0.012, vol));

/* voice a chord nicely around middle C */
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
/* items: [{tick, dur, midi, vel}] — ticks in PPQ units */
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
    0x4d, 0x54, 0x72, 0x6b, (L >>> 24) & 255, (L >>> 16) & 255, (L >>> 8) & 255, L & 255,
    ...trk,
  ]);
}
const safeName = (s) =>
  s.replace(/♯/g, "sharp").replace(/♭/g, "flat").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
function downloadMidi(items, bpm, name) {
  try {
    const blob = new Blob([buildMidi(items, bpm, name)], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeName(name) + ".mid";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    return true;
  } catch (e) {
    return false;
  }
}

/* ============================== UI ATOMS ============================== */
function Eyebrow({ children, color }) {
  return (
    <div className="mb-2 text-xs uppercase" style={{ letterSpacing: "0.18em", color: color || C.dim, fontFamily: SANS }}>
      {children}
    </div>
  );
}
function Panel({ children, className = "", style }) {
  return (
    <div
      className={"rounded-xl p-4 " + className}
      style={{ background: C.panel, border: "1px solid " + C.line, ...style }}
    >
      {children}
    </div>
  );
}
function Pill({ active, onClick, children, color = C.amber, small, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={"rounded-lg transition-colors " + (small ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm")}
      style={{
        background: active ? color : C.panel2,
        color: active ? C.ink : C.bone,
        border: "1px solid " + (active ? color : C.line),
        fontWeight: active ? 700 : 500,
        fontFamily: SANS,
      }}
    >
      {children}
    </button>
  );
}
function PlayBtn({ onClick, label = "Play", color = C.mint, icon = "▶" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-lg px-3 text-xs"
      style={{ height: 34, background: "transparent", border: "1px solid " + color, color, fontFamily: SANS, letterSpacing: "0.06em" }}
    >
      {icon} {label}
    </button>
  );
}

/* ============================== KEYBOARD ============================== */
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_DEFS = [
  { after: 0, pc: 1 }, { after: 1, pc: 3 }, { after: 3, pc: 6 }, { after: 4, pc: 8 }, { after: 5, pc: 10 },
];

function Keyboard({ octaves = 2, base = 60, info, onPlay, height = 132, flat = false }) {
  const whites = [];
  for (let o = 0; o < octaves; o++)
    WHITE_PCS.forEach((pc) => whites.push({ pc, midi: base + o * 12 + pc }));
  const blacks = [];
  for (let o = 0; o < octaves; o++)
    BLACK_DEFS.forEach((b) => blacks.push({ pc: b.pc, midi: base + o * 12 + b.pc, idx: o * 7 + b.after }));
  const bw = (100 / whites.length) * 0.6;

  const paint = (pc) => (info ? info(pc) : null);

  return (
    <div className="relative w-full select-none" style={{ height }}>
      <div className="flex h-full w-full gap-px">
        {whites.map((k, i) => {
          const m = paint(k.pc);
          const on = !!m;
          return (
            <button
              type="button"
              key={"w" + i}
              onPointerDown={() => onPlay && onPlay(k.midi)}
              aria-label={"Play " + octName(k.midi, flat)}
              className="relative flex-1 rounded-b-md"
              style={{
                background: on
                  ? `linear-gradient(180deg, ${m.color} 0%, ${m.color} 62%, #fff 100%)`
                  : "linear-gradient(180deg, #d9d3ca 0%, #f7f4ef 22%)",
                border: "1px solid #0d0b12",
                boxShadow: "inset 0 -6px 8px rgba(0,0,0,0.18)",
              }}
            >
              <span
                className="absolute inset-x-0 bottom-1 text-center"
                style={{ fontFamily: MONO, fontSize: 9, color: "#3a3242", fontWeight: 700 }}
              >
                {m ? m.label : ""}
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
              onPointerDown={() => onPlay && onPlay(k.midi)}
              aria-label={"Play " + octName(k.midi, flat)}
              className="pointer-events-auto absolute top-0 rounded-b-md"
              style={{
                left: `calc(${((k.idx + 1) / whites.length) * 100}% - ${bw / 2}%)`,
                width: bw + "%",
                height: height * 0.62,
                background: m
                  ? `linear-gradient(180deg, ${m.color} 0%, ${m.color} 70%, #2a2433 100%)`
                  : "linear-gradient(180deg, #2b2536 0%, #100d16 70%)",
                border: "1px solid #0d0b12",
                boxShadow: "0 3px 6px rgba(0,0,0,0.6)",
              }}
            >
              <span
                className="absolute inset-x-0 bottom-1 text-center"
                style={{ fontFamily: MONO, fontSize: 8, color: m ? "#241f2e" : "transparent", fontWeight: 700 }}
              >
                {m ? m.label : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== APP ============================== */
const TAB_GROUPS = [
  [["identify", "Identify"], ["scales", "Scales"], ["chords", "Chords"], ["inkey", "In key"],
   ["progs", "Progressions"], ["mood", "By feeling"]],
  [["intervals", "Intervals"], ["circle", "Circle of 5ths"]],
  [["rhythm", "Rhythm"], ["tuning", "Tuning & Hz"], ["harmonics", "Harmonics"], ["mix", "Mix"], ["tips", "Fixes"]],
];

const GLOBAL_CSS = `
button { touch-action: manipulation; }
button:focus-visible, select:focus-visible, input:focus-visible, [tabindex]:focus-visible {
  outline: 2px solid #F5A524; outline-offset: 2px; border-radius: 4px;
}
input[type=range] { height: 26px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
`;

export default function App() {
  /* --- global context, shared by every module --- */
  const [rootPc, setRootPc] = useState(0);
  const [flat, setFlat] = useState(false);
  const [scaleId, setScaleId] = useState("minor");
  const [chordId, setChordId] = useState("min");
  const [sevenths, setSevenths] = useState(false);
  const [progId, setProgId] = useState("axis");
  const [bpm, setBpm] = useState(100);
  const [a4, setA4] = useState(440);
  const [vol, setVol] = useState(0.85);
  /* --- view state --- */
  const [tab, setTab] = useState("scales");
  const [held, setHeld] = useState(null);
  const [playingStep, setPlayingStep] = useState(-1);
  const [rollNotes, setRollNotes] = useState([]);
  const [rollBars, setRollBars] = useState(2);
  const [rollOpen, setRollOpen] = useState(true);
  const [sel, setSel] = useState([]);
  const timers = useRef([]);
  const rollRef = useRef(null);
  const keyGuard = useRef({ t: 0, k: "" });

  useEffect(() => { setTuning(a4); }, [a4]);
  useEffect(() => { setVolume(vol); }, [vol]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const scale = SCALES.find((s) => s.id === scaleId) || SCALES[0];
  const rootName = nameOf(rootPc, flat);
  const notes = useMemo(() => spellScale(rootName, scale.iv, flat), [rootName, scale, flat]);
  const degs = useMemo(() => degreeLabels(scale.iv), [scale]);
  const scalePcs = useMemo(() => scale.iv.map((x) => (rootPc + x) % 12), [scale, rootPc]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; setPlayingStep(-1); };

  const picking = tab === "identify";
  const toggleSel = (pc) => setSel((p) => (p.includes(pc) ? p.filter((x) => x !== pc) : [...p, pc]));

  /* keyboard readout painter */
  const info = (pc) => {
    if (picking) return sel.includes(pc) ? { color: C.rose, label: nameOf(pc, flat) } : null;
    if (held) {
      const i = held.pcs.indexOf(pc);
      if (i >= 0) return { color: pc === held.root ? C.amber : held.color, label: held.labels[i] };
      return null;
    }
    const i = scalePcs.indexOf(pc);
    if (i < 0) return null;
    return { color: i === 0 ? C.amber : C.mint, label: notes[i] };
  };

  const flash = (pcs, labels, color, root) => {
    clearTimers();
    setHeld({ pcs, labels, color, root });
    timers.current.push(setTimeout(() => setHeld(null), 1600));
  };

  /* the piano roll drives the same readout while it plays, throttled */
  const setRollKeys = useCallback((pcs) => {
    if (!pcs) { keyGuard.current = { t: 0, k: "" }; setHeld(null); return; }
    const k = pcs.join(",");
    const now = Date.now();
    if (k === keyGuard.current.k || now - keyGuard.current.t < 90) return;
    keyGuard.current = { t: now, k };
    setHeld({ pcs, labels: pcs.map((p) => nameOf(p, flat)), color: C.orchid, root: rootPc });
  }, [flat, rootPc]);

  const playScale = () => {
    const base = 60 + rootPc > 66 ? 48 + rootPc : 60 + rootPc;
    [...scale.iv, 12].forEach((x, i) => tone(base + x, 0.5, i * 0.26));
    flash(scalePcs, notes, C.mint, rootPc);
  };

  const playChordAt = (pc, iv, labels) => {
    strum(voice(pc, iv), 1.5);
    const uniq = [], lab = [];
    iv.map((x) => (pc + x) % 12).forEach((p, i) => {
      if (!uniq.includes(p)) { uniq.push(p); lab.push(labels ? labels[i] : nameOf(p, flat)); }
    });
    flash(uniq, lab, C.orchid, pc);
  };

  const playProg = (prog) => {
    clearTimers();
    const step = (60 / bpm) * 2;
    prog.steps.forEach((s, i) => {
      const ct = CHORDS.find((c) => c.id === s.type) || CHORDS[0];
      const pc = (rootPc + s.semi) % 12;
      strum(voice(pc, ct.iv), step * 1.15, i * step);
      timers.current.push(setTimeout(() => {
        setPlayingStep(i);
        const pcs = ct.iv.map((x) => (pc + x) % 12).filter((v, k, a) => a.indexOf(v) === k);
        setHeld({ pcs, labels: pcs.map((p) => nameOf(p, flat)), color: C.orchid, root: pc });
      }, i * step * 1000));
    });
    timers.current.push(setTimeout(() => { setPlayingStep(-1); setHeld(null); }, prog.steps.length * step * 1000 + 400));
  };

  const diat = useMemo(() => {
    const s = scale.iv.length === 7 ? scale : SCALES.find((x) => x.id === scale.parent);
    return { list: buildDiatonic(s.iv, sevenths), src: s };
  }, [scale, sevenths]);

  /* --- piano roll plumbing --- */
  const rollBase = 48 + rootPc;
  const revealRoll = () => {
    setRollOpen(true);
    setTimeout(() => {
      const el = rollRef.current;
      if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 60);
  };
  const fitRow = (m) => { let r = m - rollBase; while (r > 24) r -= 12; while (r < 0) r += 12; return r; };
  const loadProgToRoll = (prog) => {
    const bars = Math.min(4, Math.max(1, prog.steps.length));
    const out = [];
    prog.steps.slice(0, bars).forEach((s, i) => {
      const ct = CHORDS.find((c) => c.id === s.type) || CHORDS[0];
      const pc = (rootPc + s.semi) % 12;
      voice(pc, ct.iv).forEach((m) => {
        const row = fitRow(m);
        if (!out.some((n) => n.row === row && n.step === i * 16)) out.push({ row, step: i * 16, len: 16 });
      });
    });
    setRollBars(bars);
    setRollNotes(out);
    revealRoll();
  };
  const loadScaleToRoll = () => {
    const seq = [...scale.iv, 12];
    setRollBars(Math.min(4, Math.max(1, Math.ceil((seq.length * 2) / 16))));
    setRollNotes(seq.map((x, i) => ({ row: Math.min(24, x + 12), step: i * 2, len: 2 })));
    revealRoll();
  };

  return (
    <div className="min-h-screen w-full pb-24" style={{ background: C.ink, color: C.bone, fontFamily: SANS }}>
      <style>{GLOBAL_CSS}</style>

      {/* ---------- always-on readout ---------- */}
      <header className="sticky top-0 z-30" style={{ background: C.ink, borderBottom: "1px solid " + C.line }}>
        <div className="mx-auto max-w-4xl px-3 pt-3">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.3em", color: C.dim }}>THEORY DESK</div>
              <div className="flex items-baseline gap-2">
                <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.amber, lineHeight: 1.15 }}>{rootName}</span>
                <span style={{ fontSize: 15 }}>{scale.name.toLowerCase()}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVol(vol > 0 ? 0 : 0.85)}
              aria-label={vol > 0 ? "Mute audio" : "Unmute audio"}
              className="rounded-lg px-3 py-2"
              style={{ border: "1px solid " + C.line, color: vol > 0 ? C.bone : C.rose, fontSize: 14 }}
            >
              {vol > 0 ? "🔊" : "🔇"}
            </button>
          </div>

          <Keyboard
            octaves={2} base={60} info={info} height={100} flat={flat}
            onPlay={(m) => { tone(m, 0.9); if (picking) toggleSel(m % 12); }}
          />

          {picking && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
              style={{ background: C.panel, border: "1px solid " + C.rose }}>
              <span style={{ fontSize: 11, color: C.rose }}>
                Selection mode — tap keys to pick notes ({sel.length} selected)
              </span>
              {sel.length > 0 && (
                <button type="button" onClick={() => setSel([])} className="rounded px-2 py-1"
                  style={{ fontSize: 11, color: C.dim, border: "1px solid " + C.line }}>Clear</button>
              )}
            </div>
          )}

          <div className="mt-2 flex gap-1 overflow-x-auto pb-2" role="group" aria-label="Root note">
            {Array.from({ length: 12 }, (_, pc) => (
              <button
                type="button"
                key={pc}
                onClick={() => setRootPc(pc)}
                aria-pressed={pc === rootPc}
                aria-label={"Root note " + nameOf(pc, flat)}
                className="shrink-0 rounded-md px-2"
                style={{
                  fontFamily: MONO, fontSize: 12, minWidth: 40, height: 34,
                  background: pc === rootPc ? C.amber : "transparent",
                  color: pc === rootPc ? C.ink : SHARPS[pc].length > 1 ? C.dim : C.bone,
                  border: "1px solid " + (pc === rootPc ? C.amber : C.line),
                  fontWeight: pc === rootPc ? 700 : 500,
                }}
              >
                {nameOf(pc, flat)}
              </button>
            ))}
          </div>
        </div>

        <ControlBar {...{ scaleId, setScaleId, chordId, setChordId, bpm, setBpm, a4, setA4, flat, setFlat, sevenths, setSevenths, vol, setVol, onJumpRoll: revealRoll, rollCount: rollNotes.length }} />
      </header>

      {/* ---------- reference modules ---------- */}
      <div className="mx-auto max-w-4xl px-3 pt-3">
        <div>
          <div className="flex flex-wrap gap-1 pb-2" role="tablist" aria-label="Reference modules">
            {TAB_GROUPS.map((group, gi) => (
              <React.Fragment key={gi}>
                {gi > 0 && <span aria-hidden="true" className="self-center" style={{ width: 1, height: 18, background: C.line, margin: "0 4px" }} />}
                {group.map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => { clearTimers(); setHeld(null); setTab(id); }}
                    className="whitespace-nowrap rounded-lg px-3 text-xs"
                    style={{
                      height: 34,
                      background: tab === id ? C.bone : "transparent",
                      color: tab === id ? C.ink : C.dim,
                      border: "1px solid " + (tab === id ? C.bone : C.line),
                      fontWeight: tab === id ? 700 : 500,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-1" role="tabpanel">
          {tab === "scales" && <ScalesTab {...{ scale, setScaleId, scaleId, notes, degs, playScale, rootName, rootPc, flat, loadScaleToRoll }} />}
          {tab === "chords" && <ChordsTab {...{ chordId, setChordId, rootPc, rootName, flat, playChordAt, scalePcs }} />}
          {tab === "inkey" && <InKeyTab {...{ diat, sevenths, setSevenths, rootPc, flat, playChordAt, scale, rootName }} />}
          {tab === "progs" && <ProgTab {...{ progId, setProgId, playProg, playingStep, rootPc, rootName, flat, bpm, loadProgToRoll }} />}
          {tab === "mood" && <MoodTab {...{ setScaleId, setProgId, setTab, rootName, rootPc, playChordAt }} />}
          {tab === "intervals" && <IntervalTab {...{ rootPc, rootName, flat, flash }} />}
          {tab === "circle" && <CircleTab {...{ rootPc, setRootPc, setFlat, setScaleId, flat }} />}
          {tab === "rhythm" && <RhythmTab {...{ bpm }} />}
          {tab === "tuning" && <TuningTab {...{ a4, setA4, bpm, rootPc, rootName, scale, notes, flat }} />}
          {tab === "harmonics" && <HarmonicsTab {...{ a4, rootPc, rootName }} />}
          {tab === "mix" && <MixTab />}
          {tab === "tips" && <TipsTab />}
          {tab === "identify" && <IdentifyTab {...{ sel, setSel, flat, setRootPc, setScaleId, setChordId, setTab }} />}
        </div>
      </div>

      {/* ---------- piano roll: sketchpad at the foot of the page ---------- */}
      <div className="mx-auto max-w-4xl px-3 pt-4" ref={rollRef}>
        <RollPanel {...{
          rollNotes, setRollNotes, rollBars, setRollBars, rollBase, scalePcs, bpm, flat, rootName, scale,
          open: rollOpen, setOpen: setRollOpen, loadScaleToRoll,
          loadProg: () => loadProgToRoll(PROGS.find((p) => p.id === progId) || PROGS[0]),
          setKeys: setRollKeys,
        }} />
      </div>
    </div>
  );
}

/* ============================== GLOBAL CONTROLS ============================== */
const SELECT_STYLE = {
  background: C.panel2, color: C.bone, border: "1px solid " + C.line,
  borderRadius: 8, padding: "7px 8px", fontSize: 13, fontFamily: SANS, width: "100%",
};

function ControlBar({ scaleId, setScaleId, chordId, setChordId, bpm, setBpm, a4, setA4, flat, setFlat, sevenths, setSevenths, vol, setVol, onJumpRoll, rollCount }) {
  const [open, setOpen] = useState(false);
  const taps = useRef([]);
  const clamp = (v) => Math.max(20, Math.min(500, Math.round(v || 0)));
  const tap = () => {
    const now = Date.now();
    taps.current = [...taps.current, now].filter((t) => now - t < 3000).slice(-6);
    if (taps.current.length >= 2) {
      const g = taps.current.slice(1).map((t, i) => t - taps.current[i]);
      setBpm(clamp(60000 / (g.reduce((a, b) => a + b, 0) / g.length)));
    }
  };
  return (
    <div className="mx-auto max-w-4xl px-3 pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 gap-2" style={{ minWidth: 240 }}>
          <select id="scale-select" aria-label="Scale" value={scaleId} onChange={(e) => setScaleId(e.target.value)} style={{ ...SELECT_STYLE, flex: 1 }}>
            {SCALES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select aria-label="Chord type" value={chordId} onChange={(e) => setChordId(e.target.value)} style={{ ...SELECT_STYLE, flex: 1 }}>
            {CHORDS.map((c) => <option key={c.id} value={c.id}>{c.sym === "" ? "major" : c.sym} — {c.name}</option>)}
          </select>
        </div>

        <div className="flex flex-1 items-center gap-2" style={{ minWidth: 176 }}>
          <input
            type="number" min={20} max={500} value={bpm}
            onChange={(e) => setBpm(clamp(+e.target.value))}
            aria-label="Tempo in beats per minute"
            style={{ ...SELECT_STYLE, width: 66, flex: "none", fontFamily: MONO, textAlign: "center" }}
          />
          <span style={{ fontSize: 11, color: C.dim }}>BPM</span>
          <input
            type="range" min={20} max={500} value={bpm} onChange={(e) => setBpm(+e.target.value)}
            aria-label="Tempo slider" className="flex-1" style={{ accentColor: C.amber, minWidth: 70 }}
          />
        </div>

        <button type="button" onClick={tap} className="rounded-lg px-3" aria-label="Tap tempo"
          style={{ height: 34, border: "1px solid " + C.mint, color: C.mint, fontSize: 12 }}>Tap</button>
        <button type="button" onClick={onJumpRoll} className="rounded-lg px-3" aria-label="Go to the piano roll"
          style={{ height: 34, border: "1px solid " + C.orchid, color: C.orchid, fontSize: 12 }}>
          Roll{rollCount ? " (" + rollCount + ")" : ""} ↓
        </button>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-lg px-3"
          style={{ height: 34, border: "1px solid " + C.line, color: C.dim, fontSize: 12 }}>
          {open ? "Less ▲" : "More ▾"}
        </button>
      </div>

      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg p-2" style={{ background: C.panel, border: "1px solid " + C.line }}>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 11, color: C.dim }}>Note names</span>
            <Pill small active={!flat} onClick={() => setFlat(false)}>♯</Pill>
            <Pill small active={flat} onClick={() => setFlat(true)}>♭</Pill>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 11, color: C.dim }}>Chords in key</span>
            <Pill small active={!sevenths} onClick={() => setSevenths(false)}>triads</Pill>
            <Pill small active={sevenths} onClick={() => setSevenths(true)}>7ths</Pill>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 11, color: C.dim }}>A4</span>
            {[432, 440, 442, 444].map((v) => (
              <Pill key={v} small active={a4 === v} onClick={() => setA4(v)}>{v}</Pill>
            ))}
          </div>
          <div className="flex flex-1 items-center gap-2" style={{ minWidth: 150 }}>
            <span style={{ fontSize: 11, color: C.dim }}>Volume</span>
            <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(+e.target.value)}
              aria-label="Volume" className="flex-1" style={{ accentColor: C.mint }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== PIANO ROLL ============================== */
const ROLL_ROWS = 25;
const CELL_W = 28;
const CELL_H = 16;

const RollGrid = React.memo(function RollGrid({ steps, rollBase, rollNotes, scalePcs, flat, onToggle, onPreview }) {
  const cells = {};
  rollNotes.forEach((n) => {
    for (let k = 0; k < n.len; k++) cells[n.row + ":" + (n.step + k)] = { start: k === 0, end: k === n.len - 1 };
  });
  const rows = Array.from({ length: ROLL_ROWS }, (_, i) => ROLL_ROWS - 1 - i);
  return (
    <div style={{ width: 46 + steps * CELL_W }}>
      <div className="flex" style={{ height: 16 }}>
        <div className="sticky left-0 z-10 shrink-0" style={{ width: 46, background: C.panel }} />
        {Array.from({ length: steps }, (_, s) => (
          <div key={s} aria-hidden="true" style={{
            width: CELL_W, flexShrink: 0, fontFamily: MONO, fontSize: 9, color: C.dim, textAlign: "center",
            borderLeft: "1px solid " + (s % 16 === 0 ? C.line : "transparent"),
          }}>{s % 4 === 0 ? s / 4 + 1 : ""}</div>
        ))}
      </div>
      {rows.map((row) => {
        const midi = rollBase + row;
        const pc = midi % 12;
        const inScale = scalePcs.includes(pc);
        const isRoot = pc === scalePcs[0];
        const black = [1, 3, 6, 8, 10].includes(pc);
        const label = octName(midi, flat);
        return (
          <div key={row} className="flex" style={{ height: CELL_H }}>
            <button
              type="button"
              onPointerDown={() => onPreview(row)}
              aria-label={"Preview " + label}
              className="sticky left-0 z-10 shrink-0"
              style={{
                width: 46, background: black ? "#141019" : "#221d2c",
                borderTop: "1px solid " + C.ink, borderRight: "1px solid " + C.line,
                color: isRoot ? C.amber : inScale ? C.bone : C.dim,
                fontFamily: MONO, fontSize: 9, textAlign: "right", paddingRight: 4,
              }}
            >{label}</button>
            {Array.from({ length: steps }, (_, s) => {
              const cell = cells[row + ":" + s];
              return (
                <button
                  type="button"
                  key={s}
                  onPointerDown={() => onToggle(row, s)}
                  aria-label={label + ", step " + (s + 1)}
                  aria-pressed={!!cell}
                  style={{
                    width: CELL_W, height: CELL_H, flexShrink: 0,
                    background: cell ? (isRoot ? C.amber : C.orchid) : inScale ? (black ? "#1b1622" : "#221d2c") : "#161320",
                    borderTop: "1px solid " + C.ink,
                    borderLeft: "1px solid " + (s % 16 === 0 ? C.line : s % 4 === 0 ? "#2a2436" : "#1c1826"),
                    borderTopLeftRadius: cell && cell.start ? 3 : 0, borderBottomLeftRadius: cell && cell.start ? 3 : 0,
                    borderTopRightRadius: cell && cell.end ? 3 : 0, borderBottomRightRadius: cell && cell.end ? 3 : 0,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
});

function RollPanel({ rollNotes, setRollNotes, rollBars, setRollBars, rollBase, scalePcs, bpm, flat, rootName, scale, open, setOpen, loadScaleToRoll, loadProg, setKeys }) {
  const steps = rollBars * 16;
  const [len, setLen] = useState(4);
  const [playStep, setPlayStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState("");
  const iv = useRef(null);
  const live = useRef({ notes: rollNotes, steps, len, rollBase, bpm });
  live.current = { notes: rollNotes, steps, len, rollBase, bpm };

  useEffect(() => () => clearInterval(iv.current), []);
  /* dropping bars removes notes that no longer exist */
  useEffect(() => { setRollNotes((n) => (n.some((x) => x.step >= steps) ? n.filter((x) => x.step < steps) : n)); }, [steps, setRollNotes]);

  const stop = useCallback(() => {
    clearInterval(iv.current); iv.current = null;
    setPlaying(false); setPlayStep(-1); setKeys(null);
  }, [setKeys]);

  const play = () => {
    if (playing) return stop();
    const c = ctx();
    if (!c) { setSaved("This browser has no Web Audio support, so playback is unavailable."); return; }
    const { bpm: B } = live.current;
    const stepDur = 60 / B / 4;
    const t0 = c.currentTime + 0.12;
    const fire = (s, abs) => {
      const due = live.current.notes.filter((n) => n.step === s);
      due.forEach((n) => tone(live.current.rollBase + n.row, stepDur * n.len * 0.92, Math.max(0, t0 + abs * stepDur - ctx().currentTime), 0.15));
      if (due.length) setKeys([...new Set(due.map((n) => (live.current.rollBase + n.row) % 12))].sort((a, b) => a - b));
    };
    setPlaying(true); setPlayStep(0); fire(0, 0);
    let abs = 0;
    iv.current = setInterval(() => {
      abs += 1;
      const s = abs % live.current.steps;
      setPlayStep(s);
      fire(s, abs);
    }, stepDur * 1000);
  };

  /* restart the clock if the tempo or length changes mid-loop */
  useEffect(() => { if (playing) { stop(); } /* eslint-disable-next-line */ }, [bpm, steps]);

  const onToggle = useCallback((row, s) => {
    setRollNotes((prev) => {
      const hit = prev.find((n) => n.row === row && s >= n.step && s < n.step + n.len);
      if (hit) return prev.filter((n) => n !== hit);
      return [...prev, { row, step: s, len: Math.max(1, Math.min(live.current.len, live.current.steps - s)) }];
    });
    tone(live.current.rollBase + row, 0.45);
  }, [setRollNotes]);

  const onPreview = useCallback((row) => tone(live.current.rollBase + row, 0.7), []);

  const exportRoll = () => {
    if (!rollNotes.length) { setSaved("Nothing to export yet — tap the grid to add some notes first."); return; }
    const nm = `${rootName}-${scale.name}-roll`;
    const ok = downloadMidi(
      rollNotes.map((n) => ({ tick: n.step * (PPQ / 4), dur: Math.max(20, n.len * (PPQ / 4) - 10), midi: rollBase + n.row, vel: 100 })),
      bpm, nm
    );
    setSaved(ok ? "Saved " + safeName(nm) + ".mid — drag it into your DAW."
                : "Your browser blocked the download. Open this artifact in its own window and try again.");
  };

  return (
    <Panel style={{ padding: 10 }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          className="flex items-center gap-2" style={{ color: C.bone }}>
          <span style={{ color: C.dim, fontSize: 12 }}>{open ? "▾" : "▸"}</span>
          <span className="text-xs uppercase" style={{ letterSpacing: "0.18em", color: C.dim }}>Piano roll</span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>
            {rollBars} bar{rollBars > 1 ? "s" : ""} · {rollNotes.length} note{rollNotes.length === 1 ? "" : "s"}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <PlayBtn onClick={play} icon={playing ? "■" : "▶"} label={playing ? "Stop" : "Play"} />
          <PlayBtn color={C.bone} icon="↓" onClick={exportRoll} label=".mid" />
        </div>
      </div>

      {open && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1" role="group" aria-label="Bars">
              <span style={{ fontSize: 11, color: C.dim }}>Bars</span>
              {[1, 2, 3, 4].map((b) => (
                <Pill key={b} small active={rollBars === b} onClick={() => setRollBars(b)}>{b}</Pill>
              ))}
            </div>
            <div className="flex items-center gap-1" role="group" aria-label="Note length">
              <span style={{ fontSize: 11, color: C.dim }}>Length</span>
              {[[1, "1/16"], [2, "1/8"], [4, "1/4"], [8, "1/2"], [16, "bar"]].map(([v, l]) => (
                <Pill key={v} small color={C.orchid} active={len === v} onClick={() => setLen(v)}>{l}</Pill>
              ))}
            </div>
          </div>

          <div className="relative mt-2 overflow-auto rounded-lg" style={{ maxHeight: 260, border: "1px solid " + C.line }}>
            <div className="relative" style={{ width: 46 + steps * CELL_W }}>
              {playStep >= 0 && (
                <div className="pointer-events-none absolute top-0 z-20" aria-hidden="true"
                  style={{ left: 46 + playStep * CELL_W, width: CELL_W, height: "100%", background: "rgba(245,165,36,0.16)", borderLeft: "1px solid " + C.amber }} />
              )}
              <RollGrid {...{ steps, rollBase, rollNotes, scalePcs, flat, onToggle, onPreview }} />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <PlayBtn color={C.mint} icon="+" onClick={loadScaleToRoll} label="Load scale" />
            <PlayBtn color={C.mint} icon="+" onClick={loadProg} label="Load progression" />
            <PlayBtn color={C.rose} icon="×" onClick={() => { stop(); setRollNotes([]); setSaved(""); }} label="Clear" />
          </div>
          <p className="mt-2 text-xs" style={{ color: C.dim }}>
            Tap a cell to place a note, tap it again to remove it. Shaded rows are in {rootName} {scale.name.toLowerCase()};
            amber rows are the root. Columns are 1/16 notes — thin lines mark beats, thick lines mark bars.
            Changing the key transposes whatever is in the grid.
          </p>
        </>
      )}
      {saved && <p className="mt-2 text-xs" style={{ color: C.mint }}>{saved}</p>}
    </Panel>
  );
}

/* ============================== TABS ============================== */
function NoteRow({ notes, degs, onNote }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {notes.map((n, i) => (
        <button
          key={i}
          onClick={() => onNote && onNote(i)}
          className="rounded-lg px-3 py-2 text-center"
          style={{
            background: i === 0 ? C.amber : C.panel2,
            color: i === 0 ? C.ink : C.bone,
            border: "1px solid " + (i === 0 ? C.amber : C.line),
            minWidth: 52,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{n}</div>
          <div style={{ fontSize: 10, opacity: 0.75, fontFamily: MONO }}>{degs[i]}</div>
        </button>
      ))}
    </div>
  );
}

function ScalesTab({ scale, setScaleId, scaleId, notes, degs, playScale, rootPc, rootName, flat, loadScaleToRoll }) {
  const rel = (rootPc + 9) % 12;
  const par = scale.parent === "major" ? "minor" : "major";
  return (
    <>
      <Panel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>Notes you can play</Eyebrow>
          <div className="flex gap-2">
            <PlayBtn onClick={playScale} label="Hear it" />
            <PlayBtn color={C.orchid} icon="→" onClick={loadScaleToRoll} label="Load into roll" />
          </div>
        </div>
        <NoteRow notes={notes} degs={degs} onNote={(i) => tone(60 + rootPc + scale.iv[i], 0.8)} />
        <p className="mt-3 text-sm" style={{ color: C.bone }}>{scale.feel}</p>
        <p className="mt-1 text-sm" style={{ color: C.dim }}>Used in: {scale.use}</p>
      </Panel>

      <Panel>
        <Eyebrow>Browse by sound</Eyebrow>
        <div>
          {SCALES.map((s) => {
            const on = s.id === scaleId;
            return (
              <button
                type="button"
                key={s.id}
                aria-pressed={on}
                onClick={() => setScaleId(s.id)}
                className="flex w-full items-baseline gap-3 border-b py-2 text-left"
                style={{ borderColor: C.line }}
              >
                <span className="shrink-0" style={{ width: 116, fontFamily: MONO, fontSize: 13, fontWeight: on ? 700 : 500, color: on ? C.amber : C.bone }}>
                  {s.name}
                </span>
                <span className="min-w-0 flex-1 text-xs" style={{ color: C.dim }}>{s.feel}</span>
                <span className="shrink-0" style={{ fontFamily: MONO, fontSize: 10, color: C.dim }}>{s.iv.length}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Quick facts</Eyebrow>
        <div className="space-y-2 text-sm">
          <Fact k="Home note" v={`${rootName} — start and end here and it will sound finished.`} />
          <Fact k="Number of notes" v={`${scale.iv.length}. The other ${12 - scale.iv.length} are outside the scale — usable, but as passing colour.`} />
          {scale.iv.length === 7 && (
            <Fact k="Relative key" v={`${rootName} ${scale.parent === "major" ? "major" : "minor"} shares its notes with ${nameOf(scale.parent === "major" ? rel : (rootPc + 3) % 12, flat)} ${par}. Same keys, different home.`} />
          )}
          <Fact k="Melody trick" v="Land on the 1, 3 or 5 on strong beats. Everything else is passing motion." />
        </div>
      </Panel>
    </>
  );
}
function Fact({ k, v }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0" style={{ width: 108, color: C.dim, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", paddingTop: 2 }}>{k}</div>
      <div style={{ color: C.bone }}>{v}</div>
    </div>
  );
}

function ChordsTab({ chordId, setChordId, rootPc, rootName, flat, playChordAt, scalePcs }) {
  const ch = CHORDS.find((c) => c.id === chordId) || CHORDS[0];
  const noteNames = ch.iv.map((x) => nameOf(rootPc + x, flat));
  const inKey = ch.iv.every((x) => scalePcs.includes((rootPc + x) % 12));
  return (
    <>
      <Panel>
        <div className="mb-2 flex items-start justify-between">
          <div>
            <Eyebrow>Chord</Eyebrow>
            <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.orchid }}>
              {rootName}{ch.sym}
            </div>
            <div className="text-sm" style={{ color: C.dim }}>{ch.name}</div>
          </div>
          <PlayBtn color={C.orchid} onClick={() => playChordAt(rootPc, ch.iv, noteNames)} label="Hear it" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ch.iv.map((x, i) => (
            <button key={i} onClick={() => tone(voice(rootPc, ch.iv)[i], 0.9)}
              className="rounded-lg px-3 py-2"
              style={{ background: i === 0 ? C.amber : C.panel2, color: i === 0 ? C.ink : C.bone, border: "1px solid " + (i === 0 ? C.amber : C.line), minWidth: 52 }}>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700 }}>{noteNames[i]}</div>
              <div style={{ fontSize: 10, opacity: 0.75, fontFamily: MONO }}>{EXT_DEG[x] || CHROM_DEG[x % 12]}</div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm">{ch.feel}</p>
        <p className="mt-1 text-xs" style={{ color: inKey ? C.mint : C.rose }}>
          {inKey ? "All notes fit the current scale." : "Contains notes outside the current scale — fine as a colour chord."}
        </p>
      </Panel>

      <Panel>
        <Eyebrow>Chord type</Eyebrow>
        <div className="flex flex-wrap gap-1.5">
          {CHORDS.map((c) => (
            <Pill key={c.id} small color={C.orchid} active={c.id === chordId} onClick={() => setChordId(c.id)}>
              {c.sym === "" ? "major" : c.sym}
            </Pill>
          ))}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>How chords are built</Eyebrow>
        <p className="text-sm" style={{ color: C.bone }}>
          Start on a note, skip one scale note, take the next — that's a triad (1–3–5). Keep skipping to add
          the 7th, 9th, 11th and 13th. Each extra note adds colour and takes away certainty.
        </p>
        <div className="mt-3 space-y-1.5 text-sm">
          <Fact k="3rd" v="Decides happy (major) or sad (minor). The most important note after the root." />
          <Fact k="5th" v="Adds power. Safe to remove if the chord feels crowded." />
          <Fact k="7th" v="Adds sophistication: maj7 = dreamy, dom7 = bluesy, m7 = smooth." />
          <Fact k="9th and up" v="Pure flavour. Put them at the top, never next to the root." />
        </div>
      </Panel>
    </>
  );
}

function InKeyTab({ diat, sevenths, setSevenths, rootPc, flat, playChordAt, scale, rootName }) {
  return (
    <>
      <Panel>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <Eyebrow>Chords that fit {rootName} {scale.name.toLowerCase()}</Eyebrow>
          <span style={{ fontSize: 11, color: C.dim }}>
            Showing {sevenths ? "7th chords" : "triads"} — switch under “More” at the top.
          </span>
        </div>
        {scale.iv.length !== 7 && (
          <p className="mb-3 text-xs" style={{ color: C.dim }}>
            {scale.name} has {scale.iv.length} notes, so chords are borrowed from its parent {diat.src.name.toLowerCase()} scale.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {diat.list.map((d, i) => {
            const pc = (rootPc + d.semis) % 12;
            const name = nameOf(pc, flat) + (d.chord ? d.chord.sym : "");
            return (
              <button key={i} onClick={() => playChordAt(pc, d.chord ? d.chord.iv : [0, 4, 7])}
                className="rounded-lg p-2 text-left"
                style={{ background: C.panel2, border: "1px solid " + (i === 0 ? C.amber : C.line) }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim }}>{d.roman}</div>
                <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: i === 0 ? C.amber : C.bone }}>{name}</div>
                <div style={{ fontSize: 10, color: C.dim }}>{d.chord ? d.chord.name : ""}</div>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel>
        <Eyebrow>What to do with them</Eyebrow>
        <div className="space-y-2 text-sm">
          <Fact k="Safe bet" v="Any of these chords in any order will sound acceptable. Start and end on the first one." />
          <Fact k="Strongest pull" v="The 5th chord (V) pulls hardest back to the 1st. Put it just before you loop." />
          <Fact k="Emotional pair" v="The 1st and 6th chords are the same notes with a different mood. Swap them to change the feel of a section." />
          <Fact k="The odd one" v="The diminished chord is unstable. Use it as a one-beat passing chord, not a resting point." />
        </div>
      </Panel>
    </>
  );
}

function ProgTab({ progId, setProgId, playProg, playingStep, rootPc, rootName, flat, bpm, loadProgToRoll }) {
  const prog = PROGS.find((p) => p.id === progId) || PROGS[0];
  const tags = [...new Set(PROGS.map((p) => p.tag))];
  const [tag, setTag] = useState("all");
  const [saved, setSaved] = useState("");
  const list = tag === "all" ? PROGS : PROGS.filter((p) => p.tag === tag);
  const exportProg = () => {
    const items = [];
    prog.steps.forEach((s, i) => {
      const ct = CHORDS.find((c) => c.id === s.type) || CHORDS[0];
      const pc = (rootPc + s.semi) % 12;
      voice(pc, ct.iv).forEach((m) =>
        items.push({ tick: i * PPQ * 2, dur: PPQ * 2 - 20, midi: m, vel: 96 })
      );
    });
    const ok = downloadMidi(items, bpm, `${rootName}-${prog.name}`);
    setSaved(ok ? "Saved " + safeName(`${rootName}-${prog.name}`) + ".mid" : "Download blocked — open the artifact in its own window and try again.");
  };
  return (
    <>
      <Panel>
        <div className="mb-1 flex items-start justify-between">
          <div>
            <Eyebrow>{prog.tag} · {prog.mode} key</Eyebrow>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{prog.name}</div>
          </div>
          <PlayBtn color={C.orchid} onClick={() => playProg(prog)} label="Hear it" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {prog.steps.map((s, i) => {
            const ct = CHORDS.find((c) => c.id === s.type) || CHORDS[0];
            const pc = (rootPc + s.semi) % 12;
            return (
              <div key={i} className="rounded-lg px-3 py-2"
                style={{
                  background: playingStep === i ? C.orchid : C.panel2,
                  color: playingStep === i ? C.ink : C.bone,
                  border: "1px solid " + (playingStep === i ? C.orchid : C.line), minWidth: 66,
                }}>
                <div style={{ fontFamily: MONO, fontSize: 10, opacity: 0.7 }}>{s.label}</div>
                <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700 }}>
                  {nameOf(pc, flat)}{ct.sym}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm">{prog.feel}</p>
        <p className="mt-1 text-sm" style={{ color: C.dim }}>Heard in: {prog.heard}</p>
        <p className="mt-3 text-xs" style={{ color: C.dim }}>
          Written in {rootName} {prog.mode} at {bpm} BPM. Change the key or the tempo at the top and this follows.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <PlayBtn color={C.amber} icon="→" onClick={() => loadProgToRoll(prog)} label="Load into roll" />
          <PlayBtn color={C.bone} icon="↓" onClick={exportProg} label="Export .mid" />
        </div>
        {saved && <p className="mt-2 text-xs" style={{ color: C.mint }}>{saved}</p>}
      </Panel>

      <Panel>
        <Eyebrow>Browse</Eyebrow>
        <div className="mb-2 flex flex-wrap gap-1.5">
          <Pill small active={tag === "all"} onClick={() => setTag("all")}>all</Pill>
          {tags.map((t) => (
            <Pill key={t} small active={tag === t} onClick={() => setTag(t)}>{t}</Pill>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {list.map((p) => (
            <Pill key={p.id} small color={C.orchid} active={p.id === progId} onClick={() => setProgId(p.id)}>
              {p.name}
            </Pill>
          ))}
        </div>
      </Panel>
    </>
  );
}

function MoodTab({ setScaleId, setProgId, setTab, setChordId, rootName, rootPc, flat, playChordAt }) {
  const [sel, setSel] = useState(null);
  const m = MOODS.find((x) => x.id === sel);
  return (
    <>
      <Panel>
        <Eyebrow>What should it feel like?</Eyebrow>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((x) => (
            <Pill key={x.id} small active={x.id === sel}
              onClick={() => { setSel(x.id); setScaleId(x.scale); setProgId(x.prog); }}>
              {x.name}
            </Pill>
          ))}
        </div>
        {!m && <p className="mt-3 text-sm" style={{ color: C.dim }}>Pick a feeling and the whole cheatsheet retunes to it.</p>}
      </Panel>

      {m && (
        <>
          <Panel>
            <Eyebrow color={C.amber}>Recipe for “{m.name}” in {rootName}</Eyebrow>
            <div className="space-y-2 text-sm">
              <Fact k="Scale" v={`${rootName} ${(SCALES.find((s) => s.id === m.scale) || {}).name.toLowerCase()} — already loaded above.`} />
              <Fact k="Progression" v={`${(PROGS.find((p) => p.id === m.prog) || {}).name} — open the Progressions tab to hear it.`} />
              <Fact k="Tempo" v={m.bpm + " BPM"} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.chords.map((cid) => {
                const c = CHORDS.find((x) => x.id === cid);
                return (
                  <button key={cid} onClick={() => playChordAt(rootPc, c.iv)}
                    className="rounded-lg px-3 py-2"
                    style={{ background: C.panel2, border: "1px solid " + C.line }}>
                    <div style={{ fontFamily: MONO, fontWeight: 700, color: C.orchid }}>{rootName}{c.sym}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>{c.name}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Pill small onClick={() => setTab("progs")}>Open progression</Pill>
              <Pill small onClick={() => setTab("inkey")}>Chords in this key</Pill>
            </div>
          </Panel>
          <Panel>
            <Eyebrow>Production moves</Eyebrow>
            <ul className="space-y-2 text-sm">
              {m.tips.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: C.mint }}>—</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </>
  );
}

function IntervalTab({ rootPc, rootName, flat, flash }) {
  return (
    <>
      <Panel>
        <Eyebrow>Distance between two notes, from {rootName}</Eyebrow>
        <p className="text-sm" style={{ color: C.dim }}>
          An interval is just how many keys apart two notes are — counting black keys. Tap one to hear it.
        </p>
      </Panel>
      {INTERVALS.map((iv) => {
        const top = (rootPc + iv.s) % 12;
        return (
          <button type="button" key={iv.s} aria-label={"Hear " + iv.name} className="w-full text-left"
            onClick={() => {
              tone(60 + rootPc, 1.1); tone(60 + rootPc + iv.s, 1.1, 0.06);
              flash([rootPc, top].filter((v, i, a) => a.indexOf(v) === i), [rootName, nameOf(top, flat)], C.mint, rootPc);
            }}>
            <Panel className="hover:opacity-90">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-lg px-2 py-1 text-center"
                  style={{ background: C.panel2, border: "1px solid " + C.line, minWidth: 46 }}>
                  <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: C.amber }}>{iv.short}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, color: C.dim }}>{iv.s} key{iv.s === 1 ? "" : "s"}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span style={{ fontWeight: 700 }}>{iv.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: C.mint }}>
                      {rootName} → {nameOf(top, flat)}
                    </span>
                  </div>
                  <div className="text-sm" style={{ color: C.bone }}>{iv.feel}</div>
                  <div className="text-xs" style={{ color: C.dim }}>{iv.song}</div>
                </div>
              </div>
            </Panel>
          </button>
        );
      })}
    </>
  );
}

function CircleTab({ rootPc, setRootPc, setFlat, scaleId, setScaleId, flat }) {
  const idx = CIRCLE.findIndex((c) => c.pc === rootPc);
  const cur = idx >= 0 ? CIRCLE[idx] : null;
  const R = 128, r1 = 100, r2 = 62;
  const pos = (i, r) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return [R + r * Math.cos(a), R + r * Math.sin(a)];
  };
  const near = idx >= 0 ? [(idx + 11) % 12, (idx + 1) % 12] : [];
  return (
    <>
      <Panel>
        <Eyebrow>Which keys sound good together</Eyebrow>
        <div className="flex justify-center">
          <svg viewBox="0 0 256 256" style={{ width: "100%", maxWidth: 340 }}>
            <circle cx={R} cy={R} r={122} fill="none" stroke={C.line} />
            <circle cx={R} cy={R} r={82} fill="none" stroke={C.line} />
            {CIRCLE.map((c, i) => {
              const [x, y] = pos(i, r1);
              const [mx, my] = pos(i, r2);
              const isCur = i === idx;
              const isNear = near.includes(i);
              return (
                <g key={c.maj}>
                  <circle cx={x} cy={y} r={20}
                    fill={isCur ? C.amber : isNear ? C.panel2 : C.panel}
                    stroke={isCur ? C.amber : isNear ? C.mint : C.line}
                    style={{ cursor: "pointer" }}
                    role="button" tabIndex={0} aria-label={c.maj + " major"}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRootPc(c.pc); setFlat(c.flat); setScaleId("major"); } }}
                    onClick={() => { setRootPc(c.pc); setFlat(c.flat); setScaleId("major"); }} />
                  <text x={x} y={y + 5} textAnchor="middle" pointerEvents="none"
                    style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, fill: isCur ? C.ink : C.bone }}>
                    {c.maj}
                  </text>
                  <circle cx={mx} cy={my} r={15} fill={C.ink} stroke={C.line}
                    style={{ cursor: "pointer" }}
                    role="button" tabIndex={0} aria-label={c.min + " minor"}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRootPc(c.minPc); setFlat(c.flat); setScaleId("minor"); } }}
                    onClick={() => { setRootPc(c.minPc); setFlat(c.flat); setScaleId("minor"); }} />
                  <text x={mx} y={my + 4} textAnchor="middle" pointerEvents="none"
                    style={{ fontFamily: MONO, fontSize: 11, fill: C.dim }}>
                    {c.min}
                  </text>
                </g>
              );
            })}
            <text x={R} y={R - 4} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 9, fill: C.dim, letterSpacing: "0.12em" }}>MAJOR OUT</text>
            <text x={R} y={R + 8} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 9, fill: C.dim, letterSpacing: "0.12em" }}>MINOR IN</text>
          </svg>
        </div>
        <p className="mt-2 text-center text-xs" style={{ color: C.dim }}>
          Tap an outer circle for a major key, an inner one for a minor key.
        </p>
      </Panel>
      <Panel>
        <Eyebrow>How to use it</Eyebrow>
        <div className="space-y-2 text-sm">
          {cur && <Fact k="You are here" v={`${cur.maj} major has ${cur.sig}. Its relative minor is ${cur.min} — identical notes, sadder home.`} />}
          {cur && <Fact k="Safe neighbours" v={`${CIRCLE[(idx + 11) % 12].maj} and ${CIRCLE[(idx + 1) % 12].maj} share all but one note with ${cur.maj}. Perfect for a key change or a borrowed chord.`} />}
          <Fact k="Chord shortcut" v="Your key, its two neighbours, and the three minors under them are the six main chords of the key." />
          <Fact k="Modulation" v="Move one step clockwise to lift the energy, one step anticlockwise to relax it." />
          <Fact k="Producer note" v="Sampling two tracks? If their keys sit next to each other here, they'll layer with almost no clashing." />
        </div>
      </Panel>
    </>
  );
}

function RhythmTab({ bpm }) {
  const beat = 60000 / bpm;
  const rows = [
    ["Whole note", 4], ["Half note", 2], ["Quarter note (1 beat)", 1],
    ["Eighth note", 0.5], ["Sixteenth note", 0.25], ["Dotted eighth", 0.75], ["Eighth triplet", 1 / 3],
  ];
  return (
    <>
      <Panel>
        <Eyebrow>Note lengths and delay times at {bpm} BPM</Eyebrow>
        <div className="space-y-1">
          {rows.map(([n, b]) => (
            <div key={n} className="flex justify-between border-b py-1.5 text-sm" style={{ borderColor: C.line }}>
              <span>{n}</span>
              <span style={{ fontFamily: MONO, color: C.mint }}>{Math.round(beat * b)} ms</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: C.dim }}>
          Set a delay to the eighth-note value for a rhythmic echo, or the dotted eighth for the classic
          wide-open guitar and synth sound. Reverb pre-delay of one sixteenth keeps things from smearing.
        </p>
      </Panel>

      <Panel>
        <Eyebrow>Time signatures, in plain terms</Eyebrow>
        <div className="space-y-3">
          {TIME_SIGS.map((t) => (
            <div key={t.sig}>
              <div className="flex items-baseline gap-2">
                <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: C.amber }}>{t.sig}</span>
                <span className="text-xs" style={{ color: C.dim }}>“{t.say}”</span>
              </div>
              <div className="text-sm">{t.feel}</div>
              <div className="text-xs" style={{ color: C.dim }}>{t.ex}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Typical tempo by genre</Eyebrow>
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {GENRE_BPM.map(([g, b]) => (
            <div key={g} className="flex justify-between border-b py-1.5 text-sm" style={{ borderColor: C.line }}>
              <span>{g}</span>
              <span style={{ fontFamily: MONO, color: C.dim }}>{b}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Groove</Eyebrow>
        <div className="space-y-2 text-sm">
          <Fact k="Swing" v="Delays every off-beat. 50% = straight, 54–58% = subtle groove, 62–66% = full shuffle." />
          <Fact k="Backbeat" v="Snare or clap on beats 2 and 4. This is what makes people nod." />
          <Fact k="Half-time" v="Move the snare to beat 3 only. Instantly heavier without changing tempo." />
          <Fact k="Syncopation" v="Put an accent just before a beat instead of on it. That's most of what makes a groove interesting." />
          <Fact k="Humanising" v="Random timing ±10–30 ms and velocity ±15 stops the grid from sounding robotic." />
        </div>
      </Panel>
    </>
  );
}

function MixTab() {
  return (
    <>
      <Panel>
        <Eyebrow>Dynamics — how loud to play</Eyebrow>
        <div className="space-y-1">
          {DYNAMICS.map(([sym, mean, vel]) => (
            <div key={sym} className="flex items-center gap-3 border-b py-1.5" style={{ borderColor: C.line }}>
              <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: C.amber, minWidth: 40 }}>{sym}</span>
              <span className="flex-1 text-sm">{mean}</span>
              <div className="h-1.5 rounded" style={{ width: 90, background: C.panel2 }}>
                <div className="h-full rounded" style={{ width: (vel / 127) * 100 + "%", background: C.mint }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.dim, minWidth: 28, textAlign: "right" }}>{vel}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: C.dim }}>
          The number is MIDI velocity — what you draw into a piano roll. Most DAWs default to 100, which is
          why programmed parts sound flat. Vary it.
        </p>
      </Panel>

      <Panel>
        <Eyebrow>Articulation</Eyebrow>
        <div className="space-y-2 text-sm">
          <Fact k="Staccato" v="Short and detached. Cut note lengths to 25–50% for tightness and groove." />
          <Fact k="Legato" v="Notes overlap slightly so there is no gap. Essential for realistic strings and leads." />
          <Fact k="Accent" v="One note noticeably louder. Use it to mark the start of a phrase." />
          <Fact k="Crescendo" v="Gets louder over time. Automate volume or filter cutoff upward into a chorus." />
          <Fact k="Sostenuto / sustain" v="Let notes ring. Great for pads, dangerous for busy chords in the low end." />
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Frequency ranges</Eyebrow>
        <div className="space-y-1">
          {FREQ_BANDS.map(([r, n, d]) => (
            <div key={r} className="border-b py-1.5" style={{ borderColor: C.line }}>
              <div className="flex items-baseline gap-2">
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.mint, minWidth: 96 }}>{r}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{n}</span>
              </div>
              <div className="text-sm" style={{ color: C.dim }}>{d}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Where each instrument lives</Eyebrow>
        <div className="space-y-1">
          {INSTRUMENT_RANGE.map(([i, r]) => (
            <div key={i} className="flex flex-wrap justify-between gap-x-4 border-b py-1.5 text-sm" style={{ borderColor: C.line }}>
              <span>{i}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.dim }}>{r}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Arrangement</Eyebrow>
        <div className="space-y-1">
          {STRUCTURE.map(([s, len, d]) => (
            <div key={s} className="border-b py-1.5" style={{ borderColor: C.line }}>
              <div className="flex items-baseline gap-2">
                <span style={{ fontWeight: 700, fontSize: 13 }}>{s}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.amber }}>{len}</span>
              </div>
              <div className="text-sm" style={{ color: C.dim }}>{d}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: C.dim }}>
          Sections almost always come in 4, 8 or 16 bars. Change something on every 8th bar or attention drifts.
        </p>
      </Panel>
    </>
  );
}

function TipsTab() {
  return (
    <>
      <Panel>
        <Eyebrow>When something isn't working</Eyebrow>
        <p className="text-sm" style={{ color: C.dim }}>Common problems and the fastest fix for each.</p>
      </Panel>
      {TIPS.map((t, i) => (
        <Panel key={i}>
          <div style={{ fontWeight: 700, color: C.amber }}>{t.t}</div>
          <div className="mt-1 text-sm">{t.b}</div>
        </Panel>
      ))}
      <Panel>
        <Eyebrow>The five things that matter most</Eyebrow>
        <ol className="space-y-2 text-sm">
          {[
            "Pick a key and stay in it until you have a reason not to.",
            "Four chords is plenty. Repetition is not a weakness.",
            "The bass note under a chord changes its emotion more than any added note.",
            "Space is an instrument. Mute a layer and see if you miss it.",
            "If the loop still feels good after ten plays, it's finished — arrange it.",
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span style={{ fontFamily: MONO, color: C.mint }}>{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}

/* ============================== HZ & TUNING ============================== */
function Row({ a, b, c }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 text-sm" style={{ borderColor: C.line }}>
      <span className="min-w-0">{a}</span>
      <span className="shrink-0 text-right" style={{ fontFamily: MONO, fontSize: 12, color: C.mint }}>
        {b}
        {c && <span style={{ color: C.dim }}> · {c}</span>}
      </span>
    </div>
  );
}

function TuningTab({ a4, setA4, bpm, rootPc, rootName, scale, notes, flat }) {
  const [oct, setOct] = useState(4);
  const beatHz = bpm / 60;
  const divs = [["1 bar", 0.25], ["1/2", 0.5], ["1/4", 1], ["1/4 triplet", 1.5], ["1/8", 2], ["1/8 dotted", 4 / 3], ["1/16", 4], ["1/32", 8]];
  /* tempo pushed into the audio range */
  const tempoPitch = [];
  for (let n = 5; n <= 9; n++) {
    const f = beatHz * Math.pow(2, n);
    tempoPitch.push({ n, f, nn: nearestNote(f, a4) });
  }
  const rootF = fOf(12 * (oct + 1) + rootPc, a4);
  return (
    <>
      <Panel>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>Note frequencies · octave {oct}</Eyebrow>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6].map((o) => (
              <Pill key={o} small active={o === oct} onClick={() => setOct(o)}>{o}</Pill>
            ))}
          </div>
        </div>
        {notes.map((n, i) => {
          const m = 12 * (oct + 1) + ((rootPc + scale.iv[i]) % 12);
          const f = fOf(m, a4);
          return <Row key={i} a={<span><b style={{ fontFamily: MONO, color: i === 0 ? C.amber : C.bone }}>{n}</b> <span style={{ color: C.dim }}>{octName(m, flat)}</span></span>} b={hz(f)} c={"×2 = " + hz(f * 2)} />;
        })}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs" style={{ color: C.dim }}>Tuning reference A4</span>
          {[432, 440, 442, 444].map((v) => (
            <Pill key={v} small active={a4 === v} onClick={() => setA4(v)}>{v} Hz</Pill>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: C.dim }}>
          440 Hz is the standard every DAW and sample library uses. Changing it here retunes the whole app,
          including playback — useful if you're matching a recording that sits between two notes.
        </p>
      </Panel>

      <Panel>
        <Eyebrow>Tuning the low end to the key</Eyebrow>
        <div className="space-y-2 text-sm">
          <Fact k="Kick fundamental" v={`Tune the kick's body to ${rootName}: ${hz(fOf(12 + rootPc, a4))} (octave 0) or ${hz(fOf(24 + rootPc, a4))} (octave 1). A kick tuned to the key stops it fighting the bass.`} />
          <Fact k="Sub / 808" v={`${rootName}1 = ${hz(fOf(24 + rootPc, a4))}, ${rootName}2 = ${hz(fOf(36 + rootPc, a4))}. Below about 35 Hz most speakers give you nothing but cone movement.`} />
          <Fact k="Second choice" v={`If the root clashes, tune to the fifth: ${nameOf(rootPc + 7, flat)} at ${hz(fOf(24 + ((rootPc + 7) % 12), a4))}.`} />
          <Fact k="Resonant filter" v={`Set a filter's resonance peak on a scale note and it will ring in key. Root peak here: ${hz(rootF)}.`} />
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Tempo as a frequency · {bpm} BPM</Eyebrow>
        <p className="mb-2 text-sm" style={{ color: C.dim }}>
          A tempo is just a very slow frequency: {bpm} beats per minute = {beatHz.toFixed(3)} Hz. Everything
          rhythmic can be set in Hz from that.
        </p>
        {divs.map(([l, mult]) => (
          <Row key={l} a={"LFO at " + l} b={(beatHz * mult).toFixed(3) + " Hz"} c={Math.round(1000 / (beatHz * mult)) + " ms"} />
        ))}

      </Panel>

      <Panel>
        <Eyebrow>Tempo pushed into the audio range</Eyebrow>
        <p className="mb-2 text-sm" style={{ color: C.dim }}>
          Double the beat rate enough times and it becomes a pitch. These are the notes your tempo is
          secretly related to — handy for tuning tremolo, FM rates and drone layers so they lock to the grid.
        </p>
        {tempoPitch.map((t) => (
          <Row key={t.n} a={`Beat × 2^${t.n}`} b={hz(t.f)} c={`≈ ${t.nn.name} ${t.nn.cents >= 0 ? "+" : ""}${t.nn.cents}¢`} />
        ))}
        <p className="mt-2 text-xs" style={{ color: C.dim }}>
          If the cents value is close to 0, that pitch is already in tune with standard pitch. If it's far off,
          nudge the tempo by a beat or two until it lands.
        </p>
      </Panel>

      <Panel>
        <Eyebrow>Delay, comb filtering and phase</Eyebrow>
        <div className="space-y-2 text-sm">
          <Fact k="Delay to pitch" v={`Any delay shorter than about 30 ms stops sounding like an echo and becomes a pitch. A delay of ${(1000 / fOf(48 + rootPc, a4)).toFixed(2)} ms rings at ${rootName}3 — that's how plucked-string synthesis works.`} />
          <Fact k="Comb notches" v="A delay of D ms mixed with the dry signal cancels every 1000/D Hz. A 5 ms doubling notches at 200 Hz, 400 Hz, 600 Hz and so on — that hollow flanger sound." />
          <Fact k="Safe doubling" v="Offset a doubled layer by 15–35 ms and it reads as width, not comb filtering. Under 10 ms it will thin out in mono." />
          <Fact k="Detune beating" v={`Two oscillators detuned by c cents beat at roughly f × (2^(c/1200) − 1) Hz. At ${rootName}3 (${hz(fOf(48 + rootPc, a4))}): 5¢ ≈ ${(fOf(48 + rootPc, a4) * (Math.pow(2, 5 / 1200) - 1)).toFixed(2)} Hz wobble, 15¢ ≈ ${(fOf(48 + rootPc, a4) * (Math.pow(2, 15 / 1200) - 1)).toFixed(2)} Hz, 25¢ ≈ ${(fOf(48 + rootPc, a4) * (Math.pow(2, 25 / 1200) - 1)).toFixed(2)} Hz.`} />
          <Fact k="Rule of thumb" v="Detune under 10 cents = thickness. 10–25 cents = supersaw width. Over 30 cents = out of tune." />
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Which octave to put things in</Eyebrow>
        {OCTAVE_SLOTS.map(([o, r, d]) => (
          <div key={o} className="border-b py-1.5" style={{ borderColor: C.line }}>
            <div className="flex items-baseline gap-2">
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.amber, minWidth: 34 }}>{o}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.mint }}>{r}</span>
            </div>
            <div className="text-sm" style={{ color: C.dim }}>{d}</div>
          </div>
        ))}
      </Panel>
    </>
  );
}

/* ============================== HARMONICS ============================== */
function HarmonicsTab({ a4, rootPc, rootName, flat }) {
  const baseM = 36 + rootPc; /* root, octave 2 */
  const f0 = fOf(baseM, a4);
  const overs = Array.from({ length: 16 }, (_, i) => {
    const n = i + 1;
    const f = f0 * n;
    return { n, f, nn: nearestNote(f, a4) };
  });
  const unders = Array.from({ length: 8 }, (_, i) => {
    const n = i + 1;
    const f = fOf(baseM + 24, a4) / n;
    return { n, f, nn: nearestNote(f, a4) };
  });
  const playSeries = (list) => list.slice(0, 12).forEach((o, i) => {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + i * 0.34;
    const g = c.createGain(); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = o.f;
    osc.connect(g); osc.start(t); osc.stop(t + 0.55);
  });
  return (
    <>
      <Panel>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>Overtones of {rootName}2 · {hz(f0)}</Eyebrow>
          <PlayBtn onClick={() => playSeries(overs)} label="Hear the series" />
        </div>
        <p className="mb-2 text-sm" style={{ color: C.dim }}>
          Every real instrument playing {rootName} also produces all of these, quietly, at the same time. This
          is where timbre comes from — and why some intervals sound consonant and others don't.
        </p>
        {overs.map((o) => (
          <div key={o.n} className="border-b py-1.5" style={{ borderColor: C.line }}>
            <div className="flex items-baseline justify-between gap-3">
              <span style={{ fontFamily: MONO, fontSize: 12, color: o.n === 1 ? C.amber : C.bone }}>
                {o.n}× &nbsp;{hz(o.f)}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.mint }}>
                {o.nn.name}
                <span style={{ color: Math.abs(o.nn.cents) > 12 ? C.rose : C.dim }}>
                  {" "}{o.nn.cents >= 0 ? "+" : ""}{o.nn.cents}¢
                </span>
              </span>
            </div>
            <div className="text-xs" style={{ color: C.dim }}>{HARM_ROLE[o.n]}</div>
          </div>
        ))}
        <p className="mt-2 text-xs" style={{ color: C.dim }}>
          Red cent values are the harmonics a piano cannot play. The 7th and 11th are why brass, bells and
          overdriven guitars sound the way they do.
        </p>
      </Panel>

      <Panel>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>Undertones (subharmonics)</Eyebrow>
          <PlayBtn onClick={() => playSeries(unders)} label="Hear it" />
        </div>
        <p className="mb-2 text-sm" style={{ color: C.dim }}>
          Divide a frequency instead of multiplying it. Nothing in nature produces this series, but analogue
          dividers, sub oscillators and pitch-down effects do — and it spells out a minor chord.
        </p>
        {unders.map((o) => (
          <Row key={o.n} a={"÷ " + o.n} b={hz(o.f)} c={o.nn.name + " " + (o.nn.cents >= 0 ? "+" : "") + o.nn.cents + "¢"} />
        ))}
        <p className="mt-2 text-xs" style={{ color: C.dim }}>
          Practical use: a sub oscillator one or two octaves down (÷2, ÷4) is always safe. ÷3 and ÷5 give you
          fifths and thirds below the note — huge, but they muddy fast.
        </p>
      </Panel>

      <Panel>
        <Eyebrow>Why intervals sound the way they do</Eyebrow>
        {RATIOS.map(([n, r, s, d]) => (
          <div key={n} className="border-b py-1.5" style={{ borderColor: C.line }}>
            <div className="flex items-baseline justify-between gap-3">
              <span style={{ fontWeight: 700, fontSize: 13 }}>{n}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.mint }}>
                {r} · {hz(f0 * ratioOf(r))}
              </span>
            </div>
            <div className="text-xs" style={{ color: C.dim }}>{d}</div>
          </div>
        ))}
        <p className="mt-2 text-xs" style={{ color: C.dim }}>
          Simple ratios mean shared harmonics, which the ear reads as consonance. Complex ratios leave
          harmonics slightly apart, and those near-misses beat against each other as roughness.
        </p>
      </Panel>

      <Panel>
        <Eyebrow>Waveforms and what's inside them</Eyebrow>
        {WAVEFORMS.map(([w, h, u]) => (
          <div key={w} className="border-b py-1.5" style={{ borderColor: C.line }}>
            <div className="flex items-baseline gap-2">
              <span style={{ fontWeight: 700, fontSize: 13, color: C.amber }}>{w}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.mint }}>{h}</span>
            </div>
            <div className="text-sm" style={{ color: C.dim }}>{u}</div>
          </div>
        ))}
      </Panel>

      <Panel>
        <Eyebrow>Resonance and filters</Eyebrow>
        <div className="space-y-2 text-sm">
          <Fact k="What resonance is" v="A filter boosting a narrow band right at its cutoff. Turned up far enough it self-oscillates and becomes a sine wave at the cutoff pitch." />
          <Fact k="Keeping it musical" v="Park a resonant peak on a note of the key and sweeps stay in tune. Park it between notes and every sweep sounds slightly wrong." />
          <Fact k="Q values" v="Q 0.7 = gentle and natural. Q 2–4 = obvious character. Q 8+ = a whistle. For cutting problem frequencies use high Q; for shaping tone use low Q." />
          <Fact k="Finding a problem note" v="Boost 12 dB with a narrow band and sweep until it screams, then cut 3–6 dB there. Resonances almost always land on a note — check which one." />
          <Fact k="Formants" v="Two resonant peaks in the low mids make anything sound vocal. These are the pairs the voice actually uses:" />
        </div>
        <div className="mt-2">
          {FORMANTS.map(([v, f1, f2]) => (
            <Row key={v} a={v} b={"F1 " + f1} c={"F2 " + f2} />
          ))}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Harmonic tricks worth stealing</Eyebrow>
        <ul className="space-y-2 text-sm">
          {[
            "Distortion adds harmonics that were never there. Even-order (tube, tape) sounds warm; odd-order (transistor, fuzz) sounds hard.",
            "To make a bass audible on a phone, add harmonics at 2× and 3× the fundamental — the ear infers the missing sub.",
            "A high-passed layer of the same note two octaves up will make a dull sound read as bright without touching EQ.",
            "Detuning by cents changes width. Detuning by semitones changes harmony. Don't confuse the two.",
            "Reverb and delay tails inherit the harmonics of the source — filter the send, not just the return.",
            "If two sounds fight, move one of them by an octave before reaching for EQ. Register beats equalisation.",
          ].map((s, i) => (
            <li key={i} className="flex gap-2">
              <span style={{ color: C.mint }}>—</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

function ratioOf(r) {
  const m = r.match(/(\d+):(\d+)/);
  return m ? +m[1] / +m[2] : 1;
}

/* ============================== IDENTIFY ============================== */
const pcsOf = (root, iv) => [...new Set(iv.map((x) => (root + x) % 12))].sort((a, b) => a - b);

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

function IdentifyTab({ sel, setSel, flat, setRootPc, setScaleId, setChordId, setTab }) {
  const [more, setMore] = useState(false);
  const sorted = useMemo(() => [...sel].sort((a, b) => a - b), [sel]);
  const { exact, partial } = useMemo(() => matchChords(sorted), [sorted]);
  const scales = useMemo(() => matchScales(sorted), [sorted]);
  const useChord = (m) => { setRootPc(m.root); setChordId(m.c.id); setTab("chords"); };
  const useScale = (m) => { setRootPc(m.root); setScaleId(m.s.id); setTab("scales"); };
  const gap = sorted.length === 2 ? (sorted[1] - sorted[0]) % 12 : null;
  const ivName = gap !== null ? INTERVALS.find((x) => x.s === gap) : null;

  return (
    <>
      <Panel>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>Notes selected</Eyebrow>
          {sel.length > 0 && <PlayBtn color={C.rose} icon="×" onClick={() => setSel([])} label="Clear" />}
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Select notes">
          {Array.from({ length: 12 }, (_, pc) => {
            const on = sel.includes(pc);
            return (
              <button
                type="button"
                key={pc}
                aria-pressed={on}
                onClick={() => { setSel(on ? sel.filter((p) => p !== pc) : [...sel, pc]); tone(60 + pc, 0.6); }}
                className="rounded-md px-2"
                style={{
                  height: 38, minWidth: 44, fontFamily: MONO, fontSize: 14,
                  background: on ? C.rose : C.panel2, color: on ? C.ink : C.bone,
                  border: "1px solid " + (on ? C.rose : C.line), fontWeight: on ? 700 : 500,
                }}
              >
                {nameOf(pc, flat)}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs" style={{ color: C.dim }}>
          {sel.length === 0
            ? "Tap notes here or on the keyboard at the top. Play something on your instrument, tap the notes you heard, and this will tell you what it was."
            : sel.length === 1
            ? "One note fits everything — add at least two more."
            : `${sel.length} notes selected. The keyboard at the top stays in selection mode while this module is open.`}
        </p>
        {sel.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {sorted.map((p) => (
              <span key={p} className="rounded px-2 py-1" style={{ fontFamily: MONO, fontSize: 12, background: C.panel2, border: "1px solid " + C.line }}>
                {nameOf(p, flat)}
              </span>
            ))}
          </div>
        )}
      </Panel>

      {ivName && (
        <Panel>
          <Eyebrow>Two notes — that's an interval</Eyebrow>
          <div className="flex items-baseline gap-2">
            <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: C.amber }}>{ivName.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 13, color: C.mint }}>{gap} semitones</span>
          </div>
          <p className="mt-1 text-sm">{ivName.feel}</p>
        </Panel>
      )}

      {sel.length >= 2 && (
        <Panel>
          <Eyebrow color={exact.length ? C.orchid : C.dim}>
            {exact.length ? "This is" : "No exact chord — try the list below"}
          </Eyebrow>
          {exact.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {exact.slice(0, 6).map((m, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => useChord(m)}
                  className="rounded-lg p-2 text-left"
                  style={{ background: C.panel2, border: "1px solid " + (i === 0 ? C.orchid : C.line), minWidth: 116 }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: i === 0 ? C.orchid : C.bone }}>
                    {nameOf(m.root, flat)}{m.c.sym}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim }}>{m.c.name}{m.inv ? " · inversion" : ""}</div>
                </button>
              ))}
            </div>
          )}
          {exact.length > 1 && (
            <p className="mt-2 text-xs" style={{ color: C.dim }}>
              The same notes spell more than one chord. Whichever note is lowest in your bass part is the one
              the ear will hear as the root.
            </p>
          )}
        </Panel>
      )}

      {sel.length >= 2 && partial.length > 0 && (
        <Panel>
          <Eyebrow>Chords that contain these notes</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {partial.map((m, i) => (
              <button
                type="button"
                key={i}
                onClick={() => useChord(m)}
                className="rounded-lg px-2 py-1.5 text-left"
                style={{ background: C.panel2, border: "1px solid " + C.line }}
              >
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>{nameOf(m.root, flat)}{m.c.sym}</span>
                <span style={{ fontSize: 10, color: C.dim }}> +{m.extra}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: C.dim }}>
            +1 means the chord has one note you didn't select. Useful when you know part of a voicing and want
            to know what it could grow into.
          </p>
        </Panel>
      )}

      {sel.length >= 1 && (
        <Panel>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Eyebrow>Scales that contain all {sel.length} note{sel.length === 1 ? "" : "s"}</Eyebrow>
            <span style={{ fontSize: 11, color: C.dim }}>{scales.length} matches</span>
          </div>
          {scales.length === 0 && (
            <p className="text-sm" style={{ color: C.dim }}>
              No named scale holds all of those. That's normal once you pass seven notes — you're either
              changing key or using chromatic passing notes.
            </p>
          )}
          <div className="space-y-1">
            {scales.slice(0, more ? 40 : 8).map((m, i) => {
              const spelled = spellScale(nameOf(m.root, flat), m.s.iv, flat);
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => useScale(m)}
                  className="flex w-full items-baseline justify-between gap-3 border-b py-2 text-left"
                  style={{ borderColor: C.line }}
                >
                  <span>
                    <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: i === 0 ? C.amber : C.bone }}>
                      {nameOf(m.root, flat)} {m.s.name.toLowerCase()}
                    </span>
                    <span className="block text-xs" style={{ color: C.dim }}>{spelled.join(" ")}</span>
                  </span>
                  <span className="shrink-0" style={{ fontFamily: MONO, fontSize: 11, color: C.mint }}>
                    {m.extra === 0 ? "exact" : "+" + m.extra}
                  </span>
                </button>
              );
            })}
          </div>
          {scales.length > 8 && (
            <button type="button" onClick={() => setMore(!more)} className="mt-2 text-xs" style={{ color: C.mint }}>
              {more ? "Show fewer" : `Show all ${scales.length}`}
            </button>
          )}
        </Panel>
      )}

      <Panel>
        <Eyebrow>How to use this</Eyebrow>
        <div className="space-y-2 text-sm">
          <Fact k="Name a chord" v="Tap the notes of a voicing you like and read the top result. Tap a result to load it into the Chords module." />
          <Fact k="Find the key" v="Tap the notes from a melody or a sample. The shortest scale that fits is usually the key you're in." />
          <Fact k="Fix a clash" v="Tap the notes of two parts that fight. If nothing sensible matches, one of them is out of key." />
          <Fact k="Pick a solo scale" v="Tap the notes of the chord you're playing over. Any matching scale will work over it." />
        </div>
      </Panel>
    </>
  );
}
