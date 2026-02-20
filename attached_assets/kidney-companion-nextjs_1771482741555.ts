// ╔══════════════════════════════════════════════════════════════════╗
// ║  KidneyCompanion — Next.js + FriendliAI MedGemma               ║
// ║  ALL FILES IN ONE — split at the ████ FILE: markers             ║
// ╚══════════════════════════════════════════════════════════════════╝


// ████████████████████████████████████████████████████████████████████
// ████ FILE: app/layout.tsx
// ████████████████████████████████████████████████████████████████████

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KidneyCompanion — AI Lab Interpreter",
  description: "Post-transplant lab result interpreter powered by MedGemma",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


// ████████████████████████████████████████████████████████████████████
// ████ FILE: app/globals.css
// ████████████████████████████████████████████████████████████████████

/*
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #1a5276;
  --primary-light: #2e86c1;
  --accent: #27ae60;
  --warning: #f39c12;
  --danger: #e74c3c;
  --bg: #f8fafc;
  --card: #ffffff;
  --text: #1e293b;
  --muted: #64748b;
  --border: #e2e8f0;
}

* { box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  margin: 0;
}

.markdown-body h2 { color: var(--primary); margin-top: 1.5rem; }
.markdown-body h3 { color: var(--primary-light); }
.markdown-body strong { color: var(--primary); }
.markdown-body ul { padding-left: 1.5rem; }

@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.loading-pulse { animation: pulse-soft 1.5s ease-in-out infinite; }
*/


// ████████████████████████████████████████████████████████████████████
// ████ FILE: lib/medgemma.ts
// ████████████████████████████████████████████████████████████████████

// --- Transplant reference ranges ---
export const TRANSPLANT_RANGES: Record<string, {
  unit: string; healthy: string; transplant: string;
  context: string; concernHigh?: number; concernLow?: number;
}> = {
  "Creatinine": {
    unit: "mg/dL", healthy: "0.6–1.2", transplant: "1.0–1.8 (stable graft)",
    concernHigh: 2.0,
    context: "Post-transplant creatinine depends on donor kidney quality, time since transplant, and immunosuppressant levels. A stable creatinine — even if above 'normal' — is often more important than the absolute number.",
  },
  "eGFR": {
    unit: "mL/min/1.73m²", healthy: ">90", transplant: "30–70 (common functioning graft)",
    concernLow: 30,
    context: "Most transplanted kidneys don't achieve eGFR >90. 50–60 can be perfectly stable for years. Trend over months matters far more than any single reading.",
  },
  "Potassium": {
    unit: "mmol/L", healthy: "3.5–5.0", transplant: "3.5–5.2",
    concernHigh: 5.5,
    context: "Tacrolimus and calcineurin inhibitors commonly raise potassium. Mildly elevated levels (5.0–5.3) are frequent in transplant patients.",
  },
  "BUN": {
    unit: "mg/dL", healthy: "7–20", transplant: "10–30",
    concernHigh: 35,
    context: "BUN rises with dehydration, high-protein diet, or reduced graft function. Less specific than creatinine but useful as a supporting indicator.",
  },
  "Tacrolimus Level": {
    unit: "ng/mL", healthy: "N/A", transplant: "5–12 (varies by time post-transplant)",
    concernHigh: 15,
    context: "Most common anti-rejection drug. Too high risks kidney toxicity; too low risks rejection. Target ranges decrease over time.",
  },
  "Phosphorus": {
    unit: "mg/dL", healthy: "2.5–4.5", transplant: "2.0–4.5",
    concernLow: 1.5,
    context: "A new transplant often 'wastes' phosphorus due to residual parathyroid hormone elevation.",
  },
  "Hemoglobin": {
    unit: "g/dL", healthy: "12–17", transplant: "10–15",
    concernLow: 9,
    context: "Anemia is common early post-transplant from medications or residual CKD effects. Usually improves over 6–12 months.",
  },
  "Albumin": {
    unit: "g/dL", healthy: "3.5–5.5", transplant: "3.5–5.5",
    concernLow: 3.0,
    context: "Low albumin can indicate poor nutrition, inflammation, or protein loss.",
  },
};

export interface LabEntry { name: string; value: string; }
export interface HistoricalPoint { date: string; labs: LabEntry[]; }
export interface PatientContext {
  age?: number; sex?: string; monthsPostTransplant?: number;
  donorType?: string; medications?: string;
}

