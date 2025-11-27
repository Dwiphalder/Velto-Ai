import React, { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { ProductEditModal } from './ProductEditModal';
import { generateThumbnail } from '../services/geminiService';
import { AspectRatio, GeneratedImage } from '../types';
import { Sparkles, Download, Box, Layers, Eye, User, Leaf, Crown, Zap, Utensils, Car, Armchair, CopyPlus, LayoutTemplate, Camera, RefreshCw, Pencil, Grid, Save, Loader2 } from 'lucide-react';

const PRODUCT_MODES = [
  { 
    id: 'advertisement', 
    label: 'Advertisement', 
    icon: <Sparkles className="w-4 h-4" />,
    prompt: 'High-end commercial advertisement style, dramatic cinematic lighting, dynamic composition, persuasive visual storytelling, particle effects or sleek elements.' 
  },
  { 
    id: 'on-model', 
    label: 'On Model', 
    icon: <User className="w-4 h-4" />,
    prompt: 'Product worn or held by a professional fashion model, realistic skin texture, high fashion photography, focus on how the product fits or is used.' 
  },
  { 
    id: '3d-render', 
    label: '3D Render', 
    icon: <Box className="w-4 h-4" />,
    prompt: 'Hyper-realistic 3D render style, perfect smooth textures, ray-traced lighting, physically based rendering look, unreal engine 5 style, floating object.' 
  },
  { 
    id: 'studio', 
    label: 'Studio', 
    icon: <Layers className="w-4 h-4" />,
    prompt: 'Clean solid color or gradient background, soft professional softbox lighting, sharp focus, e-commerce minimal look, high detail.' 
  },
  { 
    id: 'food', 
    label: 'Food', 
    icon: <Utensils className="w-4 h-4" />,
    prompt: 'Michelin star food photography styling, steam rising, fresh ingredients background, macro depth of field, appetizing warm lighting.' 
  },
  { 
    id: 'automotive', 
    label: 'Automotive', 
    icon: <Car className="w-4 h-4" />,
    prompt: 'Professional automotive photography, sleek reflections, motion blur background, dramatic low key lighting, asphalt texture, speed.' 
  },
  { 
    id: 'interior', 
    label: 'Interior', 
    icon: <Armchair className="w-4 h-4" />,
    prompt: 'Interior design magazine style, modern furniture context, soft natural window light, architectural composition, cozy atmosphere.' 
  },
  { 
    id: 'lifestyle', 
    label: 'Lifestyle', 
    icon: <Eye className="w-4 h-4" />,
    prompt: 'Product placed in a realistic everyday environment, shallow depth of field (bokeh), natural sunlight, in-use context, organic feel.' 
  },
  { 
    id: 'nature', 
    label: 'Nature', 
    icon: <Leaf className="w-4 h-4" />,
    prompt: 'Product placed in a beautiful natural setting, sunlight filtering through leaves, organic textures like wood, stone, water, moss, fresh atmosphere.' 
  },
  { 
    id: 'luxury', 
    label: 'Luxury', 
    icon: <Crown className="w-4 h-4" />,
    prompt: 'High-end luxury aesthetic, marble surfaces, gold or silver accents, velvet textures, dramatic elegant lighting, expensive atmosphere.' 
  },
  { 
    id: 'neon', 
    label: 'Neon / Cyber', 
    icon: <Zap className="w-4 h-4" />,
    prompt: 'Cyberpunk aesthetic, neon lights (blue/pink), dark futuristic city background, glowing reflections, tech-heavy vibe.' 
  },
];

const VIEWPOINTS = [
  { id: 'Front View', label: 'Front View' },
  { id: 'Top Down Flatlay', label: 'Top Down' },
  { id: 'Isometric 45-degree', label: 'Isometric' },
  { id: 'Side Profile', label: 'Side Profile' },
  { id: 'Low Angle', label: 'Low Angle' },
  { id: 'Close Up Macro', label: 'Macro Detail' },
];

const MODEL_TYPES = [
    { id: 'female-casual', label: 'Female (Casual)' },
    { id: 'female-pro', label: 'Female (Pro)' },
    { id: 'male-casual', label: 'Male (Casual)' },
    { id: 'male-pro', label: 'Male (Pro)' },
    { id: 'fitness-female', label: 'Fitness (F)' },
    { id: 'fitness-male', label: 'Fitness (M)' },
    { id: 'hands', label: 'Hands Only' },
    { id: 'mannequin', label: 'Mannequin' }
];

const RATIOS = [
  { label: "1:1", value: AspectRatio.SQUARE, desc: "Square" },
  { label: "9:16", value: AspectRatio.PORTRAIT, desc: "Story" },
  { label: "16:9", value: AspectRatio.LANDSCAPE, desc: "Ad" },
  { label: "4:3", value: AspectRatio.STANDARD, desc: "Std" },
];

export const ProductGenerator: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  
  // Settings
  const [selectedMode, setSelectedMode] = useState(PRODUCT_MODES[0].id);
  const [selectedModelType, setSelectedModelType] = useState(MODEL_TYPES[0].id);
  const [selectedView, setSelectedView] = useState('Front View'); 
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [prompt, setPrompt] = useState('');
  
  // Batch Settings
  const [imageCount, setImageCount] = useState<number>(1);
  
  // Output
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const speak = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    synth.speak(u);
  };

  const handleGenerate = async () => {
    // START SPEECH
    speak("Your product image is generating");
    
    setLoading(true);
    setError(null);
    setSaveStatus(null);
    setGeneratedImages([]); // Clear previous batch
    setSelectedPreviewIndex(0);

    try {
      const modeObj = PRODUCT_MODES.find(m => m.id === selectedMode);
      const modePrompt = modeObj?.prompt || "";
      
      const modelInstruction = selectedMode === 'on-model' 
        ? `MODEL TYPE: ${selectedModelType.replace('-', ' ')}.` 
        : '';

      const basePrompt = `
        PROFESSIONAL PRODUCT PHOTOGRAPHY.
        STYLE: ${modePrompt}
        CAMERA ANGLE: ${selectedView}
        ${modelInstruction}
        SCENE DETAILS: ${prompt}
        
        Instruction: Seamlessly integrate the product into the scene. Ensure perfect lighting match, perspective alignment, and high-quality rendering.
      `.trim();
      
      // Execute concurrently but update state progressively
      const tasks = Array.from({ length: imageCount }).map(async (_, i) => {
         try {
             const variationPrompt = `${basePrompt} (Variation ${i + 1}: slightly different composition)`;
             const result = await generateThumbnail(selectedImage, variationPrompt, aspectRatio);
             setGeneratedImages(prev => [...prev, result]);
         } catch (e: any) {
             console.error(`Image ${i+1} failed:`, e);
             // We continue without adding it to the list, or we could add an error placeholder if desired
         }
      });

      await Promise.allSettled(tasks);
      
      // END SPEECH
      speak("Your image is ready");

    } catch (err: any) {
      setError(err.message || "Failed to generate product images.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfirm = async (angle: string) => {
    if (generatedImages.length === 0) return;
    
    const currentImg = generatedImages[selectedPreviewIndex];
    setLoading(true);
    setIsEditModalOpen(false);

    try {
       const editPrompt = `Change camera angle to ${angle}. Maintain product consistency.`;
       const newImage = await generateThumbnail(currentImg.url, editPrompt, aspectRatio);
       
       const newImages = [...generatedImages];
       newImages[selectedPreviewIndex] = newImage;
       setGeneratedImages(newImages);
       setSelectedView(angle); 
    } catch (err: any) {
       setError(err.message);
    } finally {
       setLoading(false);
    }
  };

  const downloadImage = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.url;
    link.download = `velto-product-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveToGallery = (img: GeneratedImage) => {
    try {
      const saved = localStorage.getItem('velto_saved_images');
      const images = saved ? JSON.parse(saved) : [];
      images.unshift({
        url: img.url,
        date: new Date().toISOString(),
        type: 'Product'
      });
      if (images.length > 50) images.pop();
      localStorage.setItem('velto_saved_images', JSON.stringify(images));
      
      setSaveStatus("Saved to Gallery!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      setError("Failed to save to gallery.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      
      <ProductEditModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentAngle={selectedView}
        onConfirm={handleEditConfirm}
        isProcessing={loading}
      />

      {/* LEFT COLUMN: Controls - Parallel Slide Left */}
      <div className="lg:col-span-4 space-y-6 animate-slide-in-left opacity-0" style={{ animationFillMode: 'forwards' }}>
        
        {/* Source */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <LayoutTemplate className="w-3.5 h-3.5" /> Source Product
          </h2>
          <ImageUploader 
            selectedImage={selectedImage} 
            onImageSelect={setSelectedImage} 
            aspectRatio={aspectRatio}
          />
        </div>

        {/* Modes Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Generation Mode
          </h2>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {PRODUCT_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`
                  flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all text-left gesture
                  ${selectedMode === mode.id 
                    ? 'bg-brand-50 dark:bg-brand-500/20 border-brand-500 text-brand-700 dark:text-brand-300 shadow-sm' 
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-300'
                  }
                `}
              >
                <span className={selectedMode === mode.id ? 'text-brand-500' : 'text-slate-400'}>
                  {mode.icon}
                </span>
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conditional Model Selector */}
        {selectedMode === 'on-model' && (
           <div className="space-y-3 animate-fade-in-up">
             <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
               <User className="w-3.5 h-3.5" /> Select Model
             </h2>
             <select 
               value={selectedModelType}
               onChange={(e) => setSelectedModelType(e.target.value)}
               className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200"
             >
                {MODEL_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
             </select>
           </div>
        )}

        {/* Camera Angles - Restored to Sidebar */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Camera className="w-3.5 h-3.5" /> Camera Angle
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {VIEWPOINTS.map((view) => (
              <button
                key={view.id}
                onClick={() => setSelectedView(view.id)}
                className={`
                  px-2 py-2 rounded-lg text-[11px] font-medium border transition-all text-center truncate gesture
                  ${selectedView === view.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-300 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }
                `}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Box className="w-3.5 h-3.5" /> Aspect Ratio
          </h2>
          <div className="flex gap-2">
            {RATIOS.map((ratio) => (
              <button
                key={ratio.value}
                onClick={() => setAspectRatio(ratio.value)}
                className={`
                  flex-1 py-2 rounded-lg text-xs font-bold border transition-all gesture
                  ${aspectRatio === ratio.value
                    ? 'bg-brand-500 text-white border-brand-500 shadow-md'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-gray-50'
                  }
                `}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Count */}
        <div className="space-y-3">
           <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <CopyPlus className="w-3.5 h-3.5" /> Batch Size
              </h2>
              <span className="text-xs font-mono font-bold text-brand-500 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded">
                {imageCount} Images
              </span>
           </div>
           <input 
             type="range" 
             min="1" 
             max="10" 
             value={imageCount}
             onChange={(e) => setImageCount(parseInt(e.target.value))}
             className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-400 transition-all"
           />
           <div className="flex justify-between text-[10px] text-slate-400 px-1">
             <span>1</span>
             <span>5</span>
             <span>10</span>
           </div>
        </div>

        {/* Prompt */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe scene details (e.g., 'on a wooden table', 'sunset lighting')..."
          className="w-full h-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-500 outline-none resize-none dark:text-slate-200 placeholder:text-slate-400 transition-all focus:h-24"
        />

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-200 text-xs rounded-lg border border-red-200 dark:border-red-800 animate-pop">
            {error}
          </div>
        )}
        
        {saveStatus && (
           <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-200 text-xs rounded-lg border border-green-200 dark:border-green-800 text-center animate-fade-in">
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
              <Sparkles className="w-5 h-5" /> Generate Product Shots
            </>
          )}
        </button>
      </div>

      {/* RIGHT COLUMN: Output - Parallel Slide Right */}
      <div className="lg:col-span-8 flex flex-col h-full min-h-[500px] animate-slide-in-right opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '150ms' }}>
         <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-2 relative flex flex-col overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
            
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500/20 to-transparent z-10"></div>
            
            {loading && (
             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl transition-all duration-500 animate-fade-in">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-brand-200 dark:border-brand-900 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-brand-500 animate-pulse" />
                </div>
                <p className="mt-6 text-brand-600 dark:text-brand-400 font-bold animate-pulse text-lg tracking-tight">Creating Product Shots...</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Processing batch of {imageCount} images.</p>
             </div>
            )}

            {generatedImages.length > 0 ? (
              <div className="flex flex-col h-full">
                 
                 {/* Main Preview Area */}
                 <div className="flex-1 relative bg-gray-100 dark:bg-black/40 rounded-xl overflow-hidden mb-2 group animate-zoom-in">
                    <img 
                      src={generatedImages[selectedPreviewIndex].url} 
                      alt="Generated Product" 
                      className="w-full h-full object-contain"
                    />
                    
                    <div className="absolute bottom-6 right-6 flex flex-wrap gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 justify-end p-4">
                       <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-4 py-3 bg-brand-600/90 text-white font-semibold rounded-full hover:bg-brand-500 shadow-lg backdrop-blur border border-brand-400/20 flex items-center gap-2 gesture"
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </button>
                      <button 
                        onClick={() => saveToGallery(generatedImages[selectedPreviewIndex])}
                        className="px-4 py-3 bg-white/90 text-slate-800 font-semibold rounded-full hover:bg-white shadow-lg backdrop-blur flex items-center gap-2 gesture"
                      >
                        <Save className="w-4 h-4" /> Save
                      </button>
                      <button 
                        onClick={() => downloadImage(generatedImages[selectedPreviewIndex])}
                        className="px-6 py-3 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 shadow-lg shadow-black/10 flex items-center gap-2 gesture"
                      >
                        <Download className="w-5 h-5" /> Download
                      </button>
                    </div>
                 </div>

                 {/* Thumbnails Strip */}
                 {generatedImages.length > 1 && (
                   <div className="h-20 flex gap-2 overflow-x-auto pb-2 custom-scrollbar animate-fade-in-up delay-200">
                      {generatedImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedPreviewIndex(idx)}
                          className={`
                            relative h-full aspect-square rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 gesture
                            ${selectedPreviewIndex === idx 
                              ? 'border-brand-500 ring-2 ring-brand-500/30' 
                              : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                            }
                          `}
                        >
                          <img src={img.url} className="w-full h-full object-cover" alt={`Variant ${idx}`} />
                        </button>
                      ))}
                   </div>
                 )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-600 p-12 text-center">
                 <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-800/50 flex items-center justify-center mb-6 ring-1 ring-gray-200 dark:ring-slate-700 group-hover:scale-110 transition-transform duration-500 animate-pulse-slow">
                    <Box className="w-10 h-10 opacity-20 group-hover:opacity-40 transition-opacity" />
                 </div>
                 <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-500 mb-2">AI Product Studio</h3>
                 <p className="max-w-md text-slate-500 dark:text-slate-600 mb-8">
                   Generate professional product photography without a studio. Upload your product, choose a setting, and let AI do the rest.
                 </p>
                 
                 <div className="flex gap-4 opacity-50 text-xs">
                    <div className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full border dark:border-slate-700">Studio Lighting</div>
                    <div className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full border dark:border-slate-700">On Model</div>
                    <div className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full border dark:border-slate-700">Lifestyle</div>
                 </div>
              </div>
            )}
         </div>
         
         <div className="mt-4 flex justify-between items-center text-xs text-slate-500 dark:text-slate-600 px-2 animate-fade-in delay-200">
           <p>Generative AI may produce inaccurate results.</p>
           <p>{aspectRatio} • {imageCount} variants</p>
         </div>
      </div>
    </div>
  );
};