// Απλό fuzzy matching χωρίς εξωτερικές βιβλιοθήκες: normalize (τόνοι/πεζά) + Levenshtein distance.

function stripAccentsLower(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // αφαιρεί τόνους
    .toLowerCase()
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  const normA = stripAccentsLower(a);
  const normB = stripAccentsLower(b);
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;
  const dist = levenshtein(normA, normB);
  const maxLen = Math.max(normA.length, normB.length) || 1;
  return 1 - dist / maxLen;
}

/**
 * Χωρίζει το ελεύθερο κείμενο "Μαθηματικά, Φυσική, Χημεία" σε επιμέρους ονόματα μαθημάτων
 * και τα αντιστοιχίζει (fuzzy) σε υπάρχοντα Course entries.
 *
 * @param {string} rawText  π.χ. "Μαθηματικά Παιδείας (Άλγεβρα - Γεωμετρία), Φυσική"
 * @param {Array} existingCourses  λίστα { id, title } από τη βάση
 * @param {number} threshold  ελάχιστο σκορ ομοιότητας για αποδεκτό match (0-1)
 * @returns {{ matched: Array<{id, title, score}>, unmatched: Array<string> }}
 */
function matchCoursesFromText(rawText, existingCourses, threshold = 0.72) {
  if (!rawText) return { matched: [], unmatched: [] };
  const names = rawText.split(",").map((s) => s.trim()).filter(Boolean);

  const matched = [];
  const unmatched = [];

  for (const name of names) {
    let best = null;
    for (const course of existingCourses) {
      const score = similarity(name, course.title);
      if (!best || score > best.score) best = { id: course.id, title: course.title, score };
    }
    if (best && best.score >= threshold) {
      matched.push({ ...best, originalText: name });
    } else {
      unmatched.push(name);
    }
  }

  return { matched, unmatched };
}

module.exports = { similarity, matchCoursesFromText, stripAccentsLower };
