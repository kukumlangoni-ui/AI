import type { VercelRequest, VercelResponse } from '@vercel/node';

type AnyObj = Record<string, any>;

const DEFAULT_SYSTEM = `
You are STEA, a smart tech assistant.

Rules:
- Give short, clear answers.
- Use simple Swahili or English depending on the user.
- For current or changing information such as latest software versions, prices, news, recent events, or live situations, use Google Search before answering.
- Do not rely only on internal memory for time-sensitive facts.
- Return valid JSON only with this shape:
{
  "answer": "string",
  "cards": [],
  "suggestions": []
}
`.trim();

function getLatestUserText(messages: any[]): string {
  const last = messages?.[messages.length - 1];
  if (!last) return '';

  if (typeof last === 'string') return last;

  if (Array.isArray(last?.parts)) {
    return last.parts
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join(' ')
      .trim();
  }

  if (typeof last?.content === 'string') return last.content;
  return '';
}

function isLiveQuery(text: string): boolean {
  return /\b(current|latest|today|now|recent|news|price|prices|version|release|released|update|updated|happening|situation|leo|sasa|mpya|habari|bei|toleo|current situation|latest version)\b/i.test(
    text
  ) || /\b(ios|android|windows|macos|ubuntu|iphone|samsung|tesla|chatgpt|gemini)\b/i.test(text);
}

function normalizeMessages(messages: any[]) {
  return messages.map((m: any) => {
    if (m?.role && Array.isArray(m?.parts)) {
      return m;
    }

    if (m?.role && typeof m?.content === 'string') {
      return {
        role: m.role,
        parts: [{ text: m.content }],
      };
    }

    if (typeof m === 'string') {
      return {
        role: 'user',
        parts: [{ text: m }],
      };
    }

    return m;
  });
}

function parseGeminiText(data: AnyObj): string {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join('') ||
    ''
  ).trim();
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toAppShape(parsed: any, fallbackText?: string) {
  const answer =
    typeof parsed?.answer === 'string' && parsed.answer.trim()
      ? parsed.answer.trim()
      : (fallbackText || 'Samahani, sijaweza kupata jibu sahihi kwa sasa.').trim();

  const cards = Array.isArray(parsed?.cards)
    ? parsed.cards
        .filter((c: any) => c && typeof c === 'object')
        .map((c: any) => ({
          title: String(c.title || ''),
          desc: String(c.desc || ''),
          btn: String(c.btn || ''),
          query: String(c.query || ''),
        }))
        .filter((c: any) => c.title || c.desc || c.btn || c.query)
    : [];

  const suggestions = Array.isArray(parsed?.suggestions)
    ? parsed.suggestions.map((s: any) => String(s)).filter(Boolean)
    : [];

  return { answer, cards, suggestions };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'AI service not configured. Please set GEMINI_API_KEY in Vercel environment variables.',
    });
  }

  const { messages, systemInstruction } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }

  const normalizedMessages = normalizeMessages(messages);
  const latestUserText = getLatestUserText(normalizedMessages);
  const useGoogleSearch = isLiveQuery(latestUserText);

  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const finalSystemInstruction = systemInstruction || DEFAULT_SYSTEM;

  const normalBody = {
    system_instruction: {
      parts: [{ text: finalSystemInstruction }],
    },
    contents: normalizedMessages,
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
          suggestions: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: ['answer'],
      },
    },
  };

  const groundedBody = {
    system_instruction: {
      parts: [{ text: finalSystemInstruction }],
    },
    contents: normalizedMessages,
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 700,
    },
  };

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(useGoogleSearch ? groundedBody : normalBody),
    });

    const raw = await geminiRes.json().catch(() => ({}));

    if (!geminiRes.ok) {
      const msg = raw?.error?.message || geminiRes.statusText || 'Gemini request failed';
      console.error('Gemini API error:', msg);
      return res.status(geminiRes.status).json({
        error: 'AI service error',
        details: msg,
      });
    }

    // Normal mode: model should return JSON text because of responseSchema
    if (!useGoogleSearch) {
      const text = parseGeminiText(raw);
      const parsed = safeJsonParse(text);
      return res.status(200).json(toAppShape(parsed, text));
    }

    // Grounded mode: keep it simple, parse text manually
    const groundedText = parseGeminiText(raw);

    return res.status(200).json({
      answer: groundedText || 'Samahani, sijaweza kupata taarifa ya sasa hivi.',
      cards: [],
      suggestions: [
        'Nipe source ya habari hii',
        'Fupisha jibu',
        'Nipe update ya leo',
      ],
      grounded: true,
    });
  } catch (err: any) {
    console.error('Server error in /api/chat:', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err?.message || 'Unknown server error',
    });
  }
}
