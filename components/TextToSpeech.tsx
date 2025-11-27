
import React, { useState, useRef, useEffect } from 'react';
import { generateSpeech } from '../services/geminiService';
import { Play, Square, Download, Mic2, Languages, Volume2, Settings2, Sparkles, AudioWaveform, User, Star, Globe, Heart } from 'lucide-react';

interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  style: string;
  base?: string; // Maps to Gemini API voice name
  trait?: string; // Additional prompt instruction for style
}

const VOICES: VoiceOption[] = [
  // Base Gemini Voices
  { id: 'Puck', name: 'Puck', gender: 'Male', style: 'Deep, Resonant', base: 'Puck' },
  { id: 'Charon', name: 'Charon', gender: 'Male', style: 'Firm, Authoritative', base: 'Charon' },
  { id: 'Kore', name: 'Kore', gender: 'Female', style: 'Warm, Natural', base: 'Kore' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', style: 'Energetic, Bright', base: 'Fenrir' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female', style: 'Soft, Calm', base: 'Zephyr' },
  
  // Virtual Clones (Presets with personality instructions)
  { id: 'clone_movie', name: 'Movie Trailer', gender: 'Male', style: 'Epic, Deep Bass', base: 'Puck', trait: 'Speak in a deep, epic, dramatic movie trailer voice.' },
  { id: 'clone_news', name: 'Prime News', gender: 'Female', style: 'Professional, Fast', base: 'Kore', trait: 'Speak like a professional fast-paced news anchor.' },
  { id: 'clone_poet', name: 'The Poet', gender: 'Male', style: 'Soft, Lyrical', base: 'Charon', trait: 'Speak in a soft, slow, lyrical, and poetic manner.' },
  { id: 'clone_gamer', name: 'Pro Gamer', gender: 'Male', style: 'Hype, High Energy', base: 'Fenrir', trait: 'Speak with high energy, excitement, and modern slang vibe.' },
  { id: 'clone_grandma', name: 'Storyteller Gran', gender: 'Female', style: 'Old, Warm', base: 'Zephyr', trait: 'Speak in a shaky, warm, elderly storytelling voice.' },
  { id: 'clone_villain', name: 'Super Villain', gender: 'Male', style: 'Raspy, Menacing', base: 'Charon', trait: 'Speak in a low, raspy, menacing, and evil whisper.' },
];

const STYLES = [
  { id: 'normal', name: 'Normal Conversation', prefix: '' },
  { id: 'motivational', name: 'Motivational & Inspiring', prefix: 'Speak in a highly motivational, powerful, uplifting, and inspiring tone: ' },
  { id: 'crying', name: 'Crying & Sad', prefix: 'Speak in a very sad, crying, trembling, and heartbroken voice: ' },
  { id: 'angry', name: 'Angry & Aggressive', prefix: 'Speak in a very angry, aggressive, shouting, and intense tone: ' },
  { id: 'happy', name: 'Happy & Joyful', prefix: 'Speak in a very happy, joyful, smiling, and cheerful voice: ' },
  { id: 'excited', name: 'Excited & Energetic', prefix: 'Speak in a super excited, high-energy, and enthusiastic tone: ' },
  { id: 'fearful', name: 'Fearful & Scared', prefix: 'Speak in a fearful, terrified, and nervous tone: ' },
  { id: 'sarcastic', name: 'Sarcastic & Ironic', prefix: 'Speak in a heavy sarcastic, sassy, and ironic tone: ' },
  { id: 'romantic', name: 'Romantic & Flirty', prefix: 'Speak in a romantic, soft, charming, and seductive tone: ' },
  { id: 'whisper', name: 'Soft Whisper', prefix: 'Whisper softly and gently: ' },
  { id: 'professional', name: 'Professional Business', prefix: 'Speak in a professional, confident, corporate business tone: ' },
  { id: 'news', name: 'News Anchor', prefix: 'Read like a professional news anchor: ' },
];

