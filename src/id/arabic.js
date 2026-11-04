// Turns a name into the stretched style: الحبيب -> الـحـبـيـب
// A tatweel (ـ) is added only BETWEEN two letters that really connect, so you never get
// a leading/trailing ـ, a ـ after a letter that can't connect (ا د ذ ر ز و ة), or a broken لا.
const TATWEEL = "\u0640";

// Letters that connect to the NEXT letter (dual-joining)
const CONNECTS_FORWARD = new Set([..."بتثجحخسشصضطظعغفقكلمنهيئىپچگکی"]);

// Any Arabic letter except standalone hamza can be connected to from the previous letter
const isArabicLetter = (c) => /[\u0621-\u064A\u066E\u066F\u0671-\u06D3\u06FA-\u06FF]/.test(c);
const canBeJoinedTo = (c) => isArabicLetter(c) && c !== "\u0621";

const LAM_ALEF = new Set([..."اأإآٱ"]);

function stretchName(input) {
  const clean = String(input || "")
    .replace(/[\u0640\u064B-\u065F\u0670]/g, "") // drop existing tatweel + diacritics
    .replace(/\s+/g, " ")
    .trim();

  const chars = [...clean];
  let out = "";
  for (let k = 0; k < chars.length; k++) {
    const c = chars[k];
    const next = chars[k + 1];
    out += c;
    if (
      next &&
      CONNECTS_FORWARD.has(c) &&
      canBeJoinedTo(next) &&
      !(c === "ل" && LAM_ALEF.has(next)) // keep the lam-alef ligature intact
    ) {
      out += TATWEEL;
    }
  }
  return out;
}

module.exports = { stretchName, TATWEEL };
