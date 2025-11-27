import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, Sliders, Download, Zap, Layers, Maximize2, Monitor, Info, Droplets, Sun, Aperture, RotateCw, FlipHorizontal, FlipVertical, Wand2, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react';

interface FilterState {
  sharpness: number;
  contrast: number;
  saturation: number;
  brightness: number;
  exposure: number;
  temperature: number;
  tint: number;
  vignette: number;
  blur: number;
  sepia: number;
  is4K: boolean;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  sharpness: 0,
  contrast: 100,
  saturation: 100,
  brightness: 100,
  exposure: 0,
  temperature: 0,
  tint: 0,
  vignette: 0,
  blur: 0,
  sepia: 0,
  is4K: false,
  rotation: 0,
  flipH: false,
  flipV: false
};

const PRESETS = [
    { id: 'normal', label: 'Normal', filters: {} },
    { id: 'auto', label: 'Magic Fix', icon: <Wand2 className="w-3 h-3" />, filters: { contrast: 115, saturation: 120, sharpness: 10, brightness: 105 } },
    { id: 'bw', label: 'B&W', filters: { saturation: 0, contrast: 130 } },
    { id: 'warm', label: 'Summer', filters: { temperature: 40, tint: 10, saturation: 110 } },
    { id: 'cool', label: 'Winter', filters: { temperature: -40, tint: -10, contrast: 110 } },
    { id: 'dramatic', label: 'Dramatic', filters: { contrast: 140, saturation: 80, vignette: 50, sharpness: 20 } },
    { id: 'vintage', label: 'Vintage', filters: { sepia: 40, temperature: 20, contrast: 90, vignette: 30 } },
    { id: 'cyber', label: 'Cyber', filters: { saturation: 150, contrast: 120, tint: -20, sharpness: 30 } },
];

