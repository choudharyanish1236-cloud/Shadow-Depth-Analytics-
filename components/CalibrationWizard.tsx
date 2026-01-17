
import React, { useState, useEffect } from 'react';

interface Props {
  currentDetectedArea: number;
  isStable: boolean;
  onComplete: (area: number) => void;
  onCancel: () => void;
}

enum Step {
  INTRO,
  CLEAR_SURFACE,
  PLACE_HAND,
  CONFIRM
}

const CalibrationWizard: React.FC<Props> = ({ currentDetectedArea, isStable, onComplete, onCancel }) => {
  const [step, setStep] = useState<Step>(Step.INTRO);
  const [capturedArea, setCapturedArea] = useState(0);

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      
      <div className="relative bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-1 bg-gradient-to-r from-amber-500 to-amber-600" />
        
        <div className="p-8">
          {step === Step.INTRO && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Calibration Wizard</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  To estimate distance accurately, we need to measure your hand's base area when it's touching the surface.
                </p>
              </div>
              <button onClick={nextStep} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl uppercase tracking-widest transition-all">
                Begin Calibration
              </button>
            </div>
          )}

          {step === Step.CLEAR_SURFACE && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Step 1: Clear Space</h3>
                <p className="text-slate-300 text-sm">
                  Remove all objects from the camera view. The vision processor needs a clean baseline.
                </p>
              </div>
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-500">
                Current Noise: <span className={currentDetectedArea < 50 ? 'text-emerald-400' : 'text-rose-400'}>{currentDetectedArea} PX²</span>
              </div>
              <div className="flex gap-3">
                <button onClick={prevStep} className="flex-1 py-3 border border-slate-700 text-slate-400 font-bold rounded-xl uppercase text-xs">Back</button>
                <button 
                  onClick={nextStep} 
                  disabled={currentDetectedArea > 100}
                  className="flex-[2] py-3 bg-white text-slate-950 font-black rounded-xl uppercase tracking-widest disabled:opacity-30"
                >
                  Confirm Clear
                </button>
              </div>
            </div>
          )}

          {step === Step.PLACE_HAND && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Step 2: Measure Hand</h3>
                <p className="text-slate-300 text-sm">
                  Place your hand <span className="text-white font-bold">flat against the surface</span>. Keep it still until the system locks.
                </p>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <div className={`w-32 h-32 border-4 rounded-3xl flex items-center justify-center transition-all duration-500 ${isStable ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'border-slate-800 bg-slate-950'}`}>
                  {isStable ? (
                    <div className="text-center">
                      <div className="text-2xl font-mono text-white font-bold">{currentDetectedArea}</div>
                      <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Area Locked</div>
                    </div>
                  ) : (
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-2 w-12 bg-slate-800 rounded-full mb-2"></div>
                      <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Waiting for stability...</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={prevStep} className="flex-1 py-3 border border-slate-700 text-slate-400 font-bold rounded-xl uppercase text-xs">Back</button>
                <button 
                  onClick={() => {
                    setCapturedArea(currentDetectedArea);
                    nextStep();
                  }} 
                  disabled={!isStable || currentDetectedArea < 200}
                  className="flex-[2] py-3 bg-emerald-500 text-slate-950 font-black rounded-xl uppercase tracking-widest disabled:opacity-30 shadow-lg shadow-emerald-500/20"
                >
                  Capture Area
                </button>
              </div>
            </div>
          )}

          {step === Step.CONFIRM && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">Step 3: Verification</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  We've recorded your reference area as <span className="text-white font-mono font-bold">{capturedArea} units</span>. 
                  This will be used as the baseline for all depth calculations.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(Step.PLACE_HAND)} className="flex-1 py-3 border border-slate-700 text-slate-400 font-bold rounded-xl uppercase text-xs">Retake</button>
                <button 
                  onClick={() => onComplete(capturedArea)}
                  className="flex-[2] py-3 bg-amber-500 text-slate-950 font-black rounded-xl uppercase tracking-widest shadow-lg shadow-amber-500/20"
                >
                  Save & Exit
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-center items-center gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1.5 w-1.5 rounded-full transition-all ${i === step ? 'bg-amber-500 w-4' : 'bg-slate-700'}`} />
          ))}
        </div>
      </div>

      <button onClick={onCancel} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" />
        </svg>
      </button>
    </div>
  );
};

export default CalibrationWizard;
