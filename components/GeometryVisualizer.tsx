
import React from 'react';
import { GeometryState } from '../types';
import { calculateScale } from '../constants';

interface Props {
  state: GeometryState;
}

const GeometryVisualizer: React.FC<Props> = ({ state }) => {
  const { L, h, A_hand } = state;
  
  // Scaling for UI (let 1cm = 4px)
  const pxPerCm = 6;
  const canvasWidth = 400;
  const canvasHeight = 250;
  
  const faceX = canvasWidth - 40;
  const lightX = faceX - (L * pxPerCm);
  const handX = faceX - (h * pxPerCm);
  
  const s = calculateScale(L, h);
  const handSize = Math.sqrt(A_hand) / 2; // Arbitrary visualization size
  const shadowSize = handSize * s;

  return (
    <div className="bg-slate-900 rounded-xl p-6 shadow-inner border border-slate-800 flex flex-col items-center">
      <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Side View Visualization</h3>
      <svg width={canvasWidth} height={canvasHeight} className="overflow-visible group">
        {/* Ground/Plane */}
        <line x1={0} y1={canvasHeight - 20} x2={canvasWidth} y2={canvasHeight - 20} stroke="#334155" strokeWidth="2" />
        
        {/* Light Source */}
        <circle cx={lightX} cy={100} r="6" fill="#fbbf24" className="animate-pulse" />
        <text x={lightX} y={85} textAnchor="middle" fill="#fbbf24" className="text-[10px] font-bold">LIGHT</text>
        
        {/* Projection Rays */}
        <line x1={lightX} y1={100} x2={faceX} y2={100 - shadowSize} stroke="#fcd34d33" strokeDasharray="4" />
        <line x1={lightX} y1={100} x2={faceX} y2={100 + shadowSize} stroke="#fcd34d33" strokeDasharray="4" />

        {/* Surface (Face) */}
        <rect x={faceX} y={20} width="10" height={canvasHeight - 40} fill="#475569" rx="2" />
        <text x={faceX + 15} y={130} transform={`rotate(90 ${faceX + 15},130)`} fill="#94a3b8" className="text-[10px] uppercase font-bold">Surface Plane</text>

        {/* Shadow on Surface - Slightly refined hover and transition */}
        <g className="cursor-crosshair transition-all duration-500 ease-out group/shadow">
          <rect 
            x={faceX - 2} 
            y={100 - shadowSize} 
            width="6" 
            height={shadowSize * 2} 
            fill="#020617" 
            opacity="0.9" 
            rx="1" 
            className="transition-all duration-500 ease-out hover:scale-y-105 hover:brightness-200 origin-center"
            style={{ transformBox: 'fill-box' }}
          />
          <text 
            x={faceX - 12} 
            y={100 + shadowSize + 15} 
            textAnchor="end" 
            fill="#475569" 
            className="text-[10px] font-bold italic transition-colors duration-300 group-hover/shadow:fill-slate-300"
          >
            SHADOW
          </text>
        </g>

        {/* Hand - Refined hover scaling and smooth transition */}
        <g className="cursor-pointer transition-all duration-500 ease-out group/hand">
          <rect 
            x={handX - 5} 
            y={100 - handSize} 
            width="10" 
            height={handSize * 2} 
            fill="#94a3b8" 
            rx="2" 
            className="transition-all duration-500 ease-out hover:scale-110 hover:fill-sky-400 origin-center hover:shadow-2xl" 
            style={{ transformBox: 'fill-box' }}
          />
          <text 
            x={handX} 
            y={100 + handSize + 15} 
            textAnchor="middle" 
            fill="#94a3b8" 
            className="text-[10px] font-bold transition-colors duration-300 group-hover/hand:fill-sky-300"
          >
            HAND
          </text>
        </g>

        {/* Dimension Labels */}
        <line x1={lightX} y1={canvasHeight - 40} x2={faceX} y2={canvasHeight - 40} stroke="#64748b" strokeWidth="1" />
        <text x={(lightX + faceX) / 2} y={canvasHeight - 45} textAnchor="middle" fill="#64748b" className="text-[9px]">L = {L}cm</text>
        
        <line x1={handX} y1={canvasHeight - 60} x2={faceX} y2={canvasHeight - 60} stroke="#38bdf8" strokeWidth="1" />
        <text x={(handX + faceX) / 2} y={canvasHeight - 65} textAnchor="middle" fill="#38bdf8" className="text-[9px]">h = {h}cm</text>
      </svg>
    </div>
  );
};

export default GeometryVisualizer;
