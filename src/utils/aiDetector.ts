export interface AIDetectionResult {
  aiProbability: number;
  burstinessScore: number;
  perplexityScore: number;
  isAI: boolean;
}

export function detectAI(text: string): AIDetectionResult {
  const clean = text.replace(/[\n\r]+/g, " ");
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [];

  if (sentences.length < 3) {
      return { isAI: false, aiProbability: 0, burstinessScore: 0, perplexityScore: 0 };
  }

  // Length calculations for Variance
  const lengths = sentences.map(s => s.split(" ").length);
  const avgLength = lengths.reduce((a, b) => a + b) / lengths.length;
  
  // Burstiness (Standard Deviation of sentence length)
  const variance = lengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  // Perplexity (Lexical repetition vs unique words / syntactic complexity simulation)
  const words = clean.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const uniqueWords = new Set(words);
  const perplexityScore = words.length > 0 ? (uniqueWords.size / words.length) * 100 : 0;
  
  // v3.0 Feature: LLM Fingerprint Buzzwords (ChatGPT/Claude abuse these extensively)
  const llmFingerprints = [
      "delve", "tapestry", "robust", "multifaceted", "underscores", 
      "crucial", "testament", "realm", "navigating", "leveraging", 
      "comprehensive", "landscape", "dynamic", "pivotal"
  ];
  let buzzwordCount = 0;
  words.forEach(w => {
      if (llmFingerprints.includes(w)) buzzwordCount++;
  });
  // Density of buzzwords vs total sentences
  const buzzwordDensity = (buzzwordCount / Math.max(1, sentences.length)) * 100;

  // Modern LLM generated text has extremely consistent sentence length (low stdDev) 
  // and high vocabulary uniqueness (high perplexity), laced with specific buzzwords.
  let isAI = false;
  let probability = 0;

  if (stdDev < 5 && perplexityScore > 60) {
      probability = 75; // Highly structured, somewhat predictable
  } else if (stdDev < 8 && perplexityScore > 75) {
      probability = 60; 
  } else {
      probability = Math.max(0, 50 - (stdDev * 3));
  }

  // Buzzword Multipier! Heavily influences the probability 
  if (buzzwordDensity > 1) {
      probability = Math.min(100, probability + (buzzwordDensity * 20));
  }
  
  if (probability > 75) {
      isAI = true;
  }

  return {
      aiProbability: Math.round(probability),
      burstinessScore: Math.round(stdDev),
      perplexityScore: Math.round(perplexityScore),
      isAI
  };
}

// v3.0 AI Code Forensics
export function detectCodeAI(code: string): AIDetectionResult {
   if (!code || code.trim().length === 0) {
      return { aiProbability: 0, burstinessScore: 0, perplexityScore: 0, isAI: false };
   }

   let probability = 10; // Baseline
   
   // 1. Comment Density: LLMs notoriously over-comment their code
   const lines = code.split('\n');
   let commentLines = 0;
   lines.forEach(l => {
       if (l.trim().startsWith('//') || l.trim().startsWith('*') || l.trim().startsWith('/*')) {
          commentLines++;
       }
   });
   const commentRatio = lines.length > 0 ? commentLines / lines.length : 0;
   if (commentRatio > 0.15) probability += 30;
   if (commentRatio > 0.3) probability += 20;

   // 2. Structured Variable Alignment (Sterile Naming)
   const words = code.match(/\b[A-Za-z_][a-zA-Z0-9_]*\b/g) || [];
   const sterileNames = ["result", "data", "item", "index", "temp", "arr", "obj", "value", "key"];
   let sterileCount = 0;
   words.forEach(w => {
       if (sterileNames.includes(w.toLowerCase())) sterileCount++;
   });
   const sterileRatio = words.length > 0 ? sterileCount / words.length : 0;
   if (sterileRatio > 0.05) probability += 25;

   // 3. Perfect Formatting (No massive trailing spaces)
   if (!code.match(/  \n/g)) probability += 10;
   
   // Extremely high probability if they paste LLM markers
   if (code.includes("```") || code.includes("Here is the code")) {
       probability = 99;
   }

   probability = Math.min(100, probability);

   return {
       aiProbability: Math.round(probability),
       burstinessScore: Math.round(commentRatio * 100), // Map to radar
       perplexityScore: Math.round(sterileRatio * 100), // Map to radar
       isAI: probability > 60
   };
}
