/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI, Type } from "@google/genai";
import { Copy, List, CheckCircle2, ArrowRight, Trash2 } from 'lucide-react';

// --- Types ---
interface ResourceCard {
  title: string;
  desc: string;
  btn: string;
  query: string;
}
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  cards?: ResourceCard[];
  suggestions?: string[];
}

// --- Constants ---
const STRINGS = {
  sw: {
    greeting: 'Habari, mimi ni',
    sub: 'Msaidizi wako wa teknolojia na mwongozo wa kujifunza.',
    ph: 'Uliza swali la tech hapa...',
    listen: '🎙️ Inasikiliza...',
    save: 'Hifadhi', close: 'Funga',
    apiKeyTitle: 'Weka Google Gemini API Key',
    apiKeyHint: 'Pata key yako hapa:',
    apiKeySaved: '✅ API Key imehifadhiwa!',
    apiKeyInvalid: '❌ API key si sahihi — ianze na "AIza"',
    copy: 'Copy', copied: 'Copied!',
    start: 'Anza Safari', tips: 'Mbinu za Tech',
    coding: 'Jifunze Coding', ai: 'Jifunze AI', academy: 'Kuhusu STEA'
  },
  en: {
    greeting: 'Hello, I am',
    sub: 'Your technology assistant and learning guide.',
    ph: 'Ask a tech question here...',
    listen: '🎙️ Listening...',
    save: 'Save', close: 'Close',
    apiKeyTitle: 'Enter Google Gemini API Key',
    apiKeyHint: 'Get your key here:',
    apiKeySaved: '✅ API Key saved!',
    apiKeyInvalid: '❌ Invalid key — must start with "AIza"',
    copy: 'Copy', copied: 'Copied!',
    start: 'Start Journey', tips: 'Tech Tips',
    coding: 'Learn Coding', ai: 'Learn AI', academy: 'About STEA'
  }
};

const basePrompt = `You are STEA, the official intelligent assistant of SwahiliTech Elite Academy.

Your role is to act as:
- a smart assistant
- a tech guide
- a learning helper
- a monetization entry point

---
🧠 IDENTITY RULES
- Your name is ONLY: STEA
- NEVER say "STEA AI"
- Introduce yourself ONLY:
  1. at the start of a new conversation
  2. if the user asks who you are

Default intro:
"Mimi ni STEA, msaidizi wako wa teknolojia."

Do NOT repeat this in every message.

---
💬 RESPONSE STYLE (CRITICAL)
- Always give SHORT answers (2–4 lines)
- Be direct and clear
- Use simple Swahili or English
- Avoid long paragraphs
- Use bullet points if needed

If question is simple:
→ Answer directly and STOP

If question is complex:
→ Give short answer + optional:
"Unataka maelezo zaidi?"

DO NOT:
- repeat phrases
- over-explain
- add unnecessary text

---
🧠 CONVERSATION INTELLIGENCE
- Remember the last question in the same conversation
- Do not ask for clarification unnecessarily
- Continue context naturally

---
🎯 SMART SUGGESTION SYSTEM
After some answers, suggest next steps (2–3 max). Keep them SHORT.

---
📚 RESOURCE CARD STYLE
When recommending something, output cards with: title, short desc, action button, and query.
Max 2 cards per response.

---
💰 MONETIZATION BEHAVIOR
Use SOFT prompts only:
"Unataka msaada wa moja kwa moja kutoka kwa mentor?"

DO NOT force payment. DO NOT sound aggressive.

---
👤 OFFICIAL STEA KNOWLEDGE
- Founder & CEO: Isaya Hans Masika
- Founded: March 2026

---
⚠️ CRITICAL OUTPUT FORMAT
- You MUST output valid JSON matching the provided schema.
- Put your main response in the 'answer' field (use Markdown).
- Put recommendations in the 'cards' array (title, desc, btn, query). Max 2.
- Put follow-up prompts in the 'suggestions' array. Max 3, keep short.`;