const LANGUAGES = [
    'English (US)', 'English (UK)', 
    'Bengali', 'Hindi', 'Tamil', 'Telugu', 'Marathi', 'Urdu',
    'Spanish', 'French', 'German', 'Italian', 'Japanese', 'Korean', 'Portuguese', 'Chinese (Mandarin)', 'Arabic', 'Russian'
];

export const TextToSpeech: React.FC = () => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[2].id);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].id);
  const [selectedLang, setSelectedLang] = useState('English (US)');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [customVoices, setCustomVoices] = useState<any[]>([]);

  useEffect(() => {
      // Load cloned voices
      const saved = localStorage.getItem('velto_cloned_voices');
      if (saved) {
          try {
              setCustomVoices(JSON.parse(saved));
          } catch(e) {}
      }
  }, []);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    setAudioUrl(null);

    try {
      const style = STYLES.find(s => s.id === selectedStyle);
      const stylePrefix = style ? style.prefix : '';
      
      // Determine effective language instruction
      const langInstruction = selectedLang !== 'English (US)' ? `(Speak in ${selectedLang}) ` : '';
      
      // Resolve Voice Settings
      let apiVoiceName = 'Kore'; // Default fallback
      let personalityTrait = '';

      // Check Preset Voices
      const presetVoice = VOICES.find(v => v.id === selectedVoice);
      if (presetVoice) {
          apiVoiceName = presetVoice.base || presetVoice.id;
          personalityTrait = presetVoice.trait || '';
      } 
      // Check Custom User Clones
      else {
          const customVoice = customVoices.find(v => v.id === selectedVoice);
          if (customVoice) {
              // For now, clones use a base voice but we prompt heavily for the persona
              apiVoiceName = 'Kore'; 
              personalityTrait = `Imitate the voice persona: ${customVoice.name}. Description: ${customVoice.description}.`;
          }
      }

      // Combine Prompt: Personality + Style + Language + Text
      const finalPrompt = `${personalityTrait} ${stylePrefix} ${langInstruction} ${text}`.trim();
      
      const buffer = await generateSpeech(finalPrompt, apiVoiceName);
      createAudioBlob(buffer);

    } catch (err) {
      console.error(err);
      alert("Failed to generate speech. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const createAudioBlob = (buffer: ArrayBuffer) => {
    const blob = new Blob([buffer], { type: 'audio/pcm' }); 
    // Inject WAV header for playback
    const wavBuffer = createWavHeader(buffer);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(wavBlob);
    setAudioUrl(url);
  };

  const createWavHeader = (pcmData: ArrayBuffer) => {
     const numChannels = 1;
     const sampleRate = 24000;
     const bitsPerSample = 16;
     const blockAlign = numChannels * bitsPerSample / 8;
     const byteRate = sampleRate * blockAlign;
     const dataSize = pcmData.byteLength;
     
     const buffer = new ArrayBuffer(44 + dataSize);
     const view = new DataView(buffer);
     
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

  const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
      }
  };

  const togglePlay = () => {
    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      
      {/* Controls - Left */}
      <div className="lg:col-span-4 space-y-6 animate-slide-in-left">
         <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-brand-500" /> Voice Settings
            </h3>
            
            <div className="space-y-4">
               <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                     <Globe className="w-3 h-3" /> Language
                   </label>
                   <div className="relative">
                       <select 
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-sm appearance-none outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200"
                       >
                           {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                       </select>
                       <Languages className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                   </div>
               </div>

               <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Select Model / Voice</label>
                   <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                       
                       {/* Custom Cloned Voices */}
                       {customVoices.length > 0 && (
                           <>
                           <div className="text-xs font-bold text-brand-500 pt-2 pb-1 uppercase tracking-wider">My Cloned Voices</div>
                           {customVoices.map(voice => (
                               <button
                                 key={voice.id}
                                 onClick={() => setSelectedVoice(voice.id)}
                                 className={`w-full flex items-center justify-between p-3 rounded-lg border border-purple-200 dark:border-purple-800 text-left transition-all gesture ${selectedVoice === voice.id ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 ring-1 ring-purple-500' : 'bg-white dark:bg-slate-800 hover:border-purple-300'}`}
                               >
                                   <div>
                                       <div className="font-bold text-sm text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                           <User className="w-3 h-3" /> {voice.name}
                                       </div>
                                       <div className="text-xs text-slate-500">Cloned • {new Date(voice.date).toLocaleDateString()}</div>
                                   </div>
                                   {selectedVoice === voice.id && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                               </button>
                           ))}
                           <div className="my-2 border-t border-dashed border-gray-200 dark:border-slate-700"></div>
                           </>
                       )}

                       {/* Standard Voices */}
                       {VOICES.map(voice => (
                           <button
                             key={voice.id}
                             onClick={() => setSelectedVoice(voice.id)}
                             className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all gesture 
                             ${selectedVoice === voice.id 
                               ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 ring-1 ring-brand-500' 
                               : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                             }`}
                           >
                               <div>
                                   <div className="font-bold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                     {voice.trait ? <Star className="w-3 h-3 text-amber-500 fill-current" /> : null}
                                     {voice.name}
                                   </div>
                                   <div className="text-xs text-slate-500 dark:text-slate-400">{voice.gender} • {voice.style}</div>
                               </div>
                               {selectedVoice === voice.id && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                           </button>
                       ))}
                   </div>
               </div>

               <div>
                   <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                      <Heart className="w-3 h-3" /> Emotion & Feeling
                   </label>
                   <select 
                     value={selectedStyle}
                     onChange={(e) => setSelectedStyle(e.target.value)}
                     className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200"
                   >
                       {STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
               </div>
            </div>
         </div>
      </div>

      {/* Editor - Right */}
      <div className="lg:col-span-8 flex flex-col h-full animate-slide-in-right">
          <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
              
              <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <Mic2 className="w-6 h-6 text-brand-500" /> Text to Speech Studio
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-full">{text.length} chars</span>
                      <span>Unlimited (Pro)</span>
                  </div>
              </div>

              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type something amazing here..."
                className="flex-1 w-full bg-gray-50 dark:bg-slate-800/50 border-none rounded-xl p-6 text-lg text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:ring-0 resize-none leading-relaxed"
                spellCheck={false}
              />

              {/* Audio Player Bar */}
              <div className="mt-6 p-4 bg-gray-100 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-slate-800 flex items-center gap-4">
                  <button 
                    onClick={togglePlay}
                    disabled={!audioUrl}
                    className="w-12 h-12 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                  >
                      {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>
                  
                  <div className="flex-1 h-12 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
                      {audioUrl ? (
                          <div className="flex items-center gap-1 h-full w-full justify-center px-4">
                              {/* Fake waveform */}
                              {Array.from({ length: 40 }).map((_, i) => (
                                  <div 
                                    key={i} 
                                    className={`w-1 bg-brand-500 rounded-full transition-all duration-75 ${isPlaying ? 'animate-pulse' : ''}`}
                                    style={{ 
                                        height: `${Math.random() * 80 + 20}%`,
                                        animationDelay: `${i * 0.05}s`
                                    }}
                                  />
                              ))}
                          </div>
                      ) : (
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-2">
                              <AudioWaveform className="w-4 h-4" /> Generate audio to see waveform
                          </span>
                      )}
                  </div>

                  <a 
                    href={audioUrl || '#'} 
                    download={`velto-speech-${Date.now()}.wav`}
                    className={`p-3 rounded-lg border transition-all ${audioUrl ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500' : 'opacity-50 cursor-not-allowed border-transparent'}`}
                  >
                      <Download className="w-5 h-5" />
                  </a>
              </div>

              <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleGenerate}
                    disabled={isLoading || !text.trim()}
                    className="px-8 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold rounded-xl shadow-lg hover:shadow-brand-500/25 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                      {isLoading ? (
                          <>Generating...</>
                      ) : (
                          <>
                              <Sparkles className="w-5 h-5" /> Generate Speech
                          </>
                      )}
                  </button>
              </div>

              {audioUrl && (
                  <audio 
                    ref={audioRef} 
                    src={audioUrl} 
                    onEnded={() => setIsPlaying(false)} 
                    className="hidden"
                  />
              )}

          </div>
      </div>
    </div>
  );
};
