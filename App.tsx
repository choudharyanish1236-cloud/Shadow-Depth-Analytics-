
import React, { useState, useMemo, useCallback } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { 
  DEFAULT_L, 
  DEFAULT_H, 
  DEFAULT_A_HAND, 
  calculateShadowArea, 
  estimateH, 
  getLabel 
} from './constants';
import { GeometryState, PredictionResult } from './types';
import GeometryVisualizer from './components/GeometryVisualizer';
import StatsCard from './components/StatsCard';
import CameraAnalysis from './components/CameraAnalysis';
import CalibrationWizard from './components/CalibrationWizard';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<GeometryState>({
    L: DEFAULT_L,
    h: DEFAULT_H,
    A_hand: DEFAULT_A_HAND
  });

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [detectedArea, setDetectedArea] = useState(0);
  const [isVisionStable, setIsVisionStable] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const result = useMemo((): PredictionResult => {
    const A_shadow = calculateShadowArea(state.A_hand, state.L, state.h);
    const h_est = estimateH(state.L, state.A_hand, A_shadow);
    return {
      h_est,
      A_shadow,
      label: getLabel(h_est),
      confidence: 0.95
    };
  }, [state]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 0; i < state.L; i += 2) {
      data.push({
        h: i,
        area: calculateShadowArea(state.A_hand, state.L, i)
      });
    }
    return data;
  }, [state.L, state.A_hand]);

  const handleAreaDetected = useCallback((area: number) => {
    setDetectedArea(area);
  }, []);

  const handleStabilityChange = useCallback((stable: boolean) => {
    setIsVisionStable(stable);
  }, []);

  const finalizeCalibration = useCallback((area: number) => {
    if (area > 0) {
      setState(prev => ({ ...prev, A_hand: area }));
      setIsCalibrating(false);
    }
  }, []);

  const handleAiAnalyze = async () => {
    setIsAiLoading(true);
    const analysis = await geminiService.getGeometricAnalysis(state.h, state.L, state.A_hand, result.A_shadow);
    setAiAnalysis(analysis);
    setIsAiLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative min-h-screen">
      {isCalibrating && (
        <CalibrationWizard 
          currentDetectedArea={detectedArea}
          isStable={isVisionStable}
          onComplete={finalizeCalibration}
          onCancel={() => setIsCalibrating(false)}
        />
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase">Shadow<span className="text-amber-500">Depth</span> <span className="text-slate-700 not-italic font-light">Pro</span></h1>
          <p className="text-slate-400 mt-1 max-w-xl text-sm">
            Refactored with edge-detection based shadow masking and interactive A_hand calibration.
          </p>
        </div>
        <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">A_hand Calibration</div>
              <div className="text-lg font-mono text-amber-500">{state.A_hand} <span className="text-[10px] text-slate-600">px</span></div>
            </div>
            <button 
              onClick={() => setIsCalibrating(!isCalibrating)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border ${isCalibrating ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/50 hover:text-amber-500'}`}
            >
              {isCalibrating ? 'Cancel Wizard' : 'Launch Wizard'}
            </button>
        </div>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Vision */}
        <div className="lg:col-span-4 space-y-6">
          <CameraAnalysis 
            onAreaDetected={handleAreaDetected} 
            onStabilityChange={handleStabilityChange}
            isCalibrating={isCalibrating}
            onCalibrationComplete={finalizeCalibration}
          />

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <h2 className="text-sm font-bold text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
              Simulation Sliders
            </h2>
            
            <div className="space-y-8">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  <span>Light Distance (L)</span>
                  <span className="text-amber-400 font-mono">{state.L} cm</span>
                </div>
                <input 
                  type="range" min="10" max="200" step="1" 
                  value={state.L} 
                  onChange={(e) => setState(prev => ({ ...prev, L: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  <span>Object Position (h)</span>
                  <span className="text-sky-400 font-mono">{state.h} cm</span>
                </div>
                <input 
                  type="range" min="0" max={state.L - 1} step="0.1" 
                  value={state.h} 
                  onChange={(e) => setState(prev => ({ ...prev, h: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
            </div>

            <button 
              onClick={handleAiAnalyze}
              disabled={isAiLoading}
              className="w-full mt-10 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAiLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 10-2 0h-1a1 1 0 100 2h1a1 1 0 102 0zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 10-2 0H2a1 1 0 100 2h1a1 1 0 102 0zM8.464 14.95a1 1 0 10-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zM17 13a1 1 0 100-2h-1a1 1 0 100 2h1zM12.95 17.05a1 1 0 101.414-1.414l-.707-.707a1 1 0 10-1.414 1.414l.707.707z" />
                  </svg>
                  Geometric Theory Analysis
                </span>
              )}
            </button>
          </div>

          {aiAnalysis && (
            <div className="bg-indigo-950/20 border border-indigo-500/30 p-6 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-indigo-400 text-[10px] font-bold uppercase mb-3 tracking-widest flex items-center gap-2">
                Intelligence Brief
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed font-light italic">
                {aiAnalysis}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Visualization & Stats */}
        <div className="lg:col-span-8 space-y-8">
          <GeometryVisualizer state={state} />
          
          <StatsCard result={result} actualH={state.h} />

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shadow Area Projection Flux</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Predicted Area</span>
                </div>
              </div>
            </div>
            
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="h" 
                    stroke="#475569" 
                    fontSize={10} 
                    label={{ value: 'Depth (h) [cm]', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '10px' }}
                    itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="area" 
                    stroke="#f59e0b" 
                    strokeWidth={3}
                    fill="url(#areaGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-600 uppercase tracking-tighter">
              <span>Dynamic Projection Model: A = A_hand * (L / (L - h))^2</span>
              <span>Model Stability: High</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="pt-8 border-t border-slate-900 text-[10px] font-mono text-slate-700 flex justify-between items-center">
        <div>PROXIMITY ENGINE // BUILT BY SENIOR FRONTEND GEOMETRY LABS</div>
        <div className="flex gap-6 uppercase tracking-widest font-bold">
          <span>Rev 3.1.0</span>
          <span>Adaptive_Mask_v2</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
