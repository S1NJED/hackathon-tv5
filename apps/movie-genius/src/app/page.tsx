// src/app/page.tsx

"use client";

import { Send, MessageSquare } from 'lucide-react';
import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { nanoid } from 'nanoid';
// --- NEW IMPORTS ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// -------------------

// --- Data Structures ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// --- Constants ---
const CHAT_INPUT_HEIGHT = 80;

// --- Utility Function to Read Client-Side Cookies (Removed for brevity, assuming it is imported or available) ---
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const cookieName = name + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(cookieName) == 0) {
      return c.substring(cookieName.length, c.length);
    }
  }
  return null;
};

// --- Main Component ---
export default function ChatLandingPage() {
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const sessionIdRef = useRef<string>(''); 
  const chatWindowRef = useRef<HTMLDivElement>(null);
  
  const isChatEmpty = history.length === 0;

  // Load Session ID on first component mount
  useEffect(() => {
    let existingSessionId = getCookie("session_id");
    
    if (existingSessionId) {
      sessionIdRef.current = existingSessionId;
    } else {
      const newId = nanoid();
      sessionIdRef.current = newId;
    }
  }, []); 

  // Scroll to the bottom of the chat window
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [history, isLoading]);


  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    
    // Add user message to history
    setHistory(prev => [...prev, { id: nanoid(), role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const apiUrl = `/api/chat?message=${encodeURIComponent(userMessage)}&session_id=${sessionIdRef.current}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error('API failed to return a valid response.');
      }

      const data = await response.text();

      const assistantResponse = data || "Sorry, I couldn't process that.";
      
      setHistory(prev => [...prev, { id: nanoid(), role: 'assistant', content: assistantResponse }]);

    } catch (error) {
      console.error("Chat error:", error);
      setHistory(prev => [
        ...prev, 
        { id: nanoid(), role: 'assistant', content: "Error: Could not connect to the Agent backend. Check console for details." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50 text-gray-800">
      
      {/* 1. Header */}
      <header className="flex w-full flex-shrink-0 items-center justify-center border-b border-gray-200 bg-white shadow-md p-4">
        <h1 className="text-5xl font-extrabold text-indigo-600">
          MovieGenius
        </h1>
      </header>

      {/* 2. Main Chat Display Window */}
      <div 
        ref={chatWindowRef}
        className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-8 bg-gray-100 pb-28`} 
        style={{ paddingBottom: `${CHAT_INPUT_HEIGHT + 20}px` }} 
      > 
        <div className="max-w-4xl mx-auto">
          {isChatEmpty && !isLoading ? (
            <div className="flex h-[calc(100vh-16rem)] flex-col items-center justify-center text-center">
              <MessageSquare size={48} className="text-indigo-400 mb-4" />
              <p className="text-xl text-gray-600">Your AI Copilot for perfect movie night decisions.</p>
              <p className="text-sm text-gray-500 mt-4">Note: This session does not save history.</p>
            </div>
          ) : (
            history.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))
          )}

          {/* --- The "Thinking..." Loading State --- */}
          {isLoading && (
            <div className="flex w-full justify-start mt-4">
              <div className="max-w-3xl rounded-xl px-4 py-3 shadow-md bg-white text-gray-900 border border-gray-200">
                <p className="font-medium animate-pulse text-indigo-600">Thinking...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Input Area (Fixed at the bottom) */}
      <div 
        className="absolute inset-x-0 bottom-0 bg-white border-t border-gray-200 p-4 md:p-6 shadow-2xl"
        style={{ height: `${CHAT_INPUT_HEIGHT}px` }}
      >
        <form className="max-w-4xl mx-auto" onSubmit={handleSend}>
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder={isLoading ? "Please wait..." : "Ask MovieGenius..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 resize-none overflow-hidden rounded-xl border border-gray-300 py-3 pl-4 pr-12 text-base shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="absolute right-3 p-2 text-indigo-600 hover:text-indigo-800 transition duration-150 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- Helper Component for Message Rendering ---
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mt-4`}>
      <div
        className={`max-w-3xl rounded-xl px-4 py-3 shadow-md whitespace-pre-wrap ${
          isUser
            ? 'bg-indigo-600 text-white font-medium'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        {/* --- FIX: Use ReactMarkdown Here --- */}
        {isUser ? (
            // User messages often don't need markdown, but it's safe to run them through too
            <p>{message.content}</p>
        ) : (
            <ReactMarkdown 
                // Process the markdown text from the Agent
                remarkPlugins={[remarkGfm]} 
                // Customize rendering for Tailwind compatibility (optional but recommended)
                components={{
                    // Style links blue and underlined
                    a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800" />
                    ),
                    // Style lists with Tailwind padding
                    ul: ({ node, ...props }) => (
                        <ul {...props} className="list-disc pl-5 mt-2 space-y-1" />
                    ),
                    // Style headers
                    h2: ({ node, ...props }) => (
                        <h2 {...props} className="text-xl font-bold mt-4 mb-2 border-b pb-1" />
                    ),
                    // Style code blocks for chat UI
                    code: ({ node, inline, ...props }) => {
                        const className = props.className || '';
                        const match = /language-(\w+)/.exec(className);
                        return !inline ? (
                            <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto my-2">
                                <code {...props} className={className} />
                            </pre>
                        ) : (
                            // Inline code styling
                            <code {...props} className="bg-gray-200 text-red-700 px-1 py-0.5 rounded text-sm" />
                        );
                    }
                }}
            >
                {message.content}
            </ReactMarkdown>
        )}
      </div>
    </div>
  );
}