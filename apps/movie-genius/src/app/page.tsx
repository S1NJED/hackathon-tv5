"use client";

import { Send, MessageSquare, Disc, LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { nanoid } from 'nanoid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import confetti from 'canvas-confetti'; 

// --- Data Structures ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// --- Utility Function (Cookies) ---
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const cookieName = name + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1);
    if (c.indexOf(cookieName) == 0) return c.substring(cookieName.length, c.length);
  }
  return null;
};

// --- COMPONENTS ---

// 1. The Wheel Component
const Wheel = ({ items, onSpinEnd }: { items: string[], onSpinEnd: (winner: string) => void }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Responsive Canvas Size
  const [size, setSize] = useState(300);

  useEffect(() => {
    const updateSize = () => {
      // Smaller wheel on mobile, larger on desktop
      setSize(window.innerWidth < 768 ? 280 : 380);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const colors = ['#FCA5A5', '#FCD34D', '#86EFAC', '#93C5FD', '#C4B5FD', '#F0ABFC'];

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numSegments = items.length;
    const arcSize = (2 * Math.PI) / (numSegments || 1);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (numSegments === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#f3f4f6'; // gray-100
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9ca3af'; // gray-400
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("Add Movies!", centerX, centerY);
      return;
    }

    items.forEach((item, index) => {
      const angle = index * arcSize;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arcSize / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#000";
      ctx.font = "bold 14px Arial";
      ctx.fillText(item.substring(0, 15) + (item.length > 15 ? '...' : ''), radius - 20, 5);
      ctx.restore();
    });
  };

  useEffect(() => {
    drawWheel();
  }, [items, size]);

  const spin = () => {
    if (isSpinning || items.length === 0) return;

    setIsSpinning(true);
    const newRotation = rotation + 1440 + Math.random() * 360; 
    setRotation(newRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const actualRotation = newRotation % 360;
      const arcSize = 360 / items.length;
      const winningIndex = Math.floor(((360 - actualRotation) % 360) / arcSize);
      onSpinEnd(items[winningIndex]);
    }, 4000);
  };

  return (
    <div className="flex flex-col items-center justify-center relative py-4">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[calc(50%+20px)] z-10 pointer-events-none">
        <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[30px] border-l-red-600 border-b-[15px] border-b-transparent drop-shadow-md"></div>
      </div>

      <div 
        style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.83, 0.67)' }}
        className="rounded-full overflow-hidden shadow-2xl border-4 border-white bg-white"
      >
        <canvas ref={canvasRef} width={size} height={size} />
      </div>

      <button 
        onClick={spin}
        disabled={isSpinning || items.length === 0}
        className="mt-6 px-10 py-3 bg-indigo-600 text-white rounded-full font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transform transition active:scale-95 cursor-pointer"
      >
        {isSpinning ? 'Spinning...' : 'SPIN THE WHEEL'}
      </button>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function ChatLandingPage() {
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // New States
  const [viewMode, setViewMode] = useState<'normal' | 'wheel'>('normal');
  const [wheelItems, setWheelItems] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  const sessionIdRef = useRef<string>(''); 
  const chatWindowRef = useRef<HTMLDivElement>(null);
  
  const isChatEmpty = history.length === 0;

  useEffect(() => {
    let existingSessionId = getCookie("session_id");
    if (existingSessionId) {
      sessionIdRef.current = existingSessionId;
    } else {
      sessionIdRef.current = nanoid();
    }
  }, []); 

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [history, isLoading, viewMode]);

  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setHistory(prev => [...prev, { id: nanoid(), role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // Prompt Injection ensuring bold titles for parsing
      const systemContext = " If you suggest movies, please put the movie title in **bold** text and provide a short description or image after it.";
      const fullQuery = userMessage + systemContext;

      const apiUrl = `/api/chat?message=${encodeURIComponent(fullQuery)}&session_id=${sessionIdRef.current}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('API failed.');
      const data = await response.text();
      const assistantResponse = data || "Sorry, I couldn't process that.";
      setHistory(prev => [...prev, { id: nanoid(), role: 'assistant', content: assistantResponse }]);

    } catch (error) {
      console.error("Chat error:", error);
      setHistory(prev => [...prev, { id: nanoid(), role: 'assistant', content: "Error connecting to backend." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const addToWheel = (movie: string) => {
    if (!wheelItems.includes(movie)) {
      setWheelItems(prev => [...prev, movie]);
    }
  };

  const removeFromWheel = (index: number) => {
    setWheelItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50 text-gray-800 font-sans overflow-hidden">
      
      {/* 1. Header with CENTERED Toggle */}
      <header className="relative flex w-full flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white shadow-sm px-4 md:px-8 py-4 z-20">
        
        {/* Left: Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-600 tracking-tight">
          MovieGenius
        </h1>
        
        {/* Center: Toggle (Absolute positioning ensures it's dead center) */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-gray-100 p-1 rounded-lg flex space-x-1">
                <button 
                    onClick={() => setViewMode('normal')}
                    className={`flex items-center space-x-2 px-3 py-1.5 md:px-4 md:py-2 rounded-md text-sm md:text-base transition cursor-pointer ${viewMode === 'normal' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutTemplate size={16} />
                    <span className="hidden md:inline">Normal</span>
                </button>
                <button 
                    onClick={() => setViewMode('wheel')}
                    className={`flex items-center space-x-2 px-3 py-1.5 md:px-4 md:py-2 rounded-md text-sm md:text-base transition cursor-pointer ${viewMode === 'wheel' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Disc size={16} />
                    <span className="hidden md:inline">Wheel Mode</span>
                </button>
            </div>
        </div>

        {/* Right: Spacer to balance the layout if needed, or user profile */}
        <div className="w-8"></div> 
      </header>

      {/* 2. Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative flex-col md:flex-row">
        
        {/* --- LEFT SIDE: WHEEL (Visible in Wheel Mode) --- */}
        {/* Responsive: On mobile, this stacks on top. On Desktop, it takes 50% width */}
        {viewMode === 'wheel' && (
            <div className="w-full h-1/2 md:h-full md:w-1/2 border-b md:border-b-0 md:border-r border-gray-200 bg-slate-50 p-4 flex flex-col items-center overflow-y-auto z-10">
                <div className="text-center mb-2 md:mb-6 mt-2">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">Movie Roulette</h2>
                </div>
                
                <Wheel items={wheelItems} onSpinEnd={(win) => {
                    setWinner(win);
                    if(typeof window !== 'undefined' && (window as any).confetti) (window as any).confetti();
                }} />

                {/* Winner Display */}
                {winner && (
                    <div className="mt-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-xl text-center animate-bounce shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider">The Winner Is</p>
                        <p className="text-xl md:text-3xl font-bold mt-1">{winner}</p>
                    </div>
                )}

                {/* List of items */}
                <div className="w-full max-w-sm mt-6 mb-10">
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wide text-center">Current List ({wheelItems.length})</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                        {wheelItems.map((item, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => removeFromWheel(idx)}
                                className="group flex items-center space-x-1 bg-white border border-gray-200 pl-3 pr-2 py-1.5 rounded-full text-sm shadow-sm hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
                            >
                                <span className="font-medium text-gray-700 group-hover:text-red-600">{item}</span>
                                <Trash2 size={14} className="text-gray-400 group-hover:text-red-500" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* --- RIGHT SIDE: CHAT --- */}
        {/* Responsive: Full width in Normal. In Wheel mode, full width on mobile (scrolling), half on desktop */}
        <div className={`flex flex-col relative h-full transition-all duration-300 ${viewMode === 'wheel' ? 'w-full md:w-1/2' : 'w-full max-w-5xl mx-auto border-x border-gray-200'}`}>
            
            {/* Chat Messages */}
            <div 
                ref={chatWindowRef}
                className="flex-1 overflow-y-auto p-4 md:p-6 pb-32"
            >
                {isChatEmpty && !isLoading ? (
                    <div className="flex h-full flex-col items-center justify-center text-center opacity-60">
                        <MessageSquare size={48} className="text-indigo-400 mb-4" />
                        <p className="text-xl font-medium text-gray-600">Start the conversation</p>
                        <p className="text-sm text-gray-500 mt-2">Ask for recommendations, then add them to the wheel!</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-y-6"> {/* Global gap between messages */}
                        {history.map((msg) => (
                            <ChatMessage 
                                key={msg.id} 
                                message={msg} 
                                onAddToWheel={addToWheel} 
                                viewMode={viewMode}
                            />
                        ))}
                    </div>
                )}

                {isLoading && (
                    <div className="flex w-full justify-start mt-4">
                        <div className="px-5 py-4 rounded-2xl bg-white shadow-sm border border-gray-100 rounded-bl-none">
                            <span className="flex space-x-1.5">
                                <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 z-20">
                <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
                    <input
                        type="text"
                        placeholder="Ask for specific genres, actors, or moods..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        className="w-full rounded-full border border-gray-300 py-3.5 pl-5 pr-14 shadow-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-base"
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-300 transition-colors cursor-pointer shadow-md"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>

      </div>
    </div>
  );
}


// --- Helper Component for Message Rendering ---
function ChatMessage({ 
    message, 
    onAddToWheel,
    viewMode
}: { 
    message: Message; 
    onAddToWheel: (item: string) => void;
    viewMode: 'normal' | 'wheel';
}) {
  const isUser = message.role === 'user';
  const cleanedContent = message.content.replace(/\\n/g, '\n');
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-4 shadow-sm text-base leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-none'
            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
        }`}
      >
        {isUser ? (
            <p className="whitespace-pre-wrap">{cleanedContent}</p>
        ) : (
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                components={{
                    // 1. Paragraphs: Add gap between movies/blocks
                    p: ({ children }) => <p className="mb-6 last:mb-0">{children}</p>,
                    
                    // 2. Bold Text (Movie Titles): Render the Title AND the Big Button
                    strong: ({ children }) => {
                        const text = String(children);
                        return (
                            <div className="inline-flex flex-col items-start my-2">
                                <span className="text-lg font-bold text-gray-900 block mb-2">
                                    {text}
                                </span>
                                {viewMode === 'wheel' && (
                                    <button 
                                        onClick={() => onAddToWheel(text)}
                                        className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-indigo-200"
                                    >
                                        <Plus size={16} />
                                        <span>Add to Wheel</span>
                                    </button>
                                )}
                            </div>
                        );
                    },
                    // 3. Images: styling
                    img: ({ node, ...props }) => (
                        <img 
                            {...props} 
                            className="w-full max-w-sm h-auto my-3 rounded-xl shadow-md border border-gray-100"
                        />
                    ),
                    // 4. Lists: Ensure spacing
                    ul: ({ children }) => <ul className="space-y-4 my-4">{children}</ul>,
                    li: ({ children }) => <li className="flex flex-col">{children}</li>
                }}
            >
                {cleanedContent}
            </ReactMarkdown>
        )}
      </div>
    </div>
  );
}