import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Upload, FlaskConical, Loader2, Beaker, ChevronRight, Camera, FileText, Info, ChevronsUpDown, Check } from "lucide-react";
import type { LabEntry } from "@shared/schema";
import { COMMON_LABS, TRANSPLANT_RANGES } from "@shared/schema";
import { DEMO_LABS } from "@/lib/constants";
import { buildExtractionPrompt } from "@/lib/prompts";
import { compressImage } from "@/lib/image-utils";

function LabNameCombobox({
  value,
  onChange,
  open,
  onOpenChange,
  index,
}: {
  value: string;
  onChange: (val: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: number;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? COMMON_LABS.filter((n) => n.toLowerCase().includes(search.toLowerCase()))
    : COMMON_LABS;

  const showCustomOption = search.length > 0 && !COMMON_LABS.some((n) => n.toLowerCase() === search.toLowerCase());

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between font-normal"
          data-testid={`select-lab-name-${index}`}
        >
          <span className="truncate">
            {value || "Select or type lab..."}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            ref={inputRef}
            placeholder="Search or type a lab name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
            data-testid={`input-lab-search-${index}`}
            autoFocus
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {showCustomOption && (
            <button
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm text-left text-primary font-medium cursor-pointer"
              onClick={() => {
                onChange(search.trim());
                setSearch("");
                onOpenChange(false);
              }}
              data-testid={`option-custom-lab-${index}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Use "{search.trim()}"
            </button>
          )}
          {filtered.map((name) => (
            <button
              key={name}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm text-left cursor-pointer"
              onClick={() => {
                onChange(name);
                setSearch("");
                onOpenChange(false);
              }}
              data-testid={`option-lab-${name.replace(/\s+/g, "-").toLowerCase()}-${index}`}
            >
              <Check className={`w-3.5 h-3.5 shrink-0 ${value === name ? "opacity-100 text-primary" : "opacity-0"}`} />
              <span className="flex-1">{name}</span>
              {TRANSPLANT_RANGES[name] && (
                <span className="text-xs text-muted-foreground">
                  {TRANSPLANT_RANGES[name].unit}
                </span>
              )}
            </button>
          ))}
          {filtered.length === 0 && !showCustomOption && (
            <p className="text-xs text-muted-foreground text-center py-3">No matching labs found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface StepLabsProps {
  labs: LabEntry[];
  setLabs: (labs: LabEntry[]) => void;
  onNext: () => void;
  setError: (err: string) => void;
}

export function StepLabs({ labs, setLabs, onNext, setError }: StepLabsProps) {
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [openPopover, setOpenPopover] = useState<number | null>(null);

  const addLab = () => setLabs([...labs, { name: "", value: "" }]);
  const updateLab = (i: number, field: "name" | "value", val: string) => {
    setLabs(labs.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)));
  };
  const removeLab = (i: number) => setLabs(labs.filter((_, idx) => idx !== i));

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setExtracting(true);
      setError("");
      try {
        const b64 = await compressImage(file);
        const prompt = buildExtractionPrompt();
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, imageBase64: b64 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
        const raw = data.result;
        const jsonMatch = raw.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as LabEntry[];
          setLabs(parsed.filter((l) => l.name && l.value));
        } else {
          setError("Could not parse lab values from image. Try a clearer photo or enter manually.");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Extraction failed");
      } finally {
        setExtracting(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [setLabs, setError]
  );

  const handleNext = () => {
    if (labs.length === 0) {
      setError("Please add at least one lab value to continue.");
      return;
    }
    const valid = labs.filter((l) => l.name && l.value);
    if (valid.length === 0) {
      setError("Please fill in at least one lab name and value.");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Upload Your Lab Report</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Snap a photo or upload a file — we'll read it for you
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center bg-primary/[0.02] hover:bg-primary/[0.04] transition-colors">
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleImageUpload}
              className="hidden"
              data-testid="input-file-upload"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                {extracting ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-primary" />
                )}
              </div>
              <Button
                variant="default"
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
                data-testid="button-upload-file"
                className="rounded-full px-6"
              >
                {extracting ? "Reading your lab report..." : "Choose Photo or File"}
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="w-3 h-3" />
                <span>JPG, PNG, or PDF — large files are automatically resized</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 px-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          or type your values
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10">
              <Beaker className="w-5 h-5 text-accent" />
            </div>
            <CardTitle className="text-base">Your Lab Values</CardTitle>
          </div>
          {labs.length > 0 && (
            <Badge variant="secondary" className="rounded-full">{labs.length} value{labs.length !== 1 ? "s" : ""}</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {labs.length === 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Add your lab values below, or upload a photo of your lab report above. You can also load demo data to see how it works.</span>
            </div>
          )}

          {labs.map((lab, i) => {
            return (
              <div key={i} className="flex items-center gap-2" data-testid={`row-lab-${i}`}>
                <LabNameCombobox
                  value={lab.name}
                  onChange={(val) => updateLab(i, "name", val)}
                  open={openPopover === i}
                  onOpenChange={(open) => setOpenPopover(open ? i : null)}
                  index={i}
                />
                <Input
                  placeholder={
                    lab.name && TRANSPLANT_RANGES[lab.name]
                      ? `e.g. ${TRANSPLANT_RANGES[lab.name].healthy} ${TRANSPLANT_RANGES[lab.name].unit}`
                      : "e.g. 1.6 mg/dL"
                  }
                  value={lab.value}
                  onChange={(e) => updateLab(i, "value", e.target.value)}
                  className="flex-1"
                  data-testid={`input-lab-value-${i}`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeLab(i)}
                  className="text-muted-foreground shrink-0"
                  data-testid={`button-remove-lab-${i}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <Button variant="outline" onClick={addLab} className="rounded-full" data-testid="button-add-lab">
              <Plus className="w-4 h-4" />
              Add Lab Value
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLabs([...DEMO_LABS])}
              className="text-muted-foreground"
              data-testid="button-load-demo"
            >
              <FlaskConical className="w-4 h-4" />
              Try Demo Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={handleNext} disabled={labs.length === 0} className="rounded-full px-6" data-testid="button-next-step1">
          Next: Tell Us About You
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
