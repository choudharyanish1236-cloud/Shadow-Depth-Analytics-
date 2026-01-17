
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { generateShadowMask, ShadowData } from '../utils/imageProcessing';

interface Props {
  onAreaDetected: (area: number) => void;
  onStabilityChange?: (isStable: boolean) => void;
  isCalibrating: boolean;
  onCalibrationComplete: (area: number) => void;
}

interface FrameStats {
  area: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
  intensity: number;
}

const CameraAnalysis: React.FC<Props> = ({ onAreaDetected, onStabilityChange, isCalibrating, onCalibrationComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastData, setLastData] = useState<ShadowData | null>(null);
  
  // Video filter states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);

  // Stability detection state
  const frameHistory = useRef<FrameStats[]>([]);
  const [isStable, setIsStable] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Notify parent of stability changes
  useEffect(() => {
    onStabilityChange?.(isStable);
  }, [isStable, onStabilityChange]);

  // Use refs for values needed in the loop to avoid effect restarts
  const filterRef = useRef({ brightness, contrast, saturate });
  useEffect(() => {
    filterRef.current = { brightness, contrast, saturate };
  }, [brightness, contrast, saturate]);

  // Effect to manage the camera stream
  useEffect(() => {
    if (!isActive) {
      setIsCameraReady(false);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsCameraReady(true);
        }
      } catch (err) {
        console.error("Camera access denied or error:", err);
        setIsActive(false);
        alert("Camera access is required for vision features.");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [isActive]);

  // Effect to manage the processing loop
  useEffect(() => {
    if (!isCameraReady || !isActive) {
      setIsStable(false);
      frameHistory.current = [];
      return;
    }

    let animationId: number;
    const processFrame = () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx && video.readyState >= 2) {
          const scale = 4;
          if (canvas.width !== video.videoWidth / scale) {
            canvas.width = video.videoWidth / scale;
            canvas.height = video.videoHeight / scale;
          }
          
          const { brightness, contrast, saturate } = filterRef.current;
          ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          
          const data = generateShadowMask(ctx, canvas.width, canvas.height);
          setLastData(data);
          onAreaDetected(data.count);

          const w = data.maxX - data.minX;
          const h = data.maxY - data.minY;
          const currentFrame: FrameStats = {
            area: data.count,
            width: w,
            height: h,
            cx: data.minX + w / 2,
            cy: data.minY + h / 2,
            intensity: data.avgIntensity
          };
          frameHistory.current.push(currentFrame);

          if (frameHistory.current.length > 25) {
            frameHistory.current.shift();
            const history = frameHistory.current;
            
            const getStats = (values: number[]) => {
              const mean = values.reduce((a, b) => a + b, 0) / values.length;
              const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
              return { mean, stdDev };
            };

            const areaStats = getStats(history.map(f => f.area));
            const widthStats = getStats(history.map(f => f.width));
            const heightStats = getStats(history.map(f => f.height));
            const xStats = getStats(history.map(f => f.cx));
            const yStats = getStats(history.map(f => f.cy));
            const intensityStats = getStats(history.map(f => f.intensity));

            let totalWDelta = 0;
            let totalHDelta = 0;
            for (let i = 1; i < history.length; i++) {
              totalWDelta += Math.abs(history[i].width - history[i-1].width);
              totalHDelta += Math.abs(history[i].height - history[i-1].height);
            }
            const avgWDelta = totalWDelta / (history.length - 1);
            const avgHDelta = totalHDelta / (history.length - 1);

            const areaPresent = areaStats.mean > 150;
            const areaStable = areaStats.stdDev < (areaStats.mean * 0.05); 
            const dimensionsStable = widthStats.stdDev < 3.0 && heightStats.stdDev < 3.0;
            const positionStable = xStats.stdDev < 2.0 && yStats.stdDev < 2.0;
            const jitterLow = avgWDelta < 1.5 && avgHDelta < 1.5;
            const shadowQuality = intensityStats.mean < 65;

            setIsStable(areaPresent && areaStable && dimensionsStable && positionStable && jitterLow && shadowQuality);
          }

          // --- DRAW HUD OVERLAY ---
          const time = performance.now();
          const pulse = Math.sin(time / 200) * 0.5 + 0.5;
          const baseColor = isStable ? [16, 185, 129] : [245, 158, 11];
          const primaryColor = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.8 + pulse * 0.2})`;

          // 1. Draw Targeting Reticle if Calibrating
          if (isCalibrating) {
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const size = 30;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + pulse * 0.1})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - size, cy); ctx.lineTo(cx + size, cy);
            ctx.moveTo(cx, cy - size); ctx.lineTo(cx, cy + size);
            ctx.stroke();
            ctx.strokeRect(cx - 10, cy - 10, 20, 20);
          }

          // 2. Draw Object-Locked HUD
          if (data.count > 20) {
            const x = data.minX - 4;
            const y = data.minY - 4;
            const bw = (data.maxX - data.minX) + 8;
            const bh = (data.maxY - data.minY) + 8;
            
            // Corner Brackets
            const bracketSize = Math.min(bw, bh, 15) * 0.3;
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2;
            
            // Top Left
            ctx.beginPath(); ctx.moveTo(x, y + bracketSize); ctx.lineTo(x, y); ctx.lineTo(x + bracketSize, y); ctx.stroke();
            // Top Right
            ctx.beginPath(); ctx.moveTo(x + bw - bracketSize, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + bracketSize); ctx.stroke();
            // Bottom Right
            ctx.beginPath(); ctx.moveTo(x + bw, y + bh - bracketSize); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw - bracketSize, y + bh); ctx.stroke();
            // Bottom Left
            ctx.beginPath(); ctx.moveTo(x + bracketSize, y + bh); ctx.lineTo(x, y + bh); ctx.lineTo(x, y + bh - bracketSize); ctx.stroke();

            // Status Text
            ctx.fillStyle = primaryColor;
            ctx.font = 'bold 9px monospace';
            const statusLabel = isStable ? "SIGNAL LOCKED" : "ACQUIRING...";
            ctx.fillText(statusLabel, x, y > 15 ? y - 8 : y + bh + 18);
            
            // Telemetry Floating Labels
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '7px monospace';
            ctx.fillText(`AREA: ${data.count} PX²`, x + bw + 4, y + 10);
            const dens = Math.max(0, Math.min(100, (1 - data.avgIntensity / 255) * 100));
            ctx.fillText(`DENS: ${Math.round(dens)}%`, x + bw + 4, y + 20);

            // Bounding box fill
            ctx.fillStyle = isStable ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)';
            ctx.fillRect(x, y, bw, bh);
          }
        }
      }
      animationId = requestAnimationFrame(processFrame);
    };

    animationId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationId);
  }, [isCameraReady, isActive, onAreaDetected, isStable, isCalibrating]);

  // Derived metric: Density (Inverse of intensity/brightness)
  const shadowDensity = lastData ? Math.max(0, Math.min(100, (1 - lastData.avgIntensity / 255) * 100)) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative group shadow-2xl">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Optical Processor</h3>
            {isActive && lastData && (
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors duration-300 ${isStable ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' : 'text-amber-500 bg-amber-500/10 border-amber-500/30'}`}>
                  {lastData.count} PX²
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${shadowDensity > 80 ? 'text-sky-500 border-sky-500/30' : shadowDensity > 70 ? 'text-amber-500 border-amber-500/30' : 'text-rose-500 border-rose-500/30'}`}>
                   DENSITY: {Math.round(shadowDensity)}%
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-all ${showSettings ? 'bg-slate-700 text-sky-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              title="Image Adjustments"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${isActive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'}`}
          >
            {isActive ? 'Off' : 'On'}
          </button>
        </div>
      </div>

      {isActive && showSettings && (
        <div className="bg-slate-950/80 backdrop-blur-md p-4 border-b border-slate-800 grid grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase flex justify-between">
              <span>Brightness</span>
              <span className="text-sky-400">{brightness}%</span>
            </label>
            <input 
              type="range" min="0" max="200" value={brightness} 
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase flex justify-between">
              <span>Contrast</span>
              <span className="text-sky-400">{contrast}%</span>
            </label>
            <input 
              type="range" min="0" max="200" value={contrast} 
              onChange={(e) => setContrast(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase flex justify-between">
              <span>Saturate</span>
              <span className="text-sky-400">{saturate}%</span>
            </label>
            <input 
              type="range" min="0" max="200" value={saturate} 
              onChange={(e) => setSaturate(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        </div>
      )}

      <div className="aspect-video relative bg-black flex items-center justify-center">
        {!isActive && (
          <div className="text-center p-8 opacity-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-[10px] uppercase font-mono tracking-widest">Awaiting Video Input</p>
          </div>
        )}
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas 
          ref={canvasRef} 
          className={`w-full h-full object-cover transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`} 
          style={{ imageRendering: 'pixelated' }}
        />
        
        {isActive && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
             <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start opacity-30">
                  <div className="border-l border-t border-white w-6 h-6"></div>
                  <div className="border-r border-t border-white w-6 h-6"></div>
                </div>

                {/* Intelligent Warning System */}
                {lastData && lastData.count > 50 && (
                  <div className="mx-auto flex flex-col items-center gap-2">
                    {shadowDensity < 70 ? (
                      <div className="bg-rose-500/90 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg backdrop-blur-md animate-pulse flex items-center gap-2 shadow-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Critical: Insufficient Shadow Darkness
                      </div>
                    ) : shadowDensity < 80 ? (
                      <div className="bg-amber-500/80 text-slate-950 text-[10px] font-black uppercase px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1.5">
                         Caution: Weak Environmental Contrast
                      </div>
                    ) : null}
                  </div>
                )}
             </div>

             <div className="flex flex-col gap-2">
                {/* Visual Density Gauge */}
                {lastData && (
                  <div className="bg-slate-950/60 backdrop-blur-sm p-2 rounded-lg border border-slate-800 w-40 mx-auto">
                    <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase mb-1">
                      <span>Shadow Density</span>
                      <span className={shadowDensity > 75 ? 'text-sky-400' : 'text-rose-400'}>{Math.round(shadowDensity)}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${shadowDensity > 80 ? 'bg-sky-500' : shadowDensity > 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${shadowDensity}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-end opacity-30">
                  <div className="border-l border-b border-white w-6 h-6"></div>
                  <div className="border-r border-b border-white w-6 h-6"></div>
                </div>
             </div>
          </div>
        )}
      </div>

      {isCalibrating && (
        <div className={`p-4 border-t flex items-center justify-between transition-colors duration-500 ${isStable ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
          <div className="space-y-0.5">
            <p className={`text-[10px] uppercase font-black tracking-tight ${isStable ? 'text-emerald-400' : 'text-amber-500'}`}>
              Signal Quality: {isStable ? 'Stable (Locked)' : 'Acquiring Target...'}
            </p>
            <p className="text-[9px] text-slate-500 font-mono">Intensity: {Math.round(lastData?.avgIntensity || 0)} Lm</p>
          </div>
          <button 
            onClick={() => onCalibrationComplete(lastData?.count || 0)}
            disabled={!lastData || lastData.count < 50 || !isStable}
            className={`px-6 py-2 text-[10px] font-black rounded-lg uppercase transition-all ${isStable ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
          >
            Store Baseline
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraAnalysis;
