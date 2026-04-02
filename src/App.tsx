/**
 * STEA AI Assistant — Production v2
 * - gemini-2.5-flash via server proxy
 * - Live search grounding for current questions
 * - No voice UI (text-only)
 * - Admin gated by verified Firestore role
 * - No API key exposure to client
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, collection, addDoc,
  onSnapshot, serverTimestamp, query, where, getDocs,
  orderBy, deleteDoc,
} from 'firebase/firestore';
import {
  Copy, List, Zap, CheckCircle2, Trash2, ArrowRight,
  LogOut, LayoutDashboard, Coins, Home, Search,
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { AdminPanel } from './components/AdminPanel';
import { PaymentModal } from './components/MonetizationModals';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResourceCard { title: string; desc: string; btn: string; query: string; }

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  cards?: ResourceCard[];
  suggestions?: string[];
  grounded?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  plan: 'free' | 'pro' | 'enterprise';
  creditBalance: number;
  paidCredits: number;
  dailyCredits: number;
  lastDailyResetDate: any;
  totalTokens: number;
  totalCredits: number;
  premiumStatus: boolean;
  role: 'user' | 'admin';
  createdAt: any;
  lastLogin?: any;
  totalChats?: number;
  dailyCreditsUsed?: number;
  paidCreditsUsed?: number;
  accountStatus?: string;
}

export interface StarterTopic {
  id: string; title: string; description: string;
  category: string; isFeatured: boolean; isActive: boolean; order: number;
}

// ─── Firestore error handler ───────────────────────────────────────────────────
export enum OperationType { CREATE='create', UPDATE='update', DELETE='delete', LIST='list', GET='get', WRITE='write' }
export const handleFirestoreError = (error: any, op: OperationType, path: string | null) => {
  console.error(`Firestore [${op}] "${path}":`, error instanceof Error ? error.message : error);
};

// ─── Constants ────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'kukumlangoni@gmail.com';
const MIN_BALANCE = 0.1;

const DEFAULT_TOPICS: StarterTopic[] = [
  { id:'1', title:'Njia bora ya kuanza coding leo', description:'Jifunze hatua za kwanza za kuwa programmer', category:'coding', isFeatured:true, isActive:true, order:1 },
  { id:'2', title:'AI tools gani zinaweza kusaidia wanafunzi?', description:'Gundua zana za AI za kurahisisha masomo', category:'AI', isFeatured:false, isActive:true, order:2 },
  { id:'3', title:'Cybersecurity ni nini kwa beginner?', description:'Misingi ya usalama mtandaoni', category:'cybersecurity', isFeatured:false, isActive:true, order:3 },
  { id:'4', title:'Jinsi ya kuanza kupata online income kupitia tech', description:'Njia halali za kutengeneza pesa mtandaoni', category:'online income', isFeatured:true, isActive:true, order:4 },
];

const STRINGS = {
  sw: { greeting:'Habari, mimi ni', sub:'Msaidizi wako wa teknolojia na mwongozo wa kujifunza.', ph:'Uliza swali lolote la tech...', copy:'Copy', copied:'Copied!', start:'Anza Safari', tips:'Mbinu za Tech', coding:'Jifunze Coding', ai:'Jifunze AI', academy:'Kuhusu STEA', credits:'Credits', topUp:'Ongeza Salio', upgrade:'Upgrade Pro', lowCredits:'Salio lako ni dogo. Ongeza salio ili uendelee.', admin:'Admin', steps:'Hatua', liveSearch:'🔍 Inatafuta mtandaoni...' },
  en: { greeting:'Hello, I am', sub:'Your technology assistant and learning guide.', ph:'Ask any tech question...', copy:'Copy', copied:'Copied!', start:'Start Journey', tips:'Tech Tips', coding:'Learn Coding', ai:'Learn AI', academy:'About STEA', credits:'Credits', topUp:'Top Up', upgrade:'Upgrade Pro', lowCredits:'Your balance is low. Top up to continue.', admin:'Admin', steps:'Steps', liveSearch:'🔍 Searching the web...' },
};

const SYSTEM_PROMPT = `You are STEA, the official AI assistant of SwahiliTech Elite Academy (STEA).

IDENTITY:
- Name: STEA only. Never "STEA AI".
- Introduce yourself ONLY at conversation start or if asked.
- Founder & CEO: Isaya Hans Masika
- Founded: March 2026

RESPONSE STYLE:
- Short answers (2-4 lines max)
- Direct and clear
- Use Swahili unless user writes in English
- Use bullet points only if needed
- No long paragraphs

OUTPUT (CRITICAL — always valid JSON):
{
  "answer": "your response here (markdown ok)",
  "cards": [{"title":"","desc":"","btn":"","query":""}],
  "suggestions": ["follow-up 1", "follow-up 2"]
}
cards and suggestions are optional — include only when relevant.`;

// ─── CoreAI visual ─────────────────────────────────────────────────────────────
const CoreAI = ({ onClick, busy }: { onClick: () => void; busy?: boolean }) => (
  <div className={`stea-ai-container ${busy ? 'busy' : ''}`} onClick={onClick}>
    <div className="core"><div className="inner" /><div className="eyes"><span /><span /></div></div>
  </div>
);

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState<'sw'|'en'>('sw');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [guestCount, setGuestCount] = useState(() => { try { return parseInt(localStorage.getItem('stea_guest_count') || '0'); } catch { return 0; } });

  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [starterTopics, setStarterTopics] = useState<StarterTopic[]>(DEFAULT_TOPICS);
  const [globalSettings, setGlobalSettings] = useState<any>({
    tokensPerCredit: 1000, minBalanceRequired: 0.1, freePlanInitialCredits: 20,
    dailyFreeCredits: 20, maxGuestMessages: 3,
    whatsappNumber: '255758561747',
    whatsappMessage: 'Habari, nimelipia STEA package.\nName: {name}\nEmail: {email}\nPackage: {package}\nAmount: {amount}\nNinatuma screenshot.',
    systemPromptSw: SYSTEM_PROMPT, systemPromptEn: SYSTEM_PROMPT,
  });

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const s = STRINGS[lang];
  const isAdmin = userProfile?.role === 'admin' || userProfile?.email === ADMIN_EMAIL;

  // Remove splash
  useEffect(() => { (window as any).__removeSplash?.(); }, []);

  // Toast
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let animId: number;
    let particles: { x: number; y: number; r: number; d: number }[] = [];
    const init = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      particles = Array.from({length:80}, () => ({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*2, d: Math.random()+0.5 }));
    };
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='rgba(255,170,0,0.4)';
      particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); p.y+=p.d; if(p.y>canvas.height)p.y=0; });
      animId=requestAnimationFrame(draw);
    };
    init(); draw();
    window.addEventListener('resize',init);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize',init); };
  }, []);

  // Auto-scroll
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, busy]);

  // Global settings listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db,'settings','global'), snap => {
      if (snap.exists()) setGlobalSettings((p: any) => ({...p,...snap.data()}));
    }, err => handleFirestoreError(err, OperationType.GET, 'settings/global'));
    return () => unsub();
  }, []);

  // Starter topics
  useEffect(() => {
    const q = query(collection(db,'starter_topics'), orderBy('order','asc'));
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        const active = snap.docs.map(d=>({id:d.id,...d.data()} as StarterTopic)).filter(t=>t.isActive).slice(0,4);
        setStarterTopics(active.length>0 ? active : DEFAULT_TOPICS);
      } else setStarterTopics(DEFAULT_TOPICS);
    }, () => setStarterTopics(DEFAULT_TOPICS));
    return () => unsub();
  }, []);

  // Daily credit reset
  const checkAndResetDailyCredits = useCallback(async (u: FirebaseUser, profile: UserProfile) => {
    const now = new Date();
    const lastReset = profile.lastDailyResetDate?.toDate ? profile.lastDailyResetDate.toDate() : new Date(0);
    if (now.toDateString() === lastReset.toDateString()) return;
    const daily = globalSettings.dailyFreeCredits || 20;
    const paid = profile.paidCredits || 0;
    try {
      await setDoc(doc(db,'users',u.uid), { dailyCredits: daily, creditBalance: paid+daily, lastDailyResetDate: serverTimestamp() }, {merge:true});
      await addDoc(collection(db,'credit_transactions'), { userId:u.uid, type:'daily_reset', amount:daily, note:`Daily reset (${daily})`, createdAt:serverTimestamp() });
    } catch(e) { handleFirestoreError(e, OperationType.WRITE, `users/${u.uid}`); }
  }, [globalSettings.dailyFreeCredits]);

  // Auth
  useEffect(() => {
    let unsubSnap: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      unsubSnap?.(); unsubSnap = null;
      if (!u) { setUserProfile(null); setIsAdminOpen(false); return; }
      const docRef = doc(db,'users',u.uid);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          if (profile.email === ADMIN_EMAIL && profile.role !== 'admin') {
            await updateDoc(docRef, {role:'admin'}); profile.role='admin';
          }
          setUserProfile(profile);
          await checkAndResetDailyCredits(u, profile);
          await setDoc(docRef, {lastLogin:serverTimestamp()}, {merge:true});
        } else {
          const np: UserProfile = {
            uid:u.uid, email:u.email||'', name:u.displayName||'',
            plan:'free', creditBalance:globalSettings.freePlanInitialCredits||20,
            paidCredits:0, dailyCredits:globalSettings.dailyFreeCredits||20,
            lastDailyResetDate:serverTimestamp(), totalTokens:0, totalCredits:0,
            premiumStatus:false, role: u.email===ADMIN_EMAIL?'admin':'user',
            createdAt:serverTimestamp(), lastLogin:serverTimestamp(),
          };
          await setDoc(docRef, np);
          setUserProfile(np);
        }
        unsubSnap = onSnapshot(docRef, s => { if(s.exists()) setUserProfile(s.data() as UserProfile); }, err=>handleFirestoreError(err,OperationType.GET,`users/${u.uid}`));
      } catch(e) { handleFirestoreError(e, OperationType.GET, `users/${u.uid}`); }
    });
    return () => { unsub(); unsubSnap?.(); };
  }, []);

  // Load messages on login — isolated by userId
  useEffect(() => {
    if (!user) { setMessages([]); setIsChatOpen(false); return; }
    const loadMsgs = async () => {
      try {
        const q = query(collection(db,'messages'), where('userId','==',user.uid), orderBy('createdAt','asc'));
        const snap = await getDocs(q);
        const msgs = snap.docs.map(d => d.data() as Message);
        setMessages(msgs);
        if (msgs.length > 0) setIsChatOpen(true);
      } catch(e) { handleFirestoreError(e, OperationType.GET, 'messages'); }
    };
    loadMsgs();
  }, [user]);

  useEffect(() => { if (user) { setGuestCount(0); localStorage.removeItem('stea_guest_count'); } }, [user]);

  const logout = async () => { setMessages([]); setIsChatOpen(false); setIsAdminOpen(false); await signOut(auth); };

  const clearChat = async () => {
    setMessages([]); setIsChatOpen(false);
    if (user) {
      try {
        const q = query(collection(db,'messages'), where('userId','==',user.uid));
        const snap = await getDocs(q);
        snap.docs.forEach(d => deleteDoc(d.ref).catch(console.error));
      } catch(e) { handleFirestoreError(e, OperationType.DELETE, 'messages'); }
    }
    toast(lang==='sw'?'Historia imefutwa':'Chat cleared');
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────
  const sendMsg = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? userInput).trim();
    if (!text || busy) return;

    // Guest limit
    if (!user) {
      const max = globalSettings.maxGuestMessages || 3;
      if (guestCount >= max) { setAuthModalOpen(true); return; }
      setGuestCount(prev => { const n=prev+1; localStorage.setItem('stea_guest_count',String(n)); return n; });
    } else {
      const minBal = globalSettings.minBalanceRequired || MIN_BALANCE;
      if (!userProfile || userProfile.creditBalance < minBal) {
        toast(s.lowCredits); setPaymentOpen(true); return;
      }
    }

    setIsChatOpen(true);
    const ts = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    const newMsg: Message = { role:'user', content:text, timestamp:ts };
    setMessages(prev => [...prev, newMsg]);
    setUserInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setBusy(true);

    // Save user msg
    if (user) {
      addDoc(collection(db,'messages'), { userId:user.uid, role:'user', content:text, timestamp:ts, createdAt:serverTimestamp() }).catch(console.error);
    }

    try {
      // Build history
      const allMsgs = [...messages, newMsg];
      const contents: any[] = [];
      for (const m of allMsgs) {
        const role = m.role==='user' ? 'user' : 'model';
        if (contents.length>0 && contents[contents.length-1].role===role) {
          contents[contents.length-1].parts[0].text += '\n\n' + m.content;
        } else {
          contents.push({ role, parts:[{text: m.content}] });
        }
      }

      const sysPrompt = lang==='sw'
        ? (globalSettings.systemPromptSw || SYSTEM_PROMPT)
        : (globalSettings.systemPromptEn || SYSTEM_PROMPT);

      // Detect live/current query for UI label
      const liveKeywords = ['latest','current','today','now','news','price','version','release','sasa','leo','habari','bei','mpya','toleo'];
      const isLive = liveKeywords.some(kw => text.toLowerCase().includes(kw));
      setBusyLabel(isLive ? s.liveSearch : '');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);

      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages: contents, systemInstruction: sysPrompt, userText: text }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Backend always returns {answer, cards, suggestions} — parse directly
      let payload: any = {};
      try {
        payload = await res.json();
      } catch {
        payload = { answer: 'Samahani, kuna tatizo la seva. Jaribu tena.', cards:[], suggestions:[] };
      }

      if (!res.ok && !payload.answer) {
        payload.answer = payload.error || payload.details || 'Kuna tatizo. Jaribu tena.';
      }

      const answerText = (payload.answer || '').trim() || 'Samahani, sijaweza kutoa jibu. Jaribu tena.';
      const cards = Array.isArray(payload.cards) ? payload.cards : [];
      const suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
      const grounded = !!payload.grounded;

      const aiTs = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});

      // Start typewriter
      setMessages(prev => [...prev, { role:'assistant', content:'', timestamp:aiTs, cards, suggestions, grounded }]);

      const words = answerText.split(' ');
      let current = '';
      for (let i=0; i<words.length; i++) {
        current += (i===0?'':' ') + words[i];
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length-1];
          if (last?.role==='assistant') updated[updated.length-1] = {...last, content:current};
          return updated;
        });
        await new Promise(r => setTimeout(r, 30));
      }

      // Save AI reply
      if (user) {
        addDoc(collection(db,'messages'), { userId:user.uid, role:'assistant', content:answerText, timestamp:aiTs, cards, suggestions, createdAt:serverTimestamp() }).catch(console.error);
      }

      // Deduct credits
      if (user && userProfile && payload.usageMetadata) {
        const totalTokens = payload.usageMetadata.totalTokenCount || 0;
        const creditsUsed = totalTokens / (globalSettings.tokensPerCredit || 1000);
        let toDeduct = creditsUsed;
        let newDaily = Math.max(0, userProfile.dailyCredits||0);
        let newPaid = Math.max(0, userProfile.paidCredits||0);
        let dailyUsed = 0; let paidUsed = 0;

        if (newDaily >= toDeduct) { dailyUsed=toDeduct; newDaily-=toDeduct; }
        else { dailyUsed=newDaily; toDeduct-=newDaily; newDaily=0; paidUsed=Math.min(toDeduct,newPaid); newPaid=Math.max(0,newPaid-toDeduct); }

        setDoc(doc(db,'users',user.uid), {
          creditBalance: newDaily+newPaid, dailyCredits: newDaily, paidCredits: newPaid,
          dailyCreditsUsed: (userProfile.dailyCreditsUsed||0)+dailyUsed,
          paidCreditsUsed: (userProfile.paidCreditsUsed||0)+paidUsed,
          totalTokens: (userProfile.totalTokens||0)+totalTokens,
          totalCredits: (userProfile.totalCredits||0)+creditsUsed,
          totalChats: (userProfile.totalChats||0)+1,
        }, {merge:true}).catch(console.error);

        addDoc(collection(db,'credit_transactions'), {
          userId:user.uid, type:'deduction', amount:-creditsUsed,
          note:`Chat: ${totalTokens} tokens`, createdAt:serverTimestamp(),
        }).catch(console.error);
      }

    } catch(e: any) {
      const msg = e.name==='AbortError'
        ? (lang==='sw'?'Muda umekwisha. Jaribu tena.':'Request timed out. Try again.')
        : (e.message || 'Unknown error');
      // Replace last message (loading) with error if it was blank
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length-1];
        if (last?.role==='assistant' && !last.content) {
          updated[updated.length-1] = {...last, content:`⚠️ ${msg}`};
          return updated;
        }
        return [...updated, { role:'assistant', content:`⚠️ ${msg}`, timestamp: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }];
      });
      toast('❌ ' + msg);
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  }, [user, userProfile, userInput, busy, messages, lang, globalSettings, guestCount, s, toast]);

  const autoH = (el: HTMLTextAreaElement) => { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,120)+'px'; };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <canvas id="particles" ref={canvasRef} />

      {/* HEADER */}
      <header>
        <div className="logo" onClick={() => { setIsChatOpen(false); setIsAdminOpen(false); }} style={{cursor:'pointer'}}>
          <div className="logo-badge">STEA</div>
          <div className="logo-title">Assistant</div>
        </div>

        <div className="hright">
          {userProfile && (
            <div className="balance-badge">
              <Coins size={14} className="text-gold" />
              <span>{(userProfile.creditBalance||0).toFixed(1)} {s.credits}</span>
            </div>
          )}
          {isChatOpen && !isAdminOpen && (
            <button className="iact" onClick={() => setIsChatOpen(false)} title="Home"><Home size={18}/></button>
          )}
          {messages.length>0 && !isAdminOpen && (
            <button className="iact" onClick={clearChat} title="Clear"><Trash2 size={18}/></button>
          )}
          <div className="lswitch">
            <button className={`lb ${lang==='sw'?'on':''}`} onClick={()=>setLang('sw')}>SW</button>
            <button className={`lb ${lang==='en'?'on':''}`} onClick={()=>setLang('en')}>EN</button>
          </div>
          {isAdmin && (
            <button className={`iact ${isAdminOpen?'text-gold':''}`} onClick={()=>setIsAdminOpen(!isAdminOpen)} title={s.admin}>
              <LayoutDashboard size={18}/>
            </button>
          )}
          {user ? (
            <button className="iact" onClick={logout} title="Logout"><LogOut size={18}/></button>
          ) : (
            <button className="login-btn-small" onClick={()=>setAuthModalOpen(true)}>
              {lang==='sw'?'Ingia / Jisajili':'Login / Sign Up'}
            </button>
          )}
        </div>
      </header>

      <div className={`app-container ${isChatOpen?'chat-active':''} ${isAdminOpen?'admin-active':''}`}>

        {/* ADMIN — double-gated */}
        {isAdminOpen && isAdmin && <AdminPanel onClose={()=>setIsAdminOpen(false)} lang={lang}/>}

        {!isAdminOpen && (
          <>
            {!isChatOpen ? (
              /* ─── HERO ─── */
              <main className="hero">
                <CoreAI onClick={()=>setIsChatOpen(true)} busy={busy}/>
                <h1 className="hero-title">{s.greeting} <span>STEA</span></h1>
                <p className="hero-sub">{s.sub}</p>

                {/* Quick ask bar on homepage */}
                <div className="homepage-input-wrapper">
                  <input
                    type="text"
                    className="homepage-input"
                    placeholder={s.ph}
                    onKeyDown={e => { if(e.key==='Enter' && (e.target as HTMLInputElement).value.trim()) { sendMsg((e.target as HTMLInputElement).value.trim()); } }}
                  />
                  <button className="homepage-send" onClick={e => {
                    const inp = (e.currentTarget.previousElementSibling as HTMLInputElement);
                    if (inp?.value.trim()) sendMsg(inp.value.trim());
                  }}>➤</button>
                </div>

                <div className="starter-topics-grid mt-6 w-full max-w-3xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {starterTopics.map(topic => (
                    <button key={topic.id}
                      className="starter-card text-left p-4 rounded-xl border border-gray-800 bg-black/40 hover:bg-black/60 hover:border-gold/50 transition-all duration-300 group flex flex-col gap-2 relative overflow-hidden"
                      onClick={() => { setIsChatOpen(true); setTimeout(()=>sendMsg(topic.title),200); }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-mono text-gold/80 uppercase tracking-wider">{topic.category}</span>
                        {topic.isFeatured && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 flex items-center gap-1"><Zap size={10}/> {lang==='sw'?'Mada Kuu':'Featured'}</span>}
                      </div>
                      <h3 className="text-sm font-medium text-white group-hover:text-gold transition-colors">{topic.title}</h3>
                      {topic.description && <p className="text-xs text-gray-400 line-clamp-2">{topic.description}</p>}
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all"><ArrowRight size={16} className="text-gold"/></div>
                    </button>
                  ))}
                </div>
              </main>
            ) : (
              /* ─── CHAT ─── */
              <>
                <div className="chat-view" ref={chatRef}>
                  <AnimatePresence initial={false}>
                    {messages.map((m, i) => (
                      <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className={`message ${m.role==='assistant'?'ai':'user'}`}>
                        <div className="bubble">
                          {m.role==='assistant'
                            ? <div className="markdown-body"><Markdown>{m.content}</Markdown></div>
                            : m.content
                          }
                        </div>
                        {m.grounded && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-blue-400 opacity-70">
                            <Search size={10}/> {lang==='sw'?'Jibu kutoka mtandaoni':'Answer from web search'}
                          </div>
                        )}
                        {m.cards && m.cards.length>0 && (
                          <div className="cards-container">
                            {m.cards.map((card,idx)=>(
                              <div key={idx} className="resource-card">
                                <h4>{card.title}</h4><p>{card.desc}</p>
                                <button onClick={()=>sendMsg(card.query)}>{card.btn} <ArrowRight size={14}/></button>
                              </div>
                            ))}
                          </div>
                        )}
                        {m.suggestions && m.suggestions.length>0 && (
                          <div className="suggestions-container">
                            {m.suggestions.map((sg,idx)=>(
                              <button key={idx} className="suggestion-chip" onClick={()=>sendMsg(sg)}>{sg}</button>
                            ))}
                          </div>
                        )}
                        <div className="m-meta">
                          <span>{m.timestamp}</span>
                          {m.role==='assistant' && m.content && (
                            <>
                              <button className="copy-btn-small" onClick={()=>handleCopy(m.content,i)}>
                                {copiedIndex===i?<CheckCircle2 size={12}/>:<Copy size={12}/>}
                                <span>{copiedIndex===i?s.copied:s.copy}</span>
                              </button>
                              <button className="copy-btn-small" onClick={()=>sendMsg(lang==='sw'?'Nipe hatua kwa hatua':'Give me step-by-step')}>
                                <List size={12}/><span>{s.steps}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {/* Loading indicator */}
                    {busy && (
                      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="message ai">
                        <div className="bubble">
                          {busyLabel ? (
                            <div className="flex items-center gap-2 text-xs text-blue-400">
                              <Search size={14} className="animate-pulse"/>{busyLabel}
                            </div>
                          ) : (
                            <div className="typing">
                              {[0,1,2].map(i=>(
                                <motion.span key={i}
                                  animate={{y:[0,-6,0],opacity:[0.3,1,0.3]}}
                                  transition={{duration:1.2,repeat:Infinity,delay:i*0.15,ease:'easeInOut'}}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* INPUT */}
                <div className="persistent-input">
                  {userProfile && (
                    <div className="user-status-bar">
                      <div className="plan-info">
                        <Zap size={12} className={userProfile.premiumStatus?'text-gold':'text-muted'}/>
                        <span className="capitalize">{userProfile.plan} Plan</span>
                      </div>
                      <div className="action-links">
                        <button onClick={()=>setPaymentOpen(true)}>{s.topUp}</button>
                        {!userProfile.premiumStatus && <button className="text-gold" onClick={()=>setPaymentOpen(true)}>{s.upgrade}</button>}
                      </div>
                    </div>
                  )}
                  <div className="input-wrapper">
                    <textarea ref={inputRef} rows={1} value={userInput}
                      onChange={e=>{setUserInput(e.target.value);autoH(e.target);}}
                      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                      placeholder={s.ph}
                    />
                    <div className="input-actions">
                      <button className="send-btn" onClick={()=>sendMsg()} disabled={busy||!userInput.trim()}>➤</button>
                    </div>
                  </div>
                  <div className="quick-chips">
                    <button className="chip" onClick={()=>sendMsg(s.start)}>{s.start}</button>
                    <button className="chip" onClick={()=>sendMsg(s.tips)}>{s.tips}</button>
                    <button className="chip" onClick={()=>sendMsg(s.coding)}>{s.coding}</button>
                    <button className="chip" onClick={()=>sendMsg(s.ai)}>{s.ai}</button>
                    <button className="chip" onClick={()=>sendMsg(s.academy)}>{s.academy}</button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={()=>setAuthModalOpen(false)} lang={lang}
        isPreviewLimit={!user && guestCount>=(globalSettings.maxGuestMessages||3)}/>
      <PaymentModal isOpen={isPaymentOpen} onClose={()=>setPaymentOpen(false)} userProfile={userProfile} globalSettings={globalSettings}/>

      <AnimatePresence>
        {toastMsg && (
          <motion.div className="toast" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
