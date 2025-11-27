import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Mic, Send, User, Bot, Volume2, ChevronLeft, Phone, PhoneOff, Headphones, Sparkles, AlertCircle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface CustomerCareProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'select' | 'text' | 'voice';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// --- Audio Helper Functions for Gemini Live API ---

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Simple resampler/converter to PCM 16-bit 16kHz
function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

export const CustomerCare: React.FC<CustomerCareProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<Mode>('select');
  
  // Text Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Voice Chat State
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // Model is speaking
  const [volumeLevel, setVolumeLevel] = useState(0); // For visualizer
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null); // Track input context to close it
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null); // To handle permission cleanup
  const nextStartTimeRef = useRef<number>(0);
  const isSessionActive = useRef<boolean>(false); // Gate to prevent sending audio when closed

  // System Prompt for Agent
  const SYSTEM_INSTRUCTION = `
    You are 'Velto Support', a friendly and helpful AI customer support agent for the Velto AI web application.
    
    About Velto AI:
    - Velto AI is a premier creative suite Powered by Velto AI technology.
    - Features:
      1. Thumbnail Maker: Generates viral YouTube thumbnails.
      2. Title & Tag Generator: Creates SEO-optimized titles.
      3. Product Generator: Creates professional product photography.
      4. Image Enhancer: High-resolution upscale, 4K conversion, and color grading.
    
    Your Goal:
    - Answer user questions about how to use these features.
    - Guide them on how to generate better images.
    - Be concise, professional, and enthusiastic.
    - Emphasize that all features are powered by Velto AI.
  `;

  // --- Effects ---

  useEffect(() => {
    if (isOpen) {
      setMode('select');
      setMessages([{ role: 'model', text: "Hi! I'm the Velto AI assistant. How can I help you create today?" }]);
    } else {
      stopVoiceSession();
    }
    return () => {
      stopVoiceSession();
    }
  }, [isOpen]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // --- Text Chat Logic ---

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMsg = inputText;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputText('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: SYSTEM_INSTRUCTION },
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }))
      });

      const result = await chat.sendMessageStream({ message: userMsg });
      
      let fullResponse = "";
      setMessages(prev => [...prev, { role: 'model', text: "" }]); // Placeholder

      for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
          fullResponse += text;
          setMessages(prev => {
            const newArr = [...prev];
            newArr[newArr.length - 1] = { role: 'model', text: fullResponse };
            return newArr;
          });
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please check your internet connection." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- Voice Chat Logic ---

  const startVoiceSession = async () => {
    try {
      setVoiceError(null);
      stopVoiceSession(); // Ensure cleanup before start
      
      setIsConnected(true);
      isSessionActive.current = false; // Wait for onopen
      
      // 1. Output Audio Context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = audioContextRef.current.currentTime;
      
      // 2. Microphone Input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      mediaStreamRef.current = stream; 
      
      const inputContext = new AudioContext({ sampleRate: 16000 });
      inputAudioContextRef.current = inputContext;

      const source = inputContext.createMediaStreamSource(stream);
      const processor = inputContext.createScriptProcessor(4096, 1, 1);
      
      inputSourceRef.current = source;
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputContext.destination);

      // 3. Connect to Gemini Live
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        },
        callbacks: {
          onopen: () => {
            console.log("Voice Session Connected");
            setVoiceError(null);
            isSessionActive.current = true;
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              if (audioContextRef.current) {
                setIsSpeaking(true);
                const audioData = base64ToBytes(base64Audio);
                
                const int16Data = new Int16Array(audioData.buffer);
                const float32Data = new Float32Array(int16Data.length);
                for (let i = 0; i < int16Data.length; i++) {
                   float32Data[i] = int16Data[i] / 32768.0;
                }
                
                const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
                buffer.getChannelData(0).set(float32Data);
                
                const source = audioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContextRef.current.destination);
                
                const now = audioContextRef.current.currentTime;
                const startTime = Math.max(now, nextStartTimeRef.current);
                source.start(startTime);
                nextStartTimeRef.current = startTime + buffer.duration;
                
                source.onended = () => {
                   if (audioContextRef.current && audioContextRef.current.currentTime >= nextStartTimeRef.current - 0.1) {
                      setIsSpeaking(false);
                   }
                };
              }
            }

            if (msg.serverContent?.interrupted) {
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onclose: () => {
            console.log("Voice Session Closed");
            setIsConnected(false);
            isSessionActive.current = false;
          },
          onerror: (err: any) => {
            console.error("Voice Error", err);
            setVoiceError(err.message || "Network Error. Connection interrupted.");
            setIsConnected(false);
            isSessionActive.current = false;
            stopVoiceSession();
          }
        }
      });

      // 4. Send Audio Input
      processor.onaudioprocess = (e) => {
        // Only send if session is definitely active to prevent Network Errors
        if (!isSessionActive.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        let sum = 0;
        for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);
        setVolumeLevel(Math.min(100, rms * 500)); 

        const pcm16 = floatTo16BitPCM(inputData);
        const pcmBytes = new Uint8Array(pcm16.buffer);
        const base64Data = bytesToBase64(pcmBytes);

        sessionPromise.then(session => {
           session.sendRealtimeInput({
             media: {
               mimeType: 'audio/pcm;rate=16000',
               data: base64Data
             }
           });
        }).catch(err => {
            // Ignore sending errors if session is closing/closed
            console.debug("Send input failed:", err);
        });
      };

    } catch (err: any) {
      console.error("Failed to start voice session", err);
      setVoiceError("Failed to connect to Voice Agent. " + (err.message || "Please check your network."));
      setIsConnected(false);
      stopVoiceSession();
    }
  };

  const stopVoiceSession = () => {
    isSessionActive.current = false;

    // 1. Stop ScriptProcessor & Source
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    
    // 2. Stop Microphone MediaStreamTracks (Crucial for releasing red mic icon)
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
            track.stop();
        });
        mediaStreamRef.current = null;
    }

    // 3. Close Input Audio Context
    if (inputAudioContextRef.current) {
        if (inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(() => {});
        }
        inputAudioContextRef.current = null;
    }

    // 4. Close Output Audio Context
    if (audioContextRef.current) {
       if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
       }
       audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsSpeaking(false);
    setVolumeLevel(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-[600px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800 relative">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            {mode !== 'select' && (
              <button onClick={() => {
                if (mode === 'voice') stopVoiceSession();
                setMode('select');
              }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
                <ChevronLeft className="w-5 h-5 text-slate-500" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                 <h3 className="font-bold text-slate-800 dark:text-white leading-tight">Velto Support</h3>
                 <p className="text-[10px] text-brand-500 font-medium tracking-wide">POWERED BY VELTO AI</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* --- SELECT MODE SCREEN --- */}
        {mode === 'select' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:to-[#0b0f19]">
            <div className="text-center space-y-2 mb-4">
               <Sparkles className="w-12 h-12 text-brand-400 mx-auto animate-pulse" />
               <h2 className="text-xl font-bold text-slate-800 dark:text-white">How can we help?</h2>
               <p className="text-sm text-slate-500 dark:text-slate-400">Choose your preferred way to communicate</p>
            </div>

            <button 
              onClick={() => setMode('text')}
              className="w-full p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-lg transition-all group flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Chat Support</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Text-based assistance for quick questions</p>
              </div>
            </button>

            <button 
              onClick={() => {
                setMode('voice');
              }}
              className="w-full p-5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-lg transition-all group flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Voice Agent</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Talk to our AI in real-time</p>
              </div>
            </button>
          </div>
        )}

        {/* --- TEXT MODE SCREEN --- */}
        {mode === 'text' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-black/20" ref={chatScrollRef}>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-brand-500 text-white'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-slate-500 dark:text-slate-300" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm max-w-[80%] ${
                    msg.role === 'user' 
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm rounded-tr-none border border-gray-100 dark:border-slate-700' 
                      : 'bg-brand-500 text-white shadow-md rounded-tl-none'
                  }`}>
                    {msg.text || <span className="animate-pulse">...</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about Velto AI..."
                className="flex-1 bg-gray-100 dark:bg-slate-800 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="p-2 bg-brand-500 text-white rounded-full hover:bg-brand-600 disabled:opacity-50 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

        {/* --- VOICE MODE SCREEN --- */}
        {mode === 'voice' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-black relative overflow-hidden">
            
            {/* Visualizer Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
               <div className={`w-64 h-64 bg-brand-500 rounded-full blur-[80px] transition-all duration-100 ease-linear`} 
                    style={{ transform: `scale(${0.8 + volumeLevel/80})` }}></div>
            </div>

            <div className="relative z-10 text-center space-y-8 w-full">
              <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                 {/* Rings */}
                 <div className={`absolute inset-0 border-2 border-brand-500/30 rounded-full ${isConnected ? 'animate-ping' : ''}`} style={{ animationDuration: '3s' }}></div>
                 <div className={`absolute inset-4 border-2 border-brand-500/50 rounded-full ${isConnected ? 'animate-ping' : ''}`} style={{ animationDuration: '2s' }}></div>
                 
                 <div className={`w-24 h-24 rounded-full bg-gradient-to-tr from-brand-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-brand-500/50 transition-transform duration-100 ${isSpeaking ? 'scale-110' : 'scale-100'}`}>
                    {isSpeaking ? <Volume2 className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
                 </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  {isConnected ? (isSpeaking ? "Agent Speaking..." : "Listening...") : "Start Voice Chat"}
                </h3>
                {voiceError ? (
                  <div className="flex items-center justify-center gap-2 text-red-400 bg-red-500/10 p-2 rounded-lg text-xs max-w-xs mx-auto">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{voiceError}</span>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">
                    {isConnected ? "Ask anything about Velto AI" : "Tap below to connect"}
                  </p>
                )}
              </div>
            </div>

            <div className="absolute bottom-8 left-0 w-full flex justify-center gap-4 px-8">
              {!isConnected ? (
                <button 
                  onClick={startVoiceSession}
                  className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-bold shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                >
                  <Phone className="w-5 h-5" /> Connect Agent
                </button>
              ) : (
                <button 
                  onClick={stopVoiceSession}
                  className="w-full py-4 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 rounded-2xl font-bold flex items-center justify-center gap-2 backdrop-blur-md transition-colors"
                >
                  <PhoneOff className="w-5 h-5" /> End Call
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};