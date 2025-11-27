
import React, { useState, useRef, useEffect } from 'react';
import { translateVideoContent, generateSpeech } from '../services/geminiService';
import { Upload, Play, Languages, Video, Mic, CheckCircle, AlertCircle, RefreshCw, Volume2, VolumeX, Pause, Download } from 'lucide-react';

const TARGET_LANGUAGES = [
  { id: 'Hindi', label: 'Hindi', flag: '🇮🇳' },
  { id: 'Bengali', label: 'Bengali', flag: '🇮🇳' },
  { id: 'English', label: 'English', flag: '🇺🇸' },
  { id: 'Spanish', label: 'Spanish', flag: '🇪🇸' },
  { id: 'French', label: 'French', flag: '🇫🇷' },
  { id: 'German', label: 'German', flag: '🇩🇪' },
  { id: 'Japanese', label: 'Japanese', flag: '🇯🇵' },
  { id: 'Korean', label: 'Korean', flag: '🇰🇷' },
  { id: 'Telugu', label: 'Telugu', flag: '🇮🇳' },
  { id: 'Tamil', label: 'Tamil', flag: '🇮🇳' },
];

export const VideoDubbing: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState('Hindi');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- WAV Header Helper (Critical for Playback) ---
  const createWavHeader = (pcmData: ArrayBuffer) => {
     const numChannels = 1;
     const sampleRate = 24000; // Gemini 2.5 Flash TTS default
     const bitsPerSample = 16;
     const blockAlign = numChannels * bitsPerSample / 8;
     const byteRate = sampleRate * blockAlign;
     const dataSize = pcmData.byteLength;

     const buffer = new ArrayBuffer(44 + dataSize);
     const view = new DataView(buffer);

     const writeString = (view: DataView, offset: number, string: string) => {
         for (let i = 0; i < string.length; i++) {
             view.setUint8(offset + i, string.charCodeAt(i));
         }
     };

     writeString(view, 0, 'RIFF');
     view.setUint32(4, 36 + dataSize, true);
     writeString(view, 8, 'WAVE');
     writeString(view, 12, 'fmt ');
     view.setUint32(16, 16, true);
     view.setUint16(20, 1, true);
     view.setUint16(22, numChannels, true);
     view.setUint32(24, sampleRate, true);
     view.setUint32(28, byteRate, true);
     view.setUint16(32, blockAlign, true);
     view.setUint16(34, bitsPerSample, true);
     writeString(view, 36, 'data');
     view.setUint32(40, dataSize, true);

     const pcmView = new Uint8Array(pcmData);
     const destView = new Uint8Array(buffer, 44);
     destView.set(pcmView);

     return buffer;
  };
  // ------------------------------------------------

  useEffect(() => {
    if (selectedVideo) {
      const url = URL.createObjectURL(selectedVideo);
      setVideoUrl(url);
      setDubbedAudioUrl(null);
      setTranslatedText('');
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedVideo]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Basic size check
      if (file.size > 20 * 1024 * 1024) {
        setError("Please upload a video smaller than 20MB for this demo.");
        return;
      }
      setSelectedVideo(file);
      setError(null);
    }
  };

  const processDubbing = async () => {
    if (!selectedVideo) return;
    
    setIsProcessing(true);
    setError(null);
    setIsPlaying(false);
    
    try {
      // Step 1: Translate
      setProgressStep(`Listening & Translating to ${targetLang}...`);
      const text = await translateVideoContent(selectedVideo, targetLang);
      setTranslatedText(text);

      // Step 2: Generate Speech
      setProgressStep(`Synthesizing ${targetLang} Voice...`);
      const voiceName = 'Puck'; 
      const rawAudioBuffer = await generateSpeech(text, voiceName);
      
      // FIX: Add WAV Header to raw PCM so browser can play it
      const wavBuffer = createWavHeader(rawAudioBuffer);
      const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' }); 
      
      const audioUrl = URL.createObjectURL(wavBlob);
      setDubbedAudioUrl(audioUrl);
      
      setProgressStep('Complete!');
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Dubbing failed. Please try a shorter video.");
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlayback = () => {
    if (!videoRef.current || !audioRef.current || !dubbedAudioUrl) return;

    if (isPlaying) {
      videoRef.current.pause();
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Sync start
      videoRef.current.currentTime = 0;
      audioRef.current.currentTime = 0;
      
      videoRef.current.muted = true; // Mute original
      
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
          playPromise.then(() => {
              audioRef.current?.play();
              setIsPlaying(true);
          }).catch(e => console.error("Play error", e));
      }
    }
  };

  const handleDownload = () => {
    if (dubbedAudioUrl) {
      const link = document.createElement('a');
      link.href = dubbedAudioUrl;
      link.download = `velto-dubbed-${targetLang}-${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle video ending to reset state
  const onVideoEnd = () => {
    setIsPlaying(false);
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">
      
      {/* LEFT: Controls */}
      <div className="w-full md:w-1/3 space-y-6 animate-slide-in-left">
        
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
           <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-brand-500" /> AI Video Dubbing
           </h2>
           <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
             Upload a video in any language, and Velto AI will translate and dub it into your chosen language.
           </p>

           {/* Upload */}
           <div className="mb-6">
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Source Video</label>
             <div 
               onClick={() => document.getElementById('video-upload')?.click()}
               className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group"
             >
                {selectedVideo ? (
                  <div className="text-center">
                    <Video className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{selectedVideo.name}</p>
                    <p className="text-xs text-slate-400">Click to change</p>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 group-hover:text-brand-500">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-bold">Upload MP4 / MOV</p>
                    <p className="text-xs opacity-70 mt-1">Max 20MB (Demo)</p>
                  </div>
                )}
                <input 
                  id="video-upload" 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleVideoUpload}
                />
             </div>
           </div>

           {/* Language Selector */}
           <div className="mb-6">
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                <Languages className="w-3.5 h-3.5" /> Target Language
             </label>
             <div className="grid grid-cols-2 gap-2">
                {TARGET_LANGUAGES.map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => setTargetLang(lang.id)}
                    className={`p-2 rounded-lg text-sm font-medium border transition-all text-left flex items-center gap-2
                      ${targetLang === lang.id 
                        ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500' 
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-300'
                      }
                    `}
                  >
                    <span>{lang.flag}</span> {lang.label}
                  </button>
                ))}
             </div>
           </div>

           {/* Action Button */}
           <button
             onClick={processDubbing}
             disabled={!selectedVideo || isProcessing}
             className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all
               ${!selectedVideo || isProcessing
                 ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-70' 
                 : 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/25 active:scale-95'
               }
             `}
           >
             {isProcessing ? (
               <>
                 <RefreshCw className="w-5 h-5 animate-spin" /> Processing...
               </>
             ) : (
               <>
                 <Video className="w-5 h-5" /> Dub Video
               </>
             )}
           </button>

           {error && (
             <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-200 text-xs rounded-lg flex items-center gap-2">
               <AlertCircle className="w-4 h-4 flex-shrink-0" />
               {error}
             </div>
           )}
        </div>

        {/* Status / Steps */}
        {isProcessing && (
           <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-4 rounded-xl animate-fade-in">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                 <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{progressStep}</p>
              </div>
           </div>
        )}

      </div>

      {/* RIGHT: Preview Area */}
      <div className="w-full md:w-2/3 flex flex-col h-full animate-slide-in-right">
         <div className="flex-1 bg-black rounded-2xl overflow-hidden relative group flex items-center justify-center border border-gray-800">
            
            {videoUrl ? (
               <>
                 <video 
                   ref={videoRef}
                   src={videoUrl}
                   className="max-w-full max-h-full"
                   playsInline
                   onEnded={onVideoEnd}
                 />
                 
                 {dubbedAudioUrl && (
                    <audio ref={audioRef} src={dubbedAudioUrl} />
                 )}

                 {/* Playback Controls Overlay */}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
                    {dubbedAudioUrl ? (
                       <button 
                         onClick={togglePlayback}
                         className="w-20 h-20 bg-brand-500 hover:bg-brand-400 text-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
                       >
                          {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                       </button>
                    ) : (
                       <div className="bg-black/60 px-4 py-2 rounded-full text-white text-sm backdrop-blur-md">
                          {isProcessing ? "Processing Dub..." : "Generate Dub to Play"}
                       </div>
                    )}
                 </div>

                 {/* Badges */}
                 <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur">Original</span>
                 </div>
                 {dubbedAudioUrl && (
                    <div className="absolute top-4 right-4 flex gap-2 animate-fade-in">
                      <span className="bg-brand-600 text-white text-xs px-3 py-1 rounded-full backdrop-blur font-bold shadow-lg flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Dubbed: {targetLang}
                      </span>
                    </div>
                 )}

                 {/* Download Button (Fixed) */}
                 {dubbedAudioUrl && (
                    <div className="absolute bottom-4 right-4 animate-fade-in-up">
                        <button 
                           onClick={handleDownload}
                           className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-full font-bold shadow-xl hover:bg-gray-100 transition-colors"
                        >
                           <Download className="w-4 h-4" /> Download Audio
                        </button>
                    </div>
                 )}

               </>
            ) : (
               <div className="text-center text-slate-500 p-8">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Upload a video to start</p>
               </div>
            )}
         </div>

         {/* Transcript Preview */}
         {translatedText && (
            <div className="mt-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 h-40 overflow-y-auto custom-scrollbar animate-fade-in-up">
               <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Translated Script ({targetLang})</h3>
               <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
                  "{translatedText}"
               </p>
            </div>
         )}
      </div>
    </div>
  );
};
