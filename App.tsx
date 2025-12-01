import React, { useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { LiveSession } from './components/LiveSession';
import { InterviewConfig, InterviewState } from './types';

function App() {
  const [appState, setAppState] = useState<InterviewState>(InterviewState.SETUP);
  const [config, setConfig] = useState<InterviewConfig | null>(null);

  const handleStart = (newConfig: InterviewConfig) => {
    setConfig(newConfig);
    setAppState(InterviewState.LIVE);
  };

  const handleEnd = () => {
    setAppState(InterviewState.SETUP);
    // In a real app, we might go to a FEEDBACK state here.
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 flex items-center justify-center overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative w-full z-10">
        {appState === InterviewState.SETUP && (
          <SetupScreen onStart={handleStart} />
        )}

        {appState === InterviewState.LIVE && config && (
          <LiveSession config={config} onEnd={handleEnd} />
        )}
      </div>
    </div>
  );
}

export default App;