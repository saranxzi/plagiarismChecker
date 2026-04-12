import React from 'react';

export interface RadarData {
  axis: string;
  value: number; // 0 to 100
}

interface Props {
  data: RadarData[];
}

export const RadarChart: React.FC<Props> = ({ data }) => {
  const size = 400; // Increased bounding box for labels
  const cx = 200;
  const cy = 200;
  const radius = 100;
  const numAxes = data.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // Helpers to calculate coordinates
  const getPoint = (val: number, index: number, maxVal = 100) => {
    const r = (val / maxVal) * radius;
    const a = index * angleStep - Math.PI / 2;
    return {
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a)
    };
  };

  // Generate background spider webs (ticks)
  const ticks = [20, 40, 60, 80, 100];

  // Generate the actual data polygon path
  const dataPoints = data.map((d, i) => getPoint(d.value, i));
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', overflow: 'visible' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible', maxWidth: '400px' }}>
        <defs>
            <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(107, 76, 255, 0.7)" />
                <stop offset="100%" stopColor="rgba(255, 76, 76, 0.5)" />
            </linearGradient>
            <filter id="glow">
               <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
               <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
               </feMerge>
            </filter>
        </defs>

        {/* Concentric Webs */}
        {ticks.map(tick => {
          const pts = data.map((_, i) => {
            const p = getPoint(tick, i);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <polygon 
              key={tick} 
              points={pts} 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.05)" 
              strokeWidth="2" 
            />
          );
        })}

        {/* Axis Lines */}
        {data.map((_, i) => {
          const outer = getPoint(100, i);
          return (
            <line 
              key={`axis-${i}`} 
              x1={cx} y1={cy} 
              x2={outer.x} y2={outer.y} 
              stroke="rgba(255, 255, 255, 0.1)" 
              strokeWidth="2" 
            />
          );
        })}

        {/* Data Polygon */}
        <polygon 
          points={polygonPoints} 
          fill="url(#radarFill)" 
          stroke="var(--accent)" 
          strokeWidth="3" 
          filter="url(#glow)"
          style={{ transition: 'all 0.8s ease-in-out' }}
        />

        {/* Data Vertices */}
        {dataPoints.map((p, i) => (
          <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="4" fill="#fff" />
        ))}

        {/* Axis Labels */}
        {data.map((d, i) => {
          const labelPos = getPoint(130, i); // push labels out further
          // Simple anchor adjustment based on hemisphere
          let anchor: "start" | "middle" | "end" = "middle";
          if (labelPos.x > cx + 10) anchor = "start";
          if (labelPos.x < cx - 10) anchor = "end";

          return (
            <text 
              key={`label-${i}`} 
              x={labelPos.x} y={labelPos.y + 4} 
              fill="var(--text-muted)" 
              fontSize="12" 
              fontWeight="bold"
              textAnchor={anchor}
            >
              {d.axis}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
