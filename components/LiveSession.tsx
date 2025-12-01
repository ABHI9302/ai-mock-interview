import React, { useEffect, useRef, useState } from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { InterviewConfig, TranscriptItem } from '../types';
import { Orb } from './Orb';

interface LiveSessionProps {
  config: InterviewConfig;
  onEnd: () => void;
}

export const LiveSession: React.FC<LiveSessionProps> = ({ config, onEnd }) => {
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { connect, disconnect, isConnected, isAiSpeaking, micVolume, aiVolume } = useGeminiLive({
    onTranscriptUpdate: (item) => {
      setTranscripts(prev => [...prev, item]);
    },
    onConnect: () => {
      console.log("Connected to interview");
    },
    onDisconnect: () => {
      console.log("Disconnected from interview");
    },
    onError: (err) => {
      alert("Error: " + err.message);
      onEnd();
    },
    videoRef: videoRef
  });

  // Auto-connect on mount
  useEffect(() => {
    connect(config);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 glass-panel p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white">{config.jobRole} Interview</h2>
          <p className="text-sm text-slate-400">{config.topic} • {config.difficulty}</p>
        </div>
        <button 
          onClick={() => { disconnect(); onEnd(); }}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg font-medium transition-colors border border-red-500/20"
        >
          End Session
        </button>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px]">
        
        {/* Connection Status */}
        {!isConnected && (
            <div className="absolute z-10 text-blue-400 animate-pulse font-medium tracking-wide">
                ESTABLISHING SECURE CONNECTION...
            </div>
        )}

        {/* AI Visualization */}
        <Orb isActive={isConnected && isAiSpeaking} volume={aiVolume} />
        
        {/* User Camera View */}
        <div className="absolute bottom-0 right-0 w-32 md:w-48 aspect-video bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-700 shadow-xl z-20">
            <video 
                ref={videoRef} 
                className="w-full h-full object-cover transform -scale-x-100" 
                autoPlay 
                muted 
                playsInline 
            />
            {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-slate-400">
                    Camera Off
                </div>
            )}
        </div>
        
        {/* Mic Indicator */}
        <div className="mt-8 flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full transition-colors ${isConnected ? 'bg-green-500' : 'bg-slate-600'}`}></div>
             <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-green-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, micVolume * 500)}%` }}
                ></div>
             </div>
             <span className="text-xs text-slate-500 font-mono">MIC INPUT</span>
        </div>
      </div>

      {/* Transcript Area */}
      <div className="h-64 mt-6 glass-panel rounded-xl flex flex-col overflow-hidden border border-slate-700/50">
        <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-700/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Live Transcript
        </div>
        <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        >
          {transcripts.length === 0 && (
             <div className="text-center text-slate-600 italic mt-10">
                 Listening... The conversation will appear here.
             </div>
          )}
          {transcripts.map((t) => (
            <div 
                key={t.id} 
                className={`flex w-full ${t.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    t.sender === 'user' 
                    ? 'bg-blue-600/20 text-blue-100 border border-blue-500/20 rounded-tr-none' 
                    : 'bg-slate-700/30 text-slate-200 border border-slate-600/30 rounded-tl-none'
                }`}
              >
                <p>{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};