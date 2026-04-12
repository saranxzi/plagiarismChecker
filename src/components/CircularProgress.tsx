import { useEffect, useState } from 'react';

interface Props {
  percentage: number;
}

export const CircularProgress: React.FC<Props> = ({ percentage }) => {
  const [strokeDasharray, setStrokeDasharray] = useState('0, 100');

  useEffect(() => {
    // animate circle
    setStrokeDasharray(`${percentage}, 100`);
  }, [percentage]);

  const getScoreClass = (score: number) => {
    // Zero tolerance policy bounds
    if (score <= 5) return 'score-safe';
    if (score <= 20) return 'score-warning';
    return 'score-danger';
  };

  return (
    <div className={`score-card glass-panel ${getScoreClass(percentage)}`}>
      <h3 style={{ color: 'var(--text-muted)' }}>Plagiarism Score</h3>
      <svg viewBox="0 0 36 36" className="circular-chart">
        <path className="circle-bg"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path className="circle"
          strokeDasharray={strokeDasharray}
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <text x="18" y="20.35" className="percentage">{percentage}%</text>
      </svg>
      {percentage > 50 ? (
        <p style={{ color: 'var(--danger)', fontWeight: 'bold' }}>High Risk Detected</p>
      ) : percentage > 15 ? (
        <p style={{ color: 'var(--warning)', fontWeight: 'bold' }}>Moderate Similarity</p>
      ) : (
        <p style={{ color: 'var(--success)', fontWeight: 'bold' }}>Original Content</p>
      )}
    </div>
  );
};
