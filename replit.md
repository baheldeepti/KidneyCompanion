# KidneyCompanion

## Overview
KidneyCompanion is an AI-powered lab interpreter for kidney transplant patients. It uses FriendliAI's MedGemma 4B-IT model to help patients understand their post-transplant lab results with personalized, educational explanations.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js API proxy to FriendliAI + ElevenLabs TTS
- **AI Model**: MedGemma 4B-IT via FriendliAI dedicated endpoint (dep0ju34hez4juy)
- **TTS**: ElevenLabs (Rachel voice) via Replit connector for empathetic audio responses
- **No database** - this is a stateless tool for on-the-fly lab analysis

## Key Files
- `shared/schema.ts` - TypeScript interfaces, transplant reference ranges (19 labs), Zod schemas
- `server/routes.ts` - `/api/analyze` and `/api/tts` endpoints
- `server/elevenlabs.ts` - ElevenLabs TTS service (Replit connector auth)
- `client/src/pages/home.tsx` - Main multi-step wizard page
- `client/src/components/step-*.tsx` - Step components (Labs, Patient, History, Analyze, Results)
- `client/src/lib/prompts.ts` - MedGemma prompt builders (empathetic, patient-centric)
- `client/src/lib/image-utils.ts` - Image compression/resizing for lab report uploads
- `client/src/lib/constants.ts` - Demo data for testing
- `client/src/lib/theme-provider.tsx` - Light/dark mode provider

## Multi-Step Wizard Flow
1. **Your Labs** - Manual entry or image upload (AI extraction with auto-compression)
2. **About You** - Optional context (age, sex, months post-transplant, medications)
3. **History** - Optional historical lab values for trend analysis
4. **Review** - Review summary + ask a question, then submit to MedGemma
5. **Results** - Lab summary cards + detailed AI-generated explanation + Listen button (ElevenLabs TTS)

## API Endpoints
- `POST /api/analyze` - Accepts `{ prompt: string, imageBase64?: string }`, returns `{ result: string }`
- `POST /api/tts` - Accepts `{ text: string }`, returns audio/mpeg binary

## Environment Variables
- `FRIENDLI_API_KEY` - Required for MedGemma API access via FriendliAI
- ElevenLabs API key managed via Replit connector (no manual env var needed)
