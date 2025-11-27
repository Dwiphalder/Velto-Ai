
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, Play, Square, CheckCircle, Save, X, Activity, User, Info, FileAudio } from 'lucide-react';

export const VoiceCloning: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [savedClones, setSavedClones] = useState<any[]>(() => {
      const saved = localStorage.getItem('velto_cloned_voices');
      return saved ? JSON.parse(saved) : [];
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Fixed Recording Logic
  const startRecording = async () => {
    try {
      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert("Your browser does not support audio recording.");
          return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Microphone access denied or not available. Please check browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateClone = async () => {
    if (!audioBlob || !cloneName) return;
    setIsAnalyzing(true);

    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    const newClone = {
      id: `clone-${Date.now()}`,
      name: cloneName,
      date: new Date().toISOString(),
      description: 'Custom AI Voice Model based on user recording.',
    };

    const updated = [newClone, ...savedClones];
    setSavedClones(updated);
    
    // Save to localStorage so TextToSpeech component can access it
    localStorage.setItem('velto_cloned_voices', JSON.stringify(updated));
    
    setIsAnalyzing(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setCloneName('');
  };

  const deleteClone = (id: string) => {
      const updated = savedClones.filter(c => c.id !== id);
      setSavedClones(updated);
      localStorage.setItem('velto_cloned_voices', JSON.stringify(updated));
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* Create Section */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
           {/* Background Decoration */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

           <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2 relative z-10">
               <User className="w-6 h-6 text-purple-500" /> Voice Cloning App
           </h2>
           <p className="text-slate-500 dark:text-slate-400 mb-8 relative z-10">
               Upload or record a 30s sample to create a digital twin of your voice.
           </p>

           {/* Recorder / Uploader */}
           {!audioUrl ? (
               <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={isRecording ? stopRecording : startRecording}
                     className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${isRecording ? 'border-red-500 bg-red-50 dark:bg-red-900/10 animate-pulse' : 'border-gray-300 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-slate-800'}`}
                   >
                       <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-slate-500'}`}>
                           {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-8 h-8" />}
                       </div>
                       <span className="font-bold text-slate-700 dark:text-slate-300">
                           {isRecording ? 'Stop Recording' : 'Record Voice'}
                       </span>
                   </button>

                   <div className="relative p-8 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-slate-800 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer">
                       <input type="file" accept="audio/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                       <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                           <Upload className="w-8 h-8" />
                       </div>
                       <span className="font-bold text-slate-700 dark:text-slate-300">Upload Audio</span>
                   </div>
               </div>
           ) : (
               <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-6 text-center space-y-4 animate-fade-in">
                   <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mx-auto">
                       <FileAudio className="w-8 h-8" />
                   </div>
                   <div>
                       <h3 className="font-bold text-slate-800 dark:text-white">Sample Ready</h3>
                       <p className="text-xs text-slate-500">Duration: ~30s • Quality: High</p>
                   </div>
                   <audio src={audioUrl} controls className="w-full h-8" />
                   <button 
                     onClick={() => { setAudioUrl(null); setAudioBlob(null); }}
                     className="text-xs text-red-500 hover:underline"
                   >
                       Remove & Try Again
                   </button>
               </div>
           )}

           {/* Name & Create */}
           <div className="mt-8 space-y-4">
               <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Voice Name</label>
                   <input 
                     type="text" 
                     value={cloneName}
                     onChange={(e) => setCloneName(e.target.value)}
                     placeholder="e.g. My Narrator Voice"
                     className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 dark:text-white"
                   />
               </div>
               
               <button
                 onClick={handleCreateClone}
                 disabled={!audioBlob || !cloneName.trim() || isAnalyzing}
                 className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                   {isAnalyzing ? (
                       <>
                           <Activity className="w-5 h-5 animate-spin" /> Analyzing & Cloning...
                       </>
                   ) : (
                       <>
                           <Save className="w-5 h-5" /> Create Voice Clone
                       </>
                   )}
               </button>
           </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex gap-3 text-sm text-blue-800 dark:text-blue-300">
            <Info className="w-5 h-5 flex-shrink-0" />
            <p>
                Cloning takes about 10-30 seconds. Once created, your voice will appear in the <strong>Text to Speech</strong> module under "My Cloned Voices".
            </p>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-6">
          <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Your Clones</h3>
              <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-2 py-1 rounded-md">
                  {savedClones.length} / 5 Slots
              </span>
          </div>

          <div className="space-y-3">
              {savedClones.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl text-slate-400">
                      <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No voice clones yet.</p>
                  </div>
              ) : (
                  savedClones.map(clone => (
                      <div key={clone.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in-up">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-md">
                                  <User className="w-5 h-5" />
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 dark:text-white">{clone.name}</h4>
                                  <p className="text-xs text-slate-500">Created {new Date(clone.date).toLocaleDateString()}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-green-500 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                  <CheckCircle className="w-3 h-3" /> Ready
                              </span>
                              <button 
                                onClick={() => deleteClone(clone.id)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                  <X className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
};
