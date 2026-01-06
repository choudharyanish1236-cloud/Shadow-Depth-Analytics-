
import React from 'react';
import { PredictionResult } from '../types';
import { getLabelColor } from '../constants';

interface Props {
  result: PredictionResult;
  actualH: number;
}

const StatsCard: React.FC<Props> = ({ result, actualH }) => {
  const error = Math.abs(result.h_est - actualH);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="text-slate-500 text-xs font-bold uppercase mb-1">Estimated Depth</div>
        <div className="text-3xl font-mono text-white">{result.h_est.toFixed(2)} <span className="text-sm text-slate-500">cm</span></div>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="text-slate-500 text-xs font-bold uppercase mb-1">Classification</div>
        <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white mb-2 ${getLabelColor(result.label)}`}>
          {result.label}
        </div>
        <div className="text-xl font-semibold text-white">Action Matrix</div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="text-slate-500 text-xs font-bold uppercase mb-1">Shadow Area</div>
        <div className="text-2xl font-mono text-amber-400">{Math.round(result.A_shadow)} <span className="text-sm text-slate-500">px²</span></div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="text-slate-500 text-xs font-bold uppercase mb-1">Precision Delta</div>
        <div className={`text-2xl font-mono ${error < 0.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
          ±{error.toFixed(2)} <span className="text-sm text-slate-500">cm</span>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
