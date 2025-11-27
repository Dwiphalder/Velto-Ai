
import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, MessageSquareQuote, Brush, Undo2, ZoomIn, ZoomOut, Move, Hand } from 'lucide-react';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onConfirm: (instruction: string, maskDataUrl: string | null) => void;
  isProcessing: boolean;
}

export const EditModal: React.FC<EditModalProps> = ({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onConfirm,
  isProcessing 
}) => {
  const [instruction, setInstruction] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(25);
  const [hasMask, setHasMask] = useState(false);
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<'move' | 'brush'>('move');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasMask(false);
      setInstruction('');
      setScale(1);
      setActiveTool('move'); // Default to move to allow zooming first
      setTimeout(setupCanvas, 100);
    }
  }, [isOpen, imageSrc]);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (canvas && image) {
      // Set canvas resolution to match image natural resolution for high quality
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isProcessing || activeTool !== 'brush') return;
    setIsDrawing(true);
    setHasMask(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== 'brush') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Get coordinates relative to the canvas element
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    ctx.lineWidth = brushSize * (canvas.width / 1000); // Dynamic relative size
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.5)';
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasMask(false);
    }
  };

  const getMaskData = (): string | null => {
    if (!hasMask || !canvasRef.current) return null;
    
    const tempCanvas = document.createElement('canvas');
    const sourceCanvas = canvasRef.current;
    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;
    const ctx = tempCanvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      const userCtx = sourceCanvas.getContext('2d');
      const userData = userCtx?.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      
      if (userData) {
         const targetData = ctx.createImageData(sourceCanvas.width, sourceCanvas.height);
         for (let i = 0; i < userData.data.length; i += 4) {
            // Check alpha
            if (userData.data[i+3] > 0) {
               targetData.data[i] = 255;   
               targetData.data[i+1] = 255; 
               targetData.data[i+2] = 255; 
               targetData.data[i+3] = 255; 
            } else {
               targetData.data[i] = 0;
               targetData.data[i+1] = 0;
               targetData.data[i+2] = 0;
               targetData.data[i+3] = 255; 
            }
         }
         ctx.putImageData(targetData, 0, 0);
      }
    }
    
    return tempCanvas.toDataURL('image/png');
  };

  const handleSubmit = () => {
    if (instruction.trim()) {
      const maskData = getMaskData();
      onConfirm(instruction, maskData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl h-[95vh]">
        
        {/* Image Preview & Canvas Section */}
        <div className="md:w-2/3 bg-[#050505] relative flex flex-col border-b md:border-b-0 md:border-r border-slate-800">
           
           {/* Toolbar */}
           <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-800/90 backdrop-blur border border-slate-700 p-2 rounded-full shadow-xl">
              
              {/* Tool Toggle */}
              <div className="flex bg-slate-900 rounded-full p-1 border border-slate-700 mr-2">
                 <button 
                  onClick={() => setActiveTool('move')}
                  className={`p-2 rounded-full transition-colors ${activeTool === 'move' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  title="Move/Zoom"
                 >
                   <Hand className="w-4 h-4" />
                 </button>
                 <button 
                  onClick={() => setActiveTool('brush')}
                  className={`p-2 rounded-full transition-colors ${activeTool === 'brush' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  title="Paint Mask"
                 >
                   <Brush className="w-4 h-4" />
                 </button>
              </div>

              {/* Brush Settings */}
              {activeTool === 'brush' && (
                <div className="flex items-center gap-2 px-2 border-r border-slate-600/50 animate-in fade-in slide-in-from-left-2">
                   <span className="text-[10px] text-slate-400">Size</span>
                   <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              )}

              <button onClick={handleZoomOut} className="p-2 hover:bg-slate-700 rounded-full text-slate-300">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] w-8 text-center text-slate-400">{Math.round(scale * 100)}%</span>
              <button onClick={handleZoomIn} className="p-2 hover:bg-slate-700 rounded-full text-slate-300">
                <ZoomIn className="w-4 h-4" />
              </button>
              
              <button 
                onClick={clearMask}
                className="p-2 hover:bg-slate-700 rounded-full text-slate-300 transition-colors border-l border-slate-600/50 ml-1"
                title="Clear Selection"
              >
                <Undo2 className="w-4 h-4" />
              </button>
           </div>

           {/* Scrollable Container */}
           <div className="flex-1 overflow-auto custom-scrollbar flex bg-dots-pattern relative">
             
             {/* Centering Wrapper that grows with scale */}
             <div 
                className="min-w-full min-h-full flex items-center justify-center p-12"
                style={{ 
                    // This ensures that when scaled up, the container actually takes up space to scroll
                    width: imageRef.current ? `${imageRef.current.clientWidth * scale + 100}px` : '100%',
                    height: imageRef.current ? `${imageRef.current.clientHeight * scale + 100}px` : '100%',
                }}
             >
                <div 
                   className="relative shadow-2xl shadow-black transition-transform duration-200 ease-out origin-center"
                   style={{ transform: `scale(${scale})` }}
                >
                    <img 
                      ref={imageRef}
                      src={imageSrc} 
                      alt="To Edit" 
                      className="max-w-[80vw] max-h-[70vh] block rounded-sm select-none pointer-events-none"
                      onLoad={setupCanvas}
                    />
                    <canvas
                      ref={canvasRef}
                      className={`absolute inset-0 rounded-sm z-10 w-full h-full touch-none ${activeTool === 'brush' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
                      onMouseDown={startDrawing}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onMouseMove={draw}
                      onTouchStart={startDrawing}
                      onTouchEnd={stopDrawing}
                      onTouchMove={draw}
                    />
                </div>
             </div>
           </div>
           
           <div className="p-3 bg-black/80 text-center text-xs text-slate-400 border-t border-slate-800 flex justify-center gap-4">
             <span className={`flex items-center gap-1 ${activeTool === 'move' ? 'text-brand-400 font-bold' : ''}`}><Hand className="w-3 h-3" /> Move/Zoom Mode</span>
             <span className={`flex items-center gap-1 ${activeTool === 'brush' ? 'text-brand-400 font-bold' : ''}`}><Brush className="w-3 h-3" /> Paint Mode</span>
           </div>
        </div>

        {/* Controls Section */}
        <div className="md:w-1/3 p-6 flex flex-col bg-slate-900 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-400" />
              Magic Edit
            </h3>
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 space-y-6">
            
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-1.5 rounded-md ${hasMask ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-700 text-slate-400'}`}>
                  <Brush className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">1. Select Area</h4>
              </div>
              <p className="text-xs text-slate-500 pl-10">
                 Select the <strong className="text-brand-400">Paint Mode</strong> to draw over the object you want to change. Switch to <strong className="text-white">Move Mode</strong> to zoom in for details.
              </p>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
               <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-slate-700 text-slate-300">
                  <MessageSquareQuote className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">2. Describe Change</h4>
              </div>
              
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g., 'Make the shirt blue', 'Add a neon sign', 'Remove the person'..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent min-h-[150px] resize-none"
                autoFocus
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!instruction.trim() || isProcessing}
              className={`
                flex-1 py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                ${!instruction.trim() || isProcessing
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/20'
                }
              `}
            >
              <Sparkles className="w-4 h-4" />
              {isProcessing ? 'Processing...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .bg-dots-pattern {
          background-image: radial-gradient(#334155 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
