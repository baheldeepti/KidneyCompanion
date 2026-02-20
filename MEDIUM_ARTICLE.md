# Building KidneyCompanion: How I Used Google's MedGemma to Help Transplant Patients Understand Their Lab Results

## When lab numbers feel like a foreign language, AI can be the translator.

---

Every 8 minutes, someone is added to the kidney transplant waiting list. For the fortunate ones who receive a transplant, a new chapter begins — one filled with hope, but also with an endless stream of lab work.

Creatinine. Tacrolimus trough levels. eGFR. BUN. CMV viral load.

For most transplant patients and their caregivers, these numbers arrive in a portal or on a printed sheet, stripped of context, wrapped in anxiety. *Is 1.4 creatinine good or bad? My tacrolimus was 8.2 last month and now it's 6.1 — should I be worried?*

I built **KidneyCompanion** to bridge that gap — an AI-powered lab interpreter that speaks to patients like a caring nurse, not a clinical database.

---

## The Problem: Information Without Understanding

After a kidney transplant, patients undergo frequent blood work — sometimes weekly in the early months, tapering to monthly or quarterly over time. Each lab panel can include a dozen or more values, each with its own "normal" range.

But here's the thing most patients quickly discover: **transplant normal isn't the same as normal normal.**

A healthy person's creatinine might sit at 0.7–1.2 mg/dL. But for a transplant recipient, 1.0–1.5 mg/dL might be perfectly acceptable — and the trend matters more than any single number. Standard lab portals don't know this. They flag values with alarming red markers based on general population ranges, sending patients into unnecessary spirals of worry.

Patients deserve better. They deserve explanations that account for their transplant, their medications, and their history — delivered in language they can actually understand.

---

## Enter MedGemma: Medical AI That Actually Knows Medicine

When Google released **MedGemma**, a family of open medical AI models built on top of Gemma, I saw an opportunity. MedGemma 4B-IT isn't just a general-purpose language model with a medical veneer — it's been specifically trained on medical data, clinical reasoning, and health-related tasks.

For KidneyCompanion, I chose the **MedGemma 4B-IT** variant, deployed on a **FriendliAI dedicated endpoint** for reliable, low-latency inference. This setup gives me:

- **Medical domain knowledge** — MedGemma understands the relationship between tacrolimus levels and kidney function, knows why transplant patients need different reference ranges, and can explain how immunosuppressants affect lab values.
- **Conversational ability** — The instruction-tuned (IT) variant generates warm, structured explanations rather than clinical shorthand.
- **Multimodal input** — Patients can upload a photo of their lab report, and MedGemma extracts the values directly from the image.

---

## The Architecture: Simple by Design

KidneyCompanion is deliberately stateless. No accounts. No databases. No stored health data.

```
Patient's Browser
    ↓
React Frontend (Vite + Tailwind + shadcn/ui)
    ↓
Express.js API Proxy
    ↓
FriendliAI → MedGemma 4B-IT
ElevenLabs → Rachel Voice (TTS)
```

The frontend builds a carefully crafted prompt from the patient's lab values, context, and history, then sends it to the Express backend, which proxies the request to FriendliAI's API. The result streams back via Server-Sent Events (SSE), so patients see real-time progress updates while MedGemma thinks.

**Why stateless?** Privacy. Transplant patients are already sharing sensitive health data with dozens of systems. KidneyCompanion doesn't need to be another one. Enter your labs, get your explanation, and everything disappears when you close the tab.

---

## The Five-Step Wizard: Designed for Patients, Not Developers

I spent significant time on the user experience because the target audience isn't tech-savvy developers — it's patients recovering from major surgery, elderly caregivers, and family members trying to help.

### Step 1: Your Labs
Three ways to enter lab data, because one size doesn't fit all:

- **Upload a photo** — Snap a picture of the lab report. MedGemma reads it and auto-populates the values.
- **Search and type** — A searchable combobox with 19 common transplant labs. Can't find yours? Type any lab name — MedGemma knows thousands.
- **Demo data** — For first-timers who want to see how it works before entering real values.

### Step 2: About You (Optional)
Age, sex, months since transplant, current medications. Every field is optional, but each one helps MedGemma tailor its explanation. Telling it you're 6 months post-transplant on tacrolimus and mycophenolate changes the entire analysis.

### Step 3: History (Optional)
Past lab values for trend analysis. A single creatinine of 1.6 might be fine — but a creatinine that's been climbing from 1.2 → 1.4 → 1.6 over three months tells a different story. MedGemma spots these trends.

### Step 4: Review
A summary of everything before submission. Patients can also type a specific question: *"My doctor mentioned my potassium is borderline — should I worry?"*

