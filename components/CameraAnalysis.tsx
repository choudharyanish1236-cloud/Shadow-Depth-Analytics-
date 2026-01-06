
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { generateShadowMask, ShadowData } from '../utils/imageProcessing';

interface Props {
  onAreaDetected: (area: number) => void;
  isCalibrating: boolean;
  onCalibrationComplete: (area: number) => void;
}

interface FrameStats {
  area: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

const CameraAnalysis: React.FC<Props> = ({ onAreaDetected, isCalibrating, onCalibrationComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [lastData, setLastData] = useState<ShadowData | null>(null);
  
  // Stability detection state: tracking area, dimensions, and position
  const frameHistory = useRef<FrameStats[]>([]);
  const [isStable, setIsStable] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsStable(false);
      frameHistory.current = [];
      return;
    }

    let animationId: number;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    const processFrame = () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          const scale = 4;
          canvas.width = video.videoWidth / scale;
          canvas.height = video.videoHeight / scale;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const data = generateShadowMask(ctx, canvas.width, canvas.height);
          setLastData(data);
          onAreaDetected(data.count);

          // Calculate current frame metrics
          const currentW = data.maxX - data.minX;
          const currentH = data.maxY - data.minY;
          const currentCX = data.minX + currentW / 2;
          const currentCY = data.minY + currentH / 2;

          // Update stability tracking
          frameHistory.current.push({
            area: data.count,
            width: currentW,
            height: currentH,
            cx: currentCX,
            cy: currentCY
          });

          if (frameHistory.current.length > 25) {
            frameHistory.current.shift();
            
            // Utility for calculating mean and standard deviation
            const getStats = (values: number[]) => {
              const mean = values.reduce((a, b) => a + b, 0) / values.length;
              const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
              return { mean, stdDev };
            };

            const areaStats = getStats(frameHistory.current.map(f => f.area));
            const widthStats = getStats(frameHistory.current.map(f => f.width));
            const heightStats = getStats(frameHistory.current.map(f => f.height));
            const xStats = getStats(frameHistory.current.map(f => f.cx));
            const yStats = getStats(frameHistory.current.map(f => f.cy));

            // multi-factor stability check:
            // 1. Significant area detected
            // 2. Area variance < 4%
            // 3. Width/Height variance < 6% (Size consistency)
            // 4. Centroid drift < 3 pixels (Positional stability)
            const areaCheck = areaStats.mean > 150 && areaStats.stdDev < areaStats.mean * 0.04;
            const sizeCheck = widthStats.stdDev < widthStats.mean * 0.06 && heightStats.stdDev < heightStats.mean * 0.06;
            const posCheck = xStats.stdDev < 3.0 && yStats.stdDev < 3.0;

            setIsStable(areaCheck && sizeCheck && posCheck);
          }

          // Draw Bounding Box Overlay with Animations
          if (data.count > 10) {
            const time = performance.now();
            const pulse = Math.sin(time / 200) * 0.5 + 0.5; // 0 to 1
            
            // Color shifts to emerald when stable
            const baseColor = isStable ? [16, 185, 129] : [245, 158, 11]; // emerald-500 : amber-500
            const strokeColor = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.6 + pulse * 0.4})`;
            
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = isStable ? 2 : 1 + pulse;
            
            // Draw box corners
            const pad = 2;
            const x = data.minX - pad;
            const y = data.minY - pad;
            const w = (data.maxX - data.minX) + pad * 2;
            const h = (data.maxY - data.minY) + pad * 2;
            
            ctx.beginPath();
            const cornerLen = Math.min(w, h) * 0.2;
            
            // Top Left
            ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y);
            // Top Right
            ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen);
            // Bottom Right
            ctx.moveTo(x + w, y + h - cornerLen); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - cornerLen, y + h);
            // Bottom Left
            ctx.moveTo(x + cornerLen, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - cornerLen);
            ctx.stroke();

            // Subtle interior pulse
            ctx.fillStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.05 + pulse * 0.05})`;
            ctx.fillRect(x, y, w, h);
            
