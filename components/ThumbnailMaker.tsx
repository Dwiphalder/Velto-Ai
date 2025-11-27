
import React, { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { EditModal } from './EditModal';
import { generateThumbnail } from '../services/geminiService';
import { AspectRatio, GeneratedImage } from '../types';
import { Wand2, Download, RefreshCw, LayoutTemplate, Sparkles, Image as ImageIcon, Pencil, Type, Move, Palette, Save, Loader2 } from 'lucide-react';

const STYLES = [
  { 
    id: 'Cinematic', 
    label: 'Cinematic', 
    color: 'from-purple-500 to-indigo-600',
    prompt: 'Hyper-realistic, movie poster quality, dramatic lighting, 8k resolution, cinematic color grading, depth of field.'
  },
  { 
    id: 'Gaming', 
    label: 'Gaming', 
    color: 'from-green-400 to-emerald-600',
    prompt: 'High energy, vibrant neon colors, esports style, intense action, glowing effects, bold contrast, futuristic elements.'
  },
  { 
    id: 'Viral', 
    label: 'Viral', 
    color: 'from-red-500 to-orange-500',
    prompt: 'Shocked expression style, bright red arrows and circles, high saturation, clickbait aesthetic, extreme emotion, high contrast.'
  },
  { 
    id: 'Minimalist', 
    label: 'Minimalist', 
    color: 'from-slate-400 to-slate-600',
    prompt: 'Clean lines, lots of negative space, modern typography, soft lighting, professional, sleek, apple advertisement style.'
  },
  { 
    id: 'Tech', 
    label: 'Tech', 
    color: 'from-blue-400 to-cyan-500',
    prompt: 'Futuristic, sleek gadgets, blue and white color scheme, circuit board patterns, clean modern look, 3D render style.'
  },
  { 
    id: 'Reaction', 
    label: 'Reaction', 
    color: 'from-yellow-400 to-amber-600',
    prompt: 'Extreme facial expression close-up, emotional, vibrant background, youtube reaction video style, wide angle lens.'
  },
];

const FONTS = [
  { id: 'sans', name: 'Inter (Clean)', css: 'font-sans' },
  { id: 'bebas', name: 'Bebas Neue (Bold)', css: 'font-bebas' },
  { id: 'anton', name: 'Anton (Impact)', css: 'font-anton' },
  { id: 'lobster', name: 'Lobster (Fancy)', css: 'font-lobster' },
  { id: 'oswald', name: 'Oswald (Modern)', css: 'font-oswald' },
  { id: 'playfair', name: 'Playfair (Elegant)', css: 'font-playfair' },
  { id: 'mono', name: 'Roboto Mono (Code)', css: 'font-mono' },
];

const TEXT_POSITIONS = [
  { id: 'Top Left', label: 'TL' },
  { id: 'Top Center', label: 'TC' },
  { id: 'Top Right', label: 'TR' },
  { id: 'Center Left', label: 'CL' },
  { id: 'Center', label: 'C' },
  { id: 'Center Right', label: 'CR' },
  { id: 'Bottom Left', label: 'BL' },
  { id: 'Bottom Center', label: 'BC' },
  { id: 'Bottom Right', label: 'BR' },
];

export const ThumbnailMaker: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  
  // State variables
  const [selectedStyle, setSelectedStyle] = useState<string>('Cinematic');
  const [overlayText, setOverlayText] = useState('');
  const [textPosition, setTextPosition] = useState('Center');
  const [selectedFont, setSelectedFont] = useState(FONTS[1].id); // Default to Bebas for thumbnails
  
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.LANDSCAPE);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  
  // Edit Mode State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Helper for Voice Feedback
  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    // Cancel any ongoing speech to prevent overlap
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1; 
    utterance.pitch = 1;
    
    // Try to pick a pleasant English voice
    const voices = synth.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google US English') || 
      v.name.includes('Samantha') || 
      v.lang.startsWith('en')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    synth.speak(utterance);
  };

  const handleGenerate = async () => {
    // 1. Play Start Sound
    speak("Your thumbnail is generating");

    setLoading(true);
    setError(null);
    setSaveStatus(null);
    
    try {
      const styleObj = STYLES.find(s => s.id === selectedStyle);
      const styleDescription = styleObj ? styleObj.prompt : selectedStyle;
      const fontObj = FONTS.find(f => f.id === selectedFont);

      // Construct a detailed prompt from all inputs
      const fullPrompt = `
        GENERATE A YOUTUBE THUMBNAIL IMAGE.
        
        VISUAL STYLE: ${styleDescription}
        ASPECT RATIO: ${aspectRatio}
        
        ${overlayText ? `TEXT OVERLAY: The image MUST include the text "${overlayText}" placed in the ${textPosition}. Font style: ${fontObj?.name || 'Bold Sans-Serif'}. The text should be integrated into the design.` : ''}
        
        SCENE DESCRIPTION: ${prompt || "A captivating, high-quality scene matching the visual style."}
        
        ${selectedImage ? "REFERENCE: Use the uploaded image as the main subject or composition guide." : ""}
        
        NO CHAT. NO TEXT EXPLANATION. JUST THE IMAGE.
      `.trim();

      const result = await generateThumbnail(selectedImage, fullPrompt, aspectRatio);
      setGeneratedImage(result);

      // 2. Play Completion Sound
      speak("Thumbnail generation is complete");

    } catch (err: any) {
      setError(err.message || "Something went wrong during generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfirm = async (instruction: string, maskDataUrl: string | null) => {
    if (!generatedImage) return;

    setLoading(true);
    setError(null);
    setIsEditModalOpen(false); 

    try {
      const result = await generateThumbnail(generatedImage.url, instruction, aspectRatio, maskDataUrl);
      setGeneratedImage(result);
    } catch (err: any) {
      setError(err.message || "Failed to edit image.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage.url;
      link.download = `velto-ai-thumbnail-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const saveToGallery = () => {
    if (!generatedImage) return;
    try {
      const saved = localStorage.getItem('velto_saved_images');
      const images = saved ? JSON.parse(saved) : [];
      images.unshift({
        url: generatedImage.url,
        date: new Date().toISOString(),
        type: 'Thumbnail'
      });
      // Limit to 50 items to prevent LS overflow
      if (images.length > 50) images.pop();
      
      localStorage.setItem('velto_saved_images', JSON.stringify(images));
      setSaveStatus("Saved to Settings > Saved Images");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      setError("Failed to save. Storage might be full.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      
      {generatedImage && (
        <EditModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          imageSrc={generatedImage.url}
          onConfirm={handleEditConfirm}
          isProcessing={loading}
        />
      )}

      {/* LEFT COLUMN: Controls (Slide In Parallel Left) */}
      <div className="lg:col-span-4 xl:col-span-4 space-y-6 animate-slide-in-left opacity-0" style={{ animationFillMode: 'forwards' }}>
        
        {/* Input Section */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5" /> Source Image
            {selectedImage && (
              <button 
                onClick={() => setSelectedImage(null)}
                className="ml-auto text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 normal-case active:scale-95 transition-transform"
              >
                Clear
              </button>
            )}
          </h2>
          <ImageUploader 
            selectedImage={selectedImage} 
            onImageSelect={setSelectedImage} 
            aspectRatio={aspectRatio}
          />
        </div>

        {/* Ratio Section */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <LayoutTemplate className="w-3.5 h-3.5" /> Aspect Ratio
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "16:9", value: AspectRatio.LANDSCAPE, desc: "YouTube" },
              { label: "1:1", value: AspectRatio.SQUARE, desc: "Instagram" },
              { label: "9:16", value: AspectRatio.PORTRAIT, desc: "Shorts" },
            ].map((ratio) => (
              <button
                key={ratio.value}
                onClick={() => setAspectRatio(ratio.value)}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-lg border gesture
                  ${aspectRatio === ratio.value 
                    ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-300 shadow-sm' 
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }
                `}
              >
                <span className="font-bold text-sm">{ratio.label}</span>
                <span className="text-[10px] opacity-60">{ratio.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Style Categories */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-3.5 h-3.5" /> Visual Style
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`
                  relative overflow-hidden rounded-lg p-2 h-16 flex items-center justify-center text-xs font-bold gesture
                  border 
                  ${selectedStyle === style.id 
                    ? 'border-white text-white shadow-lg ring-2 ring-brand-500/30' 
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-brand-300 dark:hover:border-slate-500'
                  }
                `}
              >
                {selectedStyle === style.id && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${style.color} animate-fade-in`} />
                )}
                <span className="relative z-10 text-center">{style.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Overlay Config */}
        <div className="p-4 bg-white dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/50 rounded-xl space-y-4 shadow-sm dark:shadow-none hover:border-brand-500/30 transition-colors">
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Type className="w-3.5 h-3.5" /> Text Overlay
            </h2>
            <input 
              type="text" 
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="e.g. GAME OVER, VLOG #1"
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white transition-all"
            />
          </div>

          {overlayText && (
            <div className="animate-fade-in-up space-y-4">
              <div className="space-y-2">
                 <label className="text-xs font-medium text-slate-500">Font Style</label>
                 <select 
                   value={selectedFont} 
                   onChange={(e) => setSelectedFont(e.target.value)}
                   className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-2 py-2 text-sm focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-white"
                 >
                   {FONTS.map(f => (
                     <option key={f.id} value={f.id}>{f.name}</option>
                   ))}
                 </select>
              </div>

              <div className="space-y-2">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Move className="w-3.5 h-3.5" /> Text Position
                </h2>
                <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
                  {TEXT_POSITIONS.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setTextPosition(pos.id)}
                      title={pos.id}
                      className={`
                        w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center gesture
                        ${textPosition === pos.id 
                          ? 'bg-brand-500 text-white shadow-md' 
                          : 'bg-gray-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }
                      `}
                    >
                      {pos.label === 'C' ? <div className="w-1.5 h-1.5 rounded-full bg-current" /> : pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Prompt */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Wand2 className="w-3.5 h-3.5" /> Additional Details
          </h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe lighting, mood, specific objects..."
            className="w-full h-24 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 resize-none transition-all focus:h-28"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-200 text-xs animate-pop">
            {error}
          </div>
        )}
        
        {saveStatus && (
           <div className="p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-200 text-xs text-center animate-fade-in">
             {saveStatus}
           </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`
            w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all gesture
            ${loading 
              ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-50' 
              : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 shadow-brand-500/25'
            }
          `}
        >
          {loading ? (
            <span>Processing...</span>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Generate Thumbnail
            </>
          )}
        </button>
      </div>

      {/* RIGHT COLUMN: Output (Slide In Parallel Right) */}
      <div className="lg:col-span-8 xl:col-span-8 flex flex-col h-full min-h-[500px] animate-slide-in-right opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '150ms' }}>
        <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-2 relative group overflow-hidden flex flex-col shadow-sm dark:shadow-none transition-colors duration-300">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500/20 to-transparent z-10"></div>

          {/* Local Loading State Overlay */}
          {loading && (
             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl transition-all duration-500 animate-fade-in">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-brand-200 dark:border-brand-900 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-brand-500 animate-pulse" />
                </div>
                <p className="mt-6 text-brand-600 dark:text-brand-400 font-bold animate-pulse text-lg tracking-tight">Designing your Thumbnail...</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">You can continue adjusting settings while we work.</p>
             </div>
          )}

          {generatedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-gray-100 dark:bg-black/40 rounded-xl overflow-hidden animate-zoom-in">
               {/* Background blur effect */}
               <img 
                  src={generatedImage.url} 
                  alt="Background Blur"
                  className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30"
               />
               
               {/* Main Image */}
               <img 
                src={generatedImage.url} 
                alt="Generated Thumbnail" 
                className="relative max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              />
              
              <div className="absolute bottom-6 right-6 flex flex-wrap gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 justify-end p-4">
                 <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-4 py-3 bg-brand-600/90 text-white font-semibold rounded-full hover:bg-brand-500 shadow-lg backdrop-blur border border-brand-400/20 flex items-center gap-2 gesture"
                  title="Edit this image"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button 
                  onClick={saveToGallery}
                  className="px-4 py-3 bg-white/90 text-slate-800 font-semibold rounded-full hover:bg-white shadow-lg backdrop-blur flex items-center gap-2 gesture"
                  title="Save to App Gallery"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
                <button 
                  onClick={downloadImage}
                  className="px-6 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 shadow-lg shadow-black/10 flex items-center gap-2 gesture"
                >
                  <Download className="w-5 h-5" /> Download
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-600 p-12 text-center">
              <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-800/50 flex items-center justify-center mb-6 ring-1 ring-gray-200 dark:ring-slate-700 group-hover:scale-110 transition-transform duration-500 animate-pulse-slow">
                <Sparkles className="w-10 h-10 opacity-20 group-hover:opacity-40 transition-opacity" />
              </div>
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-500 mb-2">Ready to Create</h3>
              <p className="max-w-md text-slate-500 dark:text-slate-600 mb-8">
                Select a style, add your text, and upload an image to generate professional thumbnails using Velto AI.
              </p>
              
              <div className="grid grid-cols-2 gap-4 max-w-sm w-full opacity-50">
                <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-lg text-xs border border-gray-200 dark:border-slate-700">
                  <div className="font-bold text-slate-500 dark:text-slate-400 mb-1">Style</div>
                  {selectedStyle}
                </div>
                <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-lg text-xs border border-gray-200 dark:border-slate-700">
                  <div className="font-bold text-slate-500 dark:text-slate-400 mb-1">Ratio</div>
                  {aspectRatio}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-between items-center text-xs text-slate-500 dark:text-slate-600 px-2 animate-fade-in delay-200">
          <p>Generative AI may produce inaccurate results.</p>
          <p>{aspectRatio} Aspect Ratio</p>
        </div>
      </div>
    </div>
  );
};
