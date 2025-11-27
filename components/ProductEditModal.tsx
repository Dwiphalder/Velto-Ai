import React, { useState } from 'react';
import { X, Eye, Sparkles, Check } from 'lucide-react';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAngle: string;
  onConfirm: (angle: string) => void;
  isProcessing: boolean;
}

export const VIEWPOINTS = [
  { id: 'Front View', label: 'Front View' },
  { id: 'Top Down Flatlay', label: 'Top Down' },
  { id: 'Isometric 45-degree', label: 'Isometric' },
  { id: 'Side Profile', label: 'Side Profile' },
  { id: 'Low Angle', label: 'Low Angle' },
  { id: 'Close Up Macro', label: 'Macro Detail' },
];

export const ProductEditModal: React.FC<ProductEditModalProps> = ({ 
  isOpen, 
  onClose, 
  currentAngle, 
  onConfirm,
  isProcessing 
}) => {
  const [selectedAngle, setSelectedAngle] = useState(currentAngle);

  // Sync internal state if prop changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAngle(currentAngle);
    }
  }, [isOpen, currentAngle]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <div>
             <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <Eye className="w-5 h-5 text-brand-500" />
               Edit Perspective
             </h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
               Regenerate this product with a new angle
             </p>
          </div>
          <button 
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
           <div className="grid grid-cols-2 gap-3">
              {VIEWPOINTS.map((view) => (
                <button
                  key={view.id}
                  onClick={() => setSelectedAngle(view.id)}
                  className={`
                    relative p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between group
                    ${selectedAngle === view.id
                      ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500 text-brand-700 dark:text-brand-400 shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-300 dark:hover:border-slate-600'
                    }
                  `}
                >
                  <span>{view.label}</span>
                  {selectedAngle === view.id && <Check className="w-4 h-4 text-brand-500" />}
                </button>
              ))}
           </div>
           
           <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-xs">
              <strong>Note:</strong> Changing the camera angle will generate a new variation of your product image.
           </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex gap-3 bg-gray-50 dark:bg-slate-900">
           <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-4 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(selectedAngle)}
              disabled={isProcessing}
              className={`
                flex-1 py-2.5 px-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                ${isProcessing
                  ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/20'
                }
              `}
            >
              <Sparkles className="w-4 h-4" />
              {isProcessing ? 'Processing...' : 'Update View'}
            </button>
        </div>

      </div>
    </div>
  );
};