export const ImageEnhancer: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadedImgElement, setLoadedImgElement] = useState<HTMLImageElement | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [originalStats, setOriginalStats] = useState<{ width: number, height: number, size: number }>({ width: 0, height: 0, size: 0 });
  const [outputStats, setOutputStats] = useState<{ width: number, height: number, size: number }>({ width: 0, height: 0, size: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'adjust' | 'transform' | 'enhance'>('presets');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sharpenImage = (imageData: ImageData, intensity: number) => {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    const buff = new Uint8Array(data.length);
    const mix = intensity / 200.0; 

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) { 
           const val = data[idx + c];
           const highPass = 5*val - (data[((y-1)*w + x)*4 + c] + data[((y+1)*w + x)*4 + c] + data[(y*w + (x-1))*4 + c] + data[(y*w + (x+1))*4 + c]);
           buff[idx + c] = Math.min(255, Math.max(0, val + (highPass - val) * mix));
        }
        buff[idx + 3] = data[idx + 3]; 
      }
    }
    for (let i = 0; i < buff.length; i++) if (buff[i] !== 0) data[i] = buff[i];
    return imageData;
  };

  // 1. Image Loading Effect: Loads the image once when URL changes
  useEffect(() => {
    if (imageUrl) {
        setIsProcessing(true);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            setLoadedImgElement(img);
            setOriginalStats({
               width: img.width,
               height: img.height,
               size: selectedImage?.size || 0
            });
            setIsProcessing(false);
        };
        img.onerror = () => {
            console.error("Failed to load source image");
            setIsProcessing(false);
        };
        img.src = imageUrl;
    } else {
        setLoadedImgElement(null);
    }
  }, [imageUrl, selectedImage]);

  // 2. Canvas Rendering Logic
  const renderCanvas = useCallback(() => {
    if (!loadedImgElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = loadedImgElement;
    const scaleFactor = filters.is4K ? 2 : 1; 
      
    // Determine canvas size based on rotation
    if (filters.rotation % 180 !== 0) {
        canvas.width = img.height * scaleFactor;
        canvas.height = img.width * scaleFactor;
    } else {
        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Clear before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const brightnessVal = filters.brightness + (filters.exposure * 0.5); 
    const filterString = `brightness(${brightnessVal}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) blur(${filters.blur / 10}px)`;
    
    ctx.save();
    
    // Transform Context
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((filters.rotation * Math.PI) / 180);
    ctx.scale(
        (filters.flipH ? -1 : 1) * scaleFactor, 
        (filters.flipV ? -1 : 1) * scaleFactor
    );
    
    // Draw with Filters
    ctx.filter = filterString;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.filter = 'none';
    
    ctx.restore();

    // --- Overlays (Temperature / Tint) ---
    if (filters.temperature !== 0 || filters.tint !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      
      if (filters.temperature !== 0) {
        ctx.fillStyle = filters.temperature > 0 ? `rgba(255, 160, 0, ${filters.temperature / 200})` : `rgba(0, 100, 255, ${Math.abs(filters.temperature) / 200})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      if (filters.tint !== 0) {
          ctx.fillStyle = filters.tint > 0 ? `rgba(255, 0, 255, ${filters.tint / 200})` : `rgba(0, 255, 0, ${Math.abs(filters.tint) / 200})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    }

    // --- Vignette ---
    if (filters.vignette > 0) {
        ctx.save();
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, canvas.width / 3,
          canvas.width / 2, canvas.height / 2, canvas.width * 0.8
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0, ${filters.vignette / 100})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // --- Sharpening (Pixel Manipulation) --- 
    if (filters.sharpness > 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const sharpened = sharpenImage(imageData, filters.sharpness);
      ctx.putImageData(sharpened, 0, 0);
    }

    // Update Output Stats with check to prevent infinite loops
    const estSize = (canvas.width * canvas.height * 3) * 0.15;
    setOutputStats(prev => {
        if (prev.width === canvas.width && prev.height === canvas.height && Math.abs(prev.size - estSize) < 100) return prev;
        return { width: canvas.width, height: canvas.height, size: estSize };
    });

  }, [loadedImgElement, filters]);

  // 3. Render Trigger Effect
  useEffect(() => {
    if (loadedImgElement) {
       const handle = requestAnimationFrame(renderCanvas);
       return () => cancelAnimationFrame(handle);
    }
  }, [loadedImgElement, filters, renderCanvas]);

  // Handle file selection
  useEffect(() => {
    if (selectedImage) {
      const url = URL.createObjectURL(selectedImage);
      setImageUrl(url);
      setFilters(DEFAULT_FILTERS); 
      setActiveTab('presets');
      return () => URL.revokeObjectURL(url);
    } else {
      setImageUrl(null);
      setOriginalStats({ width: 0, height: 0, size: 0 });
      setOutputStats({ width: 0, height: 0, size: 0 });
    }
  }, [selectedImage]);

  const updateFilter = (key: keyof FilterState, value: number | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const rotateImage = () => {
     setFilters(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }));
  };

  const applyPreset = (preset: any) => {
     if (preset.id === 'normal') {
         setFilters(prev => ({ ...DEFAULT_FILTERS, is4K: prev.is4K, rotation: prev.rotation, flipH: prev.flipH, flipV: prev.flipV }));
     } else {
         setFilters(prev => ({
             ...DEFAULT_FILTERS,
             is4K: prev.is4K, rotation: prev.rotation, flipH: prev.flipH, flipV: prev.flipV,
             ...preset.filters
         }));
     }
  };

  const downloadResult = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `velto-enhanced-${Date.now()}.jpg`;
      link.href = canvasRef.current.toDataURL('image/jpeg', 0.95);
      link.click();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) setSelectedImage(e.dataTransfer.files[0]);
  };

  // 1. EMPTY STATE: LARGE UPLOADER
  if (!selectedImage) {
      return (
          <div className="h-full flex flex-col p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex-1 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-3xl bg-gray-50 dark:bg-slate-800/30 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 hover:border-brand-400 transition-all group relative overflow-hidden"
                   onDragOver={handleDragOver}
                   onDrop={handleDrop}
                   onClick={() => document.getElementById('main-uploader')?.click()}>
                   
                   <div className="absolute inset-0 bg-brand-500/5 scale-0 group-hover:scale-100 transition-transform rounded-3xl" />
                   
                   <div className="relative z-10 text-center space-y-6 max-w-lg mx-auto">
                       <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto shadow-xl group-hover:scale-110 transition-transform">
                           <Upload className="w-10 h-10 text-brand-500" />
                       </div>
                       <div>
                           <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Upload to Enhance</h2>
                           <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                             Drag & drop your photo to instantly see the preview and start editing.
                           </p>
                       </div>
                       <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-400 pt-4">
                           <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700"><Zap className="w-3.5 h-3.5 text-yellow-500" /> 4K Upscale</span>
                           <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700"><Wand2 className="w-3.5 h-3.5 text-purple-500" /> AI Magic Fix</span>
                           <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700"><Layers className="w-3.5 h-3.5 text-blue-500" /> Pro Filters</span>
                       </div>
                       <p className="text-xs text-brand-500/70 pt-8 font-medium">POWERED BY VELTO AI</p>
                   </div>
                   <input type="file" id="main-uploader" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setSelectedImage(e.target.files[0])} />
              </div>
          </div>
      );
  }

  // 2. EDITOR STATE: PREVIEW CENTERED, TOOLS ON SIDE
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-0 md:gap-4 overflow-hidden relative">
      
      {/* LEFT/CENTER: MAIN PREVIEW CANVAS */}
      <div className="flex-1 bg-gray-100 dark:bg-[#050505] md:border border-gray-200 dark:border-slate-800 md:rounded-xl relative overflow-hidden flex flex-col order-1 md:order-1">
          
          {/* Top Info Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
             <div className="bg-black/60 backdrop-blur-md rounded-lg p-2 text-[10px] md:text-xs text-white/90 space-y-1 border border-white/10">
                 <div>Input: <span className="text-slate-400">{originalStats.width}x{originalStats.height}</span></div>
                 <div>Output: <span className="text-brand-400 font-bold">{outputStats.width}x{outputStats.height}</span></div>
                 <div>Est Size: <span className="text-slate-400">{formatBytes(outputStats.size)}</span></div>
             </div>
             
             {filters.is4K && (
                 <div className="bg-gradient-to-r from-brand-600 to-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg animate-pulse flex items-center gap-1">
                     <Maximize2 className="w-3 h-3" /> 4K ULTRA HD
                 </div>
             )}
          </div>

          {/* Canvas Container */}
          <div className="flex-1 flex items-center justify-center relative bg-checkered p-4 md:p-8" ref={containerRef}>
              <canvas 
                ref={canvasRef}
                className="max-w-full max-h-full object-contain shadow-2xl transition-all duration-200 rounded-sm"
              />
              {/* Fallback/Loader if canvas is empty or loading */}
              {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
                      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
              )}
          </div>
          
          {/* Bottom Bar */}
          <div className="bg-white dark:bg-slate-900 p-2 text-center text-[10px] text-slate-500 dark:text-slate-400 border-t border-gray-200 dark:border-slate-800 flex justify-center gap-6">
             <span className="flex items-center gap-1"><Monitor className="w-3 h-3"/> Live Preview</span>
             <span className="flex items-center gap-1"><Zap className="w-3 h-3"/> Powered by Velto AI</span>
          </div>
      </div>

      {/* RIGHT: TOOLS SIDEBAR */}
      <div className="w-full md:w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col h-[40vh] md:h-full z-20 shadow-2xl order-2 md:order-2">
          
          {/* Header Actions */}
          <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
                 <Sliders className="w-4 h-4 text-brand-500" /> Editor
              </span>
              <button onClick={() => setSelectedImage(null)} className="text-xs px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 rounded flex items-center gap-1 transition-colors">
                 <Trash2 className="w-3 h-3" /> New
              </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
             {[
               { id: 'presets', label: 'Filters', icon: <Layers className="w-4 h-4"/> },
               { id: 'adjust', label: 'Adjust', icon: <Sliders className="w-4 h-4"/> },
               { id: 'transform', label: 'Crop', icon: <RotateCw className="w-4 h-4"/> },
               { id: 'enhance', label: '4K & AI', icon: <Zap className="w-4 h-4"/> },
             ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 px-2 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/10 border-brand-500' : 'text-slate-400 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                >
                   {tab.icon}
                   {tab.label}
                </button>
             ))}
          </div>

          {/* Tools Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
             
             {/* PRESETS TAB */}
             {activeTab === 'presets' && (
               <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map(p => (
                     <button 
                       key={p.id} 
                       onClick={() => applyPreset(p)} 
                       className="p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md transition-all text-left group"
                     >
                        <div className="flex items-center gap-2 mb-1">
                           <div className={`w-2 h-2 rounded-full ${p.id === 'normal' ? 'bg-slate-400' : 'bg-brand-500'}`}></div>
                           <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-brand-500">{p.label}</span>
                        </div>
                        {p.icon && <div className="text-brand-500 mb-1">{p.icon}</div>}
                     </button>
                  ))}
               </div>
             )}

             {/* TRANSFORM TAB */}
             {activeTab === 'transform' && (
                <div className="space-y-4">
                   <div className="grid grid-cols-3 gap-2">
                     <button onClick={rotateImage} className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl flex flex-col items-center gap-2 hover:border-brand-500 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <RotateCw className="w-6 h-6 text-slate-400" /> Rotate 90°
                     </button>
                     <button onClick={() => updateFilter('flipH', !filters.flipH)} className={`p-4 border rounded-xl flex flex-col items-center gap-2 text-xs font-bold ${filters.flipH ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        <FlipHorizontal className="w-6 h-6" /> Flip H
                     </button>
                     <button onClick={() => updateFilter('flipV', !filters.flipV)} className={`p-4 border rounded-xl flex flex-col items-center gap-2 text-xs font-bold ${filters.flipV ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        <FlipVertical className="w-6 h-6" /> Flip V
                     </button>
                   </div>
                   <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-[10px] text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                      Changes are applied in real-time to the preview.
                   </div>
                </div>
             )}

             {/* ADJUST TAB */}
             {activeTab === 'adjust' && (
               <div className="space-y-5">
                  <ControlSlider label="Exposure" value={filters.exposure} min={-50} max={50} onChange={(v) => updateFilter('exposure', v)} icon={<Sun className="w-3 h-3"/>} />
                  <ControlSlider label="Contrast" value={filters.contrast} min={50} max={150} onChange={(v) => updateFilter('contrast', v)} icon={<Sliders className="w-3 h-3"/>} />
                  <ControlSlider label="Brightness" value={filters.brightness} min={50} max={150} onChange={(v) => updateFilter('brightness', v)} icon={<Sun className="w-3 h-3"/>} />
                  <ControlSlider label="Saturation" value={filters.saturation} min={0} max={200} onChange={(v) => updateFilter('saturation', v)} icon={<Droplets className="w-3 h-3"/>} />
                  <ControlSlider label="Vignette" value={filters.vignette} min={0} max={100} onChange={(v) => updateFilter('vignette', v)} icon={<Aperture className="w-3 h-3"/>} />
               </div>
             )}

             {/* ENHANCE (4K) TAB */}
             {activeTab === 'enhance' && (
                <div className="space-y-4">
                  
                  {/* 4K Toggle */}
                  <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${filters.is4K ? 'bg-gradient-to-r from-brand-600 to-purple-600 border-transparent shadow-lg transform scale-[1.02]' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-brand-400'}`}
                       onClick={() => updateFilter('is4K', !filters.is4K)}>
                     <div>
                        <span className={`text-sm font-bold flex items-center gap-2 ${filters.is4K ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                           <Maximize2 className={`w-4 h-4 ${filters.is4K ? 'text-white' : 'text-brand-500'}`} />
                           4K Quality Upscale
                        </span>
                        <p className={`text-[10px] mt-1 ${filters.is4K ? 'text-white/80' : 'text-slate-500'}`}>
                           Convert to Ultra HD (2x Resolution)
                        </p>
                     </div>
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${filters.is4K ? 'bg-white border-white' : 'border-slate-300'}`}>
                        {filters.is4K && <div className="w-3 h-3 rounded-full bg-brand-600"></div>}
                     </div>
                  </div>

                  <ControlSlider label="Detail Sharpening" value={filters.sharpness} min={0} max={100} onChange={(v) => updateFilter('sharpness', v)} icon={<Aperture className="w-3 h-3"/>} />
                  <ControlSlider label="Color Temperature" value={filters.temperature} min={-100} max={100} onChange={(v) => updateFilter('temperature', v)} icon={<Sun className="w-3 h-3"/>} />
                
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-[10px] text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-800 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Use 4K upscale for printing or high-res displays. Processing might take a few seconds.</span>
                   </div>
                </div>
             )}

          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
              <button 
                onClick={downloadResult}
                className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Download className="w-5 h-5" /> Download Result
              </button>
          </div>
      </div>

      <style>{`
        .bg-checkered {
          background-image: linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          background-color: #0f172a; 
        }
        .light .bg-checkered {
           background-color: #e2e8f0;
           background-image: linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #94a3b8; 
          border-radius: 4px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

const ControlSlider = ({ label, value, min, max, onChange, icon }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void, icon?: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
      <span className="flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-brand-500 bg-brand-50 dark:bg-brand-900/20 px-1.5 rounded">{value}</span>
    </div>
    <input 
      type="range" min={min} max={max} 
      value={value} 
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none accent-brand-500 cursor-pointer hover:accent-brand-400 transition-all"
    />
  </div>
);