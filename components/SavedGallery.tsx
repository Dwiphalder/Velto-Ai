import React, { useEffect, useState } from 'react';
import { Download, Trash2, Calendar, Image as ImageIcon } from 'lucide-react';

interface SavedImage {
  url: string;
  date: string;
  type: string;
}

export const SavedGallery: React.FC = () => {
  const [images, setImages] = useState<SavedImage[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('velto_saved_images');
      if (saved) {
        setImages(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load images");
    }
  }, []);

  const deleteImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    localStorage.setItem('velto_saved_images', JSON.stringify(newImages));
  };

  const downloadImage = (img: SavedImage) => {
    const link = document.createElement('a');
    link.href = img.url;
    link.download = `velto-saved-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
        <p>No saved images found.</p>
        <p className="text-sm opacity-60 mt-2">Generate and click 'Save' to see them here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
         <ImageIcon className="w-6 h-6 text-brand-500" /> Saved Gallery
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((img, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="aspect-square relative overflow-hidden bg-gray-100 dark:bg-black/40">
              <img src={img.url} alt="Saved" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button 
                  onClick={() => downloadImage(img)}
                  className="p-2 bg-white text-slate-900 rounded-full hover:bg-brand-50 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteImage(idx)}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-brand-600 dark:text-brand-400">{img.type}</span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(img.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};