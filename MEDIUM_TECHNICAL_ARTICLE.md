# How I Built a Real-Time Medical AI App with MedGemma 4B-IT, SSE Streaming, and FriendliAI Dedicated Endpoints

![KidneyCompanion Architecture — React + Express + MedGemma 4B-IT + ElevenLabs TTS pipeline](https://img.shields.io/badge/Stack-React_%7C_Express_%7C_MedGemma_%7C_ElevenLabs-teal?style=for-the-badge)

*A deep dive into the architecture, prompt engineering, cold-start handling, and multimodal inference behind KidneyCompanion — an open-source lab interpreter for kidney transplant patients.*

---

## TL;DR

I built a stateless, privacy-first web app that takes kidney transplant lab results, runs them through Google's **MedGemma 4B-IT** model on a **FriendliAI dedicated endpoint**, and returns empathetic, patient-safe explanations with audio playback via **ElevenLabs TTS**. The interesting technical challenges: SSE-based retry orchestration for cold starts, client-side multimodal prompt construction, and audio summarization extraction from unstructured AI output.

**GitHub**: [github.com/baheldeepti/KidneyCompanion](https://github.com/baheldeepti/KidneyCompanion)

---

## Why MedGemma 4B-IT Over GPT-4 or Claude?

MedGemma is Google's open medical foundation model built on Gemma. The 4B-IT (4 billion parameter, instruction-tuned) variant hits a sweet spot:

- **Domain-specific training** — Pre-trained on medical literature, clinical notes, and health datasets. It doesn't just pattern-match medical terminology — it understands relationships between labs, medications, and conditions.
- **Multimodal capability** — Accepts image inputs natively. Patients can photograph a lab report, and MedGemma extracts structured data from the image without a separate OCR pipeline.
- **Size efficiency** — At 4B parameters, it runs on a single GPU with fast inference times. No need for multi-node setups or aggressive quantization.
- **Open weights** — Deployable on any inference platform. I chose FriendliAI's dedicated endpoints for production reliability.

The trade-off versus larger models (GPT-4, Claude) is raw reasoning depth. But for structured lab interpretation with transplant-specific reference ranges provided in the prompt, MedGemma 4B-IT performs remarkably well — and at a fraction of the cost.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Client (Browser)                      │
│                                                           │
│  React 18 + Vite 5 + TypeScript                          │
│  Tailwind CSS + shadcn/ui                                │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ home.tsx — Wizard state machine (5 steps)            │ │
│  │ prompts.ts — Client-side prompt construction         │ │
│  │ image-utils.ts — Canvas-based image compression      │ │
│  │ constants.ts — 19 transplant lab reference ranges    │ │
│  └───────────────────┬─────────────────────────────────┘ │
│                      │                                    │
│              EventSource (SSE) / fetch                    │
└──────────────────────┼────────────────────────────────────┘
                       │
┌──────────────────────┼────────────────────────────────────┐
│            Express.js Server (:5000)                       │
│                      │                                     │
│  POST /api/analyze ──┼──→ FriendliAI Dedicated Endpoint   │
│    • SSE response stream                                   │
│    • 11-attempt retry with exponential backoff             │
│    • Status event broadcasting                             │
│                                                            │
│  POST /api/tts ──────┼──→ ElevenLabs API                  │
│    • Text-to-speech synthesis                              │
│    • Binary audio/mpeg response                            │
└──────────────────────┼────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼                           ▼
  FriendliAI                   ElevenLabs
  ┌─────────────────┐   ┌─────────────────┐
  │ MedGemma 4B-IT  │   │ Rachel Voice    │
  │ Dedicated EP    │   │ TTS Engine      │
  │ dep0ju34hez4juy │   │ Replit OAuth    │
  │                 │   │ Connector       │
  │ OpenAI-compat.  │   │                 │
  │ chat/completions│   │ audio/mpeg      │
  └─────────────────┘   └─────────────────┘
```

### Why Client-Side Prompt Construction?

Prompts are built entirely in the browser (`prompts.ts`) before being sent to the server. This is a deliberate design choice:

```typescript
// client/src/lib/prompts.ts
export function buildAnalysisPrompt(
  labs: LabEntry[],
  ctx: PatientContext,
  history: HistoricalPoint[],
  question: string
): string {
  // Constructs a ~2000 token prompt with:
  // 1. System framing (empathetic medical educator role)
  // 2. Transplant-specific reference ranges for each entered lab
  // 3. Patient context (age, sex, months post-transplant, meds)
  // 4. Historical values for trend analysis
  // 5. The patient's specific question
  // 6. Output structure instructions
}
```

**Benefits:**
- Server stays thin — it's a pure proxy with retry logic, nothing else
- Prompt iteration doesn't require server restarts during development
- Prompt logic is colocated with the UI that collects the data
- No server-side state management for patient data

**Trade-off:** The prompt is visible in browser DevTools. For this use case, that's acceptable — the prompt contains the patient's own data, and there's no proprietary system prompt worth protecting.

---

## The Cold Start Problem: SSE + Retry Orchestration

FriendliAI dedicated endpoints are cost-efficient but can sleep when idle. When a patient submits their labs after a quiet period, the endpoint returns `503 Service Unavailable` while the GPU spins up. This can take up to 2 minutes.

A simple retry loop with `setTimeout` would leave the user staring at a spinner. Instead, I built an **SSE-based retry orchestrator** that streams status updates to the client in real time.

### Server-Side: SSE Retry Loop

```typescript
// server/routes.ts — POST /api/analyze
app.post("/api/analyze", async (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const MAX_RETRIES = 11;
  const statusMessages = [
    "Connecting to MedGemma...",
    "Our medical AI is warming up — this can take a moment...",
    "Still warming up — dedicated endpoints need a moment after idle periods...",
    "Almost there — MedGemma is preparing your personalized analysis...",
    "Thank you for your patience — your detailed results are worth the wait...",
    // ... more encouraging messages
  ];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Stream status to client
    res.write(`event: status\ndata: ${JSON.stringify({
      message: statusMessages[Math.min(attempt, statusMessages.length - 1)],
      attempt: attempt + 1,
      maxAttempts: MAX_RETRIES
    })}\n\n`);

    try {
      const response = await fetch(FRIENDLI_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FRIENDLI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "dep0ju34hez4juy",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4096,
        }),
      });

      if (response.status === 503) {
        // Endpoint waking up — wait and retry
        const delay = Math.min(5000 + attempt * 2000, 15000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      const data = await response.json();
      const result = data.choices[0].message.content;

      // Stream final result
      res.write(`event: result\ndata: ${JSON.stringify({ result })}\n\n`);
      res.end();
      return;
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) {
        res.write(`event: error\ndata: ${JSON.stringify({
          message: "Unable to reach MedGemma. Please try again."
        })}\n\n`);
        res.end();
      }
    }
  }
});
```

### Client-Side: EventSource Consumer

```typescript
// client/src/pages/home.tsx
const evtSource = new EventSource("/api/analyze", { /* POST via fetch */ });
// Actually implemented as fetch + ReadableStream since EventSource is GET-only:

