import React, { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { AspectRatio } from '../types';

interface ImageUploaderProps {
  selectedImage: File | null;
  onImageSelect: (file: File | null) => void;
  aspectRatio: AspectRatio;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ selectedImage, onImageSelect, aspectRatio }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      } else {
        alert("Please upload an image file.");
      }
    }
  }, [onImageSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageSelect(null);
  };

  // Create style object for dynamic aspect ratio
  // Replacing ':' with '/' to make it valid CSS aspect-ratio value (e.g., "16:9" -> "16/9")
  const containerStyle = {
    aspectRatio: aspectRatio.replace(':', '/')
  };

  if (selectedImage) {
    return (
      <div 
        style={containerStyle}
        className="relative group w-full bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-lg transition-all hover:border-brand-500/50"
      >
        <img 
          src={URL.createObjectURL(selectedImage)} 
          alt="Preview" 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
          <p className="text-white font-medium truncate">{selectedImage.name}</p>
          <p className="text-slate-300 text-xs">{(selectedImage.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
        <button 
          onClick={removeImage}
          className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={containerStyle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('fileInput')?.click()}
      className={`
        w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 p-4
        ${isDragging 
          ? 'border-brand-400 bg-brand-50 dark:bg-brand-400/10 scale-[1.02]' 
          : 'border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 hover:border-gray-400 dark:hover:border-slate-500'
        }
      `}
    >
      <input 
        id="fileInput" 
        type="file" 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />
      <div className="p-3 bg-white dark:bg-slate-800 rounded-full mb-3 shadow-sm dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <Upload className={`w-6 h-6 ${isDragging ? 'text-brand-400' : 'text-slate-400'}`} />
      </div>
      <p className="text-slate-600 dark:text-slate-200 font-medium text-base text-center">Upload Source Image</p>
      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 text-center">Drag & drop or click</p>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-900/50 px-2 py-1 rounded-full border border-gray-200 dark:border-slate-800">
        <ImageIcon className="w-3 h-3" />
        <span>JPG, PNG, WEBP</span>
      </div>
    </div>
  );
};