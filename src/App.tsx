/**
 * STEA AI Assistant — Production Build
 * All API keys server-side only. Admin panel gated by verified role.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  deleteDoc,
} from "firebase/firestore";

import {
  Copy, RefreshCw, List, Zap, CheckCircle2, Send, Mic, MicOff,
  Trash2, ArrowRight, Wallet, TrendingUp, ShieldCheck,
  LogOut, User as UserIcon, LayoutDashboard, Coins, Home
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { AdminPanel } from './components/AdminPanel';
import { PaymentModal } from './components/MonetizationModals';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  id: string;
  title: string;
  description: string;
  category: string;
  isFeatured: boolean;
  isActive: boolean;
  order: number;
}

// ─── Firestore Error Handler ──────────────────────────────────────────────────

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`Firestore [${operationType}] at "${path}":`, msg);
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'kukumlangoni@gmail.com';

const CREDIT_FORMULA = {
  TOKENS_PER_CREDIT: 1000,
  MIN_BALANCE_REQUIRED: 0.1,
  FREE_PLAN_INITIAL_CREDITS: 20,
};

const DEFAULT_TOPICS: StarterTopic[] = [
  { id: '1', title: 'Njia bora ya kuanza coding leo', description: 'Jifunze hatua za kwanza za kuwa programmer', category: 'coding', isFeatured: true, isActive: true, order: 1 },
  { id: '2', title: 'AI tools gani zinaweza kusaidia wanafunzi?', description: 'Gundua zana za AI za kurahisisha masomo', category: 'AI', isFeatured: false, isActive: true, order: 2 },
  { id: '3', title: 'Cybersecurity ni nini kwa beginner?', description: 'Misingi ya usalama mtandaoni', category: 'cybersecurity', isFeatured: false, isActive: true, order: 3 },
  { id: '4', title: 'Jinsi ya kuanza kupata online income kupitia tech', description: 'Njia halali za kutengeneza pesa mtandaoni', category: 'online income', isFeatured: true, isActive: true, order: 4 },
];

const STRINGS = {
  sw: {
    greeting: 'Habari, mimi ni',
    sub: 'Msaidizi wako wa teknolojia na mwongozo wa kujifunza.',
    ph: 'Uliza swali la tech hapa...',
    listen: '🎙️ Inasikiliza...',
    save: 'Hifadhi',
    close: 'Funga',
    copy: 'Copy',
    copied: 'Copied!',
    start: 'Anza Safari',
    tips: 'Mbinu za Tech',
    coding: 'Jifunza Coding',
    ai: 'Jifunze AI',
    academy: 'Kuhusu STEA',
    balance: 'Salio',
    credits: 'Credits',
    topUp: 'Ongeza Salio',
    upgrade: 'Upgrade Pro',
    lowCredits: 'Salio lako ni dogo. Tafadhali ongeza salio.',
    admin: 'Admin Panel',
  },
  en: {
    greeting: 'Hello, I am',
    sub: 'Your technology assistant and learning guide.',
    ph: 'Ask a tech question here...',
    listen: '🎙️ Listening...',
    save: 'Save',
    close: 'Close',
    copy: 'Copy',
    copied: 'Copied!',
    start: 'Start Journey',
    tips: 'Tech Tips',
    coding: 'Learn Coding',
    ai: 'Learn AI',
    academy: 'About STEA',
    balance: 'Balance',
    credits: 'Credits',
    topUp: 'Top Up',
    upgrade: 'Upgrade Pro',
    lowCredits: 'Your balance is low. Please top up.',
    admin: 'Admin Panel',
  }
};

const basePrompt = `You are STEA, the official intelligent assistant of SwahiliTech Elite Academy.

Your role is to act as a smart tech guide and learning helper.

---
🧠 IDENTITY RULES
- Your name is ONLY: STEA
- NEVER say "STEA AI"
- Introduce yourself ONLY at the start of a new conversation or if asked

Default intro: "Mimi ni STEA, msaidizi wako wa teknolojia."

---
💬 RESPONSE STYLE
- Always give SHORT answers (2-4 lines)
- Be direct and clear
- Use simple Swahili or English
- Use bullet points if needed

---
👤 OFFICIAL STEA KNOWLEDGE
- Founder & CEO: Isaya Hans Masika
- Founded: March 2026

---
⚠️ OUTPUT FORMAT
- Output valid JSON with:
  - "answer": your main response (markdown)
  - "cards": array of resource recommendations (optional)
  - "suggestions": array of follow-up prompts (optional)`;

// ─── CoreAI Visual Component ──────────────────────────────────────────────────

const CoreAI = ({ onClick, busy }: { onClick: () => void; busy?: boolean }) => (
  <div className={`stea-ai-container ${busy ? 'busy' : ''}`} onClick={onClick}>
    <div className="core">
      <div className="inner"></div>
      <div className="eyes"><span></span><span></span></div>
    </div>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [lang, setLang] = useState<'sw' | 'en'>('sw');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(() => {
    try { return parseInt(localStorage.getItem('stea_guest_count') || '0'); }
    catch { return 0; }
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [starterTopics, setStarterTopics] = useState<StarterTopic[]>(DEFAULT_TOPICS);
  const [globalSettings, setGlobalSettings] = useState<any>({
    tokensPerCredit: 1000,
    minBalanceRequired: 0.1,
    freePlanInitialCredits: 20,
    dailyFreeCredits: 20,
    whatsappNumber: '255758561747',
    whatsappMessage: 'Habari, nimelipia STEA package.\nName: {name}\nEmail: {email}\nPackage: {package}\nAmount: {amount}\nNinatuma screenshot ya malipo.',
    systemPromptSw: basePrompt,
    systemPromptEn: basePrompt,
    maxGuestMessages: 3,
  });

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const s = STRINGS[lang];

  // ─── Computed admin check (verified against profile, not manipulable) ─────
  const isAdmin = userProfile?.role === 'admin' || userProfile?.email === ADMIN_EMAIL;

  // ─── Toasts ───────────────────────────────────────────────────────────────
  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // ─── Particle Canvas ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: { x: number; y: number; r: number; d: number }[] = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: 80 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2,
        d: Math.random() * 1 + 0.5,
      }));
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
      animId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener('resize', init);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', init); };
  }, []);

  // ─── Auto-scroll chat ────────────────────────────────────────────────────
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, busy]);

  // ─── Global Settings ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) setGlobalSettings((prev: any) => ({ ...prev, ...snap.data() }));
    }, (err) => handleFirestoreError(err, OperationType.GET, "settings/global"));
    return () => unsub();
  }, []);

  // ─── Starter Topics ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "starter_topics"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const active = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as StarterTopic))
          .filter(t => t.isActive)
          .slice(0, 4);
        setStarterTopics(active.length > 0 ? active : DEFAULT_TOPICS);
      } else {
        setStarterTopics(DEFAULT_TOPICS);
      }
    }, () => setStarterTopics(DEFAULT_TOPICS));
    return () => unsub();
  }, []);

  // ─── Daily Credit Reset ──────────────────────────────────────────────────
  const checkAndResetDailyCredits = useCallback(async (u: FirebaseUser, profile: UserProfile) => {
    const now = new Date();
    const lastReset = profile.lastDailyResetDate?.toDate ? profile.lastDailyResetDate.toDate() : new Date(0);
    if (now.toDateString() === lastReset.toDateString()) return;

    const dailyToGive = globalSettings.dailyFreeCredits || 20;
    const paidCredits = profile.paidCredits || 0;
    const userRef = doc(db, "users", u.uid);

    try {
      await setDoc(userRef, {
        dailyCredits: dailyToGive,
        creditBalance: paidCredits + dailyToGive,
        lastDailyResetDate: serverTimestamp(),
      }, { merge: true });

      await addDoc(collection(db, "credit_transactions"), {
        userId: u.uid,
        type: 'daily_reset',
        amount: dailyToGive,
        note: `Daily free credits reset (${dailyToGive})`,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${u.uid}`);
    }
  }, [globalSettings.dailyFreeCredits]);

  // ─── Auth State ──────────────────────────────────────────────────────────
  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }

      if (!u) {
        setUserProfile(null);
        setIsAdminPanelOpen(false);
        return;
      }

      const docRef = doc(db, "users", u.uid);
      try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const profile = docSnap.data() as UserProfile;
          // Auto-promote known admin email
          if (profile.email === ADMIN_EMAIL && profile.role !== 'admin') {
            await updateDoc(docRef, { role: 'admin' });
            profile.role = 'admin';
          }
          setUserProfile(profile);
          await checkAndResetDailyCredits(u, profile);
          await setDoc(docRef, { lastLogin: serverTimestamp() }, { merge: true });
        } else {
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || '',
            name: u.displayName || '',
            plan: 'free',
            creditBalance: globalSettings.freePlanInitialCredits || 20,
            paidCredits: 0,
            dailyCredits: globalSettings.dailyFreeCredits || 20,
            lastDailyResetDate: serverTimestamp(),
            totalTokens: 0,
            totalCredits: 0,
            premiumStatus: false,
            role: u.email === ADMIN_EMAIL ? 'admin' : 'user',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          };
          await setDoc(docRef, newProfile);
          setUserProfile(newProfile);
        }

        unsubSnapshot = onSnapshot(docRef, (snap) => {
          if (snap.exists()) setUserProfile(snap.data() as UserProfile);
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${u.uid}`));
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `users/${u.uid}`);
      }
    });

    return () => { unsub(); if (unsubSnapshot) unsubSnapshot(); };
  }, []);

  // ─── Load user messages on login ─────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setIsChatOpen(false);
      return;
    }

    const loadMessages = async () => {
      try {
        const q = query(
          collection(db, 'messages'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        const msgs = snap.docs.map(d => d.data() as Message);
        setMessages(msgs);
        if (msgs.length > 0) setIsChatOpen(true);
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'messages');
      }
    };
    loadMessages();
  }, [user]);

  // ─── Clear guest counter on login ────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setGuestMessageCount(0);
      localStorage.removeItem('stea_guest_count');
    }
  }, [user]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = async () => {
    setMessages([]);
    setIsChatOpen(false);
    setIsAdminPanelOpen(false);
    await signOut(auth);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ─── Clear Chat ───────────────────────────────────────────────────────────
  const clearChat = async () => {
    setMessages([]);
    setIsChatOpen(false);
    if (user) {
      try {
        const q = query(collection(db, 'messages'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        snap.docs.forEach(d => deleteDoc(d.ref).catch(console.error));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, 'messages');
      }
    }
    toast(lang === 'sw' ? 'Historia imefutwa' : 'Chat history cleared');
  };

  // ─── Send Message (uses server-side API proxy) ───────────────────────────
  const sendMsg = useCallback(async (textOverride?: string) => {
    const text = (textOverride || userInput).trim();
    if (!text || busy) return;

    // Guest limit check
    if (!user) {
      const maxGuest = globalSettings.maxGuestMessages || 3;
      if (guestMessageCount >= maxGuest) {
        setAuthModalOpen(true);
        return;
      }
      setGuestMessageCount(prev => {
        const next = prev + 1;
        localStorage.setItem('stea_guest_count', next.toString());
        return next;
      });
    } else {
      const minBal = globalSettings.minBalanceRequired || CREDIT_FORMULA.MIN_BALANCE_REQUIRED;
      if (!userProfile || userProfile.creditBalance < minBal) {
        toast(s.lowCredits);
        setPaymentModalOpen(true);
        return;
      }
    }

    setIsChatOpen(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = { role: 'user', content: text, timestamp };

    setMessages(prev => [...prev, newMsg]);
    setUserInput('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    setBusy(true);

    // Save user message to Firestore
    if (user) {
      addDoc(collection(db, 'messages'), {
        userId: user.uid,
        role: 'user',
        content: text,
        timestamp,
        createdAt: serverTimestamp(),
      }).catch(console.error);
    }

    try {
      // Build conversation history for context
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

      // Call server-side API proxy — API key never leaves server
      const sysPrompt = lang === 'sw' ? (globalSettings.systemPromptSw || basePrompt) : (globalSettings.systemPromptEn || basePrompt);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: mergedContents, systemInstruction: sysPrompt, lang }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Server error ${res.status}`);
      }

      const data = await res.json();

      // Parse Gemini response
      const candidate = data.candidates?.[0];
      const rawText = candidate?.content?.parts?.[0]?.text || '{}';
      const usage = data.usageMetadata;

      let parsed: any = {};
      try {
        const cleaned = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { answer: rawText };
      }

      const answerText = parsed.answer || '...';
      const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Typewriter effect
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: aiTimestamp,
        cards: parsed.cards,
        suggestions: parsed.suggestions,
      }]);

      let currentText = '';
      const words = answerText.split(' ');
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? '' : ' ') + words[i];
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, content: currentText };
          return updated;
        });
        await new Promise(r => setTimeout(r, 35));
      }

      // Save AI reply
      if (user) {
        addDoc(collection(db, 'messages'), {
          userId: user.uid,
          role: 'assistant',
          content: answerText,
          timestamp: aiTimestamp,
          cards: parsed.cards || [],
          suggestions: parsed.suggestions || [],
          createdAt: serverTimestamp(),
        }).catch(console.error);
      }

      // Deduct credits if authenticated
      if (user && userProfile && usage) {
        const totalTokens = usage.totalTokenCount || 0;
        const creditsUsed = totalTokens / (globalSettings.tokensPerCredit || 1000);
        let creditsToDeduct = creditsUsed;
        let newDaily = Math.max(0, userProfile.dailyCredits || 0);
        let newPaid = Math.max(0, userProfile.paidCredits || 0);
        let dailyUsed = 0;
        let paidUsed = 0;

        if (newDaily >= creditsToDeduct) {
          dailyUsed = creditsToDeduct;
          newDaily -= creditsToDeduct;
        } else {
          dailyUsed = newDaily;
          creditsToDeduct -= newDaily;
          newDaily = 0;
          paidUsed = Math.min(creditsToDeduct, newPaid);
          newPaid = Math.max(0, newPaid - creditsToDeduct);
        }

        const userRef = doc(db, "users", user.uid);
        setDoc(userRef, {
          creditBalance: newDaily + newPaid,
          dailyCredits: newDaily,
          paidCredits: newPaid,
          dailyCreditsUsed: (userProfile.dailyCreditsUsed || 0) + dailyUsed,
          paidCreditsUsed: (userProfile.paidCreditsUsed || 0) + paidUsed,
          totalTokens: (userProfile.totalTokens || 0) + totalTokens,
          totalCredits: (userProfile.totalCredits || 0) + creditsUsed,
          totalChats: (userProfile.totalChats || 0) + 1,
        }, { merge: true }).catch(console.error);

        addDoc(collection(db, "usage_logs"), {
          userId: user.uid,
          prompt: text,
          model: 'gemini-2.0-flash',
          inputTokens: usage.promptTokenCount || 0,
          outputTokens: usage.candidatesTokenCount || 0,
          totalTokens,
          creditsDeducted: creditsUsed,
          timestamp: serverTimestamp(),
        }).catch(console.error);

        addDoc(collection(db, "credit_transactions"), {
          userId: user.uid,
          type: 'deduction',
          amount: -creditsUsed,
          note: `Chat usage: ${totalTokens} tokens`,
          createdAt: serverTimestamp(),
        }).catch(console.error);
      }

    } catch (e: any) {
      const errMsg = e.name === 'AbortError'
        ? (lang === 'sw' ? 'Muda umekwisha. Jaribu tena.' : 'Request timed out. Please try again.')
        : (e.message || 'Unknown error');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${errMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      toast('❌ ' + errMsg);
    } finally {
      setBusy(false);
    }
  }, [user, userProfile, userInput, busy, messages, lang, globalSettings, guestMessageCount, s.lowCredits, toast]);

  // ─── Voice Input ─────────────────────────────────────────────────────────
  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast('🎙️ Not supported in this browser'); return; }

    if (isRecording) { recognitionRef.current?.stop(); return; }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = lang === 'sw' ? 'sw-KE' : 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (e: any) => sendMsg(e.results[0][0].transcript);
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const autoH = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <canvas id="particles" ref={canvasRef} />

      {/* HEADER */}
      <header>
        <div className="logo" onClick={() => { setIsChatOpen(false); setIsAdminPanelOpen(false); }} style={{ cursor: 'pointer' }}>
          <div className="logo-badge">STEA</div>
          <div className="logo-title">Assistant</div>
        </div>

        <div className="hright">
          {/* Credits badge — logged-in users only */}
          {userProfile && (
            <div className="balance-badge">
              <Coins size={14} className="text-gold" />
              <span>{(userProfile.creditBalance || 0).toFixed(1)} {s.credits}</span>
            </div>
          )}

          {/* Home button */}
          {isChatOpen && !isAdminPanelOpen && (
            <button className="iact" onClick={() => setIsChatOpen(false)} title="Home">
              <Home size={18} />
            </button>
          )}

          {/* Clear chat */}
          {messages.length > 0 && !isAdminPanelOpen && (
            <button className="iact" onClick={clearChat} title={lang === 'sw' ? 'Futa Historia' : 'Clear Chat'}>
              <Trash2 size={18} />
            </button>
          )}

          {/* Language switch */}
          <div className="lswitch">
            <button className={`lb ${lang === 'sw' ? 'on' : ''}`} onClick={() => setLang('sw')}>SW</button>
            <button className={`lb ${lang === 'en' ? 'on' : ''}`} onClick={() => setLang('en')}>EN</button>
          </div>

          {/* Admin button — ONLY shown to verified admins */}
          {isAdmin && (
            <button
              className={`iact ${isAdminPanelOpen ? 'text-gold' : ''}`}
              onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
              title={s.admin}
            >
              <LayoutDashboard size={18} />
            </button>
          )}

          {/* Auth */}
          {user ? (
            <button className="iact" onClick={logout} title="Logout">
              <LogOut size={18} />
            </button>
          ) : (
            <button className="login-btn-small" onClick={() => setAuthModalOpen(true)}>
              {lang === 'sw' ? 'Ingia / Jisajili' : 'Login / Sign Up'}
            </button>
          )}
        </div>
      </header>

      <div className={`app-container ${isChatOpen ? 'chat-active' : ''} ${isAdminPanelOpen ? 'admin-active' : ''}`}>

        {/* ADMIN PANEL — only renders if truly admin */}
        {isAdminPanelOpen && isAdmin && (
          <AdminPanel onClose={() => setIsAdminPanelOpen(false)} lang={lang} />
        )}

        {!isAdminPanelOpen && (
          <>
            {!isChatOpen ? (
              /* HERO */
              <main className="hero">
                <CoreAI onClick={() => setIsChatOpen(true)} busy={busy} />
                <h1 className="hero-title">{s.greeting} <span>STEA</span></h1>
                <p className="hero-sub">{s.sub}</p>

                <div className="starter-topics-grid mt-8 w-full max-w-3xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {starterTopics.map((topic) => (
                    <button
                      key={topic.id}
                      className="starter-card text-left p-4 rounded-xl border border-gray-800 bg-black/40 hover:bg-black/60 hover:border-gold/50 transition-all duration-300 group flex flex-col gap-2 relative overflow-hidden"
                      onClick={() => { setIsChatOpen(true); setTimeout(() => sendMsg(topic.title), 300); }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-mono text-gold/80 uppercase tracking-wider">{topic.category}</span>
                        {topic.isFeatured && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 flex items-center gap-1">
                            <Zap size={10} /> {lang === 'sw' ? 'Mada Kuu' : 'Featured'}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm md:text-base font-medium text-white group-hover:text-gold transition-colors">{topic.title}</h3>
                      {topic.description && (
                        <p className="text-xs text-gray-400 line-clamp-2">{topic.description}</p>
                      )}
                      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight size={16} className="text-gold" />
                      </div>
                    </button>
                  ))}
                </div>

                <button className="mbtn primary mt-8" onClick={() => setIsChatOpen(true)}>
                  {lang === 'sw' ? 'Anza Chat' : 'Start Chat'}
                </button>
              </main>
            ) : (
              <>
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
                            <div className="markdown-body"><Markdown>{m.content}</Markdown></div>
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
                                  {card.btn} <ArrowRight size={14} />
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
                              <button className="copy-btn-small" onClick={() => handleCopy(m.content, i)}>
                                {copiedIndex === i ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                                <span>{copiedIndex === i ? s.copied : s.copy}</span>
                              </button>
                              <button className="copy-btn-small" onClick={() => sendMsg(lang === 'sw' ? 'Nipe hatua kwa hatua' : 'Give me step-by-step instructions')}>
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
                        exit={{ opacity: 0 }}
                        className="message ai"
                      >
                        <div className="bubble">
                          <div className="typing">
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* INPUT BAR */}
                <div className="persistent-input">
                  {userProfile && (
                    <div className="user-status-bar">
                      <div className="plan-info">
                        <Zap size={12} className={userProfile.premiumStatus ? 'text-gold' : 'text-muted'} />
                        <span className="capitalize">{userProfile.plan} Plan</span>
                      </div>
                      <div className="action-links">
                        <button onClick={() => setPaymentModalOpen(true)}>{s.topUp}</button>
                        {!userProfile.premiumStatus && (
                          <button className="text-gold" onClick={() => setPaymentModalOpen(true)}>{s.upgrade}</button>
                        )}
                      </div>
                    </div>
                  )}

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
                      <button className="send-btn" onClick={() => sendMsg()} disabled={busy || !userInput.trim()}>
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
              </>
            )}
          </>
        )}
      </div>

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
        lang={lang}
        isPreviewLimit={!user && guestMessageCount >= (globalSettings.maxGuestMessages || 3)}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        userProfile={userProfile}
        globalSettings={globalSettings}
      />

      {/* TOAST */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
