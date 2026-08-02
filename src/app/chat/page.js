'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hi! I'm the Fillpack assistant. I can help you create recipes, manage packaging, build quotes, and more. What would you like to do?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, there was an error: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    /* 100dvh, not 100vh: mobile browser chrome would otherwise push the composer
       below the fold. The nav is ~60px, hence the offset. */
    <div className="-my-5 flex flex-col bg-white sm:-my-6" style={{ height: 'calc(100dvh - 60px)' }}>
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-navy sm:text-2xl">Fillpack Assistant</h1>
          <Link href="/" className="shrink-0 text-sm text-brand hover:underline">
            Dashboard
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 sm:max-w-md ${
                msg.role === 'user'
                  ? 'bg-brand text-white'
                  : 'border border-gray-200 bg-gray-50 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="mb-4 flex justify-start">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
              <div className="flex gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                <div className="animation-delay-200 h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                <div className="animation-delay-400 h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask me anything…"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand focus:outline-none"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:bg-gray-300"
          >
            Send
          </button>
        </div>
        <p className="mt-2 hidden text-xs text-gray-500 sm:block">
          I can help you create recipes, add ingredients and packaging, build quotes, and manage your products.
        </p>
      </div>
    </div>
  );
}
