# KidneyCompanion 🫘💚

**An AI-powered, empathetic lab interpreter for kidney transplant patients.**

KidneyCompanion helps post-transplant patients understand their lab results using Google's MedGemma medical AI model, with personalized explanations written in caring, plain language — not clinical jargon.

![MedGemma](https://img.shields.io/badge/AI-MedGemma%204B--IT-teal)
![ElevenLabs](https://img.shields.io/badge/TTS-ElevenLabs-blue)
![FriendliAI](https://img.shields.io/badge/Inference-FriendliAI-purple)

---

## Features

### Multi-Step Wizard
A guided, step-by-step experience that walks patients through entering their lab data and receiving personalized explanations:

1. **Your Labs** — Enter lab values manually, upload a photo/PDF of a lab report (AI-powered extraction), or use the searchable combobox to find common transplant labs or type in any custom lab name
2. **About You** — Optional context (age, sex, months post-transplant, medications) for personalized analysis
3. **History** — Add past lab results for trend analysis over time
4. **Review** — Confirm everything and ask a specific question about your results
5. **Results** — Color-coded lab summary cards + detailed AI-generated explanation + audio summary

### AI-Powered Analysis (MedGemma)
- Uses Google's **MedGemma 4B-IT** medical foundation model via FriendliAI dedicated endpoint
- Explains what each lab measures, why it matters for transplant patients, and how medications affect it
- Generates 4-6 personalized recommendations based on your specific values
- Handles dedicated endpoint cold starts gracefully with auto-retry and encouraging status messages

### Voice Output (ElevenLabs)
- **Listen to Your Summary** — Hear the key highlights of your results read aloud
- Uses ElevenLabs' Rachel voice for a warm, caring delivery
- Extracts a concise spoken summary: overall status, key findings, and top recommendations

### Lab Report Upload
- Upload photos (JPG, PNG) or PDF files of lab reports
- Automatic image compression and resizing (1600px max, ~1MB target)
- AI extracts lab values directly from the image

### Patient-Centric Design
- Warm teal/sage color palette — calming, not clinical
- Connected progress bar with step indicators
- Welcome hero banner for first-time users
- Privacy notices — nothing is saved or stored
- Color-coded results: green (within target), amber (discuss with team)
- Light and dark mode support
- Educational disclaimers throughout

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Express.js (API proxy) |
| AI Model | MedGemma 4B-IT via FriendliAI |
| Text-to-Speech | ElevenLabs (Rachel voice) |
| Deployment | Replit |

---

## Architecture

```
client/                     # React frontend
├── src/
│   ├── pages/home.tsx      # Main wizard page
│   ├── components/
│   │   ├── step-labs.tsx    # Lab entry with combobox + upload
│   │   ├── step-patient.tsx # Patient context form
│   │   ├── step-history.tsx # Historical lab values
│   │   ├── step-analyze.tsx # Review + analyze trigger
│   │   └── step-results.tsx # Results with audio summary
│   └── lib/
│       ├── prompts.ts      # MedGemma prompt builders
│       ├── image-utils.ts  # Image compression
│       ├── constants.ts    # Demo data
│       └── theme-provider.tsx

server/
├── routes.ts               # /api/analyze (SSE) + /api/tts
├── elevenlabs.ts           # ElevenLabs TTS integration
└── index.ts                # Express server

shared/
└── schema.ts               # TypeScript types, 19 transplant lab ranges, Zod schemas
```

---

## API Endpoints

### `POST /api/analyze`
Sends lab data to MedGemma for analysis. Uses Server-Sent Events (SSE) for real-time status updates during cold starts.

**Request:**
```json
{
  "prompt": "string",
  "imageBase64": "string (optional)"
}
```

**SSE Events:**
- `status` — Progress updates (connecting, waking up, retrying)
- `result` — Final analysis text
- `error` — Error messages

### `POST /api/tts`
Converts text to speech using ElevenLabs.

**Request:**
```json
{
  "text": "string"
}
```

**Response:** `audio/mpeg` binary

---

## Supported Labs

KidneyCompanion includes transplant-specific reference ranges for 19 common labs:

Creatinine, eGFR, BUN, Tacrolimus Level, Cyclosporine Level, Potassium, Sodium, Calcium, Phosphorus, Magnesium, Hemoglobin, WBC, Glucose, HbA1c, Albumin, ALT, AST, Uric Acid, CMV Viral Load

Users can also enter **any custom lab name** — MedGemma will use its medical knowledge to interpret it.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FRIENDLI_API_KEY` | API key for FriendliAI dedicated endpoint |
| ElevenLabs | Managed via Replit connector (no manual key needed) |

---

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set the `FRIENDLI_API_KEY` environment variable
4. Connect ElevenLabs via Replit connector (or set API key manually)
5. Run the app: `npm run dev`
6. Open `http://localhost:5000`

---

## Disclaimer

KidneyCompanion is an **educational tool only**. It is not a substitute for professional medical advice, diagnosis, or treatment. Always share your lab results and questions with your transplant team.

---

## License

MIT
