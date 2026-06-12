import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Trash2, MapPin, HeartPulse, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ChatBot.css';

const API = 'http://localhost:5001/api';

/* ── Format markdown-like text to JSX ── */
const formatMessage = (text) =>
  text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    const html = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:#F3F4F6;padding:1px 5px;border-radius:4px;font-size:12px">$1</code>');
    return <p key={i} style={{ margin: '2px 0', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: html }} />;
  });

/* ── Typing indicator ── */
const TypingIndicator = () => (
  <div className="chat-message assistant">
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, opacity: 0.6 }}>
      <Bot size={13} /><span style={{ fontSize: 11, fontWeight: 600 }}>CardioSense AI</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: '50%', background: '#0A66C2',
          animation: 'typingDot 1.2s infinite', animationDelay: `${i * 0.2}s`, display: 'inline-block'
        }} />
      ))}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════ */
const ChatBot = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${firstName}! 👋 I'm your CardioSense AI Health Assistant.\n\nI can answer **any question** you have — your ECG results, heart health, medications, hospital locations, or just a friendly chat.\n\nWhat would you like to know today?`,
    },
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [configured, setConfigured] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ── Send message ── */
  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('cardiosense_token');
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-16), // send last 16 messages for context
        }),
      });

      const data = await res.json();

      if (data.fallback) {
        // Groq API key not configured
        setConfigured(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `⚠️ **AI Chat Not Configured Yet**\n\nTo enable unlimited AI chat, the admin needs to add a free Groq API key.\n\nGet one free at: **https://console.groq.com**\nThen add to backend/.env:\n\`GROQ_API_KEY=your_key_here\``,
        }]);
      } else if (data.success && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
        setConfigured(true);
      } else {
        throw new Error(data.error || 'No response from AI');
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Sorry, I couldn't connect to the AI service. Please check your internet connection and try again.\n\nError: ${err.message}`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, messages, loading]);

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      text: `Chat cleared! 😊 What would you like to talk about, ${firstName}?`,
    }]);
  };

  const quickActions = [
    'Show my latest ECG results',
    'Show all my reports',
    'What is my risk score?',
    'Find hospitals in Colombo',
    'What is atrial fibrillation?',
    'What should I eat for heart health?',
  ];

  return (
    <div className="chat-page">
      {/* ── Left Panel ── */}
      <div className="chat-sidebar-card">
        <div className="chat-sidebar-header">
          <Bot size={22} color="#0A66C2" />
          <div>
            <h2>AI Assistant</h2>
            <p>Powered by Groq · Llama 3</p>
          </div>
        </div>

        {/* Status */}
        <div style={{
          margin: '0 0 16px',
          padding: '10px 14px',
          borderRadius: 10,
          background: configured ? '#D1FAE5' : '#FEF3C7',
          border: `1px solid ${configured ? '#6EE7B7' : '#FCD34D'}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 10, width: 8, height: 8, borderRadius: '50%', background: configured ? '#10B981' : '#F59E0B', flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: configured ? '#065F46' : '#92400E' }}>
            {configured ? 'AI Online — Ask anything!' : 'API key needed'}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="chat-suggestions">
          <h3>Quick Actions</h3>
          <div className="suggestion-grid">
            {quickActions.map(a => (
              <button key={a} type="button" onClick={() => sendMessage(a)} disabled={loading}>{a}</button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="chat-info">
          <div><HeartPulse size={16} color="#0A66C2" /><p>Medical guidance only — not a replacement for professional care.</p></div>
          <div><MapPin size={16} color="#0A66C2" /><p>Hospital data covers all 9 provinces of Sri Lanka.</p></div>
        </div>
      </div>

      {/* ── Chat Window ── */}
      <div className="chat-window-card">
        <div className="chat-window-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>CardioSense AI Chat</h2>
            <p>Ask anything — your reports, heart health, medications, or anything else.</p>
          </div>
          <button type="button" onClick={clearChat}
            style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Trash2 size={14} /> Clear
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, opacity: 0.6 }}>
                  <Bot size={13} /><span style={{ fontSize: 11, fontWeight: 600 }}>CardioSense AI</span>
                </div>
              )}
              {msg.role === 'user' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, justifyContent: 'flex-end', opacity: 0.8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{user?.name?.split(' ')[0] || 'You'}</span>
                  <User size={13} />
                </div>
              )}
              <div>{formatMessage(msg.text)}</div>
            </div>
          ))}

          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask anything — ECG results, heart health, hospitals, or just say Hi..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={loading}
          />
          <button
            type="button"
            className="send-button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
