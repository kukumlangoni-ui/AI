import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  app.use(express.json());

  // ─── Secure Gemini API proxy ──────────────────────────────────────────────
  app.post("/api/chat", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server config error: GEMINI_API_KEY not set" });
    }

    const { messages, systemInstruction } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request: messages required" });
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstruction || "You are STEA, a helpful tech assistant." }],
            },
            contents: messages,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  answer: { type: "STRING" },
                  cards: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        title: { type: "STRING" },
                        desc: { type: "STRING" },
                        btn: { type: "STRING" },
                        query: { type: "STRING" },
                      },
                    },
                  },
                  suggestions: { type: "ARRAY", items: { type: "STRING" } },
                },
                required: ["answer"],
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: "AI service error",
          details: err?.error?.message || response.statusText,
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Chat API error:", error);
      return res.status(500).json({ error: "Internal server error", message: error.message });
    }
  });

  // ─── Vite dev middleware or static prod serving ───────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ STEA server running at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