            // Label
            ctx.fillStyle = strokeColor;
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`${isStable ? 'LOCKED' : 'TRACKING'}: ${data.count}PX²`, x, y > 15 ? y - 6 : y + h + 12);
          }
        }
      }
      animationId = requestAnimationFrame(processFrame);
    };

    startCamera().then(() => {
      animationId = requestAnimationFrame(processFrame);
    });

    return () => {
      cancelAnimationFrame(animationId);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [isActive, onAreaDetected, isStable]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative group">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Vision Processor</h3>
          {isActive && lastData && (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors duration-300 ${isStable ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' : 'text-amber-500 bg-amber-500/10 border-amber-500/30'}`}>
                {lastData.count} PX
              </span>
              {isStable && (
                <span className="animate-pulse text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Stability Locked</span>
              )}
            </div>
          )}
        </div>
        <button 
          onClick={() => setIsActive(!isActive)}
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${isActive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'}`}
        >
          {isActive ? 'Disconnect' : 'Connect Camera'}
        </button>
      </div>

      <div className="aspect-video relative bg-black flex items-center justify-center">
        {!isActive && (
          <div className="text-center p-8">
            <div className="h-12 w-12 border-2 border-slate-800 border-t-amber-500 rounded-full animate-spin mx-auto mb-4 opacity-20"></div>
            <p className="text-slate-600 text-xs font-mono">OPTICAL SENSORS STANDBY</p>
          </div>
        )}
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas 
          ref={canvasRef} 
          className={`w-full h-full object-cover transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`} 
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* HUD Overlay */}
        {isActive && (
          <div className="absolute inset-0 pointer-events-none border border-slate-800/20 flex flex-col justify-between p-4">
             <div className="flex justify-between items-start opacity-40">
                <div className="border-l border-t border-slate-400 w-4 h-4"></div>
                <div className="border-r border-t border-slate-400 w-4 h-4"></div>
             </div>
             
             {isCalibrating && (
                <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-500">
                  <div className="relative">
                    <div className={`absolute inset-[-30px] border-2 rounded-full animate-ping opacity-20 transition-colors duration-500 ${isStable ? 'border-emerald-500' : 'border-amber-500'}`}></div>
                    <div className={`w-24 h-24 border-2 rounded-xl flex items-center justify-center transition-all duration-500 ${isStable ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'border-amber-500 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]'}`}>
                      {isStable ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8l2 2M7 14l-2 2m10 2l2 2M17 6l-2 2" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className={`bg-slate-950/90 backdrop-blur-md border px-4 py-2 rounded-lg text-center transition-colors duration-500 ${isStable ? 'border-emerald-500/50' : 'border-amber-500/30'}`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${isStable ? 'text-emerald-400' : 'text-amber-500'}`}>
                      {isStable ? 'Calibration Ready' : 'Acquiring Target'}
                    </div>
                    <div className="text-slate-400 text-[9px] font-mono mt-0.5">
                      {isStable ? 'SIGNAL STRENGTH: OPTIMAL' : 'WAIT FOR STABLE INPUT...'}
                    </div>
                  </div>
                </div>
             )}

             <div className="flex justify-between items-end opacity-40">
                <div className="border-l border-b border-slate-400 w-4 h-4"></div>
                <div className="border-r border-b border-slate-400 w-4 h-4"></div>
             </div>
          </div>
        )}
      </div>

      {isCalibrating && (
        <div className={`p-4 border-t flex items-center justify-between transition-colors duration-500 ${isStable ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
          <div className="space-y-1">
            <p className={`text-[10px] uppercase font-bold tracking-tight transition-colors duration-500 ${isStable ? 'text-emerald-400' : 'text-amber-200'}`}>
              Phase 1: Surface Baseline
            </p>
            <p className="text-[9px] text-slate-500 font-mono">Detected Area: {lastData?.count || 0} px²</p>
          </div>
          <button 
            onClick={() => onCalibrationComplete(lastData?.count || 0)}
            disabled={!lastData || lastData.count < 50 || !isStable}
            className={`px-6 py-2 text-xs font-black rounded-lg uppercase transition-all shadow-lg ${isStable ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20' : 'bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 shadow-amber-500/20'}`}
          >
            {isStable ? 'Commit Baseline' : 'Waiting for Lock'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraAnalysis;
