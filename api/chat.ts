import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for same-origin (Vercel handles this but just in case)
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY env var is not set');
    return res.status(500).json({ error: 'AI service not configured. Please set GEMINI_API_KEY in Vercel environment variables.' });
  }

  const { messages, systemInstruction } = req.body || {};

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction || 'You are STEA, a helpful tech assistant.' }],
          },
          contents: messages,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                answer: { type: 'STRING' },
                cards: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      title: { type: 'STRING' },
                      desc: { type: 'STRING' },
                      btn: { type: 'STRING' },
                      query: { type: 'STRING' },
                    },
                  },
                },
                suggestions: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['answer'],
            },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      const msg = (errData as any)?.error?.message || geminiRes.statusText;
      console.error('Gemini API error:', msg);
      return res.status(geminiRes.status).json({ error: 'AI service error', details: msg });
    }

    const data = await geminiRes.json();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Server error in /api/chat:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
