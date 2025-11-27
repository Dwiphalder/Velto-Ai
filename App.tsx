
import React, { useState, useEffect, useRef } from 'react';
import { Home } from './components/Home';
import { ThumbnailMaker } from './components/ThumbnailMaker';
import { TitleGenerator } from './components/TitleGenerator';
import { ProductGenerator } from './components/ProductGenerator';
import { CustomerCare } from './components/CustomerCare';
import { ImageEnhancer } from './components/ImageEnhancer';
import { SavedGallery } from './components/SavedGallery';
import { TextToSpeech } from './components/TextToSpeech';
import { VoiceCloning } from './components/VoiceCloning';
import { VideoDubbing } from './components/VideoDubbing';
import { Settings, Moon, Sun, Maximize, Image as ImageIcon, Type, Box, Headphones, Images, Zap, Menu, X, Sparkles, LayoutGrid, Lock, Unlock, CheckCircle, Key, CreditCard, Video, Mic2, User, Smartphone, Palette, Languages, Download, Share, Loader2 } from 'lucide-react';

type View = 'home' | 'thumbnails' | 'titles' | 'products' | 'enhancer' | 'tts' | 'cloning' | 'saved' | 'dubbing';

// --- Theme Definitions ---
const THEMES = [
  { 
    id: 'teal', 
    name: 'Teal (Default)', 
    colors: { 
      50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 
      500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' 
    } 
  },
  { 
    id: 'violet', 
    name: 'Electric Violet', 
    colors: { 
      50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 
      500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' 
    } 
  },
  { 
    id: 'blue', 
    name: 'Ocean Blue', 
    colors: { 
      50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 
      500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' 
    } 
  },
  { 
    id: 'rose', 
    name: 'Neon Rose', 
    colors: { 
      50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 
      500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' 
    } 
  },
  { 
    id: 'amber', 
    name: 'Sunset Amber', 
    colors: { 
      50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 
      500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' 
    } 
  }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isCustomerCareOpen, setIsCustomerCareOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Customization State
  const [isHapticsEnabled, setIsHapticsEnabled] = useState(() => localStorage.getItem('velto_haptics') !== 'false');
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('velto_theme') || 'teal');
  
  // Subscription State
  const [isSubscribed, setIsSubscribed] = useState(() => localStorage.getItem('velto_subscription') === 'active');
  const [subCodeInput, setSubCodeInput] = useState('');
  const [subError, setSubError] = useState(false);

  // Install/Download State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [showManualInstall, setShowManualInstall] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  
  const settingsRef = useRef<HTMLDivElement>(null);

  // 1. Theme Logic
  useEffect(() => {
    const theme = THEMES.find(t => t.id === currentTheme) || THEMES[0];
    const root = document.documentElement;
    
    // Set CSS variables for Tailwind
    Object.entries(theme.colors).forEach(([shade, value]) => {
      root.style.setProperty(`--brand-${shade}`, value);
    });
    
    localStorage.setItem('velto_theme', currentTheme);
  }, [currentTheme]);

  // 2. Global Haptics Logic (Improved)
  useEffect(() => {
    localStorage.setItem('velto_haptics', String(isHapticsEnabled));
    
    const handleGlobalPointerDown = (e: PointerEvent) => {
      if (!isHapticsEnabled) return;
      // Vibrate on almost any interaction to ensure "feel"
      if (navigator.vibrate) {
         navigator.vibrate(50);
      }
    };
    
    window.addEventListener('pointerdown', handleGlobalPointerDown);
    return () => window.removeEventListener('pointerdown', handleGlobalPointerDown);
  }, [isHapticsEnabled]);

  // 3. Welcome Message Logic (Robust)
  useEffect(() => {
    const speakWelcome = () => {
      const synth = window.speechSynthesis;
      if (!synth) return;

      const performSpeak = () => {
        synth.cancel(); // Clear queue
        const utterance = new SpeechSynthesisUtterance("Welcome to Velto AI");
        utterance.volume = 1;
        utterance.rate = 1;
        utterance.pitch = 1;

        const voices = synth.getVoices();
        // Prefer a good English voice
        const preferred = voices.find(v => 
          v.lang.includes('en') && 
          (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Premium'))
        );
        if (preferred) utterance.voice = preferred;

        synth.speak(utterance);
      };

      // Browsers load voices asynchronously
      if (synth.getVoices().length === 0) {
        synth.onvoiceschanged = performSpeak;
      } else {
        performSpeak();
      }
    };

    // Small delay to ensure user interaction capability (browser policy)
    const timer = setTimeout(speakWelcome, 800);
    return () => clearTimeout(timer);
  }, []);

  // 4. PWA Install Logic
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("Install Prompt Captured");
    };
    
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
        setIsAppInstalled(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsAppInstalled(true));
    checkInstalled();

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
        setShowManualInstall(false); // Reset manual install view
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error("Error attempting to enable full-screen mode:", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  const playSuccessSound = () => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + (i * 0.1));
      
      gain.gain.setValueAtTime(0, now + (i * 0.1));
      gain.gain.linearRampToValueAtTime(0.1, now + (i * 0.1) + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.1) + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + (i * 0.1));
      osc.stop(now + (i * 0.1) + 0.5);
    });
  };

  const handleSubscribe = () => {
    if (subCodeInput.trim() === 'Velto') {
      setIsSubscribed(true);
      localStorage.setItem('velto_subscription', 'active');
      playSuccessSound();
      setSubError(false);
      setSubCodeInput('');
    } else {
      setSubError(true);
      if (isHapticsEnabled && navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }
  };

  const handleInstallApp = async () => {
    setIsInstalling(true);
    setInstallProgress(0);

    // Simulate preparation progress
    const duration = 1500; 
    const interval = 50;
    const steps = duration / interval;
    
    for (let i = 0; i <= steps; i++) {
        setInstallProgress(Math.round((i / steps) * 100));
        await new Promise(r => setTimeout(r, interval));
    }

    // Attempt Native Install Prompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        } else {
          // User cancelled prompt
          console.log('User dismissed install prompt');
        }
      } catch (err) {
        console.error("Install prompt failed", err);
        setShowManualInstall(true); // Fallback
      }
    } else {
      // If prompt not available, show manual instructions
      setShowManualInstall(true);
    }
    
    setIsInstalling(false);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: <LayoutGrid className="w-5 h-5" />, locked: false },
    { id: 'thumbnails', label: 'Thumbnails', icon: <ImageIcon className="w-5 h-5" />, locked: !isSubscribed },
    { id: 'titles', label: 'Titles & SEO', icon: <Type className="w-5 h-5" />, locked: false },
    { id: 'products', label: 'Product Shots', icon: <Box className="w-5 h-5" />, locked: !isSubscribed },
    { id: 'tts', label: 'Text to Speech', icon: <Mic2 className="w-5 h-5" />, locked: false },
    { id: 'cloning', label: 'Voice Cloning', icon: <User className="w-5 h-5" />, locked: !isSubscribed },
    { id: 'dubbing', label: 'Video Dubbing', icon: <Languages className="w-5 h-5" />, locked: !isSubscribed },
    { id: 'enhancer', label: 'Enhancer', icon: <Zap className="w-5 h-5" />, locked: false },
    { id: 'saved', label: 'Gallery', icon: <Images className="w-5 h-5" />, locked: false },
  ];

  const LockedView = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-fade-in p-6 text-center">
      <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
        <Lock className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        <div className="absolute top-0 right-0 p-2 bg-brand-500 rounded-full animate-pulse"></div>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{title} is Locked</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
        This premium feature requires an active subscription. Please enter your access code in Settings to unlock.
      </p>
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all hover:scale-105 flex items-center gap-2 gesture"
      >
        <Key className="w-4 h-4" /> Go to Settings
      </button>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300 flex flex-col md:flex-row">

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 z-50 sticky top-0 animate-fade-in-down">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white">
            Velto AI
          </span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 dark:text-slate-300 active:scale-900 transition-transform">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Area */}
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-gray-100 dark:border-slate-800/50">
          <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20 animate-pop">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="animate-fade-in delay-100">
            <h1 className="font-bold text-xl text-slate-900 dark:text-white leading-tight">
              Velto AI
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">CREATIVE SUITE</p>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as View);
                setIsMobileMenuOpen(false);
              }}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`
                w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium animate-fade-in-up opacity-0 fill-mode-forwards gesture
                active:scale-95
                ${currentView === item.id 
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800/30 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`transition-transform duration-300 ${currentView === item.id ? 'text-brand-600 dark:text-brand-400 scale-110' : 'text-slate-400 group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.locked && (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 space-y-2 bg-gray-50/50 dark:bg-slate-900/50 animate-fade-in delay-300">
          
          <button 
            onClick={() => setIsCustomerCareOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 active:scale-95 gesture"
          >
            <Headphones className="w-5 h-5" />
            <span>Support</span>
          </button>

          <div className="flex gap-2 pt-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex-1 p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all flex items-center justify-center active:scale-95 gesture"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={toggleFullScreen}
              className="flex-1 p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-all flex items-center justify-center active:scale-95 gesture"
              title="Full Screen"
            >
              <Maximize className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`flex-1 p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center active:scale-95 gesture ${!isSubscribed ? 'text-brand-500 dark:text-brand-400 animate-pulse' : 'text-slate-500 dark:text-slate-400'}`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col h-[calc(100vh-64px)] md:h-screen bg-white dark:bg-[#0b0f19]">
        
        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scroll-smooth relative z-10">
          <div className="max-w-7xl mx-auto h-full">
            
            {/* 
              PERSISTENT VIEWS with Transition Animations 
            */}

            <div className={currentView === 'home' ? 'block h-full animate-fade-in' : 'hidden'}>
               <Home onNavigate={setCurrentView} />
            </div>
            
            <div className={currentView === 'thumbnails' ? 'block h-full animate-fade-in' : 'hidden'}>
              {isSubscribed ? (
                <>
                  <div className="mb-6 animate-slide-in-left">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Thumbnail Creator</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Design viral-worthy YouTube thumbnails.</p>
                  </div>
                  <ThumbnailMaker />
                </>
              ) : (
                <LockedView title="Thumbnail Creator" />
              )}
            </div>

            <div className={currentView === 'titles' ? 'block h-full animate-fade-in' : 'hidden'}>
               <div className="mb-6 animate-slide-in-left">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Title & Tags</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Optimize your content for maximum reach.</p>
              </div>
              <TitleGenerator />
            </div>

            <div className={currentView === 'products' ? 'block h-full animate-fade-in' : 'hidden'}>
               {isSubscribed ? (
                <>
                  <div className="mb-6 animate-slide-in-left">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Product Photography</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Generate professional studio shots.</p>
                  </div>
                  <ProductGenerator />
                </>
              ) : (
                <LockedView title="Product Generator" />
              )}
            </div>

            <div className={currentView === 'tts' ? 'block h-full animate-fade-in' : 'hidden'}>
               <div className="mb-6 animate-slide-in-left">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Text to Speech</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Lifelike AI narration with 500+ voice combinations.</p>
              </div>
              <TextToSpeech />
            </div>

            <div className={currentView === 'cloning' ? 'block h-full animate-fade-in' : 'hidden'}>
               {isSubscribed ? (
                <>
                   <div className="mb-6 animate-slide-in-left">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Voice Cloning</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Create a digital twin of your voice in seconds.</p>
                  </div>
                  <VoiceCloning />
                </>
               ) : (
                  <LockedView title="Voice Cloning" />
               )}
            </div>

            <div className={currentView === 'dubbing' ? 'block h-full animate-fade-in' : 'hidden'}>
               {isSubscribed ? (
                <>
                   <div className="mb-6 animate-slide-in-left">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Video Dubbing</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Translate and dub your videos into other languages automatically.</p>
                  </div>
                  <VideoDubbing />
                </>
               ) : (
                  <LockedView title="Video Dubbing" />
               )}
            </div>

            <div className={currentView === 'enhancer' ? 'block h-full animate-fade-in' : 'hidden'}>
               <div className="mb-6 animate-slide-in-left">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Image Enhancer</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Upscale, apply filters, and adjust your images.</p>
              </div>
              <ImageEnhancer />
            </div>

            <div className={currentView === 'saved' ? 'block h-full animate-fade-in' : 'hidden'}>
               <div className="mb-6 animate-slide-in-left">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Saved Gallery</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Your collection of generated masterpieces.</p>
              </div>
              <SavedGallery />
            </div>

          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4 animate-fade-in">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div ref={settingsRef} className="relative bg-white dark:bg-slate-900 w-80 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 p-6 mt-16 md:mt-0 animate-slide-in-right h-[85vh] overflow-y-auto custom-scrollbar">
            
            {showManualInstall ? (
              // MANUAL INSTALL GUIDE VIEW
              <div className="space-y-6 animate-fade-in">
                 <button onClick={() => setShowManualInstall(false)} className="flex items-center gap-2 text-xs text-brand-500 font-bold mb-2">
                   <LayoutGrid className="w-3 h-3" /> Back to Settings
                 </button>
                 <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
                       <Smartphone className="w-8 h-8 text-brand-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Install App</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      To install the fully functional app, you must add it to your Home Screen:
                    </p>
                    <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-xl text-left space-y-3 text-sm border border-gray-200 dark:border-slate-700">
                        <div className="flex gap-3">
                           <span className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                           <span>Tap the <strong className="text-brand-500">Share</strong> icon (iOS) or <strong className="text-brand-500">Menu</strong> icon (Android).</span>
                        </div>
                        <div className="flex gap-3">
                           <span className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                           <span>Select <strong className="text-brand-500">Add to Home Screen</strong>.</span>
                        </div>
                        <div className="flex gap-3">
                           <span className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                           <span>Tap <strong className="text-brand-500">Add</strong>. The app will install and appear on your phone.</span>
                        </div>
                    </div>
                    <button onClick={() => setShowManualInstall(false)} className="w-full py-2 bg-brand-500 text-white rounded-lg font-bold">
                       Got it
                    </button>
                 </div>
              </div>
            ) : (
              // STANDARD SETTINGS VIEW
              <>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                  Settings
                  <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                </h3>
                
                <div className="space-y-6">

                  {/* Theme Customization */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                      <Palette className="w-4 h-4 text-brand-500" /> App Theme
                    </h4>
                    <div className="grid grid-cols-5 gap-2">
                        {THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => setCurrentTheme(theme.id)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${currentTheme === theme.id ? 'ring-2 ring-offset-2 ring-brand-500 dark:ring-offset-slate-900 scale-110' : ''}`}
                            style={{ backgroundColor: theme.colors[500] }}
                            title={theme.name}
                          >
                            {currentTheme === theme.id && <CheckCircle className="w-5 h-5 text-white" />}
                          </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Selected: <span className="font-semibold text-brand-600 dark:text-brand-400">{THEMES.find(t => t.id === currentTheme)?.name}</span>
                    </p>
                  </div>

                  {/* Haptics */}
                  <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                          <Smartphone className="w-4 h-4 text-brand-500" /> Haptic Feedback
                        </h4>
                        <button 
                          onClick={() => setIsHapticsEnabled(!isHapticsEnabled)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${isHapticsEnabled ? 'bg-brand-500' : 'bg-gray-300 dark:bg-slate-700'}`}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${isHapticsEnabled ? 'translate-x-5' : ''}`}></div>
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Vibrate on clicks and interactions.
                    </p>
                  </div>
                  
                  {/* Subscription Section */}
                  <div className={`p-4 rounded-xl border mt-4 ${isSubscribed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'}`}>
                    <h4 className="text-sm font-bold flex items-center gap-2 mb-3 text-slate-800 dark:text-white">
                      <CreditCard className="w-4 h-4" /> Subscription
                    </h4>
                    
                    {isSubscribed ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-sm animate-pop">
                        <CheckCircle className="w-5 h-5" /> Pro Active
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Enter your code to unlock premium features like Thumbnail and Product creators.
                        </p>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={subCodeInput}
                            onChange={(e) => {
                              setSubCodeInput(e.target.value);
                              setSubError(false);
                            }}
                            placeholder="Code: Velto"
                            className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 bg-white dark:bg-slate-900 dark:text-white
                              ${subError 
                                ? 'border-red-500 focus:ring-red-200' 
                                : 'border-gray-300 dark:border-slate-600 focus:ring-brand-500'
                              }
                            `}
                          />
                        </div>
                        {subError && <p className="text-xs text-red-500 animate-pulse">Invalid Code. Try 'Velto'.</p>}
                        <button 
                          onClick={handleSubscribe}
                          className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-bold shadow-md transition-all active:scale-95"
                        >
                          Unlock Pro
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Install App Section (UPDATED: NO FAKE APK) */}
                  <div className="p-4 rounded-xl border mt-4 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <h4 className="text-sm font-bold flex items-center gap-2 mb-3 text-slate-800 dark:text-white">
                      <Download className="w-4 h-4" /> Install App
                    </h4>
                    
                    {isAppInstalled ? (
                      <div className="w-full py-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-green-500/20">
                         <CheckCircle className="w-4 h-4" /> App Installed
                      </div>
                    ) : (
                      <button 
                        onClick={handleInstallApp}
                        disabled={isInstalling}
                        className={`w-full py-3 rounded-lg text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 relative overflow-hidden
                          ${isInstalling
                            ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 active:scale-95'
                          }
                        `}
                      >
                        {isInstalling && (
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-brand-500/20 dark:bg-brand-500/50 transition-all duration-100 ease-linear"
                            style={{ width: `${installProgress}%` }}
                          />
                        )}
                        
                        <div className="relative z-10 flex items-center gap-2">
                          {isInstalling ? (
                            <>
                               <Loader2 className="w-4 h-4 animate-spin" /> Installing...
                            </>
                          ) : (
                            <>
                               <Smartphone className="w-4 h-4" /> Install App
                            </>
                          )}
                        </div>
                      </button>
                    )}
                    
                    <p className="text-[10px] text-slate-400 mt-2 text-center">
                       Adds Velto AI to your home screen for native performance.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">About</label>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                      Velto AI v2.5 (PWA)
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Powered by Velto AI
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Customer Care Modal */}
      <CustomerCare isOpen={isCustomerCareOpen} onClose={() => setIsCustomerCareOpen(false)} />

    </div>
  );
};

export default App;
