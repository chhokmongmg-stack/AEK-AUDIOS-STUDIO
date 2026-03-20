import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Menu, Diamond, Plus, Mic, User, Music, ListMusic, 
  Film, Folder, Settings, Heart, Image as ImageIcon, Loader2, Send, Download,
  ChevronUp, ChevronDown, X, Paperclip, FileText, Video, Volume2, Square
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Message, streamWithSokcheat, generateStoryboardImage, generateStoryboardVideo, generateSpeech } from './services/geminiService';
import LiveChat from './components/LiveChat';
import html2pdf from 'html2pdf.js';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [hasKey, setHasKey] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'បាទ សួស្តីបង! ខ្ញុំបាទឈ្មោះ សុខជាតិ ជាជំនួយការនិពន្ធ Script និង Storyboard។ តើបងចង់ឱ្យប្អូនជួយនិពន្ធរឿងប្រភេទណាដែរបាទ?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [storyboardImage, setStoryboardImage] = useState<string | null>(null);
  const [storyboardVideo, setStoryboardVideo] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState<'audio' | 'video' | null>(null);
  const [selectedGenre, setSelectedGenre] = useState('Cinema កំសត់');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [attachments, setAttachments] = useState<{file: File, base64: string, mimeType: string, url: string}[]>([]);
  const [readingIndex, setReadingIndex] = useState<number | null>(null);
  const [readingLine, setReadingLine] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeAudioRef = useRef<{source: AudioBufferSourceNode, ctx: AudioContext} | null>(null);

  // Update playback rate of currently playing audio if it changes
  useEffect(() => {
    if (activeAudioRef.current && activeAudioRef.current.source) {
      try {
        activeAudioRef.current.source.playbackRate.value = playbackRate;
      } catch (e) {
        console.error("Could not update playback rate", e);
      }
    }
  }, [playbackRate]);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

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
      const stream = streamWithSokcheat([...messages, userMessage]);
      
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', text: fullText };
          return newMessages;
        });
      }

      // Automatically try to generate a storyboard image for the last scene described
      handleGenerateImage(fullText);

    } catch (error) {
      console.error('Error chatting with Sokcheat:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'បាទ សូមអភ័យទោសបង! មានបញ្ហាបច្ចេកទេសបន្តិចបន្តួច ប្អូនមិនអាចឆ្លើយបានទេបាទ។' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async (text: string) => {
    setIsGeneratingImage(true);
    setStoryboardVideo(null); // Reset video when new image is generated
    try {
      const imageUrl = await generateStoryboardImage(text.substring(0, 500));
      if (imageUrl) setStoryboardImage(imageUrl);
    } catch (error) {
      console.log("Image generation failed", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!storyboardImage) return;
    setIsGeneratingVideo(true);
    try {
      const videoUrl = await generateStoryboardVideo("Cinematic motion, highly detailed", storyboardImage);
      if (videoUrl) {
        setStoryboardVideo(videoUrl);
      }
    } catch (error) {
      console.error("Video generation failed", error);
      alert("បរាជ័យក្នុងការបង្កើតវីដេអូ។ សូមពិនិត្យមើល API Key របស់អ្នក។");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleDownload = (text: string, index: number) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sokcheat_Script_${index}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = (index: number) => {
    const element = document.getElementById(`message-content-${index}`);
    if (element) {
      const opt = {
        margin:       10,
        filename:     `Sokcheat_Script_${index}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      html2pdf().set(opt).from(element).save();
    }
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

  const handleReadScript = async (text: string, index: number) => {
    if (readingIndex === index) {
      // Stop playing
      if (activeAudioRef.current) {
        activeAudioRef.current.source.stop();
        activeAudioRef.current.ctx.close();
        activeAudioRef.current = null;
      }
      setReadingIndex(null);
      return;
    }

    // Stop any currently playing audio
    if (activeAudioRef.current) {
      activeAudioRef.current.source.stop();
      activeAudioRef.current.ctx.close();
    }

    setReadingIndex(index);
    try {
      // Clean up text (remove markdown formatting for better reading)
      const introText = "អរគុណបងសម្រាប់ការផ្ដល់កិត្តិយសអោយខ្ញុំ ថែមដើម្បីឱ្យបងកាន់តែយល់ច្បាស់ហើយនិងងាយស្រួលស្ដាប់។ ដូច្នេះខ្ញុំបន្តអានអត្ថបទខាងក្រោមដូចតទៅ។\n\n";
      const cleanText = (introText + text).replace(/[#*`_]/g, '');
      const base64Audio = await generateSpeech(cleanText);
      
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
        source.connect(audioCtx.destination);
        source.onended = () => {
          setReadingIndex(null);
          activeAudioRef.current = null;
        };
        source.start();
        activeAudioRef.current = { source, ctx: audioCtx };
      } else {
        setReadingIndex(null);
      }
    } catch (error) {
      console.error("Failed to read script:", error);
      setReadingIndex(null);
      alert("បរាជ័យក្នុងការអានអត្ថបទ។ សូមពិនិត្យមើល API Key របស់អ្នក។");
    }
  };

  const handleReadLine = async (text: string) => {
    if (readingLine === text) {
      if (activeAudioRef.current) {
        activeAudioRef.current.source.stop();
        activeAudioRef.current.ctx.close();
        activeAudioRef.current = null;
      }
      setReadingLine(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.source.stop();
      activeAudioRef.current.ctx.close();
    }

    setReadingLine(text);
    try {
      const cleanText = text.replace(/[#*`_]/g, '');
      const base64Audio = await generateSpeech(cleanText);
      
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
        source.connect(audioCtx.destination);
        source.onended = () => {
          setReadingLine(null);
          activeAudioRef.current = null;
        };
        source.start();
        activeAudioRef.current = { source, ctx: audioCtx };
      } else {
        setReadingLine(null);
      }
    } catch (error) {
      console.error("Failed to read line:", error);
      setReadingLine(null);
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-[#333] max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-4">ទាមទារ API Key (Paid)</h2>
          <p className="text-gray-400 mb-6">
            ដើម្បីបង្កើតរូបភាពកម្រិត 4K Cinematic និងវីដេអូបាន តម្រូវឱ្យបងភ្ជាប់ API Key ពី Google Cloud (Paid Project) ជាមុនសិន។
            <br/><br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[#1ebbb4] hover:underline">ស្វែងយល់បន្ថែមពីការភ្ជាប់ Billing</a>
          </p>
          <button 
            onClick={handleSelectKey}
            className="bg-[#1ebbb4] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#178b85] transition-colors w-full"
          >
            ភ្ជាប់ API Key ឥឡូវនេះ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-gray-300 font-khmer overflow-hidden">
      {/* Top Header */}
      <header className="h-14 bg-[#2a1a1d] border-b border-[#3d2a2e] flex items-center justify-between px-4 shrink-0">
        <div className="w-10 h-10 bg-[#8b0000] flex items-center justify-center rounded border border-[#550000] shadow-lg">
          <span className="text-white font-bold text-xl">AI</span>
        </div>
        
        <div className="bg-[#002a2a] px-6 py-1 rounded border border-[#004a4a] flex items-center gap-2 shadow-inner">
          <span className="text-[#00ff00] font-bold text-lg tracking-widest" style={{ textShadow: '0 0 8px #00ff00' }}>ឌីម៉ង់ STUDIO</span>
          <span className="bg-white text-black px-1.5 py-0.5 font-bold rounded text-xs">AI</span>
        </div>

        <div className="w-10 h-10 bg-[#8b0000] flex items-center justify-center rounded border border-[#550000] shadow-lg">
          <span className="text-white font-bold text-xl">AI</span>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Column */}
        <div className="w-[400px] flex flex-col gap-4 shrink-0">
          {/* Large Portrait Image */}
          <div className="flex-1 bg-[#0a0a0a] rounded-lg border-2 border-[#333] overflow-hidden relative group shadow-2xl">
            <img 
              src="https://image.pollinations.ai/prompt/Young%20handsome%2020%20year%20old%20Cambodian%20man%20with%20authentic%20Khmer%20brown%20skin%20tone,%20wearing%20a%20smart%20casual%20suit,%20half%20body%20shot.%20Background%20is%20a%20high-tech%20futuristic%20technology%20environment%20with%20a%20clear%20Cambodian%20flag%20displayed%20prominently%20behind%20him.%20Realistic%20photography,%204k,%20highly%20detailed?width=1024&height=1024&nologo=true&seed=999" 
              alt="Sokcheat" 
              className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-4 left-0 right-0 bg-black/60 backdrop-blur-md py-2 px-4 text-center border-t border-white/10">
              <div className="text-white font-bold text-lg">Sokcheat - AI Assistant to AeK Audios</div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex gap-4 h-32 shrink-0">
            {/* Vertical Buttons */}
            <div className="flex flex-col gap-2 w-32">
              <button className="flex-1 bg-[#222] border border-[#333] rounded flex items-center gap-2 px-3 hover:bg-[#333] transition-all group">
                <Film size={16} className="text-gray-500 group-hover:text-white" />
                <span className="text-xs font-bold tracking-widest">FILM</span>
              </button>
              <button className="flex-1 bg-[#222] border border-[#333] rounded flex items-center gap-2 px-3 hover:bg-[#333] transition-all group">
                <ListMusic size={16} className="text-gray-500 group-hover:text-white" />
                <span className="text-xs font-bold tracking-widest">NEWS</span>
              </button>
              <button className="flex-1 bg-[#222] border border-[#333] rounded flex items-center gap-2 px-3 hover:bg-[#333] transition-all group">
                <Music size={16} className="text-gray-500 group-hover:text-white" />
                <span className="text-xs font-bold tracking-widest">MUSIC</span>
              </button>
            </div>

            {/* Profile Section */}
            <div className="flex-1 bg-[#222] border border-[#333] rounded-lg p-3 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-white font-bold text-xl">សុខជាតិ</span>
                  <span className="text-[#00ff00] text-xs font-bold tracking-wider">Sokcheat</span>
                </div>
                <div className="w-8 h-8 bg-[#1a1a1a] rounded-full border border-[#444] flex items-center justify-center">
                  <User size={16} className="text-gray-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setLiveMode('audio')} className="flex-1 bg-[#1a1a1a] border border-[#333] rounded py-1.5 flex items-center justify-center gap-2 text-[10px] font-bold text-white hover:bg-[#2a2a2a] transition-colors">
                  <Mic size={12} className="text-blue-400" /> VOICE OVER
                </button>
                <button className="flex-1 bg-[#1a1a1a] border border-[#333] rounded py-1.5 flex items-center justify-center gap-2 text-[10px] font-bold text-white hover:bg-[#2a2a2a] transition-colors">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div> INVITE
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Mini Sidebar Slots */}
          <div className="w-40 flex flex-col gap-2 shrink-0 overflow-y-auto pr-1">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-12 bg-[#222] border border-[#333] rounded flex items-center justify-between px-3 hover:bg-[#2a2a2a] cursor-pointer transition-all group">
                <div className="w-6 h-6 bg-[#1a1a1a] rounded flex items-center justify-center border border-[#444]">
                  <ImageIcon size={12} className="text-gray-600 group-hover:text-gray-400" />
                </div>
                <div className="w-16 h-2 bg-[#333] rounded-full"></div>
              </div>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-[#222] rounded-[40px] border-2 border-[#3d2a2e] flex flex-col overflow-hidden shadow-2xl relative">
            {/* Chat/Script Rows */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 flex items-center justify-between group hover:border-[#444] transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#222] rounded-full flex items-center justify-center border border-[#333]">
                    <Plus size={20} className="text-gray-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-400">បង្កើត <span className="text-yellow-500">Script</span> ភាពយន្ត</span>
                  </div>
                </div>
                <button className="bg-[#1ebbb4] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-[#178b85] transition-all shadow-lg">
                  <Send size={14} /> បញ្ជូន
                </button>
              </div>

              <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 flex items-center justify-between group hover:border-[#444] transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#222] rounded-full flex items-center justify-center border border-[#333]">
                    <Plus size={20} className="text-gray-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-400">បង្កើត <span className="text-yellow-500">Script</span> "ព័ត៌មាន"</span>
                  </div>
                </div>
                <button className="bg-[#1ebbb4] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-[#178b85] transition-all shadow-lg">
                  <Send size={14} /> បញ្ជូន
                </button>
              </div>

              {/* Chat History / Preview Box */}
              <div className="flex-1 bg-[#1a1a1a] rounded-3xl border border-[#333] mt-4 flex flex-col overflow-hidden relative">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        id={`message-content-${idx}`}
                        className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-[#1ebbb4]/10 border border-[#1ebbb4]/20 text-white' : 'bg-[#222] border border-[#333] text-[#daff8d]'}`}
                        style={{ fontSize: '10px', lineHeight: '21px', fontWeight: 'normal' }}
                      >
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Inner Overlay Box (from image) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/40 backdrop-blur-sm p-6 rounded-2xl border border-white/10 flex flex-col items-center gap-3 pointer-events-auto">
                    <div className="text-red-500 font-bold text-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> ប្រសាសន៍សេចក្តីស្ងាត់
                    </div>
                    <button className="bg-[#1ebbb4]/20 text-[#1ebbb4] px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold border border-[#1ebbb4]/30 hover:bg-[#1ebbb4] hover:text-white transition-all">
                      <Plus size={16} /> បន្តសាច់រឿង
                    </button>
                  </div>
                </div>

                {/* Content Footer */}
                <div className="h-14 bg-[#111] border-t border-[#333] flex items-center justify-between px-4 shrink-0">
                  <div className="flex gap-2">
                    <button className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors">Recreate</button>
                    <button className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors">Publish</button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                      <Video size={14} /> Reference to Video
                    </div>
                    <div className="flex gap-2 text-gray-600">
                      <Download size={14} className="hover:text-white cursor-pointer" />
                      <ImageIcon size={14} className="hover:text-white cursor-pointer" />
                      <Heart size={14} className="hover:text-white cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Input Overlay (Optional, based on image) */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[90%] pointer-events-none">
              <form id="chat-form" onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-[#444] rounded-full px-6 py-2 flex items-center gap-4 shadow-2xl pointer-events-auto">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="បញ្ចូលអត្ថបទរឿង..."
                  className="flex-1 bg-transparent resize-none focus:outline-none text-white h-8"
                  style={{ marginLeft: '2px', marginRight: '-4px', fontSize: '10px', lineHeight: '25.5px' }}
                />
                <button type="submit" disabled={isLoading} className="text-[#1ebbb4] hover:text-white transition-colors">
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="h-10 bg-[#2a1a1d] border-t border-[#3d2a2e] flex items-center justify-center px-4 shrink-0">
        <div className="text-[10px] font-bold tracking-[0.2em] text-gray-500">
          © 2026 AEK AUDIO SCRIPT MASTER 8K
        </div>
      </footer>

      <AnimatePresence>
        {liveMode && (
          <LiveChat mode={liveMode} onClose={() => setLiveMode(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
