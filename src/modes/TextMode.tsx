import React, { useState, useRef } from 'react';
import { CircularProgress } from '../components/CircularProgress';
import { RadarChart } from '../components/RadarChart';
import type { RadarData } from '../components/RadarChart';
import { analyzeText } from '../utils/plagiarismEngine';
import type { PlagiarismReport } from '../utils/plagiarismEngine';
import { detectAI } from '../utils/aiDetector';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const TextMode: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [report, setReport] = useState<PlagiarismReport | null>(null);
  const [aiScore, setAiScore] = useState<{aiProbability: number, isAI: boolean, burstinessScore: number, perplexityScore: number} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (file.type === "text/plain") {
      const text = await file.text();
      setInputText(text);
    } else if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
         const page = await pdf.getPage(i);
         const textContent = await page.getTextContent();
         fullText += textContent.items.map((s: any) => s.str).join(" ") + " ";
      }
      setInputText(fullText);
    } else {
      alert("Unsupported file format. Please upload .txt or .pdf");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setReport(null);
    setAiScore(null);
    
    try {
      const result = await analyzeText(inputText);
      const aiDetect = detectAI(inputText);
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

  const renderHighlightedText = () => {
    if (!report || report.results.length === 0) return <p>{inputText}</p>;
    const sentences = inputText.match(/[^.!?]+[.!?]+/g) || [inputText];
    
    return sentences.map((sentence, idx) => {
       let isPlagiarized = false;
       for (const res of report.results) {
           for (const snip of res.matchedSnippets) {
              const cleanedSnip = snip.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().split(" ").filter(w=>w.length>3);
              const cleanedSent = sentence.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().split(" ").filter(w=>w.length>3);
              let over = 0;
              for(const sw of cleanedSnip) if (cleanedSent.includes(sw)) over++;
              if (cleanedSnip.length > 0 && (over / cleanedSnip.length > 0.3 || over > 3)) {
                 isPlagiarized = true; break;
              }
           }
           if (isPlagiarized) break;
       }

       return (
         <span key={idx} className={isPlagiarized ? (report.overallSimilarity > 50 ? 'marked-danger' : 'marked-warning') : ''}>
            {sentence} 
         </span>
       )
    });
  };

  const getRadarData = (): RadarData[] => {
     if (!report || !aiScore) return [];
     return [
        { axis: 'AI Probability', value: aiScore.aiProbability },
        { axis: 'Web Plagiarism', value: report.overallSimilarity },
        { axis: 'Grammar Perplexity', value: aiScore.perplexityScore },
        { axis: 'Tone Uniformity', value: aiScore.burstinessScore },
        { axis: 'Academic Match', value: report.overallSimilarity * 0.8 }, // Approximation for radar aesthetic
     ];
  };

  return (
    <>
      <div className="print-only">
        <h1>OmniCheck Literal Report</h1>
        <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
      </div>

      <main>
        {!report ? (
          <section 
            className={`input-section glass-panel no-print ${isDragging ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            <div className="upload-tip">
               Drag & Drop a .PDF or .TXT file here, or type your text below
            </div>
            <textarea 
              placeholder="Paste your document or text here to invoke the analyzing engine..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <input 
              type="file" 
              accept=".pdf,.txt" 
              ref={fileInputRef} 
              style={{display: 'none'}} 
              onChange={(e) => { if(e.target.files) processFile(e.target.files[0]) }}
            />
            <div className="actions">
              <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                 Upload File
              </button>
              <button 
                className="btn-primary" 
                onClick={handleAnalyze}
                disabled={isAnalyzing || inputText.length < 10}
              >
                {isAnalyzing ? <span className="loader"></span> : 'Scan Text Content'}
              </button>
            </div>
          </section>
        ) : (
          <section className="highlight-view glass-panel">
            <div className="view-header no-print">
               <h3>Document Analysis</h3>
               <div>
                 <button className="btn-secondary" onClick={handlePrint} style={{marginRight: '1rem'}}>
                    Download PDF Report
                 </button>
                 <button className="btn-secondary" onClick={() => { setReport(null); setAiScore(null); }}>
                    New Scan
                 </button>
               </div>
            </div>
            <div className="rich-text-content">
               {renderHighlightedText()}
            </div>
          </section>
        )}

        {report && (
          <section className="dashboard">
            <div className="dashboard-metrics">
                <CircularProgress percentage={report.overallSimilarity} />
                
                {aiScore && (
                   <>
                       <div className="score-card glass-panel ai-score-card" style={{ marginTop: '2rem' }}>
                          <h3>AI Pattern Detection</h3>
                          <div className={`ai-dial ${aiScore.isAI ? 'danger' : 'safe'}`}>
                             <span className="big-perc">{aiScore.aiProbability}%</span>
                             <span>Probability</span>
                          </div>
                          <p>{aiScore.isAI ? 'Likely LLM Generated Text' : 'Human Written Text'}</p>
                       </div>
                       
                       <div style={{ marginTop: '2rem' }}>
                          <RadarChart data={getRadarData()} />
                       </div>
                   </>
                )}
            </div>
            
            <div className="results-list glass-panel">
              <h3 style={{ marginBottom: '1rem' }}>Matched Cross-Web Sources</h3>
              
              {report.results.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <p>No significant matches found across Academia or Wikipedia.</p>
                </div>
              ) : (
                report.results.map((item, idx) => (
                  <div key={idx} className="result-item">
                    <div className="result-header">
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="source-name">
                        {item.sourceName}
                      </a>
                      <span className={`item-score ${item.similarityPercentage > 50 ? 'high' : item.similarityPercentage > 15 ? 'medium' : 'low'}`}>
                        {item.similarityPercentage}% Found
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
