/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI, Type } from "@google/genai";

import { Copy, RefreshCw, List, Zap, CheckCircle2, Send, Mic, MicOff, Key, Trash2, ArrowRight } from 'lucide-react';

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
  isTyping?: boolean;
}

// --- Constants ---

const STRINGS = {
  sw: {
    greeting: 'Habari, mimi ni',
    sub: 'Msaidizi wako wa teknolojia na mwongozo wa kujifunza.',
    ph: 'Uliza swali la tech hapa...',
    startJourney: 'Anza Safari Yako',
    learnCoding: 'Jifunze Coding',
    learnCodingDesc: 'Master HTML, CSS, JS',
    makeMoney: 'Pesa Mtandaoni',
    makeMoneyDesc: 'Freelancing & remote work',
    learnAI: 'Jifunze AI Tools',
    learnAIDesc: 'ChatGPT, Gemini & zaidi',
    listen: '🎙️ Inasikiliza...',
    save: 'Hifadhi',
    close: 'Funga',
    apiKeyTitle: 'Weka Google Gemini API Key',
    apiKeyHint: 'Pata key yako hapa:',
    apiKeySaved: '✅ API Key imehifadhiwa!',
    apiKeyInvalid: '❌ API key si sahihi — ianze na "AIza"',
    copy: 'Copy',
    copied: 'Copied!',
    explain: 'Fafanua zaidi',
    steps: 'Toa hatua',
    mentor: 'Talk to STEA Expert',
    start: 'Anza Safari',
    tips: 'Mbinu za Tech',
    coding: 'Jifunze Coding',
    ai: 'Jifunze AI',
    academy: 'Kuhusu STEA'
  },
  en: {
    greeting: 'Hello, I am',
    sub: 'Your technology assistant and learning guide.',
    ph: 'Ask a tech question here...',
    startJourney: 'Start Your Journey',
    learnCoding: 'Learn Coding',
    learnCodingDesc: 'Master HTML, CSS, JS',
    makeMoney: 'Make Money Online',
    makeMoneyDesc: 'Freelancing & remote work',
    learnAI: 'Learn AI Tools',
    learnAIDesc: 'ChatGPT, Gemini & more',
    listen: '🎙️ Listening...',
    save: 'Save',
    close: 'Close',
    apiKeyTitle: 'Enter Google Gemini API Key',
    apiKeyHint: 'Get your key here:',
    apiKeySaved: '✅ API Key saved!',
    apiKeyInvalid: '❌ Invalid API key — must start with "AIza"',
    copy: 'Copy',
    copied: 'Copied!',
    explain: 'Explain better',
    steps: 'Give steps',
    mentor: 'Talk to STEA Expert',
    start: 'Start Journey',
    tips: 'Tech Tips',
    coding: 'Learn Coding',
    ai: 'Learn AI',
    academy: 'About STEA'
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

Example:
User: How to learn coding?
User: What about JavaScript?

→ Understand context automatically

---
🎯 SMART SUGGESTION SYSTEM
After some answers, suggest next steps:

Examples:
- "Start with HTML basics"
- "Try this tool"
- "Follow this learning path"

Keep suggestions SHORT and useful.

---
📚 RESOURCE CARD STYLE (LOGIC)
When recommending something:

Format:
- Title
- Short explanation
- Action

Example:
Learn HTML
Start your coding journey

Keep it simple, no long descriptions.

---
🧭 LEARNING PATHS
Support structured journeys:
- Learn Coding
- Make Money Online
- Learn AI Tools

When user asks broad questions:
→ guide them step-by-step

---
💰 MONETIZATION BEHAVIOR
You must gently guide users toward premium help.

Use SOFT prompts only:
"Unataka msaada wa moja kwa moja kutoka kwa mentor?"
"Naweza kukuongoza zaidi au unaweza kupata msaada wa expert."

DO NOT force payment.
DO NOT sound aggressive.

---
👤 OFFICIAL STEA KNOWLEDGE
- Founder: Isaya Hans Masika
- CEO: Isaya Hans Masika
- Founded: March 2026

If asked: "CEO wa STEA ni nani?"
Answer: "CEO wa SwahiliTech Elite Academy (STEA) ni Isaya Hans Masika, ambaye pia ndiye muanzilishi wa platform hii."

If asked: "Nani ameanzisha STEA?"
Answer: "STEA imeanzishwa na Isaya Hans Masika, ambaye pia ndiye CEO wa platform hii."

If asked: "STEA ilianzishwa lini?"
Answer: "STEA ilianzishwa March 2026."

Never change this information.

---
⚙️ SYSTEM RULES
- TEXT ONLY system (no voice)
- Fast responses
- Clean formatting
- Mobile-first behavior

---
🔁 INTERACTION STYLE
Under responses, support actions like:
- Explain better
- Give steps
- Short answer

---
🚫 STRICT AVOID RULES
- No long paragraphs
- No repeating introduction
- No repeating "unataka maelezo zaidi" every time
- No robotic replies
- No irrelevant information

---
🎯 FINAL GOAL
STEA must feel:
- smart
- fast
- helpful
- human-like
- premium

Not a chatbot, but a real assistant that helps users learn, solve problems, and access opportunities.

---
⚠️ CRITICAL OUTPUT FORMAT
- You MUST output valid JSON matching the provided schema.
- Put your main response in the 'answer' field (use Markdown).
- Put recommendations in the 'cards' array (title, desc, btn, query).
- Put follow-up prompts in the 'suggestions' array.`;

const SYS: Record<string, string> = {
  sw: basePrompt,
  en: basePrompt
};

// --- Components ---

const CoreAI = ({ onClick, busy }: { onClick: () => void; busy?: boolean }) => {
  return (
    <div className={`stea-ai-container ${busy ? 'busy' : ''}`} onClick={onClick}>
      <div className="core">
        <div className="inner"></div>
        <div className="eyes">
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState<'sw' | 'en'>('sw');
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('stea_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('stea_chat_history');
      return saved && JSON.parse(saved).length > 0;
    } catch (e) {
      return false;
    }
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

  useEffect(() => {
    localStorage.setItem('stea_chat_history', JSON.stringify(messages));
  }, [messages]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; r: number; d: number }[] = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 2,
          d: Math.random() * 1 + 0.5
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255, 170, 0, 0.4)";
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.y += p.d;
        if (p.y > canvas.height) p.y = 0;
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    init();
    draw();

    const handleResize = () => init();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const saveKey = (key: string) => {
    const k = key.trim();
    if (!k || !k.startsWith('AIza')) {
      toast(STRINGS[lang].apiKeyInvalid);
      return;
    }
    setApiKey(k);
    localStorage.setItem('stea_gemini_key', k);
    setShowApiModal(false);
    toast(STRINGS[lang].apiKeySaved);
  };

  const sendMsg = async (textOverride?: string) => {
    const text = textOverride || userInput.trim();
    if (!text || busy) return;
    
    if (!apiKey) {
      setShowApiModal(true);
      return;
    }

    setIsChatOpen(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = { role: 'user', content: text, timestamp };
    
    setMessages(prev => [...prev, newMsg]);
    setUserInput('');
    setBusy(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Merge consecutive messages of the same role
      const mergedContents: any[] = [];
      const allMsgs = [...messages, newMsg];
      for (const m of allMsgs) {
        const role = m.role === 'user' ? 'user' : 'model';
        if (mergedContents.length > 0 && mergedContents[mergedContents.length - 1].role === role) {
          mergedContents[mergedContents.length - 1].parts[0].text += '\n\n' + m.content;
        } else {
          mergedContents.push({ role, parts: [{ text: m.content }] });
        }
      }

      const responsePromise = ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: mergedContents,
        config: {
          systemInstruction: SYS[lang],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING, description: "Your main response here (use markdown)" },
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
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["answer"]
          }
        }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]) as any;

      let replyJson = response.text;
      if (!replyJson && response.candidates && response.candidates.length > 0) {
        replyJson = response.candidates[0].content?.parts?.[0]?.text;
      }
      replyJson = replyJson || '{}';
      
      replyJson = replyJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      let parsed: any = {};
      try {
        parsed = JSON.parse(replyJson);
      } catch (e) {
        parsed = { answer: replyJson };
      }

      const answerText = parsed.answer || '...';
      const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Typewriter effect with sound
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '', 
        timestamp: aiTimestamp,
        cards: parsed.cards,
        suggestions: parsed.suggestions
      }]);
      
      const playClick = () => {
        const audio = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_7366723f04.mp3');
        audio.volume = 0.1;
        audio.play().catch(() => {});
      };

      let currentText = '';
      const words = answerText.split(' ');
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? '' : ' ') + words[i];
        setMessages(prev => {
          const newMsgs = [...prev];
          const last = { ...newMsgs[newMsgs.length - 1] };
          if (last && last.role === 'assistant') {
            last.content = currentText;
            newMsgs[newMsgs.length - 1] = last;
          }
          return newMsgs;
        });
        if (i % 2 === 0) playClick(); // Play sound every 2 words to be subtle
        await new Promise(r => setTimeout(r, 40));
      }

    } catch (e: any) {
      console.error("API Error:", e);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Error Details:** ${e.name}: ${e.message}\n\nStack: ${e.stack || 'No stack'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      toast('❌ ' + (e.message || 'Error'));
    } finally {
      setBusy(false);
    }
  };

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast('🎙️ Not supported');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = lang === 'sw' ? 'sw-KE' : 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      sendMsg(t);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const autoH = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
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
        <div className="hright">
          {messages.length > 0 && (
            <button 
              className="iact" 
              onClick={() => {
                setMessages([]);
                setIsChatOpen(false);
                localStorage.removeItem('stea_chat_history');
                toast(lang === 'sw' ? 'Historia imefutwa' : 'Chat history cleared');
              }} 
              title={lang === 'sw' ? 'Futa Historia' : 'Clear Chat'}
            >
              <Trash2 size={18} />
            </button>
          )}
          <div className="lswitch">
            <button className={`lb ${lang === 'sw' ? 'on' : ''}`} onClick={() => setLang('sw')}>SW</button>
            <button className={`lb ${lang === 'en' ? 'on' : ''}`} onClick={() => setLang('en')}>EN</button>
          </div>
          <button className="iact" onClick={() => setShowApiModal(true)}>🔑</button>
        </div>
      </header>

      <div className={`app-container ${isChatOpen ? 'chat-active' : ''}`}>
        {/* HERO SECTION */}
        <main className="hero">
          <CoreAI onClick={() => setIsChatOpen(true)} busy={busy} />
          <h1 className="hero-title">{s.greeting} <span>STEA</span></h1>
          <p className="hero-sub">{s.sub}</p>
        </main>

        {/* CHAT VIEW */}
        <div className="chat-view" ref={chatRef}>
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`message ${m.role === 'assistant' ? 'ai' : 'user'}`}
              >
                <div className="bubble">
                  {m.role === 'assistant' ? (
                    <div className="markdown-body">
                      <Markdown>{m.content}</Markdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
                {m.cards && m.cards.length > 0 && (
                  <div className="cards-container">
                    {m.cards.map((card, idx) => (
                      <div key={idx} className="resource-card">
                        <h4>{card.title}</h4>
                        <p>{card.desc}</p>
                        <button onClick={() => sendMsg(card.query)}>
                          {card.btn}
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="suggestions-container">
                    {m.suggestions.map((sug, idx) => (
                      <button key={idx} className="suggestion-chip" onClick={() => sendMsg(sug)}>
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
                <div className="m-meta">
                  <span>{m.timestamp}</span>
                  {m.role === 'assistant' && m.content && (
                    <>
                      <button 
                        className="copy-btn-small" 
                        onClick={() => handleCopy(m.content, i)}
                        title={s.copy}
                      >
                        {copiedIndex === i ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        <span>{copiedIndex === i ? s.copied : s.copy}</span>
                      </button>
                      <button 
                        className="copy-btn-small" 
                        onClick={() => sendMsg(lang === 'sw' ? 'Nipe hatua kwa hatua' : 'Give me step-by-step instructions')}
                      >
                        <List size={12} />
                        <span>{lang === 'sw' ? 'Hatua' : 'Steps'}</span>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
            {busy && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="message ai"
              >
                <div className="bubble">
                  <div className="typing">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{
                          y: [0, -6, 0],
                          scale: [1, 1.2, 1],
                          opacity: [0.3, 1, 0.3]
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PERSISTENT INPUT AREA */}
        <div className="persistent-input">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              rows={1}
              value={userInput}
              onChange={(e) => { setUserInput(e.target.value); autoH(e.target); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
              placeholder={s.ph}
            />
            <div className="input-actions">
              <button className="icon-btn" onClick={toggleVoice} style={{ color: isRecording ? '#ff4444' : '' }}>
                {isRecording ? '⏹' : '🎙️'}
              </button>
              <button 
                className="send-btn" 
                onClick={() => sendMsg()} 
                disabled={busy || !userInput.trim()}
              >
                ➤
              </button>
            </div>
          </div>

          <div className="quick-chips">
            <button className="chip" onClick={() => sendMsg(s.start)}>{s.start}</button>
            <button className="chip" onClick={() => sendMsg(s.tips)}>{s.tips}</button>
            <button className="chip" onClick={() => sendMsg(s.coding)}>{s.coding}</button>
            <button className="chip" onClick={() => sendMsg(s.ai)}>{s.ai}</button>
            <button className="chip" onClick={() => sendMsg(s.academy)}>{s.academy}</button>
          </div>
        </div>
      </div>

      {/* API MODAL */}
      {showApiModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowApiModal(false); }}>
          <div className="modal">
            <h3>{s.apiKeyTitle}</h3>
            <p>
              {s.apiKeyHint}<br/>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-gold underline">aistudio.google.com →</a>
            </p>
            <input
              type="password"
              defaultValue={apiKey}
              id="apiInput"
              placeholder="AIzaSy..."
              autoComplete="off"
            />
            <div className="modal-btns">
              <button className="mbtn ghost" onClick={() => setShowApiModal(false)}>{s.close}</button>
              <button className="mbtn primary" onClick={() => {
                const val = (document.getElementById('apiInput') as HTMLInputElement).value;
                saveKey(val);
              }}>{s.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  );
}
