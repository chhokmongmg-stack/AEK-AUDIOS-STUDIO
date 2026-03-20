import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Mic, MicOff, Video, VideoOff, Loader2 } from 'lucide-react';
import { connectLive } from '../services/geminiService';

interface LiveChatProps {
  onClose: () => void;
  mode: 'audio' | 'video';
}

export default function LiveChat({ onClose, mode }: LiveChatProps) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const audioQueue = useRef<Int16Array[]>([]);
  const isPlaying = useRef(false);

  useEffect(() => {
    startLive();
    return () => stopLive();
  }, []);

  const startLive = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // 1. Get Media Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video' ? { width: 1280, height: 720 } : false
      });
      streamRef.current = stream;
      if (videoRef.current && mode === 'video') {
        videoRef.current.srcObject = stream;
      }

      // 2. Setup Audio Context for recording and playback
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // 3. Connect to Live API
      const sessionPromise = connectLive({
        onopen: () => {
          setIsActive(true);
          setIsConnecting(false);
          console.log('Live session opened');
          
          // Start sending audio
          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (!sessionRef.current) return;
            
            const inputData = e.inputBuffer.getChannelData(0);
            // Convert Float32 to Int16 PCM
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
            }
            
            // Base64 encode
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
            sessionRef.current.sendRealtimeInput({
              media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
          };

          source.connect(processor);
          processor.connect(audioContext.destination);

          // Start sending video frames if in video mode
          if (mode === 'video') {
            startVideoLoop();
          }

          // Prompt Sokcheat to speak immediately
          if (sessionRef.current && sessionRef.current.send) {
            try {
              const greetingText = 'សូមនិយាយស្វាគមន៍មកកាន់ខ្ញុំដោយប្រើប្រយោគថា "ជម្រាបសួរបាទ ខ្ញុំបាទសុខជាតិ" ហើយបន្ទាប់មកឈប់និយាយដើម្បីរង់ចាំខ្ញុំឆ្លើយតប។';
              
              sessionRef.current.send({
                clientContent: {
                  turns: [{ role: 'user', parts: [{ text: greetingText }] }],
                  turnComplete: true
                }
              });
            } catch (e) {
              console.error("Failed to send initial greeting prompt:", e);
            }
          }
        },
        onmessage: (message) => {
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                const base64Audio = part.inlineData.data;
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const pcmData = new Int16Array(bytes.buffer);
                audioQueue.current.push(pcmData);
                if (!isPlaying.current) {
                  playNextInQueue();
                }
              }
            }
          }
          if (message.serverContent?.interrupted) {
            audioQueue.current = [];
            isPlaying.current = false;
          }
        },
        onerror: (err) => {
          console.error('Live API error:', err);
          setError('បាទ សូមអភ័យទោសបង! មានបញ្ហាក្នុងការតភ្ជាប់បន្តិចបាទ។');
          setIsConnecting(false);
        },
        onclose: () => {
          console.log('Live session closed');
          setIsActive(false);
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error('Failed to start live:', err);
      setError('បាទ សូមអភ័យទោសបង! មិនអាចបើកកាមេរ៉ា ឬមីក្រូហ្វូនបានទេបាទ។');
      setIsConnecting(false);
    }
  };

  const stopLive = () => {
    setIsActive(false);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startVideoLoop = () => {
    const captureFrame = () => {
      if (!isActive || !videoRef.current || !canvasRef.current || !sessionRef.current) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        sessionRef.current.sendRealtimeInput({
          media: { data: base64Image, mimeType: 'image/jpeg' }
        });
      }
      setTimeout(captureFrame, 500); // Send frame every 500ms (2fps)
    };
    captureFrame();
  };

  const playNextInQueue = async () => {
    if (audioQueue.current.length === 0 || !audioContextRef.current) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const pcmData = audioQueue.current.shift()!;
    
    // Model sends 24000Hz, we need to play it back
    // Web Audio API works better if we create a buffer
    const audioContext = audioContextRef.current;
    const audioBuffer = audioContext.createBuffer(1, pcmData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 0x7FFF;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => playNextInQueue();
    source.start();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md"
    >
      <div className="relative w-full h-full md:max-w-6xl md:max-h-[85vh] bg-black md:bg-[#1a1a1a] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col border-0 md:border border-[#333]">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-white text-sm font-medium khmer-serif">
              {isActive ? 'កំពុងផ្សាយបន្តផ្ទាល់ (Live)' : 'កំពុងរៀបចំ...'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Feed */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {/* Sokcheat Avatar (Main Screen) */}
          <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
            <img 
              src="https://image.pollinations.ai/prompt/Young%20handsome%2020%20year%20old%20Cambodian%20man%20with%20authentic%20Khmer%20brown%20skin%20tone,%20wearing%20a%20smart%20casual%20suit,%20half%20body%20shot.%20Background%20is%20a%20high-tech%20futuristic%20technology%20environment%20with%20a%20clear%20Cambodian%20flag%20displayed%20prominently%20behind%20him.%20Realistic%20photography,%204k,%20highly%20detailed?width=1024&height=1024&nologo=true&seed=888" 
              alt="Sokcheat Live Avatar" 
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover ${isActive ? 'animate-[breathe_4s_ease-in-out_infinite]' : 'opacity-50 grayscale'}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-4.0.3&auto=format&fit=crop&w=1024&q=80";
              }}
            />
            {/* Audio visualizer effect when active */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-8 gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2 bg-[#00ff00] rounded-full animate-pulse" style={{ height: `${Math.random() * 40 + 10}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
          </div>

          {/* User Camera (PiP) */}
          {mode === 'video' && (
            <div className="absolute top-16 right-4 w-32 h-40 bg-black rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-20">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
          )}
          
          <canvas ref={canvasRef} width="640" height="480" className="hidden" />
          
          {isConnecting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white gap-4 z-30">
              <Loader2 className="animate-spin" size={48} />
              <p className="khmer-serif">បាទ សូមរង់ចាំបន្តិចបង...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-6 text-center gap-4 z-30">
              <p className="khmer-serif text-lg">{error}</p>
              <button 
                onClick={onClose}
                className="olive-button"
              >
                បិទវិញ
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex justify-center items-center gap-6 z-20">
          <div className="flex flex-col items-center gap-1">
            <div className={`p-4 rounded-full backdrop-blur-md ${isActive ? 'bg-[#1ebbb4]/30 text-[#1ebbb4]' : 'bg-white/10 text-white'}`}>
              <Mic size={24} />
            </div>
            <span className="text-[10px] uppercase tracking-tighter text-white/70">Audio</span>
          </div>
          
          <button 
            onClick={onClose}
            className="px-8 py-4 bg-red-600/90 text-white rounded-full font-bold shadow-lg hover:bg-red-500 transition-colors khmer-serif border border-red-500/50"
          >
            បញ្ឈប់ការសន្ទនា
          </button>

          <div className="flex flex-col items-center gap-1">
            <div className={`p-4 rounded-full backdrop-blur-md ${isActive && mode === 'video' ? 'bg-[#1ebbb4]/30 text-[#1ebbb4]' : 'bg-white/10 text-white'}`}>
              {mode === 'video' ? <Video size={24} /> : <VideoOff size={24} />}
            </div>
            <span className="text-[10px] uppercase tracking-tighter text-white/70">Video</span>
          </div>
        </div>

        {/* Persona Overlay */}
        {isActive && (
          <div className="absolute bottom-36 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/60 backdrop-blur-md text-[#1ebbb4] rounded-full text-sm khmer-serif shadow-lg border border-[#1ebbb4]/30 z-20 whitespace-nowrap">
            "ប្អូនប្រុស សុខជាតិ កំពុងស្ដាប់បងៗបាទ..."
          </div>
        )}
      </div>
    </motion.div>
  );
}
