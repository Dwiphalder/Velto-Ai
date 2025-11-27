import React, { useState } from 'react';
import { generateText } from '../services/geminiService';
import { Sparkles, Hash, Copy, Type } from 'lucide-react';

export const TitleGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState<{ titles: string[], tags: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `
        You are a YouTube SEO expert.
        Generate 5 viral, click-worthy titles and 20 relevant tags for a video about: "${topic}".
        
        Return the output strictly in the following JSON format:
        {
          "titles": ["Title 1", "Title 2", ...],
          "tags": ["tag1", "tag2", ...]
        }
      `;
      
      const textResponse = await generateText(prompt);
      
      // Attempt to clean JSON if model includes markdown code blocks
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(cleanJson);
      setResult(parsed);
    } catch (err) {
      setError("Failed to generate titles. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Title & Tag Generator</h2>
        <p className="text-slate-500 dark:text-slate-400">Boost your video SEO with AI-optimized metadata</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-800 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
          Video Topic or Description
        </label>
        <div className="flex gap-4 flex-col md:flex-row">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="e.g., How to bake a sourdough bread for beginners"
            className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !topic}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-w-[160px]"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Generate
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {result && (
        <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Titles Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center gap-2">
              <Type className="w-4 h-4 text-brand-500" />
              <h3 className="font-bold text-slate-700 dark:text-slate-200">Viral Titles</h3>
            </div>
            <div className="p-2">
              {result.titles.map((title, idx) => (
                <div key={idx} className="group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors border-b border-gray-100 dark:border-slate-800/50 last:border-0">
                  <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">{title}</p>
                  <button 
                    onClick={() => copyToClipboard(title)}
                    className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-700 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-slate-700 dark:text-slate-200">Optimized Tags</h3>
              </div>
              <button 
                onClick={() => copyToClipboard(result.tags.join(','))}
                className="text-xs font-semibold text-brand-600 hover:text-brand-500 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy All
              </button>
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              {result.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded-md border border-gray-200 dark:border-slate-700">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};