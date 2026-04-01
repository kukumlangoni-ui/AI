@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
@import "tailwindcss";

:root {
  --bg: #050505;
  --surface: #0a0a0a;
  --card: #111111;
  --border: rgba(255, 215, 0, 0.1);
  --gold: #ffd700;
  --gold-glow: rgba(255, 215, 0, 0.3);
  --gold-dim: rgba(255, 215, 0, 0.05);
  --text: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.6);
  --accent: #ff8c00;
  --r: 24px;
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  color: var(--text);
  height: 100dvh;
  margin: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── BACKGROUND PARTICLES ── */
#particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* ── HEADER ── */
header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(5, 5, 5, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.logo { display: flex; align-items: center; gap: 8px; }
.logo-badge {
  background: var(--gold);
  color: #000;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.05em;
}
.logo-title {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
}
.logo-title span { color: var(--gold); }

.hright { display: flex; align-items: center; gap: 12px; }
.lswitch {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 99px;
  padding: 2px;
}
.lb {
  padding: 4px 10px;
  font-size: 0.65rem;
  font-weight: 600;
  border: none;
  border-radius: 99px;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted);
  transition: all 0.2s;
}
.lb.on { background: var(--gold); color: #000; }

.iact {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.1rem;
  transition: color 0.2s;
}
.iact:hover { color: var(--gold); }

/* ── LAYOUT CONTAINER ── */
.app-container {
  position: relative;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding-top: 70px; /* header height */
  overflow: hidden;
  z-index: 1;
}

/* ── HERO SECTION ── */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}

.chat-active .hero {
  padding: 0;
  transform: scale(0.35);
  margin-top: -60px;
  height: 0;
  overflow: visible;
}

.chat-active .hero-title,
.chat-active .hero-sub,
.chat-active .starter-topics-grid {
  display: none;
}

/* ── STARTER TOPICS ── */
.starter-topics-grid {
  width: 100%;
  max-width: 800px;
  margin: 2rem auto;
}

.starter-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.starter-card:hover::before {
  opacity: 1;
}

/* ── THE CORE (AI ENTITY) ── */
.stea-ai-container {
  position: relative;
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform 0.3s;
}

.chat-active .stea-ai-container {
  transform: scale(0.5);
  margin-bottom: 0;
}

.stea-ai-container.busy .core {
  animation: float 2s ease-in-out infinite, pulse-busy 1s ease-in-out infinite;
  background: radial-gradient(circle at 30% 30%, #fff, #ffd700);
}

@keyframes pulse-busy {
  0%, 100% {
    box-shadow:
      0 0 40px #ffae00,
      0 0 80px rgba(255, 174, 0, 0.6);
  }
  50% {
    box-shadow:
      0 0 60px #ffae00,
      0 0 120px rgba(255, 174, 0, 0.9);
  }
}

.core {
  width: 100px; /* smaller for mobile-first */
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #ffd700, #ff9900);
  box-shadow:
    0 0 30px #ffae00,
    0 0 60px rgba(255, 174, 0, 0.4),
    inset 0 0 20px rgba(255, 255, 255, 0.3);
  animation: float 4s ease-in-out infinite,
             pulse 3s ease-in-out infinite;
  position: relative;
}

.inner {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.4), transparent);
}

.eyes {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -30%);
  display: flex;
  gap: 15px;
}

.eyes span {
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 8px #fff;
  animation: core-eye-blink 5s infinite;
}

/* FLOAT ANIMATION */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

/* PULSE */
@keyframes pulse {
  0%, 100% {
    box-shadow:
      0 0 30px #ffae00,
      0 0 60px rgba(255, 174, 0, 0.4);
  }
  50% {
    box-shadow:
      0 0 40px #ffae00,
      0 0 80px rgba(255, 174, 0, 0.7);
  }
}

