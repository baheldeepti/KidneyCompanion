import { useState, useRef } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, TrendingUp, ShieldCheck, Heart, Volume2, Loader2, Pause, Play, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import type { LabEntry, PatientContext, HistoricalPoint } from "@shared/schema";
import { TRANSPLANT_RANGES } from "@shared/schema";

function parseNumeric(val: string): number | null {
  const match = val.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

function getLabStatus(name: string, value: string): { label: string; color: string; bgColor: string; icon: "ok" | "watch" | "discuss" } {
  const range = TRANSPLANT_RANGES[name];
  if (!range) return { label: "See analysis", color: "text-muted-foreground", bgColor: "bg-muted/50", icon: "watch" };
  const num = parseNumeric(value);
  if (num === null) return { label: "Check value", color: "text-muted-foreground", bgColor: "bg-muted/50", icon: "watch" };

  if (range.concernHigh && num >= range.concernHigh) return { label: "Discuss with team", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", icon: "discuss" };
  if (range.concernLow && num <= range.concernLow) return { label: "Discuss with team", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", icon: "discuss" };

  const transplantMatch = range.transplant.match(/([\d.]+)[–-]([\d.]+)/);
  if (transplantMatch) {
    const low = parseFloat(transplantMatch[1]);
    const high = parseFloat(transplantMatch[2]);
    if (num >= low && num <= high) return { label: "Within target", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800", icon: "ok" };
    if (num < low) return { label: "Below target", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", icon: "watch" };
    return { label: "Above target", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", icon: "watch" };
  }

  if (range.transplant.includes(">")) {
    const threshold = parseFloat(range.transplant.replace(/[>]/g, ""));
    if (num >= threshold) return { label: "Within target", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800", icon: "ok" };
    return { label: "Below target", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", icon: "watch" };
  }

  return { label: "See analysis", color: "text-muted-foreground", bgColor: "bg-muted/50", icon: "watch" };
}

function renderMarkdown(text: string) {
  const raw = text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-primary mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-foreground mt-6 mb-3">$1</h2>')
    .replace(/^-> /gm, '<span class="ml-4 text-muted-foreground">&#8594; </span>')
    .replace(/^- /gm, '<span class="ml-2 text-primary">&#x2022; </span>')
    .replace(/\n/g, "<br/>");
  const clean = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ["strong", "em", "h2", "h3", "span", "br", "p", "ul", "li", "ol"],
    ALLOWED_ATTR: ["class"],
  });
  return <div className="prose-content leading-relaxed text-sm" data-testid="text-analysis-content" dangerouslySetInnerHTML={{ __html: clean }} />;
}

interface StepResultsProps {
  labs: LabEntry[];
  ctx: PatientContext;
  history: HistoricalPoint[];
  question: string;
  analysis: string;
  onNewAnalysis: () => void;
  onAddHistory: () => void;
}

export function StepResults({
  labs,
  ctx,
  history,
  question,
  analysis,
  onNewAnalysis,
  onAddHistory,
}: StepResultsProps) {
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing" | "paused" | "error">("idle");
  const [audioError, setAudioError] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const buildAudioSummary = (fullAnalysis: string): string => {
    const plain = fullAnalysis
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/^#{1,3}\s+/gm, "")
      .replace(/^->\s+/gm, "")
      .trim();

    const lines = plain.split("\n").filter((l) => l.trim().length > 0);

    const summaryParts: string[] = [];

    summaryParts.push("Here's a summary of your lab results.");

    if (okCount > 0 || watchCount > 0) {
      const parts: string[] = [];
      if (okCount > 0) parts.push(`${okCount} of your labs are within the target range`);
      if (watchCount > 0) parts.push(`${watchCount} may need a closer look with your transplant team`);
      summaryParts.push(parts.join(", and ") + ".");
    }

    const keyFindings: string[] = [];
    let inSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.toLowerCase().includes("overall") ||
        trimmed.toLowerCase().includes("summary") ||
        trimmed.toLowerCase().includes("key takeaway") ||
        trimmed.toLowerCase().includes("bottom line") ||
        trimmed.toLowerCase().includes("in short") ||
        trimmed.toLowerCase().includes("good news")
      ) {
        inSection = true;
        const cleaned = trimmed.replace(/^[-*•]\s*/, "");
        if (cleaned.length > 15) keyFindings.push(cleaned);
        continue;
      }
      if (inSection) {
        if (trimmed.startsWith("##") || trimmed.startsWith("Recommendation")) {
          inSection = false;
          continue;
        }
        const cleaned = trimmed.replace(/^[-*•]\s*/, "");
        if (cleaned.length > 10 && keyFindings.length < 5) keyFindings.push(cleaned);
      }
    }

    if (keyFindings.length === 0) {
      const bulletPoints = lines
        .filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*") || l.trim().startsWith("•"))
        .map((l) => l.trim().replace(/^[-*•]\s*/, ""))
        .filter((l) => l.length > 15 && l.length < 200);
      keyFindings.push(...bulletPoints.slice(0, 4));
    }

    if (keyFindings.length > 0) {
      summaryParts.push("Here are the key points:");
      keyFindings.forEach((f) => summaryParts.push(f));
    }

    const recLines: string[] = [];
    let inRec = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes("recommendation") || trimmed.toLowerCase().includes("next step") || trimmed.toLowerCase().includes("action")) {
        inRec = true;
        continue;
      }
      if (inRec) {
        if (trimmed.startsWith("##")) break;
        const cleaned = trimmed.replace(/^[-*•\d.]\s*/, "");
        if (cleaned.length > 10 && recLines.length < 3) recLines.push(cleaned);
      }
    }

    if (recLines.length > 0) {
      summaryParts.push("Some recommendations for you:");
      recLines.forEach((r) => summaryParts.push(r));
    }

    summaryParts.push("Remember, this is for your understanding only. Please share these results with your transplant team for personalized medical advice. You're doing a great job staying on top of your health!");

    return summaryParts.join(" ");
  };

  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const handleListen = async () => {
    if (audioState === "playing" && audioRef.current) {
      audioRef.current.pause();
      setAudioState("paused");
      return;
    }
    if (audioState === "paused" && audioRef.current) {
      audioRef.current.play();
      setAudioState("playing");
      return;
    }

    cleanupAudio();
    setAudioState("loading");
    setAudioError("");
    try {
      const plainText = buildAudioSummary(analysis);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plainText }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Audio generation failed (${res.status})`);
      }

      const blob = await res.blob();
      if (blob.size === 0) throw new Error("Received empty audio response");
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setAudioState("idle");
      audio.onerror = () => {
        setAudioState("error");
        setAudioError("Audio playback failed. Try again.");
      };
      await audio.play();
      setAudioState("playing");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Audio failed";
      setAudioError(msg);
      setAudioState("error");
    }
  };

  const handleDownload = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            labs,
            ctx,
            history,
            question,
            analysis,
            timestamp: new Date().toISOString(),
            model: "MedGemma 4B-IT",
          },
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kidneycompanion_results.json";
    a.click();
  };

  const okCount = labs.filter((l) => getLabStatus(l.name, l.value).icon === "ok").length;
  const watchCount = labs.length - okCount;

  return (
    <div className="space-y-5">
      <Card className="border-primary/20 overflow-hidden" data-testid="card-listen-section">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Listen to Your Summary</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {audioState === "loading"
                    ? "Generating audio summary with Rachel's voice..."
                    : audioState === "playing"
                      ? "Playing your summary..."
                      : audioState === "paused"
                        ? "Audio paused"
                        : audioState === "error"
                          ? audioError
                          : "Hear the key highlights read aloud in a caring voice"}
                </p>
              </div>
            </div>
            <Button
              onClick={handleListen}
              disabled={audioState === "loading"}
              data-testid="button-listen-audio"
              className="rounded-full px-5 shrink-0"
              variant={audioState === "error" ? "destructive" : "default"}
            >
              {audioState === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
              {(audioState === "idle" || audioState === "error") && <Volume2 className="w-4 h-4" />}
              {audioState === "playing" && <Pause className="w-4 h-4" />}
              {audioState === "paused" && <Play className="w-4 h-4" />}
              {audioState === "loading" ? "Generating..." : audioState === "playing" ? "Pause" : audioState === "paused" ? "Resume" : audioState === "error" ? "Retry" : "Listen"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {labs.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/8 to-transparent border border-primary/10" data-testid="results-summary-bar">
          <Heart className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm font-medium flex-1">
            {okCount > 0 && <span className="text-emerald-600 dark:text-emerald-400">{okCount} within target</span>}
            {okCount > 0 && watchCount > 0 && <span className="text-muted-foreground"> · </span>}
            {watchCount > 0 && <span className="text-amber-600 dark:text-amber-400">{watchCount} to review</span>}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {labs.map((l, i) => {
          const range = TRANSPLANT_RANGES[l.name];
          const status = getLabStatus(l.name, l.value);
          return (
            <Card key={i} className={`border ${status.bgColor} overflow-hidden`} data-testid={`card-lab-result-${i}`}>
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-medium text-muted-foreground truncate flex-1">{l.name}</p>
                  {status.icon === "ok" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />}
                  {status.icon === "discuss" && <AlertCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />}
                </div>
                <p className="text-xl font-bold mt-1">{l.value.split(" ")[0]}</p>
                <p className="text-xs text-muted-foreground">
                  {l.value.split(" ").slice(1).join(" ")}
                </p>
                {range && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Target: {range.transplant.split("(")[0].trim()}
                  </p>
                )}
                <p className={`text-xs font-medium mt-1.5 ${status.color}`}>
                  {status.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Your Results, Explained With Care</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Personalized for you by MedGemma</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">{renderMarkdown(analysis)}</CardContent>
      </Card>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">A Friendly Reminder</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              KidneyCompanion is here to help you understand your numbers — but we're not your doctor.
              These explanations are for learning, not medical decisions. Please share your results
              and any questions with your transplant team. You're doing a wonderful job by being involved in your care!
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap pt-2">
        <Button variant="outline" onClick={onNewAnalysis} className="rounded-full" data-testid="button-new-analysis">
          <RefreshCw className="w-4 h-4" />
          New Analysis
        </Button>
        <Button variant="outline" onClick={handleDownload} className="rounded-full" data-testid="button-download-json">
          <Download className="w-4 h-4" />
          Save Results
        </Button>
        {history.length === 0 && (
          <Button onClick={onAddHistory} className="rounded-full" data-testid="button-add-history-from-results">
            <TrendingUp className="w-4 h-4" />
            Add History for Trends
          </Button>
        )}
      </div>
    </div>
  );
}
