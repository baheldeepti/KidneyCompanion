import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Heart,
  Upload,
  User,
  TrendingUp,
  Sparkles,
  Volume2,
  Shield,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Camera,
  Keyboard,
  FlaskConical,
  CircleCheck,
  FileText,
  Lightbulb,
} from "lucide-react";

const STORAGE_KEY = "kidneycompanion_onboarding_seen";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    id: "welcome",
    icon: Heart,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Welcome to KidneyCompanion",
    subtitle: "Your caring guide to understanding lab results",
    description:
      "After a kidney transplant, lab work can feel overwhelming. KidneyCompanion uses advanced medical AI to help you understand your numbers in plain, reassuring language — so you can walk into your next appointment feeling informed and confident.",
    highlights: [
      { icon: Shield, text: "Private and secure — nothing is saved" },
      { icon: Sparkles, text: "Powered by MedGemma medical AI" },
      { icon: Volume2, text: "Listen to your results read aloud" },
    ],
    hasVideo: true,
  },
  {
    id: "step1",
    icon: Upload,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Step 1: Enter Your Labs",
    subtitle: "Three easy ways to get started",
    description: "",
    steps: [
      {
        stepIcon: Camera,
        title: "Upload a photo",
        text: "Snap a picture of your lab report — our AI reads it and fills in the values automatically.",
      },
      {
        stepIcon: Keyboard,
        title: "Type them in",
        text: "Search from 19 common transplant labs or type any lab name. MedGemma knows them all.",
      },
      {
        stepIcon: FlaskConical,
        title: "Try demo data",
        text: "Not sure how it works? Load sample lab values to see KidneyCompanion in action.",
      },
    ],
  },
  {
    id: "step2",
    icon: User,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Step 2: Tell Us About You",
    subtitle: "Optional but helpful",
    description:
      "Share a little about yourself — your age, how long since your transplant, and what medications you take. This helps the AI tailor its explanation to your specific situation.",
    note: "Every field is optional. Your info stays on this page and is never stored.",
  },
  {
    id: "step3",
    icon: TrendingUp,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Step 3: Add Past Results",
    subtitle: "Trends tell a better story",
    description:
      "If you have previous lab reports, you can add them here. This lets the AI spot trends — like whether your creatinine is improving, stable, or needs attention. One snapshot is good, but trends are even better.",
    note: "This step is optional. You can always come back and add history later.",
  },
  {
    id: "results",
    icon: Sparkles,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Your Personalized Results",
    subtitle: "Clear, caring explanations just for you",
    description: "",
    features: [
      {
        featureIcon: CircleCheck,
        featureColor: "text-green-600",
        title: "Color-coded lab cards",
        text: "See at a glance which values are within target (green) and which to discuss with your team (amber).",
      },
      {
        featureIcon: FileText,
        featureColor: "text-primary",
        title: "Detailed AI explanation",
        text: "MedGemma explains what each lab measures, why it matters for your transplant, and how your medications may affect it.",
      },
      {
        featureIcon: Volume2,
        featureColor: "text-primary",
        title: "Listen to your summary",
        text: "Tap 'Listen' to hear the key highlights read aloud by Rachel — our warm, caring voice assistant.",
      },
      {
        featureIcon: Lightbulb,
        featureColor: "text-amber-500",
        title: "Personalized recommendations",
        text: "Get 4-6 tailored suggestions based on your specific values, history, and medications.",
      },
    ],
  },
  {
    id: "ready",
    icon: Heart,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "You're Ready!",
    subtitle: "Let's look at your labs together",
    description:
      "Remember — KidneyCompanion is here to help you understand, not to replace your doctor. Always share your results and questions with your transplant team. You're doing a wonderful job by being involved in your care.",
    cta: true,
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [current, setCurrent] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `onboarding-title-${current}`;
  const slide = slides[current];
  const isLast = current === slides.length - 1;
  const isFirst = current === 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();
  }, [current]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleComplete();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="onboarding-overlay"
      ref={dialogRef}
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-primary/10">
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div className="flex items-center gap-2" role="tablist" aria-label="Tour slides">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                role="tab"
                aria-selected={i === current}
                aria-label={`Slide ${i + 1}: ${s.title}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-8 bg-primary" : i < current ? "w-4 bg-primary/40" : "w-4 bg-muted"
                }`}
                data-testid={`button-onboarding-dot-${i}`}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleComplete}
            className="text-muted-foreground text-xs"
            data-testid="button-onboarding-skip"
          >
            Skip tour
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <CardContent className="px-6 py-6 space-y-5">
          {slide.hasVideo && (
            <div className="relative rounded-xl overflow-hidden bg-muted aspect-video">
              <video
                src={new URL("../assets/videos/onboarding-welcome.mp4", import.meta.url).href}
                autoPlay
                loop
                muted
                playsInline
                onLoadedData={() => setVideoLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-500 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
                data-testid="video-onboarding-welcome"
              />
              {!videoLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Play className="w-5 h-5 text-primary" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl ${slide.iconBg} flex items-center justify-center shrink-0`}>
              <slide.icon className={`w-6 h-6 ${slide.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-xl font-bold text-foreground" data-testid="text-onboarding-title">{slide.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{slide.subtitle}</p>
            </div>
          </div>

          {slide.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{slide.description}</p>
          )}

          {slide.highlights && (
            <div className="flex flex-wrap gap-3">
              {slide.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
                  <h.icon className="w-3.5 h-3.5 text-primary" />
                  {h.text}
                </div>
              ))}
            </div>
          )}

          {slide.steps && (
            <div className="space-y-3">
              {slide.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <s.stepIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {slide.features && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {slide.features.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <f.featureIcon className={`w-4 h-4 ${f.featureColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {slide.note && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              {slide.note}
            </div>
          )}

          {slide.cta && (
            <div className="pt-2">
              <Button
                onClick={handleComplete}
                className="w-full rounded-full py-6 text-base"
                data-testid="button-onboarding-start"
              >
                <Sparkles className="w-5 h-5" />
                Get Started — Enter My Labs
              </Button>
            </div>
          )}
        </CardContent>

        <div className="px-6 pb-5 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrent(current - 1)}
            disabled={isFirst}
            className="rounded-full"
            data-testid="button-onboarding-prev"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <span className="text-xs text-muted-foreground" aria-live="polite">
            {current + 1} of {slides.length}
          </span>

          {!isLast ? (
            <Button
              onClick={() => setCurrent(current + 1)}
              className="rounded-full"
              data-testid="button-onboarding-next"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="rounded-full"
              data-testid="button-onboarding-done"
            >
              Let's Go
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShowOnboarding(true);
    }
  }, []);

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    completeOnboarding: () => setShowOnboarding(false),
    resetOnboarding,
  };
}
