import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, FlaskConical, ChevronLeft, ChevronRight, SkipForward, Lock, Info } from "lucide-react";
import type { PatientContext } from "@shared/schema";
import { DEMO_CTX } from "@/lib/constants";

interface StepPatientProps {
  ctx: PatientContext;
  setCtx: (ctx: PatientContext) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function StepPatient({ ctx, setCtx, onNext, onBack, onSkip }: StepPatientProps) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Tell Us a Little About You</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                This helps us personalize your explanation — every field is optional
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm text-muted-foreground">
            <Lock className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <span>Your information stays on this page and is only used to tailor your explanation. Nothing is saved or stored.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="age" className="text-sm font-medium">Your age</Label>
              <Input
                id="age"
                type="number"
                placeholder="e.g. 54"
                value={ctx.age || ""}
                onChange={(e) =>
                  setCtx({ ...ctx, age: parseInt(e.target.value) || undefined })
                }
                data-testid="input-age"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sex" className="text-sm font-medium">Sex</Label>
              <Select
                value={ctx.sex || ""}
                onValueChange={(val) =>
                  setCtx({ ...ctx, sex: val === "not-specified" ? undefined : val })
                }
              >
                <SelectTrigger data-testid="select-sex">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-specified">Not specified</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="months" className="text-sm font-medium">Months since transplant</Label>
              <Input
                id="months"
                type="number"
                placeholder="e.g. 8"
                value={ctx.monthsPostTransplant || ""}
                onChange={(e) =>
                  setCtx({
                    ...ctx,
                    monthsPostTransplant: parseInt(e.target.value) || undefined,
                  })
                }
                data-testid="input-months-post-transplant"
              />
              <p className="text-xs text-muted-foreground">Helps us understand where you are in your journey</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="donor" className="text-sm font-medium">Donor type</Label>
              <Select
                value={ctx.donorType || ""}
                onValueChange={(val) =>
                  setCtx({ ...ctx, donorType: val === "not-specified" ? undefined : val })
                }
              >
                <SelectTrigger data-testid="select-donor-type">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-specified">Not specified</SelectItem>
                  <SelectItem value="Living donor">Living donor</SelectItem>
                  <SelectItem value="Deceased donor">Deceased donor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="medications" className="text-sm font-medium">Current medications</Label>
              <Input
                id="medications"
                placeholder="e.g. Tacrolimus, Mycophenolate, Prednisone"
                value={ctx.medications || ""}
                onChange={(e) =>
                  setCtx({ ...ctx, medications: e.target.value || undefined })
                }
                data-testid="input-medications"
              />
              <p className="text-xs text-muted-foreground">Knowing your meds helps us explain how they might affect your labs</p>
            </div>
          </div>

          <div className="pt-1">
            <Button
              variant="ghost"
              onClick={() => setCtx({ ...DEMO_CTX })}
              className="text-muted-foreground"
              data-testid="button-load-demo-patient"
            >
              <FlaskConical className="w-4 h-4" />
              Try Demo Patient
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="rounded-full" data-testid="button-back-step2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground" data-testid="button-skip-to-analyze">
            <SkipForward className="w-4 h-4" />
            Skip to Review
          </Button>
          <Button onClick={onNext} className="rounded-full px-5" data-testid="button-next-step2">
            Next: History
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
