import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Zap } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

const LOADING_MESSAGES = [
  "Initializing Velto AI...",
  "Analyzing image composition...",
  "Identifying key subjects...",
  "Dreaming up concepts...",
  "Applying lighting models...",
  "Rendering 3D geometry...",
  "Enhancing textures & details...",
  "Color grading pixels...",
  "Final polish...",
  "Almost ready...",
  "Just a second more..."
];

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Cycle through messages every 1.5 seconds to keep user engaged
    const msgInterval = setInterval(() => {
      setCurrentMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);

    // Simulate progress bar that moves fast then slows down
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // Stall at 95% until actually done
        const increment = Math.max(1, (90 - prev) / 10); // Fast start, slow end
        return prev + increment;
      });
    }, 200);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f19]/90 backdrop-blur-md">
      <div className="flex flex-col items-center max-w-sm w-full mx-4 relative">
        
        {/* Glowing Orb Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-500/20 rounded-full blur-[100px] animate-pulse-slow pointer-events-none"></div>

        <div className="bg-slate-900/80 border border-slate-700/50 p-8 rounded-3xl shadow-2xl backdrop-blur-xl w-full flex flex-col items-center relative overflow-hidden">
          
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50"></div>

          <div className="relative mb-6">
            <div className="absolute inset-0 bg-brand-400 blur-xl opacity-20 rounded-full animate-ping"></div>
            <div className="relative bg-slate-800 p-4 rounded-full border border-slate-700 shadow-xl">
              <Sparkles className="w-8 h-8 text-brand-400 animate-spin-slow" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-brand-500 rounded-full p-1 border-2 border-slate-900">
               <Zap className="w-3 h-3 text-white fill-current" />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white tracking-tight mb-2 text-center">
            Creating Magic
          </h3>
          
          <div className="h-6 overflow-hidden relative w-full flex justify-center">
             {/* Text Fade Transition */}
             <p className="text-brand-300/90 text-sm font-medium animate-pulse text-center w-full">
               {LOADING_MESSAGES[currentMsgIndex]}
             </p>
          </div>

          {/* Custom Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full mt-6 overflow-hidden relative border border-slate-700/50">
            <div 
              className="h-full bg-gradient-to-r from-brand-600 via-brand-400 to-brand-300 transition-all duration-200 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite] skew-x-12"></div>
            </div>
          </div>
          
          <div className="flex justify-between w-full mt-2 px-1">
            <span className="text-[10px] text-slate-500 font-mono">AI PROCESSING</span>
            <span className="text-[10px] text-brand-400 font-mono">{Math.round(progress)}%</span>
          </div>

        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
};