export function buildReferenceBlock(labs: LabEntry[]): string {
  return labs.map(l => {
    const ref = TRANSPLANT_RANGES[l.name];
    if (ref) {
      return `- ${l.name}: Healthy=${ref.healthy} ${ref.unit}, Transplant Target=${ref.transplant}. Note: ${ref.context}`;
    }
    return `- ${l.name}: No transplant-specific reference loaded; use general ranges.`;
  }).join("\n");
}

export function buildAnalysisPrompt(
  labs: LabEntry[], question: string,
  ctx?: PatientContext, history?: HistoricalPoint[]
): string {
  const labStr = labs.map(l => `  • ${l.name}: ${l.value}`).join("\n");
  const refBlock = buildReferenceBlock(labs);
  const hasHist = history && history.length > 0;

  let ctxBlock = "";
  if (ctx && (ctx.age || ctx.sex || ctx.monthsPostTransplant || ctx.medications)) {
    const lines: string[] = [];
    if (ctx.age) lines.push(`Age: ${ctx.age}`);
    if (ctx.sex) lines.push(`Sex: ${ctx.sex}`);
    if (ctx.monthsPostTransplant) lines.push(`Time since transplant: ${ctx.monthsPostTransplant} months`);
    if (ctx.donorType) lines.push(`Donor type: ${ctx.donorType}`);
    if (ctx.medications) lines.push(`Current medications: ${ctx.medications}`);
    ctxBlock = `\n### PATIENT CONTEXT\n${lines.join("\n")}`;
  }

  let histBlock = "";
  if (hasHist) {
    const histLines = history!.map(h => {
      const vals = h.labs.map(l => `${l.name}: ${l.value}`).join(", ");
      return `  [${h.date}] ${vals}`;
    }).join("\n");
    histBlock = `\n### HISTORICAL LAB VALUES (analyze trends)\n${histLines}\n\nIMPORTANT: Compare today's values against these. State STABLE, IMPROVING, or WORSENING for each.`;
  }

  return `You are **KidneyCompanion**, a specialized nephrology patient-education assistant built on MedGemma. You are speaking directly to a kidney transplant recipient. Your purpose is to educate and empower — never to diagnose or replace their transplant team.

### CLINICAL REFERENCE RANGES (Transplant-Specific)
${refBlock}

### TODAY'S LAB RESULTS
${labStr}
${ctxBlock}
${histBlock}

### PATIENT'S QUESTION
"${question}"

### RESPONSE RULES:

SAFETY:
1. NEVER diagnose. Say "values like these can sometimes be associated with…" not "you have…"
2. NEVER recommend starting, stopping, or changing any medication or dosage.
3. NEVER use alarming language ("dangerous", "critical", "failing"). Use "worth discussing with your team".
4. ALWAYS end with a disclaimer that you are AI, not a doctor.

COMMUNICATION:
5. Write at a 5th–6th grade reading level. Define every medical term on first use.
6. Use one concrete analogy per lab value.
7. Be warm, calm, and encouraging.
8. Address the patient's question directly first.

ACCURACY:
9. Compare each value against BOTH general healthy range AND transplant-specific target.
10. If within transplant target but outside healthy range, reassure this is expected.
11. Emphasize TRENDS matter more than single values.
12. If historical labs provided, include trend analysis per value.

### OUTPUT FORMAT:

**Opening**
Warm greeting. Answer the question in 2–3 plain sentences.

**Your Numbers Explained**
For EACH lab value:
→ **[Lab Name]: [Value]**
→ **Compared to:** General = [X], Transplant target = [Y]
→ **Status:** [Within target / Slightly above / etc.]
→ **What this means:** [Analogy + plain explanation]
→ **Transplant note:** [Why different for transplant]
${hasHist ? "→ **Trend:** [Stable/Improving/Worsening]" : ""}

**Putting It All Together**
Synthesize how values relate. Common transplant factors (meds, hydration, diet, time since surgery).

**Questions for Your Care Team**
4 specific actionable questions tailored to these actual values.

**Tracking Your Health**
Explain trending: "A single result is a photograph — your doctor wants the whole movie."
${hasHist ? "Summarize the trends you observe." : "Encourage keeping a lab log."}

**Disclaimer**
"⚕️ I am KidneyCompanion, an AI education tool — not a doctor. Please share results with your transplant team before making any care decisions."`;
}