const response = await fetch("/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, imageBase64 }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  // Parse SSE events: "event: status\ndata: {...}\n\n"
  // Update UI with status messages, attempt count, progress
}
```

### The Retry Timing Strategy

```
Attempt 1:  0s    → "Connecting to MedGemma..."
Attempt 2:  5s    → "Our medical AI is warming up..."
Attempt 3:  9s    → "Still warming up..."
Attempt 4:  15s   → "Almost there..."
Attempt 5:  23s   → "Thank you for your patience..."
...
Attempt 11: ~120s → Final attempt before error
```

Progressive delays (`5s + attempt * 2s`, capped at `15s`) balance responsiveness with not hammering the endpoint. The encouraging messages transform a technical retry loop into an empathetic waiting experience.

---

## Multimodal Lab Report Extraction

Patients can upload a photo of their lab report instead of typing values manually. This involves three stages:

### Stage 1: Client-Side Image Compression

```typescript
// client/src/lib/image-utils.ts
export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_DIM = 1600;

      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      // Target ~1MB output
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = URL.createObjectURL(file);
  });
}
```

**Why client-side compression?**
- Prevents 5–10MB phone photos from hitting the server
- Reduces upload time on mobile connections
- MedGemma doesn't need 4000x3000 resolution to read lab values
- Canvas API is available in all modern browsers

### Stage 2: Multimodal Prompt

```typescript
// The prompt for image extraction
const extractionPrompt = `Extract lab values from this lab report image.
Return ONLY a JSON array: [{"name": "Lab Name", "value": "numeric value"}]
Focus on kidney-related and transplant-relevant labs.`;

