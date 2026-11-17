/** Fuzzy subsequence match that finds the best-scoring placement, not the first. */

export type FuzzyMatch = { score: number; indices: number[] };

const MATCH = 1;
const WORD_START = 8;
const PREFIX = 6;
const CONSECUTIVE = 8;
const GAP = 0.5;
const LEADING_GAP = 0.15;

function isWordStart(text: string, i: number) {
  if (i === 0) return true;
  const prev = text[i - 1];
  const cur = text[i];
  if (/[\s\-_/.,:()]/.test(prev)) return true;
  // camelCase and letter → digit boundaries
  if (prev === prev.toLowerCase() && cur !== cur.toLowerCase()) return true;
  return /\D/.test(prev) && /\d/.test(cur);
}

export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return { score: 0, indices: [] };
  const t = text.toLowerCase();
  const n = q.length;
  const m = t.length;
  if (n > m) return null;

  for (let i = 0, j = 0; i < n; i++, j++) {
    while (j < m && t[j] !== q[i]) j++;
    if (j === m) return null;
  }

  const bonus = new Float64Array(m);
  for (let j = 0; j < m; j++) bonus[j] = MATCH + (isWordStart(text, j) ? WORD_START : 0) + (j === 0 ? PREFIX : 0);

  // score[i][j]: best score with q[i] matched at t[j]. from[i][j]: where q[i-1] matched.
  const NEG = -Infinity;
  const score: Float64Array[] = [];
  const from: Int32Array[] = [];
  for (let i = 0; i < n; i++) {
    const row = new Float64Array(m).fill(NEG);
    const back = new Int32Array(m).fill(-1);
    // Running best of (score[i-1][k] + GAP * k), k <= j - 2, so a gap costs O(1).
    let best = NEG;
    let bestK = -1;
    for (let j = i; j < m; j++) {
      if (i > 0 && j >= 2) {
        const k = j - 2;
        const candidate = score[i - 1][k] + GAP * k;
        if (candidate > best) {
          best = candidate;
          bestK = k;
        }
      }
      if (t[j] !== q[i]) continue;
      if (i === 0) {
        row[j] = bonus[j] - LEADING_GAP * j;
        continue;
      }
      const adjacent = score[i - 1][j - 1] + CONSECUTIVE;
      const gapped = best - GAP * (j - 1);
      if (adjacent >= gapped && adjacent > NEG) {
        row[j] = adjacent + bonus[j];
        back[j] = j - 1;
      } else if (gapped > NEG) {
        row[j] = gapped + bonus[j];
        back[j] = bestK;
      }
    }
    score.push(row);
    from.push(back);
  }

  let end = -1;
  let top = NEG;
  for (let j = 0; j < m; j++) {
    if (score[n - 1][j] > top) {
      top = score[n - 1][j];
      end = j;
    }
  }
  if (end < 0) return null;

  const indices = new Array<number>(n);
  for (let i = n - 1, j = end; i >= 0; i--) {
    indices[i] = j;
    j = from[i][j];
  }
  // Shorter labels win ties.
  return { score: top - (m - n) * 0.01, indices };
}
