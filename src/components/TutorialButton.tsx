import { HelpCircle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export interface TutorialStep {
  title: string;
  text: string;
  icon?: string;
}

interface TutorialButtonProps {
  title: string;
  intro: string;
  simpleSteps: TutorialStep[];
  completeSteps?: TutorialStep[];
  tips?: string[];
}

const StepCard = ({ step, index }: { step: TutorialStep; index: number }) => (
  <div className="flex gap-3 rounded-xl border border-border bg-secondary/45 p-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-bold text-primary">
      {step.icon || index + 1}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">{step.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
    </div>
  </div>
);

export const TutorialButton = ({
  title,
  intro,
  simpleSteps,
  completeSteps,
  tips = [],
}: TutorialButtonProps) => {
  const [open, setOpen] = useState(false);
  const hasCompleteMode = Boolean(completeSteps?.length);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn shrink-0 border-2 border-primary/45 bg-primary/15 p-0 text-base font-black text-primary shadow-sm transition-all active:scale-95"
        style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, borderRadius: 9999 }}
        aria-label={`Aide ${title}`}
        title={`Aide ${title}`}
      >
        ?
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[440px] overflow-y-auto rounded-2xl p-0 sm:max-h-[88vh]"
          style={{ left: "50%", right: "auto", top: "50%", transform: "translate(-50%, -50%)" }}
        >
          <div className="sticky top-0 z-10 border-b border-border bg-background/95 p-4 backdrop-blur">
            <DialogHeader className="pr-10">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <HelpCircle size={20} className="text-primary" />
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                {intro}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 p-4">
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles size={15} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">Mode simple</h3>
                  <p className="text-xs text-muted-foreground">Le chemin le plus rapide sur le terrain.</p>
                </div>
              </div>
              <div className="space-y-2">
                {simpleSteps.map((step, index) => (
                  <StepCard key={`${step.title}-${index}`} step={step} index={index} />
                ))}
              </div>
            </section>

            {hasCompleteMode && (
              <section className="space-y-2">
                <div>
                  <h3 className="text-base font-bold text-foreground">Mode complet</h3>
                  <p className="text-xs text-muted-foreground">À ouvrir seulement quand vous voulez aller plus loin.</p>
                </div>
                <div className="space-y-2">
                  {completeSteps!.map((step, index) => (
                    <StepCard key={`${step.title}-${index}`} step={step} index={index} />
                  ))}
                </div>
              </section>
            )}

            {tips.length > 0 && (
              <section className="rounded-xl border border-primary/20 bg-primary/10 p-3">
                <h3 className="text-sm font-bold text-foreground">Repères utiles</h3>
                <div className="mt-2 space-y-2">
                  {tips.map((tip) => (
                    <p key={tip} className="text-sm leading-relaxed text-muted-foreground">
                      {tip}
                    </p>
                  ))}
                </div>
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
