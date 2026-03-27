import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Menu, Diamond, Plus, Mic, User, Music, ListMusic, BookOpen,
  Film, Folder, Settings, Heart, Image as ImageIcon, Loader2, Send, Download,
  ChevronUp, ChevronDown, X, Paperclip, FileText, Video, Volume2, Square, Save, Edit, Play
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Message, streamWithMolyza, generateSpeech } from './services/geminiService';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'បាទ សួស្តីបង! ខ្ញុំបាទឈ្មោះ សុខជាតិ ជាជំនួយការនិពន្ធ Script និង Storyboard។ តើបងចង់ឱ្យប្អូនជួយនិពន្ធរឿងប្រភេទណាដែរបាទ?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('Cinema កំសត់');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('selectedVoice') || 'Molyza');
  const [showFilmOptions, setShowFilmOptions] = useState(false);
  const [showNewsOptions, setShowNewsOptions] = useState(false);
  const [showMusicOptions, setShowMusicOptions] = useState(false);
  const [showDharmaOptions, setShowDharmaOptions] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pitch, setPitch] = useState<number>(() => {
    const saved = localStorage.getItem('pitch');
    return saved ? parseFloat(saved) : 0;
  });

  useEffect(() => {
    localStorage.setItem('selectedVoice', selectedVoice);
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem('pitch', pitch.toString());
  }, [pitch]);

  const voices = [
    { id: 'Sucheat', name: 'អ្នកគ្រូ សុជាតិ', enName: 'Sucheat', gender: 'ស្រី', age: '៣៥ ឆ្នាំ', preview: 'ចាស់ជំរាបសួរបងៗ ខ្ញុំឈ្មោះសុជាតិ ជាជំនួយការផ្នែកចំណេះដឹងទូទៅ និងធម៌វិន័យចាស' },
    { id: 'Menglong', name: 'អូន ម៉េងឡុង', enName: 'Menglong', gender: 'ប្រុស', age: '១៥ ឆ្នាំ', preview: 'បាទបងៗ ខ្ញុំឈ្មោះអូនម៉េងឡុង បងបងត្រូវការឱ្យខ្ញុំជួយការងារអ្វីថ្ងៃនេះបងៗបាទ' },
    { id: 'Menglang', name: 'អូន ម៉េងឡាំង', enName: 'Menglang', gender: 'ប្រុស', age: '១០ ឆ្នាំ', preview: 'បាទបងៗ ខ្ញុំឈ្មោះអូនម៉េងឡាំង បងបងត្រូវការឱ្យខ្ញុំជួយការងារអ្វីថ្ងៃនេះបងៗបាទ' },
    { id: 'Molyza', name: 'អូន ម៉ូលីសា', enName: 'Molyza', gender: 'ស្រី', age: '៨ ឆ្នាំ', preview: 'ចាស់ជំរាបសួរបងៗ អូនឈ្មោះម៉ូលីសា បងៗមានការងារឱ្យអូនម៉ូលីសា ជួយការងារអ្វីសំខាន់ថ្ងៃនេះបងៗចាស' },
    { id: 'Layheak', name: 'អូន ឡាយហៀក', enName: 'Layheak', gender: 'ស្រី', age: '២២ ឆ្នាំ', preview: 'ចាស់ជំរាបសួរបងៗ អូនឈ្មោះឡាយហៀក បងបង ថ្ងៃនេះបងៗចង់ឱ្យខ្ញុំជួយការងារអ្វីដែរបងៗ បងបងចាស' }
  ];
  const [attachments, setAttachments] = useState<{file: File, base64: string, mimeType: string, url: string}[]>([]);
  const [readingIndex, setReadingIndex] = useState<number | null>(null);
  const [readingLine, setReadingLine] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    const saved = localStorage.getItem('playbackRate');
    return saved ? parseFloat(saved) : 1.0;
  });

  useEffect(() => {
    localStorage.setItem('playbackRate', playbackRate.toString());
  }, [playbackRate]);
  
  const [isPaused, setIsPaused] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeAudioRef = useRef<{sources: AudioBufferSourceNode[], ctx: AudioContext, nextStartTime: number, isPlaying: boolean} | null>(null);

  // Update playback rate of currently playing audio if it changes
  useEffect(() => {
    if (activeAudioRef.current && activeAudioRef.current.sources) {
      try {
        activeAudioRef.current.sources.forEach(source => {
          source.playbackRate.value = playbackRate;
          source.detune.value = pitch;
        });
      } catch (e) {
        console.error("Could not update playback rate", e);
      }
    }
  }, [playbackRate, pitch]);

  const genres = [
    'Cinema កំសត់', 'ស្នេហាភ្លើងប្រច័ណ្ឌ', 'អប់រំច្បាប់/គុណធម៌', 
    'ភ័យខ្លាចរន្ធត់', 'សង្គ្រាមបុរាណ', 'សង្គ្រាមស្ដេចបុរាណ'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    chatContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Check file size (limit to 5MB per file)
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
    if (validFiles.length < files.length) {
      alert("សូមអភ័យទោស! ឯកសារខ្លះមានទំហំធំជាង 5MB មិនអាចបញ្ជូនបានទេ។");
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!reader.result) return;
        const base64String = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          file,
          base64: base64String,
          mimeType: file.type || 'image/jpeg',
          url: URL.createObjectURL(file)
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAtt = [...prev];
      URL.revokeObjectURL(newAtt[index].url);
      newAtt.splice(index, 1);
      return newAtt;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      text: input.trim() ? `[ប្រភេទរឿង: ${selectedGenre}] ${input}` : `[ប្រភេទរឿង: ${selectedGenre}] សូមពិនិត្យមើលឯកសារនេះ។`,
      attachments: attachments.map(a => ({ mimeType: a.mimeType, data: a.base64, url: a.url }))
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const modelMessage: Message = { role: 'model', text: '' };
      setMessages((prev) => [...prev, modelMessage]);

      let fullText = '';
      let imageStarted = false;
      const stream = streamWithMolyza([...messages, userMessage]);
      
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', text: fullText };
          return newMessages;
        });
      }

    } catch (error: any) {
      console.error('Error chatting with Molyza:', error);
      let errorMessage = 'បាទ សូមអភ័យទោសបង! មានបញ្ហាបច្ចេកទេសបន្តិចបន្តួច ប្អូនមិនអាចឆ្លើយបានទេបាទ។';
      
      const errorStr = String(error);
      if (errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('429') || errorStr.includes('Quota exceeded')) {
        errorMessage = 'បាទ សូមអភ័យទោសបង! ដោយសារតែមានអ្នកប្រើប្រាស់ច្រើនពេក ធ្វើឱ្យកូតា (Quota) របស់ប្អូនអស់បណ្ដោះអាសន្ន។ សូមបងរង់ចាំបន្តិច ឬសាកល្បងម្ដងទៀតនៅពេលក្រោយ ឬប្រើប្រាស់ API Key ផ្ទាល់ខ្លួនរបស់បងបាទ។';
      }
      
      setMessages((prev) => {
        const newMessages = [...prev];
        // If the last message was the empty model message, replace it
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'model' && !newMessages[newMessages.length - 1].text) {
          newMessages[newMessages.length - 1] = { role: 'model', text: errorMessage };
          return newMessages;
        }
        return [...prev, { role: 'model', text: errorMessage }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (text: string, index: number) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Molyza_Script_${index}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveProject = (text: string) => {
    const projects = JSON.parse(localStorage.getItem('molyza_projects') || '[]');
    projects.push({ id: Date.now(), text, date: new Date().toISOString() });
    localStorage.setItem('molyza_projects', JSON.stringify(projects));
    alert("គម្រោងត្រូវបានរក្សាទុកដោយជោគជ័យបាទ!");
  };

  const handleEditScript = (text: string) => {
    setInput(text);
    const form = document.getElementById('chat-form');
    form?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleContinueStory = () => {
    const continueMessage = "សូមបន្តសាច់រឿង";
    setInput(continueMessage);
    // We need to trigger the submit, but since it's an event, we can just call a modified handleSubmit or extract the logic.
    // Let's just set the input and simulate a form submission.
    setTimeout(() => {
      const form = document.getElementById('chat-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 100);
  };

  const handleReadScript = async (text: string, index?: number) => {
    if (index !== undefined && readingIndex === index) {
      if (activeAudioRef.current) {
        if (isPaused) {
          activeAudioRef.current.ctx.resume();
          setIsPaused(false);
        } else {
          activeAudioRef.current.ctx.suspend();
          setIsPaused(true);
        }
      }
      return;
    }

    // Stop any currently playing audio
    if (activeAudioRef.current) {
      activeAudioRef.current.sources.forEach(s => { try { s.stop(); } catch(e){} });
      activeAudioRef.current.ctx.close();
      setIsPaused(false);
    }

    if (index !== undefined) setReadingIndex(index);

    setReadingLine(text);
    try {
      const voiceConfigs: Record<string, { voice: string, intro: string }> = {
        'Sucheat': { voice: 'Charon', intro: "សួស្តីបង ខ្ញុំឈ្មោះ សុជាតិចាស។ \n\n" },
        'Menglong': { voice: 'Fenrir', intro: "សួស្តីបង ញុំឈ្មោះ អូន ម៉េងឡុងបាទ។ \n\n" },
        'Menglang': { voice: 'Puck', intro: "សួស្តីបង ញុំបាទឈ្មោះ អូន ម៉េងឡាំងបាទ។\n\n" },
        'Molyza': { voice: 'Kore', intro: "សួស្តីបងចាស់ ញុំឈ្មោះ អូន ម៉ូលីសចាស់។\n\n" },
        'Layheak': { voice: 'Zephyr', intro: "សួស្តីបង ញុំឈ្មោះ ឡាយហៀកចាស់។\n\n" }
      };

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      activeAudioRef.current = { sources: [], ctx: audioCtx, nextStartTime: audioCtx.currentTime, isPlaying: true };

      // Parse text for multiple characters
      const lines = text.split('\n');
      const segments: { voice: string, text: string }[] = [];

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let detectedVoice = (voiceConfigs[selectedVoice] || voiceConfigs['Molyza']).voice;
        let cleanLine = trimmed;

        if (trimmed.includes('សុជាតិ៖') || trimmed.includes('Sucheat:')) {
          detectedVoice = 'Charon';
          cleanLine = trimmed.replace(/.*(សុជាតិ៖|Sucheat:)/, '').trim();
        } else if (trimmed.includes('ម៉េងឡុង៖') || trimmed.includes('Menglong:')) {
          detectedVoice = 'Fenrir';
          cleanLine = trimmed.replace(/.*(ម៉េងឡុង៖|Menglong:)/, '').trim();
        } else if (trimmed.includes('ម៉េងឡាំង៖') || trimmed.includes('Menglang:') || trimmed.includes('ឡាំង៖') || trimmed.includes('Lang:')) {
          detectedVoice = 'Puck';
          cleanLine = trimmed.replace(/.*(ម៉េងឡាំង៖|Menglang:|ឡាំង៖|Lang:)/, '').trim();
        } else if (trimmed.includes('ម៉ូលីសា៖') || trimmed.includes('Molyza:')) {
          detectedVoice = 'Kore';
          cleanLine = trimmed.replace(/.*(ម៉ូលីសា៖|Molyza:)/, '').trim();
        } else if (trimmed.includes('ឡាយហៀក៖') || trimmed.includes('Layheak:')) {
          detectedVoice = 'Zephyr';
          cleanLine = trimmed.replace(/.*(ឡាយហៀក៖|Layheak:)/, '').trim();
        }
        if (cleanLine) {
          segments.push({ voice: detectedVoice, text: cleanLine.replace(/[#*`_]/g, '') });
        }
      });

      // If no segments found (no character tags), read the whole text with selected voice
      if (segments.length === 0) {
        const config = voiceConfigs[selectedVoice] || voiceConfigs['Molyza'];
        segments.push({ voice: config.voice, text: (config.intro + text).replace(/[#*`_]/g, '') });
      }

      for (const segment of segments) {
        if (!activeAudioRef.current?.isPlaying) break;
        
        const base64Audio = await generateSpeech(segment.text, segment.voice);
        
        if (base64Audio && activeAudioRef.current?.isPlaying) {
          const binaryString = window.atob(base64Audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const buffer = new Int16Array(bytes.buffer);
          const audioBuffer = audioCtx.createBuffer(1, buffer.length, 24000);
          const channelData = audioBuffer.getChannelData(0);
          for (let i = 0; i < buffer.length; i++) {
            channelData[i] = buffer[i] / 32768.0;
          }
          
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = playbackRate;
          source.detune.value = pitch;
          source.connect(audioCtx.destination);
          
          const startTime = Math.max(audioCtx.currentTime, activeAudioRef.current.nextStartTime);
          source.start(startTime);
          activeAudioRef.current.nextStartTime = startTime + (audioBuffer.duration / playbackRate);
          activeAudioRef.current.sources.push(source);
          
          source.onended = () => {
            if (activeAudioRef.current) {
              const idx = activeAudioRef.current.sources.indexOf(source);
              if (idx > -1) activeAudioRef.current.sources.splice(idx, 1);
              if (activeAudioRef.current.sources.length === 0 && activeAudioRef.current.nextStartTime <= audioCtx.currentTime + 0.1) {
                setReadingIndex(null);
                setIsPaused(false);
                activeAudioRef.current = null;
              }
            }
          };

          // Wait a bit before next segment to avoid overlapping if nextStartTime logic is slightly off
          // or just to give a natural pause and reduce rate limit hits
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } catch (error) {
      console.error("Failed to read script:", error);
      setReadingIndex(null);
      setIsPaused(false);
      
      let errorMessage = "បរាជ័យក្នុងការអានអត្ថបទ។ សូមពិនិត្យមើល API Key របស់អ្នក។";
      const errorStr = String(error);
      if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("Quota exceeded")) {
        errorMessage = "អ្នកបានប្រើប្រាស់អស់កូតា (Quota Exceeded)។ សូមពិនិត្យមើលគម្រោង និងការបង់ប្រាក់របស់អ្នកនៅលើ Google Cloud (https://ai.google.dev/gemini-api/docs/rate-limits)។";
      }
      alert(errorMessage);
    }
  };

  const handleReadLine = async (text: string) => {
    if (readingLine === text) {
      if (activeAudioRef.current) {
        if (isPaused) {
          activeAudioRef.current.ctx.resume();
          setIsPaused(false);
        } else {
          activeAudioRef.current.ctx.suspend();
          setIsPaused(true);
        }
      }
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.sources.forEach(s => { try { s.stop(); } catch(e){} });
      activeAudioRef.current.ctx.close();
      setIsPaused(false);
    }

    setReadingLine(text);
    try {
      const voiceConfigs: Record<string, { voice: string }> = {
        'Sucheat': { voice: 'Charon' },
        'Menglong': { voice: 'Fenrir' },
        'Menglang': { voice: 'Puck' },
        'Molyza': { voice: 'Kore' },
        'Layheak': { voice: 'Zephyr' }
      };

      const voiceName = (voiceConfigs[selectedVoice] || voiceConfigs['Molyza']).voice;
      const cleanText = text.replace(/[#*`_]/g, '');
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      activeAudioRef.current = { sources: [], ctx: audioCtx, nextStartTime: audioCtx.currentTime, isPlaying: true };
      
      const base64Audio = await generateSpeech(cleanText, voiceName);
      
      if (base64Audio && activeAudioRef.current?.isPlaying) {
        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const buffer = new Int16Array(bytes.buffer);
        const audioBuffer = audioCtx.createBuffer(1, buffer.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) {
          channelData[i] = buffer[i] / 32768.0;
        }
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackRate;
        source.detune.value = pitch;
        source.connect(audioCtx.destination);
        
        const startTime = Math.max(audioCtx.currentTime, activeAudioRef.current.nextStartTime);
        source.start(startTime);
        activeAudioRef.current.nextStartTime = startTime + (audioBuffer.duration / playbackRate);
        activeAudioRef.current.sources.push(source);
        
        source.onended = () => {
          if (activeAudioRef.current) {
            const idx = activeAudioRef.current.sources.indexOf(source);
            if (idx > -1) activeAudioRef.current.sources.splice(idx, 1);
            if (activeAudioRef.current.sources.length === 0 && activeAudioRef.current.nextStartTime <= audioCtx.currentTime + 0.1) {
              setReadingLine(null);
              setIsPaused(false);
              activeAudioRef.current = null;
            }
          }
        };
      }
    } catch (error) {
      console.error("Failed to read line:", error);
      setReadingLine(null);
      setIsPaused(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#431414] text-gray-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`w-full md:w-[320px] lg:w-[350px] h-full bg-[#2b2121] flex flex-col p-4 gap-6 overflow-y-auto shrink-0 transition-transform duration-300 absolute md:relative z-50 rounded-[22px] text-[23px] shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Mobile Close Button */}
        <button 
          className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X size={24} />
        </button>

        {/* Logo Section */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="ai-badge">AI</div>
          <div className="neon-text font-bold text-lg tracking-wider">ចម្លាក់ Studio AI</div>
        </div>
        {/* Voice Personas Selection */}
        <div className="shrink-0">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">អាន Script </div>
          <div className="grid grid-cols-2 gap-2">
            {voices.map((voice, idx) => {
              let voiceBg = 'bg-black/40';
              if (idx === 0) voiceBg = 'bg-[#2f34ad]';
              else if (idx === 1) voiceBg = 'bg-[#3c7214]';
              else if (idx === 2) voiceBg = 'bg-[#651a70]';
              else if (idx === 3) voiceBg = 'bg-[#860f56]';
              
              return (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all border cursor-pointer shadow-sm ${
                    selectedVoice === voice.id 
                      ? 'border-maroon-500 bg-maroon-900/20 shadow-[0_0_10px_rgba(255,0,0,0.2)]' 
                      : `border-gray-800 ${voiceBg} hover:border-gray-600`
                  }`}
                >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] font-bold text-white leading-tight">{voice.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReadScript(voice.preview);
                    }}
                    className="p-1 rounded-full bg-maroon-600 hover:bg-maroon-500 text-white transition-colors"
                  >
                    <Play size={10} fill="currentColor" />
                  </button>
                  <span className="text-[8px] text-gray-400 uppercase tracking-tighter">{voice.enName}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

        {/* Avatar Section */}
        <div className="maroon-border p-2 bg-black relative overflow-hidden group rounded-[14px] shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <div className="aspect-[3/4] rounded-[10px] overflow-hidden relative border-2 border-dashed border-gray-700">
            <img 
              src="https://image.pollinations.ai/prompt/Young%20cute%208%20year%20old%20Cambodian%20girl%20with%20authentic%20Khmer%20brown%20skin%20tone,%20wearing%20a%20traditional%20Khmer%20dress,%20smiling%20brightly,%20half%20body%20shot.%20Background%20is%20a%20high-tech%20futuristic%20technology%20environment%20with%20a%20clear%20Cambodian%20flag%20displayed%20prominently%20behind%20her.%20Realistic%20photography,%204k,%20highly%20detailed?width=1024&height=1024&nologo=true&seed=999" 
              alt="Molyza Avatar" 
              referrerPolicy="no-referrer" 
              className="w-full h-full object-cover opacity-90 animate-[breathe_4s_ease-in-out_infinite]"
            />
            <div className="absolute bottom-3 right-3 ai-badge text-[8px] shadow-lg">AI</div>
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
             <div className="flex items-center justify-center gap-2 bg-black/60 backdrop-blur-sm mx-4 py-1 rounded-full border border-white/10">
                <span className="text-white font-bold text-sm">ចម្លាក់ Studio AI</span>
                <span className="neon-text text-[10px] font-bold">ចម្លាក់ Studio AI</span>
             </div>
          </div>
        </div>

        
        {/* Main Menu */}
        <div className="flex flex-col gap-2 shrink-0">
          <button 
            className={`sidebar-menu-btn ${showFilmOptions ? 'bg-dash-accent/20 border-dash-accent/40' : ''}`}
            onClick={() => setShowFilmOptions(!showFilmOptions)}
          >
            <Film size={18} className="text-white" /> FILM
          </button>
          
          <AnimatePresence>
            {showFilmOptions && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-col gap-1 pl-8 overflow-hidden"
              >
                <div className="text-[10px] text-gray-400 mb-1 mt-1">ប្រភេទ:</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {['ACTION', 'COMEDY', 'DRAMA', 'HORROR', 'SCI-FI', 'HISTORICAL', 'EDUCATIONAL'].map(type => (
                    <button key={type} className="text-[9px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300">
                      {type}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-gray-400 mb-1">ប្លង់ទ្រូន (DRONE):</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {['លើចុះ-មុខ', 'លើចុះ-ក្រោយ', 'លើចុះ-ឆ្វេង', 'លើចុះ-ស្ដាំ'].map(drone => (
                    <button key={drone} className="text-[9px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300">
                      {drone}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            className={`sidebar-menu-btn ${showNewsOptions ? 'bg-dash-accent/20 border-dash-accent/40' : ''}`}
            onClick={() => setShowNewsOptions(!showNewsOptions)}
          >
            <Music size={18} className="text-gray-400" /> NEWS
          </button>

          <AnimatePresence>
            {showNewsOptions && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-col gap-1 pl-8 overflow-hidden"
              >
                <div className="text-[10px] text-gray-400 mb-1 mt-1">ជម្រើស:</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {['ព័ត៌មានសង្គម', 'ទាន់ហេតុការណ៍', 'សុខភាព', 'ចំណេះដឹង', 'បុគ្គល', 'អប់រំ'].map(type => (
                    <button key={type} className="text-[9px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300">
                      {type}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            className={`sidebar-menu-btn ${showMusicOptions ? 'bg-dash-accent/20 border-dash-accent/40' : ''}`}
            onClick={() => setShowMusicOptions(!showMusicOptions)}
          >
            <ListMusic size={18} className="text-gray-400" /> MUSIC
          </button>

          <AnimatePresence>
            {showMusicOptions && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-col gap-1 pl-8 overflow-hidden"
              >
                <div className="text-[10px] text-gray-400 mb-1 mt-1">ជម្រើស:</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {['មនោសញ្ចេតនា', 'ញាក់', 'កន្ត្រឹម/ឡាំលាវ', 'Hip-hop'].map(type => (
                    <button key={type} className="text-[9px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300">
                      {type}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-gray-400 mb-1">ភាសា:</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {['ខ្មែរ', 'កូរ៉េ', 'ចិន', 'វៀតណាម', 'ម៉ាឡេស៊ី', 'បារាំង', 'អង់គ្លេស', 'ជប៉ុន', 'ឥណ្ឌូនេស៊ី'].map(lang => (
                    <button key={lang} className="text-[9px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300">
                      {lang}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            className={`sidebar-menu-btn ${showDharmaOptions ? 'bg-dash-accent/20 border-dash-accent/40' : ''}`}
            onClick={() => setShowDharmaOptions(!showDharmaOptions)}
          >
            <BookOpen size={18} className="text-yellow-500" /> DHARMA
          </button>

          <AnimatePresence>
            {showDharmaOptions && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-col gap-1 pl-8 overflow-hidden"
              >
                <div className="text-[10px] text-gray-400 mb-1 mt-1">ចំណេះដឹងធម៌:</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {['ព្រះត្រៃបិដក', 'ធម្មបទ', 'ពាក្យពេចន៍មាស', 'តេស្តស្មារតី'].map(type => (
                    <button 
                      key={type} 
                      onClick={() => {
                        if (type === 'ពាក្យពេចន៍មាស') setShowQuotes(true);
                        if (type === 'តេស្តស្មារតី') {
                          setInput("តើអ្វីទៅជាសន្តិភាពពិតប្រាកដ? ហើយតើបច្ចេកវិទ្យាអាចជួយដល់សន្តិភាពបានយ៉ាងដូចម្តេច?");
                        }
                      }}
                      className="text-[9px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </aside>
      <div className="flex-1 flex flex-col overflow-hidden p-2 md:p-4 gap-4 relative bg-[#431414]">
        {/* Header */}
        <header className="h-16 bg-black border border-dash-border flex items-center px-4 md:px-6 justify-between shrink-0 rounded-2xl">
           <div className="flex items-center gap-4">
             <button 
               className="md:hidden text-gray-400 hover:text-white"
               onClick={() => setIsSidebarOpen(true)}
             >
               <Menu size={24} />
             </button>
             <div className="flex items-center gap-3">
               <div className="ai-badge">AI</div>
               <div className="neon-text font-bold text-lg tracking-wider hidden sm:block">ចម្លាក់ Studio AI</div>
             </div>
           </div>
           
           <nav className="hidden lg:flex gap-8 text-[11px] font-bold tracking-widest text-gray-400">
             <a href="#" className="hover:text-white transition-colors">FILM</a>
             <a href="#" className="hover:text-white transition-colors">NEWS</a>
             <a href="#" className="hover:text-white transition-colors">MUSIC</a>
             <a href="#" className="hover:text-white transition-colors">DHARMA</a>
           </nav>

           <div className="flex items-center gap-4">
             <div className="relative hidden md:block">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
               <input type="text" placeholder="Search by Film, Actor, Ligl..." className="bg-[#1a1a1a] border border-[#333] rounded-full py-1.5 pl-8 pr-4 text-xs w-48 lg:w-64 focus:outline-none focus:border-dash-accent text-white placeholder-gray-600 transition-colors" />
             </div>
             <div className="flex items-center gap-2">
                <div className="text-2xl font-serif text-white border-2 border-white px-2 leading-none pb-1">AI</div>
                <div className="w-8 h-8 rounded-full bg-dash-accent flex items-center justify-center text-white text-xs font-bold">A</div>
             </div>
           </div>
        </header>

        {/* Content Area */}
        <main style={{ backgroundColor: '#968787', borderRadius: '29px' }} className="flex-1 overflow-y-auto flex flex-col gap-4 relative p-1 md:p-2">
           {/* Top Half */}
           <div className="flex flex-col lg:flex-row gap-4 min-h-fit lg:h-[60vh]">
              {/* Left Column (Chat/Input) */}
              <div className="flex-1 flex flex-col gap-4 p-4 bg-[#162f39] rounded-[26px] border border-gray-200 shadow-sm">
                 {/* Input Area */}
                 <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center px-2 py-1 border-b border-gray-100">
                       <span className="text-white text-[10px] font-bold uppercase tracking-widest">បង្កើត Script ភាពយន្ត</span>
                       <div className="flex items-center gap-2">
                          <button className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> RECORD
                          </button>
                          <button className="flex items-center gap-1 text-[10px] font-bold text-[#000000] bg-gray-50 px-2 py-1 rounded border border-gray-100">
                             <Paperclip size={10} /> ATTACH
                          </button>
                       </div>
                    </div>

                    <div className="flex justify-between items-center px-2 py-1 border-b border-gray-100">
                       <span className="text-white text-[10px] font-bold uppercase tracking-widest">បង្រ្កាប Script "ព័ត៌មាន"</span>
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setShowSettings(true)}
                            className="flex items-center gap-1 text-[10px] font-bold text-[#000000] bg-gray-50 px-2 py-1 rounded border border-gray-100 ml-[-6px] mr-[11px]"
                          >
                             <Settings size={10} /> OPTION
                          </button>
                          <button className="flex items-center gap-1 text-[10px] font-bold text-[#000000] bg-gray-50 px-2 py-1 rounded border border-gray-100 ml-[4px] mr-[21px]">
                             <Volume2 size={10} /> VOICE
                          </button>
                       </div>
                    </div>

                    <div className="bg-[#0e2d4a] rounded-2xl p-4 flex flex-col gap-3 border border-gray-100">
                       <form id="chat-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
                          <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="សរសេរអ្វីមួយនៅទីនេះ..."
                            className="w-full bg-[#2e2b2b] rounded-[15px] resize-none focus:outline-none placeholder-gray-400 text-white text-lg min-h-[100px]"
                          />
                          
                          <div className="flex justify-between items-center">
                             <div className="flex gap-2">
                                <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="bg-[#120808] text-[10px] rounded px-2 py-1 border border-gray-200 text-white focus:outline-none font-bold">
                                   {genres.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                             </div>
                             <button type="submit" disabled={isLoading} className="bg-[#005e69] text-white font-bold px-6 py-2 rounded-full text-xs flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-dash-accent/20">
                                <Send size={14} /> បញ្ជូន
                             </button>
                          </div>
                       </form>
                 </div>
                 </div>

                 {/* Chat History */}
                 <div ref={chatContainerRef} className="flex-1 overflow-y-auto bg-[#0b1329] rounded-3xl p-4 relative border border-gray-100">
                    <div className="space-y-4 pb-8">
                       {messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-dash-accent text-white' : 'bg-[#0b5b68] border border-gray-100 text-white'}`}>
                                <div className="markdown-body text-left text-sm md:text-base">
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      {msg.attachments.map((att, aIdx) => (
                                        <div key={aIdx} className="w-24 h-24 rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
                                          {att.mimeType.startsWith('image/') ? (
                                            <img src={att.url || `data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center">
                                              <FileText size={24} className="text-gray-400" />
                                              <span className="text-[10px] text-gray-500 mt-2">Document</span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <Markdown
                                    components={{
                                      p: ({node, children}) => {
                                        const extractText = (child: any): string => {
                                          if (typeof child === 'string') return child;
                                          if (Array.isArray(child)) return child.map(extractText).join('');
                                          if (child && child.props && child.props.children) return extractText(child.props.children);
                                          return '';
                                        };
                                        const text = extractText(children);
                                        return (
                                          <div className="group relative pr-8 mb-4">
                                            <p className="bg-[#1d1c1c] rounded-[14px] p-2">{children}</p>
                                            {msg.role === 'model' && text.length > 10 && (
                                              <>
                                                <button 
                                                  onClick={() => handleReadLine(text)}
                                                  className={`absolute top-0 right-0 p-1.5 rounded transition-colors ${
                                                    readingLine === text 
                                                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 opacity-100' 
                                                      : 'bg-gray-100 text-gray-400 hover:bg-dash-accent hover:text-white opacity-0 group-hover:opacity-100'
                                                  }`}
                                                  title={readingLine === text ? (isPaused ? "បន្តការអាន" : "ផ្អាកការអាន") : "អានបន្ទាត់នេះ"}
                                                >
                                                  {readingLine === text ? (isPaused ? <Play size={14} className="fill-current" /> : <Square size={14} className="fill-current" />) : <Volume2 size={14} />}
                                                </button>
                                                {readingLine === text && (
                                                  <button 
                                                    onClick={() => {
                                                      if (activeAudioRef.current) {
                                                        activeAudioRef.current.isPlaying = false;
                                                        activeAudioRef.current.sources.forEach(s => { try { s.stop(); } catch(e){} });
                                                        activeAudioRef.current.ctx.close();
                                                        activeAudioRef.current = null;
                                                      }
                                                      setReadingLine(null);
                                                      setIsPaused(false);
                                                    }}
                                                    className="absolute top-0 right-8 p-1.5 rounded transition-colors bg-red-500/10 text-red-500 hover:bg-red-500/20 opacity-100"
                                                    title="បញ្ឈប់ការអាន"
                                                  >
                                                    <X size={14} />
                                                  </button>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        );
                                      },
                                      li: ({node, children}) => {
                                        const extractText = (child: any): string => {
                                          if (typeof child === 'string') return child;
                                          if (Array.isArray(child)) return child.map(extractText).join('');
                                          if (child && child.props && child.props.children) return extractText(child.props.children);
                                          return '';
                                        };
                                        const text = extractText(children);
                                        return (
                                          <li className="group relative pr-8 mb-2">
                                            <span>{children}</span>
                                            {msg.role === 'model' && text.length > 10 && (
                                              <>
                                                <button 
                                                  onClick={() => handleReadLine(text)}
                                                  className={`absolute top-0 right-0 p-1.5 rounded transition-colors ${
                                                    readingLine === text 
                                                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 opacity-100' 
                                                      : 'bg-gray-100 text-gray-400 hover:bg-dash-accent hover:text-white opacity-0 group-hover:opacity-100'
                                                  }`}
                                                  title={readingLine === text ? (isPaused ? "បន្តការអាន" : "ផ្អាកការអាន") : "អានចំណុចនេះ"}
                                                >
                                                  {readingLine === text ? (isPaused ? <Play size={14} className="fill-current" /> : <Square size={14} className="fill-current" />) : <Volume2 size={14} />}
                                                </button>
                                                {readingLine === text && (
                                                  <button 
                                                    onClick={() => {
                                                      if (activeAudioRef.current) {
                                                        activeAudioRef.current.isPlaying = false;
                                                        activeAudioRef.current.sources.forEach(s => { try { s.stop(); } catch(e){} });
                                                        activeAudioRef.current.ctx.close();
                                                        activeAudioRef.current = null;
                                                      }
                                                      setReadingLine(null);
                                                      setIsPaused(false);
                                                    }}
                                                    className="absolute top-0 right-8 p-1.5 rounded transition-colors bg-red-500/10 text-red-500 hover:bg-red-500/20 opacity-100"
                                                    title="បញ្ឈប់ការអាន"
                                                  >
                                                    <X size={14} />
                                                  </button>
                                                )}
                                              </>
                                            )}
                                          </li>
                                        );
                                      }
                                    }}
                                  >
                                    {msg.text}
                                  </Markdown>
                                </div>
                                {msg.role === 'model' && msg.text.length > 50 && (
                                  <div className="mt-4 flex flex-col items-end gap-2 border-t border-gray-100 pt-3">
                                    {readingIndex === idx && (
                                      <div className="flex justify-end items-center gap-2 text-[10px] text-gray-400 mt-1">
                                        <span className="font-bold uppercase tracking-wider">ល្បឿនអាន:</span>
                                        <div className="flex gap-1">
                                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                            <button
                                              key={speed}
                                              onClick={() => setPlaybackRate(speed)}
                                              className={`px-2 py-0.5 rounded border transition-colors font-bold ${
                                                playbackRate === speed 
                                                  ? 'bg-dash-accent text-white border-dash-accent' 
                                                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                              }`}
                                            >
                                              {speed}x
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex gap-2">
                                       <button 
                                         onClick={() => handleReadScript(msg.text, idx)}
                                         className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors border ${
                                           readingIndex === idx 
                                             ? 'bg-[#800000] text-white border-red-500' 
                                             : 'bg-[#800000] text-white border-yellow-500'
                                         }`}
                                       >
                                         {readingIndex === idx ? (
                                           isPaused ? <><Play size={12} className="fill-current" /> បន្តការអាន</> : <><Square size={12} className="fill-current" /> ផ្អាកការអាន</>
                                         ) : (
                                           <><Volume2 size={12} /> ម៉ូលីសាអានស្គ្រីប</>
                                         )}
                                       </button>
                                       {readingIndex === idx && (
                                         <button 
                                           onClick={() => {
                                             if (activeAudioRef.current) {
                                               activeAudioRef.current.isPlaying = false;
                                               activeAudioRef.current.sources.forEach(s => { try { s.stop(); } catch(e){} });
                                               activeAudioRef.current.ctx.close();
                                               activeAudioRef.current = null;
                                             }
                                             setReadingIndex(null);
                                             setIsPaused(false);
                                           }}
                                           className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors border bg-[#800000] text-white border-red-500"
                                         >
                                           <X size={12} /> បញ្ឈប់
                                         </button>
                                       )}

                                       <button 
                                         onClick={() => handleDownload(msg.text, idx)} 
                                         className="flex items-center gap-1 text-[10px] font-bold bg-[#800000] text-white px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors border border-gray-200"
                                       >
                                         <Download size={12} /> Download File
                                       </button>
                                       <button 
                                         onClick={() => {}} 
                                         className="flex items-center gap-1 text-[10px] font-bold bg-[#800000] text-white px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors border border-gray-200"
                                       >
                                         <Save size={12} /> Save Project
                                       </button>
                                       <button 
                                         onClick={() => {}} 
                                         className="flex items-center gap-1 text-[10px] font-bold bg-[#800000] text-white px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors border border-gray-200"
                                       >
                                         <Edit size={12} /> Edit Script
                                       </button>
                                    </div>

                                    {idx === messages.length - 1 && !isLoading && (
                                      <button 
                                        onClick={handleContinueStory}
                                        className="flex items-center gap-1.5 text-[10px] font-bold bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20 mt-1"
                                      >
                                        <Plus size={12} /> បន្តស្គ្រីប
                                      </button>
                                    )}
                                  </div>
                                )}
                             </div>
                          </div>
                       ))}
                       {isLoading && (
                         <div className="flex justify-start">
                           <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                             <Loader2 className="animate-spin text-dash-accent" size={18} />
                           </div>
                         </div>
                       )}
                       <div ref={messagesEndRef} />
                    </div>
                    <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                      <button onClick={scrollToTop} className="text-white bg-white hover:text-dash-accent rounded-full p-2 border border-gray-100 shadow-lg transition-colors">
                        <ChevronUp size={20} />
                      </button>
                      <button onClick={scrollToBottom} className="text-white bg-white hover:text-dash-accent rounded-full p-2 border border-gray-100 shadow-lg transition-colors">
                        <ChevronDown size={20} />
                      </button>
                    </div>
                 </div>
              </div>

              {/* Right Column (Menu + Info) */}
              <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col gap-4 shrink-0 bg-[#120a0a] rounded-[22px]">
                 {/* Info Box */}
                 <div className="aspect-video bg-black rounded-3xl border border-[#333] flex items-center justify-center overflow-hidden relative group shadow-xl p-6">
                    <div className="text-center">
                       <div className="w-16 h-16 bg-[#1ebbb4]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#1ebbb4]/20">
                          <Mic className="text-[#1ebbb4]" size={32} />
                       </div>
                       <h4 className="text-white font-bold text-sm mb-2 tracking-tight">ប្រព័ន្ធសំឡេងឆ្លាតវៃ (Smart Voice)</h4>
                       <p className="text-gray-500 text-[10px] leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest font-bold">
                          រៀបចំ Script និងអានដោយស្វ័យប្រវត្តិជាមួយបច្ចេកវិទ្យា AI ជំនាន់ចុងក្រោយ
                       </p>
                    </div>
                 </div>

                 {/* Control Panel */}
                 <div className="bg-white rounded-3xl p-6 flex flex-col gap-4 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                       <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">REFERENCE TO VIDEO</span>
                       <div className="bg-dash-accent text-white text-[8px] font-bold px-1.5 py-0.5 rounded">AI</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                       <button className="flex items-center justify-center gap-2 bg-gray-50 text-gray-600 font-bold text-[10px] py-3 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                          <ImageIcon size={14} /> ADD IMAGE
                       </button>
                       <button className="flex items-center justify-center gap-2 bg-gray-50 text-gray-600 font-bold text-[10px] py-3 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                          <Video size={14} /> ADD VIDEO
                       </button>
                    </div>

                    <button className="w-full bg-dash-accent text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-dash-accent/20">
                       PUBLISH SCRIPT
                    </button>
                 </div>

                 {/* Quick Links */}
                 <div className="grid grid-cols-3 gap-3">
                    {['SONGS', 'PLAYLIST', 'SPACES'].map(item => (
                       <div key={item} className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm hover:border-dash-accent transition-colors cursor-pointer group">
                          <div className="text-[8px] text-gray-400 font-bold mb-1 tracking-widest group-hover:text-dash-accent transition-colors">{item}</div>
                          <div className="text-[10px] text-gray-800 font-bold">EXPLORE</div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Bottom Half (SHOTDECK) */}
           <div className="bg-[#120a0a] p-4 md:p-6 flex flex-col gap-4 min-h-[300px] shrink-0 w-full rounded-[22px] shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-gray-100 px-4 py-2 rounded-xl bg-gray-50 w-full md:w-auto">
                    <span className="font-bold text-xs tracking-widest text-gray-500">SHOTDECK</span>
                    <span className="text-[10px] text-gray-400">© 2026 AEK AUDIO SCRIPT MAETER  - All rights reserved.</span>
                 </div>
                 <div className="flex gap-3 items-center w-full md:w-auto justify-between md:justify-end">
                    <span className="font-bold text-sm md:text-lg"><span className="text-dash-accent">Browse</span> <span className="text-yellow-500">Shots</span></span>
                    <div className="flex gap-2">
                       <button className="bg-white border border-gray-200 px-4 py-1.5 rounded-full text-[10px] font-bold text-gray-500 hover:bg-gray-50 transition-colors">FILTER</button>
                       <button className="bg-white border border-gray-200 px-4 py-1.5 rounded-full text-[10px] font-bold text-gray-500 hover:bg-gray-50 transition-colors">SORT</button>
                    </div>
                 </div>
              </div>
              {/* Grid of placeholder images */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                 {[
                   'city', 'lake', 'road', 'sunset', 
                   'snow', 'building', 'desert', 'sky'
                 ].map((seed, i) => (
                    <div key={i} className="bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden relative group cursor-pointer aspect-video shadow-sm">
                       <img src={`https://picsum.photos/seed/${seed}/400/250`} alt={`Shot ${i}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" referrerPolicy="no-referrer" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="text-[10px] font-bold text-white">SCENE {i + 1}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </main>
      </div>

      {/* Dharma Quotes Modal */}
      <AnimatePresence>
        {showQuotes && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-2xl bg-black border-2 border-dash-accent rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(255,99,33,0.3)]"
            >
              <div className="p-6 border-b border-dash-border flex justify-between items-center bg-gradient-to-r from-maroon-900/20 to-black">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-dash-accent/20 rounded-xl text-dash-accent">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">ពាក្យពេចន៍មាស (Gold Quotes)</h2>
                    <p className="text-xs text-gray-400">ដកស្រង់ចេញពីព្រះត្រៃបិដក និងធម្មបទ</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowQuotes(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                {[
                  { title: "សន្តិភាព", quote: "នត្ថិ សន្តិ បរំ សុខំ - ពុំមានសេចក្តីសុខឯណា ក្រៅពីសន្តិភាពឡើយ។", source: "ធម្មបទ" },
                  { title: "ការអប់រំខ្លួន", quote: "អត្តនា ហិ សុទន្តេន នាថំ លភតិ ទុល្លភំ - បុគ្គលដែលអប់រំខ្លួនបានល្អហើយ រមែងបាននូវទីពឹងដែលគេបានដោយកម្រ។", source: "ព្រះត្រៃបិដក" },
                  { title: "កម្មផល", quote: "យាទិសំ វបតេ ពុជំ តាទិសំ លភតេ ផលំ - បុគ្គលសាបព្រោះពូជបែបណា រមែងបានផលបែបនោះ។", source: "ព្រះត្រៃបិដក" },
                  { title: "មេត្តាធម៌", quote: "ន ហិ វេរេន វេរានិ សម្មន្តីធ កុទាចនំ - ពុំដែលឃើញថាការចងពៀរ រមែងរម្ងាប់ដោយការចងពៀរឡើយ។", source: "ធម្មបទ" }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-gray-900/50 border border-dash-border rounded-2xl hover:border-dash-accent/50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-dash-accent uppercase tracking-widest">{item.title}</span>
                      <span className="text-[10px] text-gray-500 italic">{item.source}</span>
                    </div>
                    <p className="text-white text-lg leading-relaxed mb-3 font-medium">"{item.quote}"</p>
                    <button 
                      onClick={() => {
                        setInput(`សូមពន្យល់ពីអត្ថន័យនៃពាក្យពេចន៍មាស៖ "${item.quote}"`);
                        setShowQuotes(false);
                      }}
                      className="text-[10px] text-dash-accent hover:underline flex items-center gap-1"
                    >
                      <Play size={10} /> សុំឱ្យកូនៗពន្យល់បន្ថែម
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="p-6 bg-maroon-900/10 border-t border-dash-border flex justify-end">
                <button 
                  onClick={() => setShowQuotes(false)}
                  className="px-6 py-2 bg-dash-accent text-black font-bold rounded-xl hover:bg-dash-accent/90 transition-colors"
                >
                  បិទវិញ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#222]">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Settings size={18} className="text-[#1ebbb4]" /> ការកំណត់សំឡេង (Voice Settings)
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-6 bg-black/50">
                {/* Voice Selection */}
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 block">ជ្រើសរើសតួអង្គ (Select Voice)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {voices.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          selectedVoice === voice.id 
                            ? 'border-[#1ebbb4] bg-[#1ebbb4]/10 text-white' 
                            : 'border-[#333] bg-[#222] text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-xs font-bold">{voice.name}</div>
                        <div className="text-[9px] opacity-60 uppercase">{voice.enName}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed Control */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ល្បឿនអាន (Speed)</label>
                    <span className="text-[#1ebbb4] font-mono text-xs font-bold">{playbackRate}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2.0" 
                    step="0.1" 
                    value={playbackRate} 
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#1ebbb4]"
                  />
                  <div className="flex justify-between mt-1 text-[8px] text-gray-500 font-bold">
                    <span>យឺត (Slow)</span>
                    <span>ធម្មតា (Normal)</span>
                    <span>លឿន (Fast)</span>
                  </div>
                </div>

                {/* Pitch Control */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">កម្រិតសំឡេង (Pitch)</label>
                    <span className="text-[#1ebbb4] font-mono text-xs font-bold">{pitch > 0 ? `+${pitch}` : pitch} cents</span>
                  </div>
                  <input 
                    type="range" 
                    min="-1200" 
                    max="1200" 
                    step="100" 
                    value={pitch} 
                    onChange={(e) => setPitch(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#1ebbb4]"
                  />
                  <div className="flex justify-between mt-1 text-[8px] text-gray-500 font-bold">
                    <span>ទាប (Low)</span>
                    <span>ធម្មតា (Normal)</span>
                    <span>ខ្ពស់ (High)</span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-[#1ebbb4] text-white font-bold py-3 rounded-xl hover:bg-[#178b85] transition-colors mt-2 shadow-lg shadow-[#1ebbb4]/20"
                >
                  រក្សាទុកការកំណត់
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