// Sent to FriendliAI with image content
messages: [{
  role: "user",
  content: [
    { type: "text", text: extractionPrompt },
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
  ]
}]
```

### Stage 3: Auto-Population

The JSON response is parsed and mapped to the lab entry form. The searchable combobox matches extracted lab names against the 19 predefined transplant labs, and any unrecognized labs are added as custom entries.

---

## Audio Summary Extraction

The full MedGemma analysis can be 800–1200 words. Sending all of that to ElevenLabs TTS would produce a 3–4 minute audio clip — too long for a quick listen. Instead, `buildAudioSummary()` extracts a focused 150–200 word summary.

### The Extraction Logic

```typescript
// client/src/lib/prompts.ts
export function buildAudioSummary(analysis: string): string {
  const lines = analysis.split("\n");
  const sections: string[] = [];

  // 1. Extract overall status (first paragraph or "Overall" section)
  // 2. Find key findings (headers containing "finding", "assessment", "good news")
  // 3. Pull top 3 recommendations (numbered list items)
  // 4. Add closing reminder

  // Regex-based section extraction from markdown-formatted AI output
  const overallMatch = analysis.match(/overall[^]*?(?=\n##|\n\*\*|$)/i);
  const recsMatch = analysis.match(/recommendation[^]*?(?=\n##|$)/i);

  // Construct spoken summary with natural transitions
  return [
    "Here's a summary of your lab results.",
    overallStatus,
    "Key findings: " + keyFindings.join(". "),
    "Top recommendations: " + topRecs.join(". "),
    "Remember to share these results with your transplant team."
  ].filter(Boolean).join(" ");
}
```

### Why Not Just Summarize with Another LLM Call?

Cost and latency. Adding a second MedGemma call to summarize would double the inference cost and add another potential cold-start delay. Regex-based extraction from the structured markdown output is instant, free, and reliable enough — MedGemma's output format is consistent thanks to explicit structure instructions in the prompt.

---

## Transplant-Specific Reference Ranges

Standard lab ranges don't apply to transplant patients. `shared/schema.ts` encodes transplant-specific ranges for 19 labs:

```typescript
// shared/schema.ts
export const TRANSPLANT_LABS: Record<string, LabReference> = {
  Creatinine: {
    unit: "mg/dL",
    healthy: [0.7, 1.2],      // General population
    transplant: [1.0, 1.5],   // Transplant target
    concernLow: 0.5,
    concernHigh: 2.0,
    description: "Measures kidney filtration..."
  },
  "Tacrolimus Level": {
    unit: "ng/mL",
    healthy: [5, 15],
    transplant: [5, 10],      // Lower target to reduce toxicity
    concernLow: 3,
    concernHigh: 20,
    description: "Immunosuppressant drug level..."
  },
  // ... 17 more labs
};
```

These ranges power two things:
1. **Color-coded result cards** — Green (within transplant target), amber (outside target, discuss with team)
2. **Prompt context** — Each lab's transplant range is injected into the MedGemma prompt so the model evaluates against the correct thresholds

### The Custom Lab Combobox

For labs not in the predefined 19, users can type any lab name. The implementation uses a `Popover` + search input pattern (not a standard `<select>`):

```typescript
// Searchable combobox with custom entry support
// 1. Filter predefined labs by search query
// 2. If no match, show "Use custom: {query}" option
// 3. MedGemma interprets custom lab names using its medical knowledge
```

This means a patient can type "C-reactive protein" or "BK virus PCR" — labs not in the predefined set — and MedGemma will still provide a medically accurate interpretation.

---

## The FriendliAI Integration

FriendliAI provides an **OpenAI-compatible API** for dedicated endpoints, which simplifies the integration:

```typescript
// server/routes.ts
const FRIENDLI_ENDPOINT = "https://api.friendli.ai/dedicated/v1/chat/completions";

const response = await fetch(FRIENDLI_ENDPOINT, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.FRIENDLI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "dep0ju34hez4juy",  // Dedicated endpoint ID
    messages: [{ role: "user", content: promptContent }],
    max_tokens: 4096,
    temperature: 0.4,  // Lower temp for medical accuracy
  }),
});
```

**Key parameters:**
- `model` — The dedicated endpoint ID, not a model name
- `max_tokens: 4096` — Enough for a comprehensive lab analysis
- `temperature: 0.4` — Low enough for medical accuracy, high enough for natural language

### Dedicated vs. Serverless

I chose a **dedicated endpoint** over serverless for predictable latency once warm. Serverless endpoints share GPU resources and can have variable response times. For a medical tool where users are anxious about their results, consistent 3–5 second inference (once warm) matters more than cold-start elimination.

---

## ElevenLabs TTS via Replit Connector

ElevenLabs integration uses the **Replit connector pattern** — OAuth-based authentication managed by the platform, no manual API key handling:

```typescript
// server/elevenlabs.ts
import { ElevenLabsClient } from "elevenlabs";

const client = new ElevenLabsClient();  // Auth via Replit connector

export async function textToSpeech(text: string): Promise<Buffer> {
  const audio = await client.textToSpeech.convert("21m00Tcm4TlvDq8ikWAM", {
    text,
    model_id: "eleven_monolingual_v1",
    voice_settings: {
      stability: 0.6,
      similarity_boost: 0.75,
    },
  });

  // Collect stream into buffer
  const chunks: Buffer[] = [];
  for await (const chunk of audio) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
```

**Voice choice: Rachel** (`21m00Tcm4TlvDq8ikWAM`)
- Warm, empathetic female voice
- Clear enunciation for medical terminology
- Natural pacing that doesn't sound robotic

---

## Stateless Privacy Architecture

The entire app has **zero persistence**:

- No database
- No cookies (except localStorage for theme + onboarding state)
- No server-side sessions
- No analytics or tracking
- Lab data exists only in React `useState` during the session

```typescript
// All patient data lives here — and only here
const [labs, setLabs] = useState<LabEntry[]>([]);
const [ctx, setCtx] = useState<PatientContext>({});
const [history, setHistory] = useState<HistoricalPoint[]>([]);
const [analysis, setAnalysis] = useState("");
```

When the tab closes, everything vanishes. This is the simplest possible architecture for handling sensitive health data — if you don't store it, you can't leak it.

---

## Prompt Engineering for Medical Safety

The most critical code in the entire project isn't the retry logic or the SSE streaming — it's the prompt. Medical AI needs careful framing to be helpful without being harmful.

### Key Prompt Principles

1. **Role framing** — MedGemma is positioned as an "empathetic medical educator," not a diagnostician
2. **Transplant context injection** — Every lab's transplant-specific range is included so the model evaluates against the right thresholds
3. **Safety rails** — Every response must include a disclaimer to consult the transplant team
4. **Structure instructions** — Explicit output format ensures consistent, parseable responses
5. **Trend awareness** — Historical data is formatted as time-series with explicit direction indicators

```typescript
// Simplified prompt structure
const prompt = `
You are an empathetic medical educator helping a kidney transplant patient
understand their lab results. You are warm, caring, and thorough.

PATIENT CONTEXT:
- ${ctx.age ? `Age: ${ctx.age}` : "Age: not provided"}
- ${ctx.monthsSinceTransplant ? `Months post-transplant: ${ctx.monthsSinceTransplant}` : ""}
- ${ctx.medications ? `Medications: ${ctx.medications}` : ""}

LAB RESULTS WITH TRANSPLANT RANGES:
${labs.map(l => {
  const ref = TRANSPLANT_LABS[l.name];
  return `${l.name}: ${l.value} ${ref?.unit || ""}
    Transplant target: ${ref?.transplant?.join("-") || "consult team"}
    General range: ${ref?.healthy?.join("-") || "N/A"}`;
}).join("\n")}

${history.length > 0 ? `HISTORICAL TRENDS:\n${formatHistory(history)}` : ""}

PATIENT'S QUESTION: ${question}

Provide your response in these sections:
1. Overall Assessment (reassuring overview)
2. Lab-by-Lab Breakdown (what each measures, why it matters)
3. Medication Considerations
4. Recommendations (4-6 personalized, actionable items)
5. Reminder to discuss with transplant team
`;
```

---

## Performance Optimizations

### Image Compression Pipeline
- Canvas-based resize to 1600px max dimension
- JPEG encoding at 0.8 quality
- Typical reduction: 8MB phone photo → 800KB upload
- Processing time: <200ms client-side

### SSE Over WebSockets
- No persistent connection overhead
- Native browser `ReadableStream` support
- Automatic reconnection isn't needed (single request-response)
- Simpler server implementation (just `res.write()`)

### Bundle Size
- shadcn/ui components are copy-pasted (tree-shakeable), not a monolithic import
- Lucide icons are individually imported
- Vite's code splitting handles route-based chunking

---

## Lessons for Developers Building Medical AI Apps

1. **Prompt > Model** — A well-crafted prompt on MedGemma 4B-IT outperforms a lazy prompt on GPT-4 for domain-specific tasks. Invest in prompt engineering.

2. **Infrastructure is UX** — Cold starts, retries, and latency aren't just DevOps concerns. They directly shape how patients experience your app. Build empathy into your error handling.

3. **Stateless is a feature** — For health data, the absence of a database is a stronger privacy guarantee than any encryption scheme. If you don't need persistence, don't add it.

4. **Client-side processing scales** — Image compression, prompt construction, and summary extraction all run in the browser. Zero server cost, zero latency, and the server stays a thin proxy.

5. **Medical AI needs guardrails, not just accuracy** — Every response must be framed as educational. Every output must include a disclaimer. The prompt structure matters as much as the model's knowledge.

---

## Try It / Contribute

KidneyCompanion is open source:

- **GitHub**: [github.com/baheldeepti/KidneyCompanion](https://github.com/baheldeepti/KidneyCompanion)
- **Stack**: React + Vite + Express + MedGemma 4B-IT + ElevenLabs
- **License**: MIT

PRs welcome — especially for additional lab reference ranges, prompt improvements, and accessibility enhancements.

---

#MedGemma #GoogleAI #MedicalAI #FriendliAI #ElevenLabs #TextToSpeech #React #TypeScript #Vite #ExpressJS #ServerSentEvents #SSE #PromptEngineering #HealthTech #KidneyTransplant #OpenSource #WebDev #AIEngineering #MultimodalAI #FullStack #DeveloperBlog
