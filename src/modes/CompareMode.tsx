import React, { useState } from 'react';
import { CircularProgress } from '../components/CircularProgress';
import { compareTextsStructural } from '../utils/stringMatching';

export const CompareMode: React.FC = () => {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [report, setReport] = useState<{ similarity: number, matches: string[] } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!text1.trim() || !text2.trim()) return;
    setIsAnalyzing(true);
    setReport(null);
    
    setTimeout(() => {
      const result = compareTextsStructural(text1, text2);
      setReport(result);
      setIsAnalyzing(false);
    }, 600); // simulate some delay for animation
  };

  const renderHighlightedText = (text: string, matches: string[]) => {
    const words = text.split(/(\s+)/); // keep whitespace
    const matchSet = new Set(matches.map(m => m.toLowerCase()));
    
    return words.map((word, idx) => {
        const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
        if (cleanWord && matchSet.has(cleanWord)) {
            return <strong key={idx} className="marked-warning" style={{ backgroundColor: 'var(--accent-glow)', padding: '0 2px', borderRadius: '4px', color: 'var(--text-main)' }}>{word}</strong>;
        }
        return <span key={idx}>{word}</span>;
    });
  };

  return (
    <main>
      {!report ? (
        <section className="input-section glass-panel">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
             <div>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Document A (Source)</h3>
                <textarea 
                  placeholder="Paste source text here..."
                  value={text1}
                  onChange={(e) => setText1(e.target.value)}
                  style={{ minHeight: '300px' }}
                />
             </div>
             <div>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Document B (Suspect)</h3>
                <textarea 
                  placeholder="Paste text to verify against Document A..."
                  value={text2}
                  onChange={(e) => setText2(e.target.value)}
                  style={{ minHeight: '300px' }}
                />
             </div>
          </div>
          <div className="actions" style={{ marginTop: '2rem', justifyContent: 'center' }}>
            <button 
              className="btn-primary" 
              onClick={handleAnalyze}
              disabled={isAnalyzing || text1.length < 10 || text2.length < 10}
            >
              {isAnalyzing ? <span className="loader"></span> : 'Compare Documents Locally'}
            </button>
          </div>
        </section>
      ) : (
        <section className="dashboard" style={{ gridTemplateColumns: '1fr', animation: 'slideUp 0.6s ease' }}>
           <div className="dashboard-metrics" style={{ alignItems: 'center' }}>
               <CircularProgress percentage={report.similarity} />
               <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Local 1-to-1 KMP Structural Match Score</p>
               
               <div style={{ marginTop: '1rem' }}>
                   <button className="btn-secondary" onClick={() => setReport(null)}>
                      New Comparison
                   </button>
               </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem', marginTop: '2rem' }}>
              <div className="glass-panel" style={{ padding: '2rem' }}>
                 <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Document A</h3>
                 <div className="rich-text-content" style={{ fontSize: '1rem' }}>
                    {renderHighlightedText(text1, report.matches)}
                 </div>
              </div>
              <div className="glass-panel" style={{ padding: '2rem' }}>
                 <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Document B</h3>
                 <div className="rich-text-content" style={{ fontSize: '1rem' }}>
                    {renderHighlightedText(text2, report.matches)}
                 </div>
              </div>
           </div>
        </section>
      )}
    </main>
  );
};
