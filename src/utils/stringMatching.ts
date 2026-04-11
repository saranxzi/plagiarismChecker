export function computeLPSArray(pattern: string): number[] {
  const m = pattern.length;
  const lps = new Array(m).fill(0);
  let length = 0;
  let i = 1;

  while (i < m) {
    if (pattern[i] === pattern[length]) {
      length++;
      lps[i] = length;
      i++;
    } else {
      if (length !== 0) {
        length = lps[length - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
  }
  return lps;
}

export function kmpSearch(text: string, pattern: string): number[] {
  const n = text.length;
  const m = pattern.length;
  if (m === 0) return [];

  const lps = computeLPSArray(pattern);
  const indices: number[] = [];
  let i = 0; // index for text
  let j = 0; // index for pattern

  while (n - i >= m - j) {
    if (pattern[j] === text[i]) {
      j++;
      i++;
    }

    if (j === m) {
      indices.push(i - j);
      j = lps[j - 1];
    } else if (i < n && pattern[j] !== text[i]) {
      if (j !== 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }
  }
  return indices;
}

export function getNGrams(words: string[], n: number = 3): string[] {
  const nGrams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    nGrams.push(words.slice(i, i + n).join(' '));
  }
  return nGrams;
}

export function compareTextsStructural(text1: string, text2: string): { similarity: number, matches: string[] } {
  const clean1 = text1.replace(/[^\w\s]/g, "").toLowerCase().trim();
  const clean2 = text2.replace(/[^\w\s]/g, "").toLowerCase().trim();
  
  if (!clean1 || !clean2) return { similarity: 0, matches: [] };

  const words1 = clean1.split(/\s+/);
  const words2 = clean2.split(/\s+/);
  
  const n = 3;
  if (words1.length < n || words2.length < n) {
     let overlap = 0;
     const words1Set = new Set(words1);
     words2.forEach(w => { if (words1Set.has(w)) overlap++; });
     const sim = overlap / Math.max(words1.length, words2.length, 1) * 100;
     return { similarity: sim, matches: [] };
  }

  const nGrams2 = getNGrams(words2, n);
  
  let matchCount = 0;
  const matchWords = new Set<string>();

  for (const ngram of nGrams2) {
     const occurrences = kmpSearch(clean1, ngram);
     if (occurrences.length > 0) {
         matchCount++;
         ngram.split(' ').forEach(w => matchWords.add(w));
     }
  }

  // Scale raw ngram overlap to a 0-100 score appropriately
  let rawSim = (matchCount / nGrams2.length) * 100;
  // Boost slightly as N-gram exact matches are strong indicators
  let similarity = Math.min(100, Math.round(rawSim * 1.5)); 
  
  return { 
    similarity: isNaN(similarity) ? 0 : similarity, 
    matches: Array.from(matchWords) 
  };
}