/* ── HERO TEXT ── */
.hero-title {
  font-family: 'Syne', sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.chat-active .hero-title {
  font-size: 1.1rem;
}

.hero-title span {
  background: linear-gradient(to right, var(--gold), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
  font-weight: 400;
}

/* ── CHAT VIEW ── */
.chat-view {
  flex: 1;
  overflow-y: auto;
  padding: 10px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(20px);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-view::-webkit-scrollbar {
  width: 4px;
}
.chat-view::-webkit-scrollbar-track {
  background: transparent;
}
.chat-view::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.chat-view::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 215, 0, 0.3);
}

.chat-active .chat-view {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
  padding-top: 50px;
}

.message {
  max-width: 85%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: message-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.message.user { align-self: flex-end; align-items: flex-end; }
.message.ai { align-self: flex-start; align-items: flex-start; }

.bubble {
  padding: 12px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  line-height: 1.5;
  word-break: break-word;
}

.message.user .bubble {
  background: var(--gold);
  color: #000;
  border-bottom-right-radius: 4px;
}

.message.ai .bubble {
  background: var(--card);
  color: var(--text);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--border);
}

.m-meta {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin: 4px 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.message.user .m-meta {
  justify-content: flex-end;
}

.copy-btn-small {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  padding: 0;
  transition: color 0.2s;
}

.copy-btn-small:hover {
  color: var(--gold);
}

.typing {
  display: flex;
  gap: 6px;
  padding: 6px 4px;
  align-items: center;
}

.typing span {
  width: 6px;
  height: 6px;
  background: var(--gold);
  border-radius: 50%;
}

/* ── CARDS & SUGGESTIONS ── */
.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  margin-top: 12px;
  width: 100%;
}

.resource-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.resource-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  border-color: var(--gold);
}

.resource-card h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--gold);
}

.resource-card p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.resource-card button {
  align-self: flex-start;
  margin-top: 4px;
  padding: 6px 12px;
  background: rgba(255, 215, 0, 0.1);
  color: var(--gold);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.resource-card button:hover {
  background: var(--gold);
  color: #000;
}

.suggestions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.suggestion-chip {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-chip:hover {
  background: rgba(255, 215, 0, 0.1);
  border-color: var(--gold);
  color: var(--gold);
}

/* ── PERSISTENT INPUT ── */
.persistent-input {
  padding: 16px 20px 24px;
  background: linear-gradient(to top, var(--bg) 80%, transparent);
  z-index: 10;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-active .persistent-input {
  padding: 8px 12px 12px;
  background: var(--bg);
  border-top: 1px solid rgba(255, 255, 255, 0.02);
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 6px 6px 6px 16px;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.05);
  transition: all 0.3s ease;
}

.chat-active .input-wrapper {
  border-color: transparent;
  background: rgba(255, 255, 255, 0.03);
  box-shadow: none;
}

.input-wrapper:focus-within,
.chat-active .input-wrapper:focus-within {
  border-color: var(--gold);
  background: var(--surface);
  box-shadow: 0 0 25px rgba(255, 215, 0, 0.15);
}

textarea {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-family: inherit;
  font-size: 0.95rem;
  padding: 8px 0;
  resize: none;
  max-height: 120px;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.send-btn {
  width: 36px;
  height: 36px;
  background: var(--gold);
  color: #000;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.9rem;
  transition: transform 0.2s;
}

.send-btn:active { transform: scale(0.9); }
.send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── QUICK CHIPS ── */
.quick-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 12px 0 0;
  scrollbar-width: none;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 60px;
  opacity: 1;
}

.chat-active .quick-chips {
  max-height: 0;
  padding: 0;
  opacity: 0;
  pointer-events: none;
  margin: 0;
}

.quick-chips::-webkit-scrollbar { display: none; }

.chip {
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  padding: 8px 16px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.chip:active {
  background: var(--gold-dim);
  border-color: var(--gold);
  color: var(--gold);
}

/* ── ANIMATIONS ── */
@keyframes core-eye-blink {
  0%, 90%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}

@keyframes message-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── TOAST ── */
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  padding: 10px 20px;
  border-radius: 99px;
  font-size: 0.8rem;
  z-index: 1000;
  animation: message-in 0.3s both;
}

/* ── MODAL ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal h3 { font-family: 'Syne', sans-serif; font-size: 1.1rem; margin: 0; }
.modal p { font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin: 0; }
.modal input {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  color: #fff;
  font-size: 0.9rem;
}

.modal-btns { display: flex; gap: 10px; }
.mbtn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.mbtn.primary { background: var(--gold); color: #000; }
.mbtn.ghost { background: rgba(255,255,255,0.05); color: #fff; }

/* ── RESPONSIVE ── */
@media (min-width: 600px) {
  .hero-title { font-size: 2.5rem; }
  .app-container {
    max-width: 500px;
    margin: 0 auto;
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
  }
}

/* ── MARKDOWN STYLES ── */
.markdown-body {
  font-size: 0.95rem;
  line-height: 1.5;
}
.markdown-body p {
  margin-bottom: 0.75rem;
}
.markdown-body p:last-child {
  margin-bottom: 0;
}
.markdown-body strong {
  font-weight: 600;
  color: var(--gold);
}
.markdown-body ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}
.markdown-body ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}
.markdown-body li {
  margin-bottom: 0.25rem;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: var(--gold);
}
.markdown-body h1 { font-size: 1.25rem; }
.markdown-body h2 { font-size: 1.1rem; }
.markdown-body h3 { font-size: 1rem; }
.markdown-body code {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85em;
}
.markdown-body pre {
  background: rgba(0, 0, 0, 0.5);
  padding: 0.75rem;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 0.75rem;
}
.markdown-body pre code {
  background: transparent;
  padding: 0;
}
.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
}
.markdown-body th, .markdown-body td {
  border: 1px solid var(--border);
  padding: 0.5rem;
  text-align: left;
}
/* ── CREDIT SYSTEM & AUTH ── */
.balance-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.2);
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text);
}