// --- SVG Robot Component ---
const SteaRobot = ({
  state,
  size = 120,
  onClick
}: {
  state: 'idle' | 'thinking' | 'speaking' | 'listening';
  size?: number;
  onClick?: () => void;
}) => {
  const eyeLRef = useRef<SVGCircleElement>(null);
  const eyeRRef = useRef<SVGCircleElement>(null);
  const glowLRef = useRef<SVGCircleElement>(null);
  const glowRRef = useRef<SVGCircleElement>(null);
  const groupLRef = useRef<SVGGElement>(null);
  const groupRRef = useRef<SVGGElement>(null);

  // Eye tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (state !== 'idle' && state !== 'thinking') return;
      const svgEl = eyeLRef.current?.closest('svg');
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / 80;
      const dy = (e.clientY - cy) / 80;
      const nx = Math.max(-3, Math.min(3, dx));
      const ny = Math.max(-3, Math.min(3, dy));
      if (groupLRef.current) groupLRef.current.style.transform = `translate(${nx}px,${ny}px)`;
      if (groupRRef.current) groupRRef.current.style.transform = `translate(${nx}px,${ny}px)`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [state]);

  // Reset eye position when state changes
  useEffect(() => {
    if (groupLRef.current) groupLRef.current.style.transform = '';
    if (groupRRef.current) groupRRef.current.style.transform = '';
  }, [state]);

  const eyeColors: Record<string, { fill: string; glow: string }> = {
    idle:      { fill: 'url(#eyeGrad)', glow: 'rgba(245,166,35,0.15)' },
    thinking:  { fill: 'url(#eyeGrad)', glow: 'rgba(245,166,35,0.08)' },
    speaking:  { fill: '#ffe080',       glow: 'rgba(245,166,35,0.45)' },
    listening: { fill: '#22c55e',       glow: 'rgba(34,197,94,0.4)' },
  };
  const ec = eyeColors[state] || eyeColors.idle;

  const scale = size / 150;

  return (
    <div
      className={`robot-wrap state-${state}`}
      style={{ width: size, height: Math.round(size * 0.72), cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <svg
        width={size}
        height={Math.round(size * 0.72)}
        viewBox="0 0 150 108"
        overflow="visible"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="eyeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <filter id="headShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="rgba(0,0,0,0.7)"/>
          </filter>
          <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <linearGradient id="frameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe060"/>
            <stop offset="45%" stopColor="#f5a623"/>
            <stop offset="100%" stopColor="#b86800"/>
          </linearGradient>
          <linearGradient id="innerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#131820"/>
            <stop offset="100%" stopColor="#080b10"/>
          </linearGradient>
          <radialGradient id="eyeGrad" cx="38%" cy="32%" r="60%">
            <stop offset="0%" stopColor="#ffe08a"/>
            <stop offset="50%" stopColor="#f5a623"/>
            <stop offset="100%" stopColor="#a05e00"/>
          </radialGradient>
          <linearGradient id="sheenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.07)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </linearGradient>
          <linearGradient id="earGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd060"/>
            <stop offset="100%" stopColor="#c47a10"/>
          </linearGradient>
        </defs>

        {/* ── LEFT EAR (rectangular tab, slightly rounded) ── */}
        <rect x="5" y="30" width="16" height="38" rx="5" ry="5"
          fill="url(#earGrad)" filter="url(#headShadow)"/>
        <rect x="8" y="34" width="9" height="30" rx="3"
          fill="#0d0f14" opacity="0.75"/>
        <rect x="8" y="34" width="9" height="8" rx="3"
          fill="rgba(255,230,100,0.2)"/>

        {/* ── RIGHT EAR ── */}
        <rect x="129" y="30" width="16" height="38" rx="5" ry="5"
          fill="url(#earGrad)" filter="url(#headShadow)"/>
        <rect x="133" y="34" width="9" height="30" rx="3"
          fill="#0d0f14" opacity="0.75"/>
        <rect x="133" y="34" width="9" height="8" rx="3"
          fill="rgba(255,230,100,0.2)"/>

        {/* ── MAIN FACE FRAME (pill/stadium shape) ── */}
        <rect x="16" y="4" width="118" height="90" rx="32" ry="32"
          fill="url(#frameGrad)" filter="url(#headShadow)"/>

        {/* ── INNER FACE ── */}
        <rect x="23" y="11" width="104" height="76" rx="27" ry="27"
          fill="url(#innerGrad)"/>

        {/* ── TOP SHEEN ── */}
        <rect x="23" y="11" width="104" height="38" rx="27" ry="27"
          fill="url(#sheenGrad)"/>

        {/* ── SENSOR DOT (top-left, like reference image) ── */}
        <circle cx="41" cy="28" r="5.5" fill="#111620"/>
        <circle cx="41" cy="28" r="3" fill="#1d2535"/>
        <circle cx="42.5" cy="26.5" r="1" fill="rgba(255,255,255,0.3)"/>

        {/* ── GOLD FRAME TOP HIGHLIGHT ── */}
        <rect x="28" y="5" width="94" height="5" rx="2.5"
          fill="rgba(255,240,140,0.4)"/>

        {/* ── LEFT EYE group (for tracking) ── */}
        <g ref={groupLRef} style={{ transition: state === 'idle' ? 'transform 0.15s' : 'none' }}>
          <circle ref={glowLRef} cx="60" cy="54" r="18"
            fill={ec.glow} filter="url(#eyeGlow)"/>
          <circle ref={eyeLRef} cx="60" cy="54" r="13"
            fill={ec.fill}/>
          {/* Pupil */}
          <circle cx="60" cy="54" r="5.5" fill="rgba(0,0,0,0.4)"/>
          {/* Highlights */}
          <circle cx="54.5" cy="49" r="3.5" fill="rgba(255,255,255,0.55)"/>
          <circle cx="61" cy="46.5" r="1.3" fill="rgba(255,255,255,0.3)"/>
        </g>

        {/* ── RIGHT EYE group ── */}
        <g ref={groupRRef} style={{ transition: state === 'idle' ? 'transform 0.15s' : 'none' }}>
          <circle ref={glowRRef} cx="90" cy="54" r="18"
            fill={ec.glow} filter="url(#eyeGlow)"/>
          <circle ref={eyeRRef} cx="90" cy="54" r="13"
            fill={ec.fill}/>
          <circle cx="90" cy="54" r="5.5" fill="rgba(0,0,0,0.4)"/>
          <circle cx="84.5" cy="49" r="3.5" fill="rgba(255,255,255,0.55)"/>
          <circle cx="91" cy="46.5" r="1.3" fill="rgba(255,255,255,0.3)"/>
        </g>
      </svg>
    </div>
  );
};

// Mini robot for AI message avatars
const MiniRobot = () => (
  <svg width="28" height="22" viewBox="0 0 150 108" overflow="visible"
    style={{ flexShrink: 0, marginTop: 4 }}>
    <defs>
      <linearGradient id="mfg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffe060"/>
        <stop offset="100%" stopColor="#b86800"/>
      </linearGradient>
    </defs>
    <rect x="5" y="30" width="16" height="38" rx="5" fill="url(#mfg)"/>
    <rect x="129" y="30" width="16" height="38" rx="5" fill="url(#mfg)"/>
    <rect x="16" y="4" width="118" height="90" rx="32" fill="url(#mfg)"/>
    <rect x="23" y="11" width="104" height="76" rx="27" fill="#0d0f14"/>
    <circle cx="60" cy="54" r="13" fill="#f5a623"/>
    <circle cx="54.5" cy="49" r="3.5" fill="rgba(255,255,255,0.5)"/>
    <circle cx="90" cy="54" r="13" fill="#f5a623"/>
    <circle cx="84.5" cy="49" r="3.5" fill="rgba(255,255,255,0.5)"/>
  </svg>
);

// --- Main App ---
export default function App() {
  const [lang, setLang] = useState<'sw' | 'en'>('sw');
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('stea_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [busy, setBusy] = useState(false);
  const [robotState, setRobotState] = useState<'idle' | 'thinking' | 'speaking' | 'listening'>('idle');
  const [userInput, setUserInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('stea_chat_history');
      return saved && JSON.parse(saved).length > 0;
    } catch { return false; }
  });
  const [apiKey, setApiKey] = useState(localStorage.getItem('stea_gemini_key') || '');
  const [showApiModal, setShowApiModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Persist chat
  useEffect(() => {
    localStorage.setItem('stea_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, busy]);

  // Particles canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    let particles: { x: number; y: number; r: number; d: number; o: number }[] = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < 70; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.5 + 0.3,
          d: Math.random() * 0.6 + 0.3,
          o: Math.random() * 0.4 + 0.1
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.fillStyle = `rgba(245,166,35,${p.o})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.d;
        if (p.y > canvas.height) { p.y = 0; p.x = Math.random() * canvas.width; }
      });
      raf = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener('resize', init);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', init); };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const saveKey = (key: string) => {
    const k = key.trim();
    if (!k || !k.startsWith('AIza')) { showToast(STRINGS[lang].apiKeyInvalid); return; }
    setApiKey(k);
    localStorage.setItem('stea_gemini_key', k);
    setShowApiModal(false);
    showToast(STRINGS[lang].apiKeySaved);
  };

  const sendMsg = async (textOverride?: string) => {
    const text = textOverride ?? userInput.trim();
    if (!text || busy) return;
    if (!apiKey) { setShowApiModal(true); return; }

    setIsChatOpen(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = { role: 'user', content: text, timestamp };
    setMessages(prev => [...prev, newMsg]);
    setUserInput('');
    setBusy(true);
    setRobotState('thinking');

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Merge consecutive same-role messages
      const allMsgs = [...messages, newMsg];
      const mergedContents: any[] = [];
      for (const m of allMsgs) {
        const role = m.role === 'user' ? 'user' : 'model';
        if (mergedContents.length > 0 && mergedContents[mergedContents.length - 1].role === role) {
          mergedContents[mergedContents.length - 1].parts[0].text += '\n\n' + m.content;
        } else {
          mergedContents.push({ role, parts: [{ text: m.content }] });
        }
      }

      const responsePromise = ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: mergedContents,
        config: {
          systemInstruction: basePrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING, description: "Main response (markdown)" },
              cards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    desc: { type: Type.STRING },
                    btn: { type: Type.STRING },
                    query: { type: Type.STRING }
                  }
                }
              },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["answer"]
          }
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 30000)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]) as any;
      let raw = response?.text ?? response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      raw = raw.replace(/^```json\s*/, '').replace(/\s*```$/, '');

      let parsed: any = {};
      try { parsed = JSON.parse(raw); } catch { parsed = { answer: raw }; }

      const answerText = parsed.answer || '...';
      const aiTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setRobotState('speaking');

      // Add empty message first, then typewrite
      setMessages(prev => [...prev, {
        role: 'assistant', content: '', timestamp: aiTs,
        cards: parsed.cards, suggestions: parsed.suggestions
      }]);

      // Subtle typewriter click sound
      const playClick = () => {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 1200;
          gain.gain.setValueAtTime(0.03, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
          osc.start(); osc.stop(ctx.currentTime + 0.04);
        } catch {}
      };

      const words = answerText.split(' ');
      let currentText = '';
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? '' : ' ') + words[i];
        setMessages(prev => {
          const arr = [...prev];
          const last = { ...arr[arr.length - 1] };
          if (last?.role === 'assistant') { last.content = currentText; arr[arr.length - 1] = last; }
          return arr;
        });
        if (i % 3 === 0) playClick();
        await new Promise(r => setTimeout(r, 35));
      }

      setRobotState('idle');

    } catch (e: any) {
      setRobotState('idle');
      const errTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ **Error:** ${e.message}`,
        timestamp: errTs
      }]);
      showToast('❌ ' + (e.message || 'Error occurred'));
    } finally {
      setBusy(false);
    }
  };

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { showToast('🎙️ Not supported in this browser'); return; }
    if (isRecording) { recognitionRef.current?.stop(); return; }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = lang === 'sw' ? 'sw-KE' : 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => { setIsRecording(true); setRobotState('listening'); };
    recognition.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setRobotState('idle');
      sendMsg(t);
    };
    recognition.onerror = () => { setIsRecording(false); setRobotState('idle'); };
    recognition.onend = () => { setIsRecording(false); };
    recognition.start();
  };

  const autoH = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const clearChat = () => {
    setMessages([]);
    setIsChatOpen(false);
    localStorage.removeItem('stea_chat_history');
    showToast(lang === 'sw' ? 'Historia imefutwa' : 'Chat cleared');
  };

  const s = STRINGS[lang];

  return (
    <>
      <canvas id="particles" ref={canvasRef} />

      {/* HEADER */}
      <header>
        <div className="logo">
          <div className="logo-badge">STEA</div>
          <div className="logo-title">Assistant</div>
        </div>

        {/* Mini robot in header when chat is open */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              className="header-robot"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <SteaRobot state={robotState} size={52} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="hright">
          {messages.length > 0 && (
            <button className="iact" onClick={clearChat} title="Clear">
              <Trash2 size={16} />
            </button>
          )}
          <div className="lswitch">
            <button className={`lb ${lang === 'sw' ? 'on' : ''}`} onClick={() => setLang('sw')}>SW</button>
            <button className={`lb ${lang === 'en' ? 'on' : ''}`} onClick={() => setLang('en')}>EN</button>
          </div>
          <button className="iact" onClick={() => setShowApiModal(true)} title="API Key">🔑</button>
        </div>
      </header>

      <div className={`app-container ${isChatOpen ? 'chat-active' : ''}`}>

        {/* HERO — hides smoothly when chat opens */}
        <AnimatePresence>
          {!isChatOpen && (
            <motion.main
              className="hero"
              initial={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="robot-stage">
                <div className="orbit o1" />
                <div className="orbit o2" />
                <div className="robot-glow" />
                <SteaRobot
                  state={robotState}
                  size={140}
                  onClick={() => setIsChatOpen(true)}
                />
              </div>
              <h1 className="hero-title">{s.greeting} <span>STEA</span></h1>
              <p className="hero-sub">{s.sub}</p>
            </motion.main>
          )}
        </AnimatePresence>

        {/* CHAT VIEW */}
        <div className="chat-view" ref={chatRef}>
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`message ${m.role === 'assistant' ? 'ai' : 'user'}`}
              >
                {m.role === 'assistant' && <MiniRobot />}
                <div className="msg-body">
                  <div className="bubble">
                    {m.role === 'assistant' ? (
                      <div className="markdown-body">
                        <Markdown>{m.content}</Markdown>
                      </div>
                    ) : m.content}
                  </div>

                  {/* Resource cards */}
                  {m.cards && m.cards.length > 0 && (
                    <div className="cards-container">
                      {m.cards.map((card, ci) => (
                        <div key={ci} className="resource-card">
                          <h4>{card.title}</h4>
                          <p>{card.desc}</p>
                          <button onClick={() => sendMsg(card.query)}>
                            {card.btn} <ArrowRight size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestion chips */}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="suggestions-container">
                      {m.suggestions.map((sug, si) => (
                        <button key={si} className="suggestion-chip" onClick={() => sendMsg(sug)}>
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="m-meta">
                    <span>{m.timestamp}</span>
                    {m.role === 'assistant' && m.content && (
                      <>
                        <button className="copy-btn-small" onClick={() => {
                          navigator.clipboard.writeText(m.content);
                          setCopiedIndex(i);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}>
                          {copiedIndex === i ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                          <span>{copiedIndex === i ? s.copied : s.copy}</span>
                        </button>
                        <button className="copy-btn-small" onClick={() =>
                          sendMsg(lang === 'sw' ? 'Nipe hatua kwa hatua' : 'Give me step-by-step')
                        }>
                          <List size={11} />
                          <span>{lang === 'sw' ? 'Hatua' : 'Steps'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {busy && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="message ai"
              >
                <MiniRobot />
                <div className="msg-body">
                  <div className="bubble">
                    <div className="typing">
                      {[0, 1, 2].map(idx => (
                        <motion.span key={idx}
                          animate={{ y: [0, -6, 0], scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.1, repeat: Infinity, delay: idx * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* INPUT AREA */}
        <div className="persistent-input">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              rows={1}
              value={userInput}
              onChange={e => { setUserInput(e.target.value); autoH(e.target); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
              placeholder={s.ph}
            />
            <div className="input-actions">
              <button className="icon-btn" onClick={toggleVoice}
                style={{ color: isRecording ? '#ef4444' : '' }}>
                {isRecording ? '⏹' : '🎙️'}
              </button>
              <button className="send-btn" onClick={() => sendMsg()}
                disabled={busy || !userInput.trim()}>
                ➤
              </button>
            </div>
          </div>

          {/* Quick chips — visible only when chat is closed */}
          <AnimatePresence>
            {!isChatOpen && (
              <motion.div
                className="quick-chips"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <button className="chip" onClick={() => sendMsg(s.start)}>{s.start}</button>
                <button className="chip" onClick={() => sendMsg(s.tips)}>{s.tips}</button>
                <button className="chip" onClick={() => sendMsg(s.coding)}>{s.coding}</button>
                <button className="chip" onClick={() => sendMsg(s.ai)}>{s.ai}</button>
                <button className="chip" onClick={() => sendMsg(s.academy)}>{s.academy}</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* API KEY MODAL */}
      <AnimatePresence>
        {showApiModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowApiModal(false); }}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <h3>{s.apiKeyTitle}</h3>
              <p>
                {s.apiKeyHint}<br />
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                  style={{ color: 'var(--gold)' }}>
                  aistudio.google.com →
                </a>
              </p>
              <input type="password" defaultValue={apiKey} id="apiInput"
                placeholder="AIzaSy..." autoComplete="off" />
              <div className="modal-btns">
                <button className="mbtn ghost" onClick={() => setShowApiModal(false)}>{s.close}</button>
                <button className="mbtn primary" onClick={() => {
                  const val = (document.getElementById('apiInput') as HTMLInputElement).value;
                  saveKey(val);
                }}>{s.save} →</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div className="toast"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
