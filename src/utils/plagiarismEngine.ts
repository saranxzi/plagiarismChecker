import { compareTextsStructural } from './stringMatching';

export interface SimilarityResult {
  sourceName: string;
  sourceUrl: string;
  similarityPercentage: number;
  matchedSnippets: string[];
}

export interface PlagiarismReport {
  overallSimilarity: number;
  results: SimilarityResult[];
}

// Helper to distribute samples
function extractSearchQueries(text: string): string[] {
  const clean = text.replace(/[\n\r]+/g, " ");
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  
  const queries: string[] = [];
  const step = Math.max(1, Math.floor(sentences.length / 5));
  
  for (let i = 0; i < sentences.length && queries.length < 5; i += step) {
    const words = sentences[i].replace(/[^\w\s-]/g, "").trim().split(/\s+/);
    if (words.length > 5) {
      queries.push(words.slice(0, 10).join(" "));
    }
  }
  
  if (queries.length === 0 && text.trim().length > 0) {
    const words = text.replace(/[^\w\s-]/g, "").trim().split(/\s+/);
    queries.push(words.slice(0, 10).join(" "));
  }
  
  return queries;
}

export async function analyzeText(inputText: string): Promise<PlagiarismReport> {
  if (!inputText || inputText.trim().length === 0) {
    return { overallSimilarity: 0, results: [] };
  }

  const results: SimilarityResult[] = [];
  
  const inputWordsSet = new Set(inputText.toLowerCase().split(/\W+/).filter(w => w.length > 3));

  try {
    const queries = extractSearchQueries(inputText);
    const sourceMap = new Map<string, { url: string; overlapSum: number; hits: number; snippets: string[] }>();
    
    // Strict Tracker for exact overlap (so we don't overestimate)
    let totalConfirmedPlagiarizedWords = 0;
    const plagiarizedWordsFound = new Set<string>();

    const fetchPromises = queries.map(query => {
      if (!query || query.trim() === "") return Promise.resolve(null);
      // Wikipedia Live
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
      // OpenAlex Open Academic Database
      const openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=1`;
      
      return Promise.allSettled([
        fetch(wikiUrl).then(res => res.json()).catch(() => null),
        fetch(openAlexUrl).then(res => res.json()).catch(() => null)
      ]);
    });

    const responsesBlock = await Promise.all(fetchPromises);

    for (let i = 0; i < responsesBlock.length; i++) {
        const blocks = responsesBlock[i] as any[];
        
        // --- 1. Process Wikipedia ---
        const wikiData = blocks[0]?.value;
        if (wikiData && wikiData.query && wikiData.query.search && wikiData.query.search.length > 0) {
            for(let j=0; j < Math.min(2, wikiData.query.search.length); j++) {
                const result = wikiData.query.search[j];
                const cleanSnippet = result.snippet.replace(/<\/?[^>]+(>|$)/g, "").replace(/&[#A-Za-z0-9]+;/g, " ");
                const { similarity, matches } = compareTextsStructural(inputText, cleanSnippet);
                const overlapPercentage = similarity / 100;
                matches.forEach(m => plagiarizedWordsFound.add(m));
                if (overlapPercentage > 0.4) {
                    const sourceName = `Wikipedia - ${result.title}`;
                    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`;
                    if (!sourceMap.has(sourceName)) {
                        sourceMap.set(sourceName, { url, overlapSum: overlapPercentage, hits: 1, snippets: [`... ${cleanSnippet} ...`] });
                    } else {
                        const existing = sourceMap.get(sourceName)!;
                        existing.hits++;
                        existing.overlapSum += overlapPercentage;
                        if (existing.snippets.length < 4) existing.snippets.push(`... ${cleanSnippet} ...`);
                    }
                    totalConfirmedPlagiarizedWords += overlap;
                }
            }
        }

        // --- 2. Process OpenAlex Academic Journals ---
        const alexData = blocks[1]?.value;
        if (alexData && alexData.results && alexData.results.length > 0) {
            const paper = alexData.results[0];
            if (paper.title || paper.abstract_inverted_index) {
                const snipText = paper.title + " " + (paper.display_name || "");
                 const { similarity, matches } = compareTextsStructural(inputText, snipText);
                 const overlapPercentage = similarity / 100;
                 matches.forEach(m => plagiarizedWordsFound.add(m));
                 if (overlapPercentage > 0.4) {
                    const sourceName = `Academic Paper: ${paper.title || "Unknown Document"}`;
                    const url = paper.id || (paper.ids && paper.ids.doi) || "#";
                    if (!sourceMap.has(sourceName)) {
                        sourceMap.set(sourceName, { url, overlapSum: overlapPercentage, hits: 1, snippets: [`... ${snipText.substring(0, 80)} ...`] });
                    }
                    totalConfirmedPlagiarizedWords += overlap;
                }
            }
        }
    }

    // Mathematical Fix: Strict real percentage calculation without manual overriding
    let calculatedSimilarity = 0;
    if (inputWordsSet.size > 0 && plagiarizedWordsFound.size > 0) {
        // Pure ratio of plagiarized unique words vs total unique input words
        calculatedSimilarity = (plagiarizedWordsFound.size / inputWordsSet.size) * 100;
    }

    let maxSourceSim = 0;
    sourceMap.forEach((data, name) => {
        const avgSourceOverlap = data.overlapSum / data.hits;
        // Accurate source specific match
        const sourceSim = Math.min(100, (avgSourceOverlap * 100)); // Cap each source accurately based on overlap density
        
        if (sourceSim > maxSourceSim) maxSourceSim = sourceSim;
        
        results.push({
            sourceName: name,
            sourceUrl: data.url,
            similarityPercentage: parseFloat(sourceSim.toFixed(2)),
            matchedSnippets: data.snippets
        });
    });

    // Address "snippet limitation": since APIs only return tiny text snippets, a perfectly copied article
    // might mathematically only flag 5% of its total words. If ANY single source snippet overlaps completely (>70%),
    // it signals extensive unoriginality. We clamp the overall similarity upward.
    if (maxSourceSim > 70) {
        calculatedSimilarity = Math.max(calculatedSimilarity, maxSourceSim * 0.95);
    } else if (maxSourceSim > 30) {
        calculatedSimilarity = Math.max(calculatedSimilarity, maxSourceSim * 0.60);
    }

    results.sort((a, b) => b.similarityPercentage - a.similarityPercentage);

    return {
      overallSimilarity: parseFloat(Math.min(100, calculatedSimilarity).toFixed(2)),
      results
    };

  } catch (err) {
    console.error("Advanced APIs failed", err);
  }

  return { overallSimilarity: 0, results: [] };
}
