# STEA AI Assistant — Production Setup

## Architecture

```
Browser → /api/chat (Vercel Serverless) → Gemini API
Browser → Firebase (Auth + Firestore)
```

API keys **never** leave the server. Users never see or enter API keys.

---

## Environment Variables

### For Vercel (production):
Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key from Google AI Studio |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `steaai.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `steaai` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `steaai.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `916957246961` |
| `VITE_FIREBASE_APP_ID` | `1:916957246961:web:dd3864554202fad5884050` |

### For local dev:
Copy `.env.example` to `.env.local` and fill in values.

---

## Deploy to Vercel

```bash
# 1. Push to GitHub
git add .
git commit -m "production cleanup"
git push origin main

# 2. Deploy via Vercel CLI
npm i -g vercel
vercel --prod

# 3. Or connect GitHub repo in Vercel dashboard
# Build Command: npm run build
# Output Directory: dist
# Framework: Vite
```

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your keys
npm run dev
```

---

## Security Notes

- Gemini API key is **server-side only** (`GEMINI_API_KEY`, no `VITE_` prefix)
- Firebase config uses `VITE_*` prefix (safe for frontend — these are public-facing)
- Admin panel has **double verification**: frontend role check + Firestore read verification
- Firestore rules enforce all access controls server-side
- No API keys in localStorage or client code

---

## Admin Access

Admin email: `kukumlangoni@gmail.com`
- Admin panel icon (⊞) only visible after login to admin account
- Access verified server-side via Firestore on every panel open

---

## Firestore Rules

Deploy updated rules:
```bash
firebase deploy --only firestore:rules
```
