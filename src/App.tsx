import { useState } from 'react';
import { TextMode } from './modes/TextMode';
import { CodeMode } from './modes/CodeMode';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState<'text' | 'code'>('text');

  return (
    <div className="container">
      <header className="no-print" style={{ marginBottom: '2rem' }}>
        <h1>OmniCheck v3.0</h1>
        <p className="subtitle">Enterprise Plagiarism & Code Forensics</p>
        
        <div className="tab-container">
           <button 
              className={`mode-tab ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveTab('text')}
           >
              Document Analysis
           </button>
           <button 
              className={`mode-tab ${activeTab === 'code' ? 'active' : ''}`}
              onClick={() => setActiveTab('code')}
           >
              Code Stack Forensics
           </button>
        </div>
      </header>

      {/* Render Active Mode */}
      {activeTab === 'text' ? <TextMode /> : <CodeMode />}

    </div>
  );
}

export default App;
