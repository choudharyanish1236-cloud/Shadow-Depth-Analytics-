
import React, { useRef, useEffect, useState } from 'react';
import { generateShadowMask } from '../utils/imageProcessing';

interface Props {
  onAreaDetected: (area: number) => void;
  isCalibrating: boolean;
  onCalibrationComplete: (area: number) => void;
}

const CameraAnalysis: React.FC<Props> = ({ onAreaDetected, isCalibrating, onCalibrationComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive) return;

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
          canvas.width = video.videoWidth / 4; // Downscale for performance
          canvas.height = video.videoHeight / 4;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const area = generateShadowMask(ctx, canvas.width, canvas.height);
          onAreaDetected(area);
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
  }, [isActive]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Live Mask Analysis</h3>
        <button 
          onClick={() => setIsActive(!isActive)}
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${isActive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'}`}
        >
          {isActive ? 'Stop Stream' : 'Start Engine'}
        </button>
      </div>

      <div className="aspect-video relative bg-black flex items-center justify-center">
        {!isActive && (
          <div className="text-center p-8">
            <div className="h-12 w-12 border-2 border-slate-800 border-t-amber-500 rounded-full animate-spin mx-auto mb-4 opacity-20"></div>
            <p className="text-slate-600 text-xs font-mono">NEURAL SENSORS OFFLINE</p>
          </div>
        )}
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} className={`w-full h-full object-cover ${isActive ? 'opacity-100' : 'opacity-0'}`} />
        
        {isCalibrating && isActive && (
          <div className="absolute inset-0 bg-amber-500/10 flex flex-col items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-amber-500/50 w-32 h-32 rounded-xl mb-4 animate-pulse"></div>
            <p className="bg-amber-500 text-slate-950 px-3 py-1 text-[10px] font-bold rounded uppercase">Calibration Frame Active</p>
          </div>
        )}
      </div>

      {isCalibrating && (
        <div className="p-4 bg-amber-950/20 border-t border-amber-500/30 flex items-center justify-between">
          <p className="text-[10px] text-amber-200 uppercase font-bold">Align hand with surface (h=0)</p>
          <button 
            onClick={() => {
              // Get current area from context or callback
              // Here we assume the parent handles the snapshot
              onCalibrationComplete(0); // Trigger save in parent
            }}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-1 text-xs font-black rounded uppercase transition-all"
          >
            Capture Baseline
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraAnalysis;
