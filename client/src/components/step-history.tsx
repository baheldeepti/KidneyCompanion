import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Upload, History, Plus, X, Check, FlaskConical, Loader2, TrendingUp, Info } from "lucide-react";
import type { LabEntry, HistoricalPoint } from "@shared/schema";
import { COMMON_LABS } from "@shared/schema";
import { DEMO_HISTORY } from "@/lib/constants";
import { compressImage } from "@/lib/image-utils";

interface StepHistoryProps {
  history: HistoricalPoint[];
  setHistory: (h: HistoricalPoint[]) => void;
  onNext: () => void;
  onBack: () => void;
  setError: (err: string) => void;
}

function HistoryEntryForm({ onAdd }: { onAdd: (h: HistoricalPoint) => void }) {
  const [date, setDate] = useState("");
  const [entries, setEntries] = useState<LabEntry[]>([
    { name: "Creatinine", value: "" },
    { name: "eGFR", value: "" },
  ]);

  const handleAdd = () => {
    if (!date) return;
    const valid = entries.filter((e) => e.name && e.value);
    if (valid.length === 0) return;
    onAdd({ date, labs: valid });
    setDate("");
    setEntries([
      { name: "Creatinine", value: "" },
      { name: "eGFR", value: "" },
    ]);
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Add a past lab result</p>
        <Input
          placeholder="When was this? (e.g. January 2025)"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="max-w-xs"
          data-testid="input-history-date"
        />
        {entries.map((ent, i) => (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={ent.name}
              onValueChange={(val) =>
                setEntries(entries.map((x, idx) => (idx === i ? { ...x, name: val } : x)))
              }
            >
              <SelectTrigger className="w-[180px]" data-testid={`select-hist-lab-${i}`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {COMMON_LABS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Value + unit"
              value={ent.value}
              onChange={(e) =>
                setEntries(entries.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))
              }
              className="flex-1"
              data-testid={`input-hist-value-${i}`}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setEntries(entries.filter((_, idx) => idx !== i))}
              className="text-muted-foreground shrink-0"
              data-testid={`button-remove-hist-entry-${i}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setEntries([...entries, { name: "", value: "" }])}
            className="rounded-full"
            data-testid="button-add-hist-row"
          >
            <Plus className="w-4 h-4" />
            Add Row
          </Button>
          <Button
            variant="default"
            onClick={handleAdd}
            disabled={!date || entries.every((e) => !e.value)}
            className="rounded-full"
            data-testid="button-add-history-entry"
          >
            <Check className="w-4 h-4" />
            Save This Time Point
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StepHistory({ history, setHistory, onNext, onBack, setError }: StepHistoryProps) {
  const [extracting, setExtracting] = useState(false);
  const histFileRef = useRef<HTMLInputElement>(null);

  const handleHistImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setExtracting(true);
      setError("");
      try {
        const b64 = await compressImage(file);
        const prompt = `Extract ALL lab values from this historical lab report image.
Return ONLY a valid JSON array: [{"name":"LabName","value":"X unit"}]`;
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, imageBase64: b64 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
        const m = data.result.match(/\[[\s\S]*?\]/);
        if (m) {
          const parsed = JSON.parse(m[0]) as LabEntry[];
          const dateLabel = `Report (${new Date().toLocaleDateString()})`;
          setHistory([...history, { date: dateLabel, labs: parsed }]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Historical extraction failed");
      } finally {
        setExtracting(false);
        if (histFileRef.current) histFileRef.current.value = "";
      }
    },
    [history, setHistory, setError]
  );

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Your Lab History</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Trends tell a better story than a single snapshot
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm text-muted-foreground">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <span>Adding past lab results helps us spot trends — like whether your numbers are improving, stable, or need attention. This step is optional but very helpful.</span>
          </div>

          <div className="border-2 border-dashed border-primary/20 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Upload a past lab report</p>
              <p className="text-xs text-muted-foreground">We'll extract the values automatically</p>
            </div>
            <div>
              <input
                ref={histFileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleHistImageUpload}
                className="hidden"
                data-testid="input-hist-file-upload"
              />
              <Button
                variant="secondary"
                onClick={() => histFileRef.current?.click()}
                disabled={extracting}
                className="rounded-full"
                data-testid="button-upload-hist-file"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <HistoryEntryForm onAdd={(h) => setHistory([...history, h])} />

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Saved Records
              <Badge variant="secondary" className="rounded-full">{history.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 border border-border/50"
                data-testid={`row-history-${i}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{h.date}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {h.labs.map((l) => `${l.name}: ${l.value}`).join(", ")}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setHistory(history.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground shrink-0"
                  data-testid={`button-remove-history-${i}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="pt-1">
        <Button
          variant="ghost"
          onClick={() => setHistory([...DEMO_HISTORY])}
          className="text-muted-foreground"
          data-testid="button-load-demo-history"
        >
          <FlaskConical className="w-4 h-4" />
          Try Demo History
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="rounded-full" data-testid="button-back-step3">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={onNext} className="rounded-full px-5" data-testid="button-next-step3">
          Next: Review
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
