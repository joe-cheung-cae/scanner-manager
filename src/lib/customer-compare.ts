type Segment = { text: string; match: boolean };

function normalizeWithMap(input: string): { normalized: string; map: number[] } {
  const map: number[] = [];
  let normalized = "";
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (/[\s\-_/·.]/.test(ch)) continue;
    normalized += ch.toLowerCase();
    map.push(i);
  }
  return { normalized, map };
}

function longestCommonSubstring(a: string, b: string): { startA: number; startB: number; length: number } {
  if (!a || !b) return { startA: 0, startB: 0, length: 0 };
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  let maxLen = 0;
  let endA = 0;
  let endB = 0;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j];
          endA = i;
          endB = j;
        }
      }
    }
  }

  return {
    startA: endA - maxLen,
    startB: endB - maxLen,
    length: maxLen,
  };
}

function buildSegments(text: string, start: number, end: number): Segment[] {
  if (start < 0 || end < 0 || start >= end) return [{ text, match: false }];
  const segments: Segment[] = [];
  if (start > 0) segments.push({ text: text.slice(0, start), match: false });
  segments.push({ text: text.slice(start, end), match: true });
  if (end < text.length) segments.push({ text: text.slice(end), match: false });
  return segments;
}

export function getComparisonHighlights(inputName: string, existingName: string): {
  inputSegments: Segment[];
  candidateSegments: Segment[];
} {
  const inputNorm = normalizeWithMap(inputName);
  const existingNorm = normalizeWithMap(existingName);
  const lcs = longestCommonSubstring(inputNorm.normalized, existingNorm.normalized);
  if (lcs.length < 2) {
    return {
      inputSegments: [{ text: inputName, match: false }],
      candidateSegments: [{ text: existingName, match: false }],
    };
  }

  const inputStart = inputNorm.map[lcs.startA];
  const inputEnd = inputNorm.map[lcs.startA + lcs.length - 1] + 1;
  const candidateStart = existingNorm.map[lcs.startB];
  const candidateEnd = existingNorm.map[lcs.startB + lcs.length - 1] + 1;

  return {
    inputSegments: buildSegments(inputName, inputStart, inputEnd),
    candidateSegments: buildSegments(existingName, candidateStart, candidateEnd),
  };
}
