import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Stethoscope, Loader2, Beaker, User, History, MessageSquare, Sparkles, Heart } from "lucide-react";
import type { LabEntry, PatientContext, HistoricalPoint } from "@shared/schema";

interface StepAnalyzeProps {
  labs: LabEntry[];
  ctx: PatientContext;
  history: HistoricalPoint[];
  question: string;
  setQuestion: (q: string) => void;
  loading: boolean;
  statusMsg: string;
  onAnalyze: () => void;
  onBack: () => void;
}

export function StepAnalyze({
  labs,
  ctx,
  history,
  question,
  setQuestion,
  loading,
  statusMsg,
  onAnalyze,
  onBack,
}: StepAnalyzeProps) {
  const hasCtx = !!(ctx.age || ctx.sex || ctx.monthsPostTransplant || ctx.medications);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Let's Review Everything</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Here's what we'll analyze for you — make sure it looks right
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/50 border border-border/50">
              <Beaker className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Labs</p>
                <p className="text-sm font-semibold mt-0.5 truncate">
                  {labs.length} value{labs.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {labs.map((l) => l.name).join(", ")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/50 border border-border/50">
              <User className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">About You</p>
                {hasCtx ? (
                  <p className="text-sm font-semibold mt-0.5 truncate">
                    {[
                      ctx.age && `${ctx.age}y`,
                      ctx.sex,
                      ctx.monthsPostTransplant && `${ctx.monthsPostTransplant}mo post-tx`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-0.5">Not provided</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/50 border border-border/50">
              <History className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</p>
                <p className="text-sm font-semibold mt-0.5">
                  {history.length > 0
                    ? `${history.length} past report${history.length !== 1 ? "s" : ""}`
                    : "None added"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              What would you like to know?
            </Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="resize-none min-h-[90px] rounded-xl"
              placeholder="Ask anything about your results — we'll explain it clearly"
              data-testid="textarea-question"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Ask specific questions like "Is my creatinine okay?" or "Should I be worried about my potassium?"
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onBack} disabled={loading} className="rounded-full" data-testid="button-back-step4">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={onAnalyze}
          disabled={loading}
          className="rounded-full px-6"
          data-testid="button-analyze"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Explain My Results
            </>
          )}
        </Button>
      </div>

      {loading && (
        <Card className="border-primary/20 overflow-hidden">
          <div className="h-1 bg-primary/20">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{
                width: statusMsg.includes("Got") || statusMsg.includes("Preparing")
                  ? "95%"
                  : statusMsg.includes("Last attempt")
                    ? "85%"
                    : statusMsg.includes("waking") || statusMsg.includes("warming") || statusMsg.includes("loading") || statusMsg.includes("spinning")
                      ? "40%"
                      : statusMsg.includes("Trying again")
                        ? "50%"
                        : "20%",
              }}
            />
          </div>
          <CardContent className="py-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-primary animate-pulse" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold" data-testid="text-status">
                  {statusMsg || "Preparing your personalized explanation..."}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
                  {statusMsg.includes("waking") || statusMsg.includes("warming") || statusMsg.includes("loading") || statusMsg.includes("spinning") || statusMsg.includes("Hang tight") || statusMsg.includes("Nearly")
                    ? "Dedicated AI models sometimes need a minute or two to start up on first use. This is completely normal — once running, future requests will be fast!"
                    : statusMsg.includes("Trying again")
                      ? "We're automatically retrying — no need to do anything. Just hang tight!"
                      : "We're carefully reviewing each of your lab values and writing a personalized explanation just for you."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