### Step 5: Results
The payoff. Color-coded lab cards (green for within target, amber for discuss with your team) plus a detailed, section-by-section AI explanation covering:

- What each lab measures and why it matters for transplant health
- How the patient's medications might affect values
- Personalized recommendations (4–6 tailored suggestions)
- A reminder to always discuss results with their transplant team

---

## Handling the Cold Start Problem (With Empathy)

Running MedGemma on a FriendliAI dedicated endpoint means the model can "sleep" when idle. When a patient submits their labs after a period of inactivity, the endpoint needs up to 2 minutes to wake up.

Two minutes of a blank loading screen would be anxiety-inducing for someone already nervous about their lab results.

So I built an **empathetic retry system** with SSE streaming. The server attempts the request up to 11 times with progressive delays, and each retry sends an encouraging status message to the frontend:

> *"Connecting to MedGemma..."*
> *"Our medical AI is warming up — this can take a moment for the most accurate results..."*
> *"Almost there — MedGemma is preparing your personalized analysis..."*
> *"Thank you for your patience — your detailed results are worth the wait..."*

The patient sees a calm, reassuring flow instead of error messages or spinning wheels. Technical infrastructure problems become gentle, human-readable waiting moments.

---

## Adding a Voice: ElevenLabs TTS

Not everyone wants to read a wall of text, especially after getting lab results. Some patients are visually impaired. Some are caregivers reading results to a loved one. Some just want to hear a reassuring voice say, *"Overall, your labs are looking good."*

KidneyCompanion includes a **"Listen to Your Summary"** feature powered by ElevenLabs' Rachel voice — chosen specifically for her warm, empathetic tone. But I don't send the entire analysis to TTS. Instead, `buildAudioSummary()` extracts a concise spoken version:

1. Overall status (how many labs are within target)
2. Key findings (2–3 most important observations)
3. Top 3 recommendations
4. A closing reminder to share results with their transplant team

This keeps the audio under 60 seconds — focused, digestible, and genuinely helpful.

---

## The Onboarding Experience

Transplant patients aren't typical tech users. Many are older adults. Many are navigating health anxiety. The app needed to explain itself before asking for sensitive lab data.

I built a **6-slide interactive walkthrough** that appears on first visit:

1. **Welcome** — with a calming video and three key promises (private, AI-powered, audio support)
2. **Enter Your Labs** — explains the three input methods
3. **About You** — reassures that every field is optional and nothing is stored
4. **Past Results** — explains why trends matter
5. **Your Results** — previews what the analysis looks like
6. **You're Ready!** — an encouraging send-off

The tour can be skipped immediately or re-launched anytime from the header. It's stored in localStorage — see it once, never again (unless you want to).

---

## Design Philosophy: Warm, Not Clinical

Healthcare apps tend toward cold blues and sterile whites. KidneyCompanion deliberately uses a **warm teal and sage palette** — calming but not clinical. The design choices are intentional:

- **Rounded buttons and soft shadows** — feels approachable, not institutional
- **Privacy badges throughout** — constant reassurance that nothing is saved
- **Educational disclaimers** — clear that this is a companion, not a replacement for medical advice
- **Dark mode** — because lab anxiety doesn't only happen during business hours

---

## What I Learned

### 1. Medical AI needs guardrails, not just accuracy
MedGemma is impressive, but every response needs to be framed as educational, not diagnostic. The prompt engineering is as important as the model selection — I spent more time crafting empathetic, patient-safe prompts than writing React components.

### 2. UX matters more than features
The searchable lab combobox, the image upload with auto-extraction, the audio summary — none of these are technically groundbreaking. But for a transplant patient trying to understand their labs at 11 PM, they're the difference between useful and unusable.

### 3. Cold starts are a UX problem, not just a DevOps problem
The retry system with encouraging messages transformed a technical limitation into a moment of care. Infrastructure shapes user experience.

### 4. Stateless can be a feature
No database means no data breaches, no HIPAA concerns, no account management. For a tool that processes sensitive health data, the simplest architecture is often the most responsible one.

---

## Try It

KidneyCompanion is open source and live:

- **GitHub**: [github.com/baheldeepti/KidneyCompanion](https://github.com/baheldeepti/KidneyCompanion)

If you or someone you know is navigating life after a kidney transplant, I hope this tool brings a little clarity and comfort to the lab result experience.

And remember — always share your results with your transplant team. KidneyCompanion is here to help you understand, not to replace the humans who care for you.

---

*Built with MedGemma 4B-IT, FriendliAI, ElevenLabs, React, and a deep respect for the transplant community.*
