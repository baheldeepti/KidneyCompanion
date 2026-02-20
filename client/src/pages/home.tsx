import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, AlertTriangle, Heart, Sparkles, Shield, Clock, ChevronRight } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import type { LabEntry, HistoricalPoint, PatientContext } from "@shared/schema";
import { buildAnalysisPrompt } from "@/lib/prompts";
import { StepLabs } from "@/components/step-labs";
import { StepPatient } from "@/components/step-patient";
import { StepHistory } from "@/components/step-history";
import { StepAnalyze } from "@/components/step-analyze";
import { StepResults } from "@/components/step-results";

const STEPS = [
  { n: 1, label: "Your Labs" },
  { n: 2, label: "About You" },
  { n: 3, label: "History" },
  { n: 4, label: "Review" },
  { n: 5, label: "Results" },
];

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState(1);
  const [labs, setLabs] = useState<LabEntry[]>([]);
  const [ctx, setCtx] = useState<PatientContext>({});
  const [history, setHistory] = useState<HistoricalPoint[]>([]);
  const [question, setQuestion] = useState(
    "Can you help me understand what these lab results mean for my transplant? Is everything looking okay?"
  );
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const handleAnalyze = useCallback(async () => {
    if (labs.length === 0) {
      setError("Add at least one lab value");
      return;
    }
    setLoading(true);
    setError("");
    setAnalysis("");
    setStatusMsg("Connecting to MedGemma...");
    try {
      const prompt = buildAnalysisPrompt(labs, question, ctx, history);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Could not read response");

      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            try {
              const parsed = JSON.parse(raw);
              if (eventType === "status") {
                setStatusMsg(parsed.message);
              } else if (eventType === "result") {
                result = parsed.result;
              } else if (eventType === "error") {
                throw new Error(parsed.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      if (!result) throw new Error("No response from MedGemma. Please try again.");
      setAnalysis(result);
      setStep(5);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  }, [labs, question, ctx, history]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight truncate">KidneyCompanion</h1>
              <p className="text-xs opacity-80 truncate">
                Your caring guide to understanding lab results
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs bg-white/15 text-white border-white/20 hidden sm:flex">
              MedGemma
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              className="text-white"
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <nav className="mb-8" data-testid="nav-steps">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
            <div
              className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((Math.min(step, 5) - 1) / 4) * 100}%` }}
            />
            {STEPS.map((s) => {
              const isActive = step === s.n;
              const isDone = step > s.n;
              const isClickable = s.n <= step;
              return (
                <button
                  key={s.n}
                  onClick={() => isClickable && setStep(s.n)}
                  disabled={!isClickable}
                  className="relative z-10 flex flex-col items-center gap-1.5 group"
                  data-testid={`button-step-${s.n}`}
                >
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      transition-all duration-300
                      ${isActive ? "bg-primary text-primary-foreground scale-110 ring-4 ring-primary/20" : ""}
                      ${isDone ? "bg-primary text-primary-foreground" : ""}
                      ${!isActive && !isDone ? "bg-muted text-muted-foreground" : ""}
                      ${isClickable && !isActive ? "cursor-pointer group-hover:scale-105" : ""}
                      ${!isClickable ? "opacity-50" : ""}
                    `}
                  >
                    {isDone ? "\u2713" : s.n}
                  </div>
                  <span
                    className={`
                      text-xs font-medium hidden sm:block
                      ${isActive ? "text-primary" : isDone ? "text-primary/70" : "text-muted-foreground"}
                    `}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {error && (
          <div
            className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20"
            data-testid="text-error"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setError("")}
              className="ml-auto text-destructive/70 shrink-0"
              data-testid="button-dismiss-error"
            >
              &times;
            </Button>
          </div>
        )}

        {step === 1 && labs.length === 0 && (
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary/8 via-primary/5 to-transparent border border-primary/10 p-6" data-testid="welcome-hero">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Heart className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Welcome to KidneyCompanion</h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Understanding your lab results after a transplant can feel overwhelming.
                    We're here to walk you through your numbers with care, using language that makes sense
                    and explanations that put your mind at ease.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    AI-powered explanations
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    Private and secure
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Results in seconds
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <StepLabs
            labs={labs}
            setLabs={setLabs}
            onNext={() => {
              setError("");
              setStep(2);
            }}
            setError={setError}
          />
        )}

        {step === 2 && (
          <StepPatient
            ctx={ctx}
            setCtx={setCtx}
            onNext={() => {
              setError("");
              setStep(3);
            }}
            onBack={() => setStep(1)}
            onSkip={() => {
              setError("");
              setStep(4);
            }}
          />
        )}

        {step === 3 && (
          <StepHistory
            history={history}
            setHistory={setHistory}
            onNext={() => {
              setError("");
              setStep(4);
            }}
            onBack={() => setStep(2)}
            setError={setError}
          />
        )}

        {step === 4 && (
          <StepAnalyze
            labs={labs}
            ctx={ctx}
            history={history}
            question={question}
            setQuestion={setQuestion}
            loading={loading}
            statusMsg={statusMsg}
            onAnalyze={handleAnalyze}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && (
          <StepResults
            labs={labs}
            ctx={ctx}
            history={history}
            question={question}
            analysis={analysis}
            onNewAnalysis={() => {
              setStep(1);
              setLabs([]);
              setCtx({});
              setHistory([]);
              setAnalysis("");
              setError("");
            }}
            onAddHistory={() => setStep(3)}
          />
        )}

        <footer className="mt-10 pb-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full px-4 py-2">
            <Shield className="w-3.5 h-3.5" />
            Educational tool only — always share results with your transplant team
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
            <span>Powered by MedGemma</span>
            <span>|</span>
            <span className="flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-primary/50 inline" /> for transplant patients
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
