import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOW_DEMAND_MODEL = 'gemini-3.1-flash-lite';
const HIGH_DEMAND_MODEL = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  app.post('/api/ecoroute-chat', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        cleanedPrompt?: unknown;
        tier?: unknown;
      };

      const cleanedPrompt =
        typeof body.cleanedPrompt === 'string' ? body.cleanedPrompt.trim() : '';
      const tier = body.tier === 'HIGH' ? 'HIGH' : 'LOW';

      if (!cleanedPrompt) {
        res.status(400).json({ error: 'Cleaned prompt is required.' });
        return;
      }

      const ai = getGeminiClient();
      const model = tier === 'HIGH' ? HIGH_DEMAND_MODEL : LOW_DEMAND_MODEL;

      const systemInstruction =
        tier === 'HIGH'
          ? 'You are a Lululemon Canada Senior Guest Education Specialist handling a complex edge-case policy inquiry (such as damaged final-sale items, Quality Promise evaluations, expired gift cards, or missing receipts). Provide a warm, clear, empathetic, accurate response grounded in Lululemon Canada policy (30-day unworn return window, Quality Promise inspection in-store or via Guest Education Centre, gift card balance verification) with actionable next steps.'
          : 'You are a Lululemon Canada Fast Concierge. Give a warm, concise, accurate 2–3 sentence response answering the customer question about Lululemon Canada returns, sizing, fabrics (Nulu, Everlux, Luon), or gear.';

      const response = await ai.models.generateContent({
        model,
        contents: cleanedPrompt,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: tier === 'HIGH' ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
            includeThoughts: true,
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const thoughts = parts
        .filter((part) => Boolean((part as { thought?: boolean }).thought) && typeof part.text === 'string')
        .map((part) => (part.text ?? '').trim())
        .filter(Boolean);

      const answer = (response.text ?? '').trim();
      if (!answer) {
        throw new Error('Server AI model returned an empty response.');
      }

      res.json({
        answer,
        thoughts,
        model,
        usageMetadata: response.usageMetadata ?? null,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to generate AI response.';
      const status =
        message.includes('PERMISSION_DENIED') || message.includes('403')
          ? 403
          : message.includes('API_KEY_INVALID') || message.includes('400')
          ? 400
          : message.includes('RESOURCE_EXHAUSTED') || message.includes('429')
          ? 429
          : 500;
      console.error('[/api/ecoroute-chat] Error:', err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`EcoRoute Lululemon Demo listening on http://0.0.0.0:${port}`);
  });
}

startServer();
