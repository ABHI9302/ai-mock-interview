import React, { useState } from 'react';
import { InterviewConfig } from '../types';

interface SetupScreenProps {
  onStart: (config: InterviewConfig) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  const [role, setRole] = useState('Frontend Engineer');
  const [topic, setTopic] = useState('React & System Design');
  const [difficulty, setDifficulty] = useState<InterviewConfig['difficulty']>('Mid-Level');
  const [voice, setVoice] = useState<InterviewConfig['voiceName']>('Puck');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      jobRole: role,
      topic,
      difficulty,
      voiceName: voice
    });
  };

  return (
    <div className="max-w-md mx-auto w-full p-6 glass-panel rounded-2xl shadow-xl animate-fade-in-up">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
          Mock Interview AI
        </h1>
        <p className="text-slate-400">Configure your session to begin</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Target Role</label>
          <input
            type="text"
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-slate-500 transition-all"
            placeholder="e.g. Product Manager"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Focus Topic</label>
          <input
            type="text"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-slate-500 transition-all"
            placeholder="e.g. Conflict Resolution"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
              <div className="relative">
                <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none cursor-pointer"
                >
                    <option value="Junior">Junior</option>
                    <option value="Mid-Level">Mid-Level</option>
                    <option value="Senior">Senior</option>
                    <option value="Expert">Expert</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Interviewer Voice</label>
              <div className="relative">
                <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white appearance-none cursor-pointer"
                >
                    <option value="Puck">Puck (Playful)</option>
                    <option value="Kore">Kore (Calm)</option>
                    <option value="Fenrir">Fenrir (Deep)</option>
                    <option value="Zephyr">Zephyr (Soft)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transform transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Start Interview
        </button>
      </form>
    </div>
  );
};