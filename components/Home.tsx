import React from 'react';
import { ImageIcon, Type, Box, Zap, ArrowRight, Sparkles, Star } from 'lucide-react';

interface HomeProps {
  onNavigate: (view: any) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const features = [
    {
      id: 'thumbnails',
      title: 'Thumbnail Creator',
      description: 'Design viral-worthy YouTube thumbnails with AI-generated imagery and text overlays.',
      icon: <ImageIcon className="w-6 h-6 text-white" />,
      color: 'bg-gradient-to-br from-pink-500 to-rose-500'
    },
    {
      id: 'titles',
      title: 'Titles & SEO',
      description: 'Generate click-worthy titles and optimized tags to boost your video reach.',
      icon: <Type className="w-6 h-6 text-white" />,
      color: 'bg-gradient-to-br from-blue-500 to-indigo-500'
    },
    {
      id: 'products',
      title: 'Product Photography',
      description: 'Create professional studio-quality product shots in any environment.',
      icon: <Box className="w-6 h-6 text-white" />,
      color: 'bg-gradient-to-br from-emerald-500 to-teal-500'
    },
    {
      id: 'enhancer',
      title: 'Image Enhancer',
      description: 'Upscale resolution and fix lighting issues instantly.',
      icon: <Zap className="w-6 h-6 text-white" />,
      color: 'bg-gradient-to-br from-amber-500 to-orange-500'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 md:p-12 shadow-2xl animate-fade-in-up">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium mb-4 animate-slide-in-left delay-100 opacity-0 fill-mode-forwards">
            <Sparkles className="w-3 h-3 text-brand-400" />
            <span>AI Creative Suite v2.2</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight animate-fade-in-up delay-200 opacity-0 fill-mode-forwards leading-[1.1]">
            Create content that <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-blue-300">stands out.</span>
          </h1>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed animate-fade-in-up delay-300 opacity-0 fill-mode-forwards max-w-lg">
            Velto AI gives you the power to generate professional thumbnails, optimize metadata, and edit photos in seconds.
          </p>
          <button 
            onClick={() => onNavigate('thumbnails')}
            className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-all flex items-center gap-2 animate-zoom-in delay-500 opacity-0 fill-mode-forwards gesture"
          >
            Start Creating <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Decorative Elements */}
        <div className="absolute right-12 top-12 hidden md:block animate-float">
           <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 rotate-12 flex items-center justify-center">
              <Star className="w-8 h-8 text-brand-400 opacity-80" />
           </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, idx) => (
          <button
            key={feature.id}
            onClick={() => onNavigate(feature.id)}
            style={{ animationDelay: `${(idx * 100) + 400}ms` }}
            className="group relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 text-left hover:border-brand-500 dark:hover:border-brand-500/50 transition-all hover:shadow-xl hover:shadow-brand-500/5 hover-lift animate-fade-in-up opacity-0 fill-mode-forwards"
          >
            <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {feature.title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
              {feature.description}
            </p>
            <div className="flex items-center text-xs font-bold text-slate-400 group-hover:text-brand-500 transition-colors">
              OPEN TOOL <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Stats / Info - Staggered Parallel Animation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
            { label: 'AI Model', val: 'Velto Engine 2.0' },
            { label: 'Latency', val: 'Ultra Fast' },
            { label: 'Quality', val: 'HD / 4K' },
            { label: 'Status', val: 'Online', color: 'text-green-500' }
        ].map((stat, i) => (
            <div 
              key={i} 
              style={{ animationDelay: `${(i * 100) + 800}ms` }}
              className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100 dark:border-slate-800 text-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors animate-zoom-in opacity-0 fill-mode-forwards"
            >
                <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{stat.label}</div>
                <div className={`font-mono font-bold ${stat.color || 'text-slate-700 dark:text-slate-200'}`}>{stat.val}</div>
            </div>
        ))}
      </div>
    </div>
  );
};