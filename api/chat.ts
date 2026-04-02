import type { VercelRequest, VercelResponse } from '@vercel/node';

// Keywords that indicate a question needs live/current data via Google Search grounding
const LIVE_KEYWORDS = [
  'latest', 'current', 'now', 'today', 'recent', 'news', 'price', 'version',
  'release', '2024', '2025', '2026', 'update', 'new', 'announced', 'just',
  'this week', 'this month', 'right now', 'live', 'trending', 'stock',
  // Swahili equivalents
  'sasa', 'leo', 'habari', 'bei', 'mpya', 'hivi karibuni', 'toleo',
];

function needsLiveSearch(text: string): boolean {
  const lower = text.toLowerCase();
  return LIVE_KEYWORDS.some(kw => lower.includes(kw));
}

function extractAnswer(data: any): { answer: string; cards: any[]; suggestions: string[]; usageMetadata: any } {
  // Try to extract from candidates array (standard Gemini shape)
  const candidate = data?.candidates?.[0];
  const rawText = candidate?.content?.parts?.[0]?.text ?? '';

  let parsed: any = {};
  if (rawText) {
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Raw text isn't JSON — treat it as the answer directly
      parsed = { answer: rawText };
    }
  }

  return {
    answer: parsed.answer || parsed.text || parsed.response || rawText || '',
    cards: Array.isArray(parsed.cards) ? parsed.cards : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    usageMetadata: data?.usageMetadata ?? null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      answer: 'AI service is not configured. Please set GEMINI_API_KEY in Vercel environment variables.',
      cards: [],
      suggestions: [],
      error: 'missing_api_key',
    });
  }

  const { messages, systemInstruction, userText } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ answer: 'Invalid request.', cards: [], suggestions: [] });
  }

  const useLiveSearch = userText ? needsLiveSearch(userText) : false;
  // Always use gemini-2.5-flash — fastest + smartest for this use case
  const model = 'gemini-2.5-flash';

  // Build request body
  const requestBody: any = {
    system_instruction: {
      parts: [{ text: systemInstruction || 'You are STEA, a helpful tech assistant. Answer in short clear Swahili or English.' }],
    },
    contents: messages,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: useLiveSearch ? 0.2 : 0.7,
    },
  };

  // For normal requests: use JSON schema for clean structured output
  if (!useLiveSearch) {
    requestBody.generationConfig.responseMimeType = 'application/json';
    requestBody.generationConfig.responseSchema = {
      type: 'OBJECT',
      properties: {
        answer: { type: 'STRING', description: 'Main response in markdown' },
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
            required: ['title', 'desc', 'btn', 'query'],
          },
        },
        suggestions: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
      },
      required: ['answer'],
    };
  } else {
    // For live search: use Google Search grounding tool
    requestBody.tools = [{ google_search: {} }];
  }

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      const msg = (errData as any)?.error?.message || `Gemini error ${geminiRes.status}`;
      console.error('Gemini API error:', msg);

      // Fallback: retry without JSON schema if schema caused the error
      if (geminiRes.status === 400 && !useLiveSearch) {
        console.log('Retrying without JSON schema...');
        delete requestBody.generationConfig.responseMimeType;
        delete requestBody.generationConfig.responseSchema;
        const retryRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          const extracted = extractAnswer(retryData);
          return res.status(200).json(extracted);
        }
      }

      return res.status(200).json({
        answer: `Samahani, kuna tatizo la muda. Jaribu tena. (${msg})`,
        cards: [],
        suggestions: ['Jaribu tena', 'Try again'],
      });
    }

    const data = await geminiRes.json();

    // For live search responses, the text is plain markdown (not JSON)
    if (useLiveSearch) {
      const candidate = data?.candidates?.[0];
      const rawText = candidate?.content?.parts?.[0]?.text ?? '';
      return res.status(200).json({
        answer: rawText || 'Hakuna jibu lililopatikana.',
        cards: [],
        suggestions: [],
        usageMetadata: data?.usageMetadata ?? null,
        grounded: true,
      });
    }

    // For normal responses, parse and return clean shape
    const extracted = extractAnswer(data);

    // Safety: if answer is empty, don't return blank
    if (!extracted.answer || extracted.answer.trim() === '') {
      extracted.answer = 'Samahani, sijaweza kutoa jibu sasa. Jaribu tena.';
    }

    return res.status(200).json(extracted);

  } catch (err: any) {
    console.error('Server error in /api/chat:', err);
    return res.status(200).json({
      answer: 'Samahani, kuna tatizo la seva. Jaribu tena baadaye.',
      cards: [],
      suggestions: [],
    });
  }
}
