import type { Express } from "express";
import { createServer, type Server } from "http";
import { analyzeRequestSchema } from "@shared/schema";
import { textToSpeech } from "./elevenlabs";

const FRIENDLI_API_KEY = process.env.FRIENDLI_API_KEY || "";
const FRIENDLI_URL = "https://api.friendli.ai/dedicated/v1/chat/completions";
const MODEL = "dep0ju34hez4juy";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/analyze", async (req, res) => {
    try {
      const parsed = analyzeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request: prompt is required" });
      }

      const { prompt, imageBase64 } = parsed.data;

      if (!FRIENDLI_API_KEY) {
        return res.status(500).json({ error: "FRIENDLI_API_KEY not set in environment secrets" });
      }

      interface ContentPart {
        type: string;
        text?: string;
        image_url?: { url: string };
      }

      const content: ContentPart[] = [];

      if (imageBase64) {
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        });
      }
      content.push({ type: "text", text: prompt });

      const messages = [{ role: "user", content }];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      sendEvent("status", { message: "Connecting to MedGemma...", phase: "connecting" });

      const MAX_RETRIES = 10;
      const RETRY_DELAYS = [5000, 8000, 10000, 12000, 15000, 15000, 15000, 15000, 15000, 15000];
      const RETRY_MESSAGES = [
        "MedGemma is waking up — this is normal for a first request...",
        "Still warming up — dedicated AI models take a moment to start...",
        "Almost there — the model is loading into memory...",
        "Hang tight — MedGemma is nearly ready for you...",
        "Still working on it — your patience is appreciated!",
        "The model is spinning up — this only happens on the first request...",
        "Nearly there — just a bit more time...",
        "Warming up — once ready, future requests will be fast!",
        "Still connecting — we haven't given up!",
        "Last attempt — give it one more moment...",
      ];

      let data: any = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const response = await fetch(FRIENDLI_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${FRIENDLI_API_KEY}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages,
            max_tokens: 2048,
            temperature: 0.2,
            top_p: 0.9,
            frequency_penalty: 0.15,
          }),
        });

        if (response.ok) {
          data = await response.json();
          break;
        }

        const errText = await response.text();

        if (response.status === 503 && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt];
          const seconds = delay / 1000;
          console.log(`FriendliAI endpoint waking up (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${seconds}s...`);
          sendEvent("status", {
            message: RETRY_MESSAGES[attempt],
            phase: "waking",
            attempt: attempt + 1,
            maxAttempts: MAX_RETRIES + 1,
            retrySec: seconds,
          });
          await new Promise((r) => setTimeout(r, delay));
          sendEvent("status", {
            message: `Trying again (attempt ${attempt + 2} of ${MAX_RETRIES + 1})...`,
            phase: "retrying",
            attempt: attempt + 2,
            maxAttempts: MAX_RETRIES + 1,
          });
          continue;
        }

        console.error("FriendliAI error:", response.status, errText);
        sendEvent("error", {
          error: `FriendliAI API error: ${response.status}`,
          details: errText,
        });
        res.end();
        return;
      }

      if (!data) {
        sendEvent("error", {
          error: "MedGemma is still waking up. Please wait a moment and try again.",
        });
        res.end();
        return;
      }

      const text = data.choices?.[0]?.message?.content || "No response generated.";

      sendEvent("status", { message: "Got your results! Preparing your explanation...", phase: "done" });
      sendEvent("result", { result: text });
      res.end();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("API route error:", message);
      try {
        res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
      } catch {
        res.status(500).json({ error: message });
      }
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Non-empty text is required" });
      }

      const truncated = text.trim().slice(0, 4000);

      const audioBuffer = await textToSpeech(truncated);
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      });
      return res.send(audioBuffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("TTS error:", message);
      return res.status(500).json({ error: "Failed to generate audio. Please try again." });
    }
  });

  return httpServer;
}
