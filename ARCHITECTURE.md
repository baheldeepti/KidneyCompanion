# KidneyCompanion — Architecture

## System Overview

KidneyCompanion is a stateless, single-page web application that helps kidney transplant patients understand their lab results. It uses a client-server architecture where the React frontend handles the user experience and the Express backend acts as a secure proxy to external AI services.

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              React + Vite Frontend                 │  │
│  │                                                    │  │
│  │  home.tsx (wizard orchestrator)                    │  │
│  │    ├── step-labs.tsx     → Lab entry / upload      │  │
│  │    ├── step-patient.tsx  → Patient context          │  │
│  │    ├── step-history.tsx  → Historical data         │  │
│  │    ├── step-analyze.tsx  → Review + trigger AI     │  │
│  │    └── step-results.tsx  → Results + audio         │  │
│  │                                                    │  │
│  │  prompts.ts → Builds MedGemma prompts             │  │
│  │  image-utils.ts → Compresses uploads              │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │ fetch (JSON / SSE)                 │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────┐
│              Express.js Server (:5000)                   │
│                     │                                    │
│  ┌──────────────────┴────────────────────────────────┐  │
│  │                routes.ts                           │  │
│  │                                                    │  │
│  │  POST /api/analyze ──→ FriendliAI (MedGemma)      │  │
│  │    • SSE streaming status updates                  │  │
│  │    • Auto-retry on 503 (cold start)                │  │
│  │    • Up to 11 attempts over ~2 minutes             │  │
│  │                                                    │  │
│  │  POST /api/tts ──→ ElevenLabs (Rachel voice)      │  │
│  │    • Converts summary text to audio                │  │
│  │    • Returns audio/mpeg binary                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  elevenlabs.ts → ElevenLabs client (Replit connector)   │
│  github.ts → GitHub integration (Replit connector)      │
│  vite.ts → Dev server with HMR                          │
│  static.ts → Production static file serving             │
└─────────────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼                           ▼
┌───────────────┐         ┌─────────────────┐
│  FriendliAI   │         │   ElevenLabs    │
│               │         │                 │
│  MedGemma     │         │  Rachel Voice   │
│  4B-IT Model  │         │  TTS Engine     │
│               │         │                 │
│  Dedicated    │         │  Replit         │
│  Endpoint     │         │  Connector      │
│  dep0ju34...  │         │  Auth           │
└───────────────┘         └─────────────────┘
```

## Data Flow

### Lab Analysis Flow

```
User enters labs ──→ buildAnalysisPrompt() ──→ POST /api/analyze
                                                    │
                                              SSE stream
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                              event:status    event:result    event:error
                              (progress)      (analysis)      (failure)
                                    │               │
                                    ▼               ▼
                              Loading UI      Step 5: Results
                              with retries    with lab cards
```

### Audio Summary Flow

```
MedGemma analysis ──→ buildAudioSummary() ──→ POST /api/tts
                      (extracts key              │
                       findings +            ElevenLabs API
                       recommendations)          │
                                            audio/mpeg
                                                 │
                                            Browser Audio
                                            playback
```

### Image Upload Flow

```
User uploads photo/PDF
        │
   compressImage()
   (resize to 1600px,
    JPEG ~1MB, PDF 4MB)
        │
   POST /api/analyze
   with imageBase64
        │
   MedGemma extracts
   lab values from image
        │
   JSON array response
   [{ name, value }]
        │
   Auto-populates
   lab entry form
