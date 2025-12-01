import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { InterviewConfig, TranscriptItem } from '../types';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio';

interface UseGeminiLiveProps {
  onTranscriptUpdate: (item: TranscriptItem) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (error: Error) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const useGeminiLive = ({
  onTranscriptUpdate,
  onConnect,
  onDisconnect,
  onError,
  videoRef,
}: UseGeminiLiveProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);

  // Audio Contexts & Nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Video State
  const videoIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playback State
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Transcription State Accumulators
  const currentInputTransRef = useRef<string>('');
  const currentOutputTransRef = useRef<string>('');

  // Session Promise
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const aiClientRef = useRef<GoogleGenAI | null>(null);

  const cleanup = useCallback(() => {
    // Stop video interval
    if (videoIntervalRef.current) {
        window.clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
    }

    // Stop media stream (audio + video)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Disconnect Input Nodes
    if (inputSourceRef.current) inputSourceRef.current.disconnect();
    if (inputProcessorRef.current) inputProcessorRef.current.disconnect();
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();

    // Stop all playing audio
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();

    // Disconnect Output Nodes
    if (outputNodeRef.current) outputNodeRef.current.disconnect();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();

    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async (config: InterviewConfig) => {
    try {
      setIsConnected(true); // Optimistic UI update
      
      // 1. Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Output setup (Speaker)
      const outputCtx = outputAudioContextRef.current;
      outputNodeRef.current = outputCtx.createGain();
      outputNodeRef.current.connect(outputCtx.destination);
      
      // Analyser for AI Voice Visualizer
      analyserRef.current = outputCtx.createAnalyser();
      analyserRef.current.fftSize = 256;
      outputNodeRef.current.connect(analyserRef.current);

      // Input setup (Microphone + Camera)
      // Request video with specific constraints if needed, or just true
      const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: { width: 640, height: 480 } 
      });
      streamRef.current = stream;

      // Attach stream to video element for self-view
      if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Error playing video:", e));
      }

      // Initialize internal canvas for frame capture if not already
      if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
      }
      