.login-btn-small {
  background: var(--gold);
  color: #000;
  border: none;
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s;
}
.login-btn-small.ghost {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  border: 1px solid var(--border);
}
.login-btn-small:disabled { opacity: 0.5; cursor: not-allowed; }

.user-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px 8px;
  font-size: 0.7rem;
}

.plan-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-weight: 500;
}

.action-links {
  display: flex;
  gap: 12px;
}

.action-links button {
  background: none;
  border: none;
  color: var(--text-muted);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

/* ── ADMIN PANEL ── */
.admin-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: var(--bg);
  z-index: 50;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}

.admin-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Syne', sans-serif;
  color: var(--gold);
}

.admin-header button {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
}

.admin-tabs {
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  border-radius: 8px;
}

.admin-tabs button {
  font-size: 0.8rem;
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.admin-tabs button.active {
  background: var(--gold);
  color: #000;
  font-weight: 600;
}

.admin-tabs button:not(.active):hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.admin-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.admin-form label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.admin-form input[type="text"],
.admin-form input[type="number"],
.admin-form select {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 0.9rem;
}

.admin-form input:focus,
.admin-form select:focus {
  outline: none;
  border-color: var(--gold);
}

.icon-btn-small {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.icon-btn-small:hover {
  background: rgba(255, 255, 255, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 16px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-card label {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-card .val {
  font-size: 1.25rem;
  font-weight: 700;
  font-family: 'Syne', sans-serif;
}

.admin-actions {
  margin-top: auto;
  padding-top: 20px;
}

.admin-active .hero,
.admin-active .chat-view,
.admin-active .persistent-input {
  display: none;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  font-size: 0.85rem;
}
.admin-table th, .admin-table td {
  padding: 12px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
.admin-table th {
  color: var(--text-muted);
  font-weight: 500;
}
.admin-table button {
  background: rgba(255, 215, 0, 0.1);
  color: var(--gold);
  border: 1px solid var(--border);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

@media (min-width: 600px) {
  .admin-panel {
    border-left: 1px solid var(--border);
  }
}