export function buildExtractionPrompt(): string {
  return `You are a medical lab report reader. Extract ALL lab values from this image.
Return ONLY a valid JSON array of objects with "name" and "value" keys.
Example: [{"name":"Creatinine","value":"1.6 mg/dL"},{"name":"eGFR","value":"52 mL/min/1.73m²"}]
Rules:
- Include every lab value visible in the image.
- Use standard lab name spellings.
- Include units exactly as shown.
- If flagged High (H) or Low (L), append it: e.g. "1.6 mg/dL (H)"
- Return ONLY the JSON array. No markdown, no backticks, no explanation.`;
}


// ████████████████████████████████████████████████████████████████████
// ████ FILE: app/api/analyze/route.ts
// ████████████████████████████████████████████████████████████████████

import { NextRequest, NextResponse } from "next/server";

const FRIENDLI_API_KEY = process.env.FRIENDLI_API_KEY || "";
const FRIENDLI_URL = "https://api.friendli.ai/serverless/v1/chat/completions";
const MODEL = "google/medgemma-4b-it";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, imageBase64 } = body as {
      prompt: string;
      imageBase64?: string;
    };

    if (!FRIENDLI_API_KEY) {
      return NextResponse.json(
        { error: "FRIENDLI_API_KEY not set in environment secrets" },
        { status: 500 }
      );
    }

    // Build messages array
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

    if (!response.ok) {
      const errText = await response.text();
      console.error("FriendliAI error:", response.status, errText);
      return NextResponse.json(
        { error: `FriendliAI API error: ${response.status}`, details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "No response generated.";

    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("API route error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


// ████████████████████████████████████████████████████████████████████
// ████ FILE: app/page.tsx   (THE MAIN UI — largest file)
// ████████████████████████████████████████████████████████████████████

"use client";

import React, { useState, useRef, useCallback } from "react";

// ── Types ──
interface LabEntry { name: string; value: string; }
interface HistoricalPoint { date: string; labs: LabEntry[]; }
interface PatientContext {
  age?: number; sex?: string; monthsPostTransplant?: number;
  donorType?: string; medications?: string;
}

// ── Reference Ranges (client copy for status badges) ──
const RANGES: Record<string, { healthy: string; transplant: string; unit: string }> = {
  "Creatinine":       { unit: "mg/dL",          healthy: "0.6–1.2", transplant: "1.0–1.8" },
  "eGFR":             { unit: "mL/min/1.73m²",  healthy: ">90",     transplant: "30–70" },
  "Potassium":        { unit: "mmol/L",          healthy: "3.5–5.0", transplant: "3.5–5.2" },
  "BUN":              { unit: "mg/dL",           healthy: "7–20",    transplant: "10–30" },
  "Tacrolimus Level": { unit: "ng/mL",           healthy: "N/A",     transplant: "5–12" },
  "Phosphorus":       { unit: "mg/dL",           healthy: "2.5–4.5", transplant: "2.0–4.5" },
  "Hemoglobin":       { unit: "g/dL",            healthy: "12–17",   transplant: "10–15" },
  "Albumin":          { unit: "g/dL",            healthy: "3.5–5.5", transplant: "3.5–5.5" },
};

const COMMON_LABS = ["Creatinine","eGFR","Potassium","BUN","Tacrolimus Level","Hemoglobin","Phosphorus","Albumin"];

const DEMO_LABS: LabEntry[] = [
  {name:"Creatinine",value:"1.6 mg/dL"},{name:"eGFR",value:"52 mL/min/1.73m²"},
  {name:"Potassium",value:"4.9 mmol/L"},{name:"BUN",value:"28 mg/dL"},
  {name:"Tacrolimus Level",value:"8.2 ng/mL"},{name:"Hemoglobin",value:"11.4 g/dL"},
  {name:"Phosphorus",value:"2.8 mg/dL"},{name:"Albumin",value:"3.9 g/dL"},
];
const DEMO_HISTORY: HistoricalPoint[] = [
  {date:"2024-12 (Month 2)",labs:[{name:"Creatinine",value:"1.9 mg/dL"},{name:"eGFR",value:"42 mL/min/1.73m²"},{name:"Potassium",value:"5.2 mmol/L"},{name:"BUN",value:"32 mg/dL"}]},
  {date:"2025-02 (Month 4)",labs:[{name:"Creatinine",value:"1.7 mg/dL"},{name:"eGFR",value:"48 mL/min/1.73m²"},{name:"Potassium",value:"5.0 mmol/L"},{name:"BUN",value:"30 mg/dL"}]},
  {date:"2025-04 (Month 6)",labs:[{name:"Creatinine",value:"1.6 mg/dL"},{name:"eGFR",value:"50 mL/min/1.73m²"},{name:"Potassium",value:"4.8 mmol/L"},{name:"BUN",value:"27 mg/dL"}]},
];
const DEMO_CTX: PatientContext = {
  age:54, sex:"Male", monthsPostTransplant:8,
  donorType:"Deceased donor", medications:"Tacrolimus, Mycophenolate, Prednisone 5mg, Valganciclovir",
};

// ── API caller ──
async function callMedGemma(prompt: string, imageBase64?: string): Promise<string> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, imageBase64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data.result;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Simple Markdown Renderer ──
function renderMarkdown(text: string) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h3 style="color:#2e86c1;margin-top:1rem">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#1a5276;margin-top:1.5rem">$1</h2>')
    .replace(/^→ /gm, "&nbsp;&nbsp;→ ")
    .replace(/^- /gm, "• ")
    .replace(/\n/g, "<br/>");
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Main Component ──
export default function KidneyCompanion() {
  const [step, setStep] = useState(1);
  const [labs, setLabs] = useState<LabEntry[]>([]);
  const [ctx, setCtx] = useState<PatientContext>({});
  const [history, setHistory] = useState<HistoricalPoint[]>([]);
  const [question, setQuestion] = useState("What do these kidney lab results mean for my transplant? Should I be worried?");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const histFileRef = useRef<HTMLInputElement>(null);

  // ── Lab management ──
  const addLab = () => setLabs(p => [...p, { name: "", value: "" }]);
  const updateLab = (i: number, field: "name"|"value", val: string) => {
    setLabs(p => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  };
  const removeLab = (i: number) => setLabs(p => p.filter((_, idx) => idx !== i));

  // ── Image extraction ──
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setError("");
    try {
      const b64 = await fileToBase64(file);
      const extractPrompt = `You are a medical lab report reader. Extract ALL lab values from this image.
Return ONLY a valid JSON array of objects with "name" and "value" keys.
Example: [{"name":"Creatinine","value":"1.6 mg/dL"},{"name":"eGFR","value":"52 mL/min/1.73m²"}]
Include every value visible. Use standard names. Include units. Return ONLY JSON.`;
      const raw = await callMedGemma(extractPrompt, b64);
      // Parse JSON from response
      const jsonMatch = raw.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as LabEntry[];
        setLabs(parsed.filter(l => l.name && l.value));
      } else {
        setError("Could not parse lab values from image. Try a clearer photo or enter manually.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }, []);

  // ── Historical image extraction ──
  const handleHistImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setError("");
    try {
      const b64 = await fileToBase64(file);
      const prompt = `Extract ALL lab values from this historical lab report image.
Return ONLY a valid JSON array: [{"name":"LabName","value":"X unit"}]`;
      const raw = await callMedGemma(prompt, b64);
      const m = raw.match(/\[[\s\S]*?\]/);
      if (m) {
        const parsed = JSON.parse(m[0]) as LabEntry[];
        const dateLabel = prompt ? `Report (${new Date().toLocaleDateString()})` : "Historical";
        setHistory(prev => [...prev, { date: dateLabel, labs: parsed }]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Historical extraction failed");
    } finally {
      setExtracting(false);
    }
  }, []);

  // ── Run analysis ──
  const handleAnalyze = async () => {
    if (labs.length === 0) { setError("Add at least one lab value"); return; }
    setLoading(true);
    setError("");
    setAnalysis("");
    try {
      // Build the full prompt (same logic as lib/medgemma.ts but inline for client)
      const labStr = labs.map(l => `  • ${l.name}: ${l.value}`).join("\n");

      const refLines = labs.map(l => {
        const r = RANGES[l.name];
        return r
          ? `- ${l.name}: Healthy=${r.healthy} ${r.unit}, Transplant Target=${r.transplant}`
          : `- ${l.name}: Use general reference ranges.`;
      }).join("\n");

      const hasHist = history.length > 0;
      let ctxBlock = "";
      if (ctx.age || ctx.sex || ctx.monthsPostTransplant || ctx.medications) {
        const lines: string[] = [];
        if (ctx.age) lines.push(`Age: ${ctx.age}`);
        if (ctx.sex) lines.push(`Sex: ${ctx.sex}`);
        if (ctx.monthsPostTransplant) lines.push(`Time since transplant: ${ctx.monthsPostTransplant} months`);
        if (ctx.donorType) lines.push(`Donor type: ${ctx.donorType}`);
        if (ctx.medications) lines.push(`Medications: ${ctx.medications}`);
        ctxBlock = `\n### PATIENT CONTEXT\n${lines.join("\n")}`;
      }

      let histBlock = "";
      if (hasHist) {
        const hLines = history.map(h => {
          const vals = h.labs.map(l => `${l.name}: ${l.value}`).join(", ");
          return `  [${h.date}] ${vals}`;
        }).join("\n");
        histBlock = `\n### HISTORICAL LAB VALUES\n${hLines}\nCompare today's values. State STABLE, IMPROVING, or WORSENING.`;
      }

      const fullPrompt = `You are **KidneyCompanion**, a nephrology patient-education assistant for kidney transplant recipients. Educate and empower — never diagnose.

### REFERENCE RANGES (Transplant-Specific)
${refLines}

### TODAY'S LABS
${labStr}
${ctxBlock}
${histBlock}

### PATIENT'S QUESTION
"${question}"

### RULES:
SAFETY: Never diagnose. Never recommend medication changes. Never use alarming language. End with AI disclaimer.
COMMUNICATION: 5th-grade reading level. One analogy per lab. Warm and calm. Answer question first.
ACCURACY: Compare against BOTH general and transplant ranges. Reassure if within transplant target. Emphasize trends. ${hasHist ? "Include trend analysis." : ""}

### OUTPUT FORMAT:
**Opening** — Warm greeting, answer question in 2-3 sentences.
**Your Numbers Explained** — For each lab: Value, Compared to (general + transplant), Status, What it means (analogy), Transplant note${hasHist ? ", Trend" : ""}.
**Putting It All Together** — Synthesize how values relate. Common transplant factors.
**Questions for Your Care Team** — 4 specific questions for these values.
**Tracking Your Health** — Snapshot vs movie analogy. ${hasHist ? "Summarize trends." : "Encourage lab log."}
**Disclaimer** — "⚕️ I am KidneyCompanion, an AI education tool — not a doctor."`;

      const result = await callMedGemma(fullPrompt);
      setAnalysis(result);
      setStep(5);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ──
  const S = {
    page: { maxWidth: 900, margin: "0 auto", padding: "1rem" } as React.CSSProperties,
    header: { background: "linear-gradient(135deg, #1a5276, #2e86c1)", padding: "2rem", borderRadius: 16, color: "#fff", marginBottom: "1.5rem", textAlign: "center" as const },
    card: { background: "#fff", borderRadius: 12, padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "1rem", border: "1px solid #e2e8f0" },
    steps: { display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" as const },
    stepBtn: (active: boolean, done: boolean) => ({
      padding: "0.5rem 1rem", borderRadius: 8, border: "2px solid",
      borderColor: active ? "#2e86c1" : done ? "#27ae60" : "#e2e8f0",
      background: active ? "#ebf5fb" : done ? "#eafaf1" : "#fff",
      color: active ? "#1a5276" : done ? "#27ae60" : "#64748b",
      fontWeight: active ? 700 : 500, cursor: "pointer", fontSize: "0.9rem",
    }),
    btn: (variant: "primary"|"secondary"|"ghost" = "primary") => ({
      padding: "0.75rem 1.5rem", borderRadius: 10, border: "none", cursor: "pointer",
      fontWeight: 600, fontSize: "1rem", transition: "all 0.2s",
      ...(variant === "primary" ? { background: "#2e86c1", color: "#fff" } :
         variant === "secondary" ? { background: "#eee", color: "#333" } :
         { background: "transparent", color: "#2e86c1", textDecoration: "underline" }),
    }),
    input: { width: "100%", padding: "0.6rem 0.8rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.95rem", outline: "none" },
    select: { padding: "0.6rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.95rem", background: "#fff" },
    row: { display: "flex", gap: 12, alignItems: "center", marginBottom: 8 },
    badge: (color: string) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, background: color + "20", color }),
    error: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem" },
    disclaimer: { background: "#f0f4f8", borderLeft: "4px solid #3182ce", padding: "1rem", borderRadius: 8, marginTop: "1rem", fontSize: "0.85rem", color: "#64748b" },
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ fontSize: "2.5rem" }}>🫘</div>
        <h1 style={{ margin: "0.5rem 0 0.25rem", fontSize: "2rem" }}>KidneyCompanion</h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: "1.05rem" }}>
          AI-Powered Lab Interpreter for Kidney Transplant Patients
        </p>
        <p style={{ margin: "0.25rem 0 0", opacity: 0.65, fontSize: "0.85rem" }}>
          Powered by MedGemma 4B-IT • HAI-DEF Collection
        </p>
      </div>

      {/* Step Navigation */}
      <div style={S.steps}>
        {[
          { n: 1, label: "📋 Enter Labs" },
          { n: 2, label: "👤 Patient Info" },
          { n: 3, label: "📈 History" },
          { n: 4, label: "🔬 Analyze" },
          { n: 5, label: "📄 Results" },
        ].map(s => (
          <button key={s.n} style={S.stepBtn(step === s.n, step > s.n)}
            onClick={() => s.n <= step ? setStep(s.n) : null}>
            {s.label}
          </button>
        ))}
      </div>

      {error && <div style={S.error}>⚠️ {error}</div>}

      {/* ── STEP 1: Enter Labs ── */}
      {step === 1 && (
        <div style={S.card}>
          <h2 style={{ marginTop: 0 }}>📋 Enter Your Lab Results</h2>

          {/* Upload option */}
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "1rem", marginBottom: "1rem", border: "1px dashed #cbd5e1" }}>
            <strong>📸 Upload a lab report image</strong>
            <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.25rem 0 0.5rem" }}>
              JPG, PNG, or PDF — MedGemma will read and extract values
            </p>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleImageUpload} style={{ display: "none" }} />
            <button style={S.btn("secondary")} onClick={() => fileRef.current?.click()}
              disabled={extracting}>
              {extracting ? "⏳ Extracting..." : "📤 Choose File"}
            </button>
          </div>

          <div style={{ textAlign: "center", color: "#94a3b8", margin: "0.5rem 0" }}>— or enter manually —</div>

          {/* Lab entries */}
          {labs.map((lab, i) => (
            <div key={i} style={S.row}>
              <select style={{ ...S.select, flex: "0 0 200px" }}
                value={lab.name} onChange={e => updateLab(i, "name", e.target.value)}>
                <option value="">Select lab...</option>
                {COMMON_LABS.map(n => <option key={n} value={n}>{n}</option>)}
                <option value="__custom">Other (type below)</option>
              </select>
              {lab.name === "__custom" && (
                <input style={{ ...S.input, flex: "0 0 150px" }} placeholder="Lab name"
                  onChange={e => updateLab(i, "name", e.target.value)} />
              )}
              <input style={{ ...S.input, flex: 1 }} placeholder="e.g. 1.6 mg/dL"
                value={lab.value} onChange={e => updateLab(i, "value", e.target.value)} />
              <button onClick={() => removeLab(i)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#e74c3c" }}>✕</button>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, marginTop: "1rem", flexWrap: "wrap" }}>
            <button style={S.btn("secondary")} onClick={addLab}>+ Add Lab Value</button>
            <button style={S.btn("ghost")} onClick={() => { setLabs([...DEMO_LABS]); }}>
              Load Demo Data
            </button>
          </div>

          <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
            <button style={S.btn("primary")} onClick={() => labs.length > 0 ? setStep(2) : setError("Add at least one lab")}
              disabled={labs.length === 0}>
              Next: Patient Info →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Patient Context ── */}
      {step === 2 && (
        <div style={S.card}>
          <h2 style={{ marginTop: 0 }}>👤 Patient Information <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "#94a3b8" }}>(optional)</span></h2>
          <p style={{ color: "#64748b" }}>This helps personalize the analysis. Skip anything you prefer not to share.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Age</label>
              <input type="number" style={S.input} placeholder="e.g. 54"
                value={ctx.age || ""} onChange={e => setCtx(p => ({ ...p, age: parseInt(e.target.value) || undefined }))} />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Sex</label>
              <select style={{ ...S.select, width: "100%" }}
                value={ctx.sex || ""} onChange={e => setCtx(p => ({ ...p, sex: e.target.value || undefined }))}>
                <option value="">Not specified</option>
                <option>Male</option><option>Female</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Months since transplant</label>
              <input type="number" style={S.input} placeholder="e.g. 8"
                value={ctx.monthsPostTransplant || ""} onChange={e => setCtx(p => ({ ...p, monthsPostTransplant: parseInt(e.target.value) || undefined }))} />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Donor type</label>
              <select style={{ ...S.select, width: "100%" }}
                value={ctx.donorType || ""} onChange={e => setCtx(p => ({ ...p, donorType: e.target.value || undefined }))}>
                <option value="">Not specified</option>
                <option>Living donor</option><option>Deceased donor</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Current medications</label>
              <input style={S.input} placeholder="e.g. Tacrolimus, Mycophenolate, Prednisone"
                value={ctx.medications || ""} onChange={e => setCtx(p => ({ ...p, medications: e.target.value || undefined }))} />
            </div>
          </div>

          <button style={{ ...S.btn("ghost"), marginTop: 8 }}
            onClick={() => setCtx({ ...DEMO_CTX })}>Load Demo Patient</button>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
            <button style={S.btn("secondary")} onClick={() => setStep(1)}>← Back</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={S.btn("ghost")} onClick={() => setStep(4)}>Skip to Analysis</button>
              <button style={S.btn("primary")} onClick={() => setStep(3)}>Next: History →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Historical Labs ── */}
      {step === 3 && (
        <div style={S.card}>
          <h2 style={{ marginTop: 0 }}>📈 Historical Lab Results <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "#94a3b8" }}>(optional)</span></h2>
          <p style={{ color: "#64748b" }}>
            A single result is a <strong>snapshot</strong>. Add past results to see the <strong>movie</strong> of your kidney health.
          </p>

          {/* Upload historical */}
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "1rem", marginBottom: "1rem", border: "1px dashed #cbd5e1" }}>
            <strong>📸 Upload a past lab report</strong>
            <input ref={histFileRef} type="file" accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleHistImageUpload} style={{ display: "none" }} />
            <button style={{ ...S.btn("secondary"), marginLeft: 12 }}
              onClick={() => histFileRef.current?.click()} disabled={extracting}>
              {extracting ? "⏳ Extracting..." : "📤 Upload"}
            </button>
          </div>

          {/* Manual add */}
          <HistoryEntryForm onAdd={(h) => setHistory(p => [...p, h])} />

          {/* Display existing */}
          {history.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <strong>Historical records ({history.length}):</strong>
              {history.map((h, i) => (
                <div key={i} style={{ background: "#f1f5f9", borderRadius: 8, padding: "0.75rem", margin: "0.5rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{h.date}</strong>
                    <span style={{ color: "#64748b", marginLeft: 8, fontSize: "0.85rem" }}>
                      {h.labs.map(l => `${l.name}: ${l.value}`).join(", ")}
                    </span>
                  </div>
                  <button onClick={() => setHistory(p => p.filter((_, idx) => idx !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <button style={{ ...S.btn("ghost"), marginTop: 8 }}
            onClick={() => setHistory([...DEMO_HISTORY])}>Load Demo History</button>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
            <button style={S.btn("secondary")} onClick={() => setStep(2)}>← Back</button>
            <button style={S.btn("primary")} onClick={() => setStep(4)}>Next: Analyze →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Analyze ── */}
      {step === 4 && (
        <div style={S.card}>
          <h2 style={{ marginTop: 0 }}>🔬 Ready to Analyze</h2>

          {/* Summary */}
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "1rem", marginBottom: "1rem" }}>
            <strong>Labs:</strong> {labs.map(l => l.name).join(", ")}<br/>
            {ctx.age && <><strong>Patient:</strong> {ctx.age}y {ctx.sex}, {ctx.monthsPostTransplant}mo post-transplant<br/></>}
            {history.length > 0 && <><strong>History:</strong> {history.length} previous reports<br/></>}
          </div>

          <label style={{ fontSize: "0.9rem", fontWeight: 600 }}>💬 Your question:</label>
          <textarea style={{ ...S.input, minHeight: 80, marginTop: 4, resize: "vertical" as const }}
            value={question} onChange={e => setQuestion(e.target.value)} />

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
            <button style={S.btn("secondary")} onClick={() => setStep(3)}>← Back</button>
            <button style={{ ...S.btn("primary"), padding: "0.85rem 2rem", fontSize: "1.1rem" }}
              onClick={handleAnalyze} disabled={loading}>
              {loading ? "🧠 MedGemma is thinking..." : "🚀 Analyze My Results"}
            </button>
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }} className="loading-pulse">🧠</div>
              <p>MedGemma is analyzing your results...<br/>This usually takes 10–30 seconds.</p>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 5: Results ── */}
      {step === 5 && (
        <div>
          {/* Lab summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: "1rem" }}>
            {labs.map((l, i) => {
              const ref = RANGES[l.name];
              return (
                <div key={i} style={{ ...S.card, padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{l.name}</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0.25rem 0" }}>{l.value}</div>
                  {ref && <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Target: {ref.transplant} {ref.unit}</div>}
                </div>
              );
            })}
          </div>

          {/* Analysis */}
          <div style={S.card}>
            <h2 style={{ marginTop: 0 }}>📄 Your Results Explained</h2>
            <div style={{ lineHeight: 1.7 }}>{renderMarkdown(analysis)}</div>
          </div>

          <div style={S.disclaimer}>
            ⚕️ <strong>Disclaimer:</strong> KidneyCompanion is an AI education tool built on MedGemma, not a medical device.
            These explanations are for learning only. Always discuss results with your transplant team.
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: "1rem", flexWrap: "wrap" }}>
            <button style={S.btn("secondary")} onClick={() => setStep(1)}>🔄 New Analysis</button>
            <button style={S.btn("secondary")} onClick={() => {
              const blob = new Blob([JSON.stringify({ labs, ctx, history, question, analysis, timestamp: new Date().toISOString(), model: "MedGemma 4B-IT" }, null, 2)], { type: "application/json" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = "kidneycompanion_results.json"; a.click();
            }}>📥 Download JSON</button>
            {history.length === 0 && (
              <button style={S.btn("primary")} onClick={() => setStep(3)}>📈 Add History for Trends</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component: History Entry Form ──
function HistoryEntryForm({ onAdd }: { onAdd: (h: HistoricalPoint) => void }) {
  const [date, setDate] = useState("");
  const [entries, setEntries] = useState<LabEntry[]>([{ name: "Creatinine", value: "" }, { name: "eGFR", value: "" }]);

  const handleAdd = () => {
    if (!date) return;
    const valid = entries.filter(e => e.name && e.value);
    if (valid.length === 0) return;
    onAdd({ date, labs: valid });
    setDate("");
    setEntries([{ name: "Creatinine", value: "" }, { name: "eGFR", value: "" }]);
  };

  const S = {
    input: { padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db", fontSize: "0.9rem" },
    select: { padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db", fontSize: "0.9rem", background: "#fff" },
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem" }}>
      <strong>Add a time point manually:</strong>
      <div style={{ marginTop: 8 }}>
        <input style={{ ...S.input, width: 250, marginRight: 8 }} placeholder="Date (e.g. January 2025)"
          value={date} onChange={e => setDate(e.target.value)} />
      </div>
      {entries.map((ent, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
          <select style={S.select} value={ent.name}
            onChange={e => setEntries(p => p.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}>
            <option value="">Select...</option>
            {COMMON_LABS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <input style={{ ...S.input, flex: 1 }} placeholder="Value + unit"
            value={ent.value} onChange={e => setEntries(p => p.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} />
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => setEntries(p => [...p, { name: "", value: "" }])}
          style={{ background: "none", border: "1px dashed #ccc", borderRadius: 6, padding: "0.3rem 0.75rem", cursor: "pointer", fontSize: "0.85rem" }}>
          + row
        </button>
        <button onClick={handleAdd}
          style={{ background: "#27ae60", color: "#fff", border: "none", borderRadius: 6, padding: "0.3rem 1rem", cursor: "pointer", fontWeight: 600 }}>
          ✓ Add
        </button>
      </div>
    </div>
  );
}