      const inputCtx = inputAudioContextRef.current;
      inputSourceRef.current = inputCtx.createMediaStreamSource(stream);
      inputProcessorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);
      
      // Mic Volume Visualizer logic
      const inputAnalyser = inputCtx.createAnalyser();
      inputAnalyser.fftSize = 256;
      inputSourceRef.current.connect(inputAnalyser);
      const dataArray = new Uint8Array(inputAnalyser.frequencyBinCount);
      
      // Poll for volume (Simple interval for UI)
      const volumeInterval = setInterval(() => {
        if (!isConnected) { clearInterval(volumeInterval); return; }
        
        // Input Volume
        inputAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
        setMicVolume(sum / dataArray.length / 255);

        // Output Volume
        if (analyserRef.current) {
             const outData = new Uint8Array(analyserRef.current.frequencyBinCount);
             analyserRef.current.getByteFrequencyData(outData);
             let outSum = 0;
             for(let i=0; i<outData.length; i++) outSum += outData[i];
             setAiVolume(outSum / outData.length / 255);
             setIsAiSpeaking(outSum > 10); // Threshold for visual indicator
        }
      }, 100);


      // 2. Initialize Gemini Client
      aiClientRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 3. Connect Live Session
      const systemInstruction = `
        You are an experienced Tech Interviewer conducting a mock interview for a ${config.jobRole} position.
        Topic: ${config.topic}.
        Difficulty: ${config.difficulty}.
        
        You have video access and can see the candidate. 
        If they smile, look confused, or nod, you can acknowledge it naturally in your response (e.g., "I see you're nodding," or "You look a bit puzzled").
        
        Guidelines:
        1. Start by briefly introducing yourself and asking the first relevant technical or behavioral question.
        2. Wait for the candidate's response.
        3. Listen carefully. If the answer is vague, ask follow-up questions.
        4. If the answer is good, acknowledge it briefly and move to the next question.
        5. Keep your speaking turns relatively short (under 45 seconds) to maintain a conversational flow.
        6. Be professional but encouraging.
        7. Do not list all questions at once. Ask one at a time.
      `;

      sessionPromiseRef.current = aiClientRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } },
          },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {}, // Enable user transcription
          outputAudioTranscription: {}, // Enable AI transcription
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Session Opened");
            onConnect();
            
            // A. Connect Audio Pipeline
            if (inputProcessorRef.current && inputSourceRef.current && inputCtx) {
                inputProcessorRef.current.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    sessionPromiseRef.current?.then(session => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };
                inputSourceRef.current.connect(inputProcessorRef.current);
                inputProcessorRef.current.connect(inputCtx.destination);
            }

            // B. Start Video Streaming Loop
            // Send frames @ ~2FPS to give the model vision context without overwhelming bandwidth
            videoIntervalRef.current = window.setInterval(() => {
                if (videoRef.current && canvasRef.current) {
                    const video = videoRef.current;
                    const canvas = canvasRef.current;
                    
                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                        canvas.width = video.videoWidth * 0.5; // Downscale slightly for performance
                        canvas.height = video.videoHeight * 0.5;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                            
                            sessionPromiseRef.current?.then(session => {
                                session.sendRealtimeInput({ 
                                    media: { 
                                        mimeType: 'image/jpeg', 
                                        data: base64 
                                    } 
                                });
                            });
                        }
                    }
                }
            }, 500); // 500ms = 2 FPS
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputCtx && outputNodeRef.current) {
                const audioData = base64ToUint8Array(base64Audio);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                
                try {
                    const buffer = await decodeAudioData(audioData, outputCtx);
                    const source = outputCtx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(outputNodeRef.current);
                    
                    source.onended = () => {
                        activeSourcesRef.current.delete(source);
                        if (activeSourcesRef.current.size === 0) setIsAiSpeaking(false);
                    };
                    
                    source.start(nextStartTimeRef.current);
                    activeSourcesRef.current.add(source);
                    nextStartTimeRef.current += buffer.duration;
                    setIsAiSpeaking(true);
                } catch (err) {
                    console.error("Error decoding audio", err);
                }
            }

            // Handle Interruption
            if (msg.serverContent?.interrupted) {
                console.log("Interrupted by user");
                activeSourcesRef.current.forEach(src => src.stop());
                activeSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsAiSpeaking(false);
            }

            // Handle Transcriptions
            const outTrans = msg.serverContent?.outputTranscription;
            const inTrans = msg.serverContent?.inputTranscription;

            if (outTrans?.text) {
                currentOutputTransRef.current += outTrans.text;
            }
            if (inTrans?.text) {
                currentInputTransRef.current += inTrans.text;
            }

            if (msg.serverContent?.turnComplete) {
                // Flush transcripts to UI
                if (currentInputTransRef.current.trim()) {
                    onTranscriptUpdate({
                        id: Date.now().toString() + '-user',
                        sender: 'user',
                        text: currentInputTransRef.current.trim(),
                        timestamp: new Date(),
                        isFinal: true
                    });
                    currentInputTransRef.current = '';
                }
                
                if (currentOutputTransRef.current.trim()) {
                     onTranscriptUpdate({
                        id: Date.now().toString() + '-ai',
                        sender: 'ai',
                        text: currentOutputTransRef.current.trim(),
                        timestamp: new Date(),
                        isFinal: true
                    });
                    currentOutputTransRef.current = '';
                }
            }
          },
          onclose: () => {
            console.log("Session Closed");
            setIsConnected(false);
            onDisconnect();
          },
          onerror: (err) => {
            console.error("Session Error", err);
            onError(new Error("Connection error occurred."));
            cleanup();
            setIsConnected(false);
          }
        }
      });

    } catch (e: any) {
      console.error(e);
      onError(e);
      setIsConnected(false);
      cleanup();
    }
  }, [onTranscriptUpdate, onConnect, onDisconnect, onError, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
    onDisconnect();
  }, [cleanup, onDisconnect]);

  // Clean up on unmount
  useEffect(() => {
      return () => cleanup();
  }, [cleanup]);

  return {
    connect,
    disconnect,
    isConnected,
    isAiSpeaking,
    micVolume,
    aiVolume
  };
};