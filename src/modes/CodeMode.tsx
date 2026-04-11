import React, { useState } from 'react';
import { CircularProgress } from '../components/CircularProgress';
import { RadarChart } from '../components/RadarChart';
import type { RadarData } from '../components/RadarChart';
import { analyzeCode } from '../utils/codeEngine';
import type { CodePlagiarismReport } from '../utils/codeEngine';
import { detectCodeAI } from '../utils/aiDetector';

export const CodeMode: React.FC = () => {
  const [inputCode, setInputCode] = useState('');
  const [report, setReport] = useState<CodePlagiarismReport | null>(null);
  const [aiScore, setAiScore] = useState<{aiProbability: number, isAI: boolean, burstinessScore: number, perplexityScore: number} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!inputCode.trim()) return;
    setIsAnalyzing(true);
    setReport(null);
    setAiScore(null);
    
    try {
      const result = await analyzeCode(inputCode);
      const aiDetect = detectCodeAI(inputCode);
      setReport(result);
      setAiScore(aiDetect);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getRadarData = (): RadarData[] => {
     if (!report || !aiScore) return [];
     return [
        { axis: 'AI Code Gen', value: aiScore.aiProbability },
        { axis: 'StackOverflow Rep.', value: report.overallSimilarity },
        { axis: 'Syntax Overlap', value: report.syntaxOverlap },
        { axis: 'Code Duplication', value: report.logicDuplication },
        { axis: 'Global Forum Match', value: report.overallSimilarity * 0.9 }, 
     ];
  };

  return (
    <>
      <div className="print-only">
        <h1>OmniCheck Code Forensics Report</h1>
        <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
      </div>

      <main>
        {!report ? (
          <section className="input-section glass-panel no-print">
            <div className="upload-tip">
               Paste the raw script/code below to invoke StackOverflow Forensics
            </div>
            <textarea 
              placeholder="function calculateThreat() { ... }"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              style={{ fontFamily: 'monospace', color: '#4cff88', backgroundColor: '#000' }}
            />
            <div className="actions">
              <button 
                className="btn-primary" 
                onClick={handleAnalyze}
                disabled={isAnalyzing || inputCode.length < 5}
              >
                {isAnalyzing ? <span className="loader"></span> : 'Execute Code Forensics'}
              </button>
            </div>
          </section>
        ) : (
          <section className="highlight-view glass-panel">
            <div className="view-header no-print">
               <h3>Code Structure Analysis</h3>
               <div>
                 <button className="btn-secondary" onClick={handlePrint} style={{marginRight: '1rem'}}>
                    Download Metric Report
                 </button>
                 <button className="btn-secondary" onClick={() => setReport(null)}>
                    New Trace
                 </button>
               </div>
            </div>
            <div style={{ backgroundColor: '#000', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>
               <pre style={{ color: report.overallSimilarity > 50 ? 'red' : '#4cff88', fontFamily: 'monospace' }}>
                   {inputCode}
               </pre>
            </div>
          </section>
        )}

        {report && (
          <section className="dashboard">
            <div className="dashboard-metrics">
                <CircularProgress percentage={report.overallSimilarity} />
                
                {aiScore && (
                   <div className="score-card glass-panel ai-score-card" style={{ marginTop: '2rem' }}>
                      <h3>AI Code Pattern Detection</h3>
                      <div className={`ai-dial ${aiScore.isAI ? 'danger' : 'safe'}`}>
                         <span className="big-perc">{aiScore.aiProbability}%</span>
                         <span>Probability</span>
                      </div>
                      <p>{aiScore.isAI ? 'Likely LLM Generated Scripts' : 'Hand-Written Code'}</p>
                   </div>
                )}
                
                <div style={{ marginTop: '2rem' }}>
                    <RadarChart data={getRadarData()} />
                </div>
            </div>
            
            <div className="results-list glass-panel">
              <h3 style={{ marginBottom: '1rem' }}>Matched Forums & Threads</h3>
              
              {report.results.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <p>No identical code structure found on StackExchange databases.</p>
                </div>
              ) : (
                report.results.map((item, idx) => (
                  <div key={idx} className="result-item">
                    <div className="result-header">
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="source-name">
                        {item.sourceName}
                      </a>
                      <span className={`item-score ${item.similarityPercentage > 50 ? 'high' : item.similarityPercentage > 15 ? 'medium' : 'low'}`}>
                        {item.similarityPercentage}% Match Found
                      </span>
                    </div>
                    {item.matchedSnippets.map((snip, i) => (
                      <p key={i} className="snippet">"{snip}"</p>
                    ))}
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
};
