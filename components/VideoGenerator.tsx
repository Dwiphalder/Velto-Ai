import React, { useState, useRef } from 'react';
import { generateVideo } from '../services/geminiService';
import { ImageUploader } from './ImageUploader';
import { AspectRatio } from '../types';
import { Video, Sparkles, Download, Film, Type, Image as ImageIcon, Clock, MonitorPlay, Save, Loader2 } from 'lucide-react';

export const VideoGenerator: React.FC = () => {
  const [mode, setMode] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [duration, setDuration] = useState<string>('5s');
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Generating Video...");
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleGenerate = async () => {
    // Validate inputs
    if (mode === 'text-to-video' && !prompt) return;
    if (mode === 'image-to-video' && !selectedImage && !prompt) return;
    
    setLoading(true);
    setLoadingMsg("Initializing Veo Model...");
    setError(null);
    setVideoUrl(null);
    setSaveStatus(null);

    // Dynamic message updates
    const msgInterval = setInterval(() => {
       setLoadingMsg(prev => {
          if (prev.includes("Initializing")) return "Generating Video (approx 1 min)...";
          if (prev.includes("Generating")) return "Rendering frames...";
          if (prev.includes("Rendering")) return "Finalizing video...";
          return prev;
       });
    }, 15000);

    try {
      const url = await generateVideo(prompt, mode === 'image-to-video' ? selectedImage : null, aspectRatio);
      setVideoUrl(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate video.");
    } finally {
      clearInterval(msgInterval);
      setLoading(false);
    }
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `velto-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const saveToGallery = () => {
    if (!videoUrl) return;
    try {
      const saved = localStorage.getItem('velto_saved_images');
      const items = saved ? JSON.parse(saved) : [];
      items.unshift({
        url: videoUrl, // Note: Blob URLs expire. In a real app, upload to cloud. For now, this persists only in session.
        date: new Date().toISOString(),
        type: 'Video'
      });
      if (items.length > 50) items.pop();
      localStorage.setItem('velto_saved_images', JSON.stringify(items));
      
      setSaveStatus("Saved to Gallery!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      setError("Failed to save.");
    }
  };

  // Determine if generate is allowed
  const canGenerate = () => {
    if (mode === 'text-to-video') return !!prompt;
    if (mode === 'image-to-video') return !!selectedImage; // Prompt optional for image-to-video
    return false;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

      {/* LEFT: Controls */}
      <div className="lg:col-span-4 space-y-6">
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Film className="w-3.5 h-3.5" /> Input Mode
          </h2>
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
             <button
               onClick={() => setMode('text-to-video')}
               className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${mode === 'text-to-video' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <Type className="w-3 h-3" /> Text to Video
             </button>
             <button
               onClick={() => setMode('image-to-video')}
               className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${mode === 'image-to-video' ? 'bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <ImageIcon className="w-3 h-3" /> Image to Video
             </button>
          </div>
        </div>

        {mode === 'image-to-video' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
               <ImageIcon className="w-3.5 h-3.5" /> Start Image
            </h2>
            <ImageUploader 
              selectedImage={selectedImage} 
              onImageSelect={setSelectedImage} 
              aspectRatio={aspectRatio === '16:9' ? AspectRatio.LANDSCAPE : AspectRatio.PORTRAIT} 
            />
          </div>
        )}

        <div className="space-y-3">
           <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
             <MonitorPlay className="w-3.5 h-3.5" /> Aspect Ratio
           </h2>
           <div className="grid grid-cols-2 gap-2">
             {['16:9', '9:16'].map((r) => (
               <button
                 key={r}
                 onClick={() => setAspectRatio(r)}
                 className={`py-2 rounded-lg text-xs font-bold border transition-all ${aspectRatio === r ? 'bg-brand-500 text-white border-brand-500' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500'}`}
               >
                 {r} ({r === '16:9' ? 'Landscape' : 'Mobile'})
               </button>
             ))}
           </div>
        </div>
        
        <div className="space-y-3">
           <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
             <Clock className="w-3.5 h-3.5" /> Target Duration
           </h2>
           <div className="grid grid-cols-3 gap-2">
             {['5s', '8s', '10s'].map((d) => (
               <button
                 key={d}
                 onClick={() => setDuration(d)}
                 className={`py-2 rounded-lg text-xs font-bold border transition-all ${duration === d ? 'bg-brand-500 text-white border-brand-500' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500'}`}
               >
                 {d}
               </button>
             ))}
           </div>
           <p className="text-[10px] text-slate-400">Note: Actual duration depends on AI model generation cycles.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Video Prompt
          </h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === 'image-to-video' ? "Optional: Describe motion (e.g. 'Pan right', 'Slow zoom')..." : "Describe the video scene..."}
            className="w-full h-32 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-500 outline-none resize-none dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-200 text-xs rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}
        
        {saveStatus && (
           <div className="text-xs text-green-500 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800 text-center">
             {saveStatus}
           </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate()}
          className={`
            w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.98]
            ${loading || !canGenerate()
              ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-50' 
              : 'bg-gradient-to-r from-purple-600 to-brand-500 hover:from-purple-500 hover:to-brand-400 shadow-brand-500/25'
            }
          `}
        >
          {loading ? <span>Processing...</span> : <><Video className="w-5 h-5" /> Generate Video</>}
        </button>
      </div>

      {/* RIGHT: Output */}
      <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
         <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-2 relative flex items-center justify-center overflow-hidden">
            
            {/* Local Loading Overlay */}
            {loading && (
             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl transition-all duration-500">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-brand-200 dark:border-brand-900 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                    <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-brand-500 animate-pulse" />
                </div>
                <p className="mt-6 text-brand-600 dark:text-brand-400 font-bold animate-pulse text-lg tracking-tight">{loadingMsg}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Video generation takes about 60 seconds.</p>
             </div>
            )}

            {videoUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black rounded-xl overflow-hidden group">
                 <video 
                   ref={videoRef}
                   src={videoUrl}
                   controls
                   autoPlay
                   loop
                   className="max-w-full max-h-full shadow-2xl"
                 />
                 <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={saveToGallery}
                      className="p-2 bg-white/10 backdrop-blur hover:bg-white/20 text-white rounded-full transition-colors"
                      title="Save to Gallery"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={downloadVideo}
                      className="p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                 </div>
              </div>
            ) : (
              <div className="text-center opacity-50 p-12">
                 <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-800/50 flex items-center justify-center mb-6 mx-auto">
                    <Video className="w-10 h-10 text-slate-400" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">AI Video Studio</h3>
                 <p className="text-slate-500 max-w-sm mx-auto mt-2">Generate short, high-quality videos from text or images using Gemini Veo.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};