```

## Directory Structure

```
/
├── client/                          # Frontend (React + Vite)
│   └── src/
│       ├── main.tsx                 # App entry point
│       ├── App.tsx                  # Router + providers
│       ├── index.css                # Tailwind + theme variables
│       ├── pages/
│       │   ├── home.tsx             # Wizard orchestrator (state, navigation)
│       │   └── not-found.tsx        # 404 page
│       ├── components/
│       │   ├── step-labs.tsx        # Lab entry with combobox + image upload
│       │   ├── step-patient.tsx     # Patient context form
│       │   ├── step-history.tsx     # Historical lab values
│       │   ├── step-analyze.tsx     # Review summary + analyze trigger
│       │   ├── step-results.tsx     # Results cards + AI explanation + TTS
│       │   └── ui/                  # shadcn/ui component library
│       ├── lib/
│       │   ├── prompts.ts           # MedGemma prompt builders
│       │   ├── image-utils.ts       # Image compression/resizing
│       │   ├── constants.ts         # Demo data for testing
│       │   ├── theme-provider.tsx   # Light/dark mode context
│       │   ├── queryClient.ts       # TanStack Query config
│       │   └── utils.ts             # Tailwind cn() helper
│       └── hooks/
│           └── use-toast.ts         # Toast notification hook
│
├── server/                          # Backend (Express.js)
│   ├── index.ts                     # Server bootstrap
│   ├── routes.ts                    # API endpoints (analyze + TTS)
│   ├── elevenlabs.ts                # ElevenLabs TTS client
│   ├── github.ts                    # GitHub API client
│   ├── vite.ts                      # Vite dev server middleware
│   └── static.ts                    # Production static serving
│
├── shared/                          # Shared types (client + server)
│   └── schema.ts                    # TypeScript types, lab ranges, Zod schemas
│
├── README.md                        # Project documentation
├── ARCHITECTURE.md                  # This file
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── tailwind.config.ts               # Tailwind config
├── vite.config.ts                   # Vite config
└── drizzle.config.ts                # Drizzle ORM config (unused — no DB)
```

## Key Design Decisions

### Stateless Architecture
No database is used. Lab data, patient context, and analysis results live only in React state during the session. Nothing is persisted or stored — this is intentional for patient privacy and simplicity.

### Server-Sent Events (SSE) for Analysis
The `/api/analyze` endpoint uses SSE instead of a simple JSON response. This enables:
- Real-time status updates during FriendliAI cold starts
- Progress feedback without polling
- Graceful handling of the dedicated endpoint's wake-up time (up to 2 minutes)

### Dedicated Endpoint with Auto-Retry
MedGemma runs on a FriendliAI dedicated endpoint that may sleep when idle. The server automatically retries up to 11 times with increasing delays, streaming encouraging status messages to the user while waiting.

### Audio Summary (Not Full Text)
ElevenLabs TTS receives a condensed summary extracted from the full MedGemma analysis — not the entire text. The `buildAudioSummary()` function pulls out:
1. Overall lab status (how many within target vs. needing review)
2. Key findings (overall assessments, good news, takeaways)
3. Top 3 recommendations
4. Closing reminder to consult their transplant team

This keeps audio under 60 seconds and focused on what matters most.

### Client-Side Prompt Construction
Prompts are built entirely on the frontend (`prompts.ts`) before being sent to the server. This keeps the server thin (just a proxy) and makes prompt iteration fast without server restarts.

### Image Compression Before Upload
Lab report photos are compressed client-side before upload:
- Images resized to max 1600px width
- Converted to JPEG at ~0.8 quality (~1MB)
- PDFs limited to 4MB
This prevents large uploads from timing out or exceeding API limits.

### Searchable Combobox for Lab Names
The lab name selector uses a custom combobox (Popover + search input) instead of a standard dropdown. This allows:
- Searching/filtering the 19 common transplant labs
- Typing any custom lab name not in the predefined list
- MedGemma interprets custom lab names using its medical knowledge

## External Service Integration

| Service | Purpose | Auth Method | Endpoint |
|---------|---------|-------------|----------|
| FriendliAI | MedGemma inference | API key (env var) | `api.friendli.ai/dedicated/v1/chat/completions` |
| ElevenLabs | Text-to-speech | Replit connector (OAuth) | ElevenLabs SDK |
| GitHub | Code repository | Replit connector (OAuth) | Octokit REST API |

## Transplant Lab Reference Data

The `shared/schema.ts` file contains transplant-specific reference ranges for 19 labs. Each entry includes:
- `unit` — measurement unit (e.g., mg/dL)
- `healthy` — normal population range
- `transplant` — target range for transplant patients
- `concernLow` / `concernHigh` — thresholds for flagging values
- `description` — plain-language explanation

These ranges power the color-coded result cards (green = within target, amber = discuss with team).

## Theme System

The app uses CSS custom properties for theming with two modes:
- **Light mode**: Warm teal/sage palette (172° primary, amber accent)
- **Dark mode**: Matching teal tones on dark backgrounds

Theme toggle is in the header. Preference persists in localStorage via `ThemeProvider`.
