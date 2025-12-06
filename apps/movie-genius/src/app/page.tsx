// src/app/page.tsx

"use client";

import { Send, MessageSquare } from 'lucide-react';
import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { nanoid } from 'nanoid';

// --- Utility Function to Read Client-Side Cookies ---
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

// --- Data Structures ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// --- Constants ---
const CHAT_INPUT_HEIGHT = 80;

// --- Main Component ---
export default function ChatLandingPage() {
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const sessionIdRef = useRef<string>(''); 
  const chatWindowRef = useRef<HTMLDivElement>(null);
  
  const isChatEmpty = history.length === 0;

  // Generate or Load Session ID on first component mount
  useEffect(() => {
    let existingSessionId = getCookie("session_id");
    
    if (existingSessionId) {
      // 1. Found an existing cookie: use it to resume the conversation state.
      sessionIdRef.current = existingSessionId;
      console.log(`Resuming session with ID: ${existingSessionId}`);
    } else {
      // 2. No cookie found or expired: generate a new one.
      const newId = nanoid();
      sessionIdRef.current = newId;
      console.log(`Starting new session with ID: ${newId}`);
      
      // IMPORTANT: We MUST tell the backend to set this cookie on the first request.
      // We don't set it directly here to maintain the session state consistency 
      // managed by the FastAPI backend (which sets the TTL).
    }
  }, []); // Run only once on mount

  // Scroll to the bottom of the chat window on new message or load state change
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [history, isLoading]);


  const handleSend = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    
    // 1. Add user message to history
    setHistory(prev => [...prev, { id: nanoid(), role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // 2. Build the fetch URL for the Next.js API route
      // IMPORTANT: Use the sessionIdRef.current value
      const apiUrl = `/api/chat?message=${encodeURIComponent(userMessage)}&session_id=${sessionIdRef.current}`;
      
      const response = await fetch(apiUrl);

      // 3. Handle cookies returned by the backend response
      // When the backend returns a Set-Cookie header, the browser handles setting the cookie automatically.
      
      if (!response.ok) {
        throw new Error('API failed to return a valid response.');
      }

      const data = await response.text();

      // 4. Add Agent response to history
      const assistantResponse = data || "Sorry, I encountered an internal error and couldn't process that.";
      
      setHistory(prev => [...prev, { id: nanoid(), role: 'assistant', content: assistantResponse }]);

    } catch (error) {
      console.error("Chat error:", error);
      setHistory(prev => [
        ...prev, 
        { id: nanoid(), role: 'assistant', content: "Error: Could not connect to the Agent backend. Please check the console." }
      ]);
    } finally {
      // 5. End loading state
      setIsLoading(false);
    }
  };

  return (
    // Main component JSX remains the same, relying on the logic above
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
            // Center welcome message if no messages exist
            <div className="flex h-[calc(100vh-16rem)] flex-col items-center justify-center text-center">
              <MessageSquare size={48} className="text-indigo-400 mb-4" />
              <p className="text-xl text-gray-600">Your AI Copilot for perfect movie night decisions.</p>
              <p className="text-sm text-gray-500 mt-4">Note: This session does not save history.</p>
            </div>
          ) : (
            // Map Conversation History
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
        className={`max-w-3xl rounded-xl px-4 py-3 shadow-md ${
          isUser
            ? 'bg-indigo-600 text-white font-medium'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        <p dangerouslySetInnerHTML={{ __html: message.content }} />
      </div>
    </div>
  );
}