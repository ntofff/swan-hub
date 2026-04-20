import { HelpCircle, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
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

const StepRow = ({ step, index }: { step: TutorialStep; index: number }) => (
  <div className="flex gap-3 py-2">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
      {step.icon || index + 1}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">{step.title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
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
          className="tutorial-dialog rounded-2xl p-0"
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
            <DialogClose asChild>
              <button
                type="button"
                className="btn absolute right-3 top-3 h-9 w-9 min-h-9 min-w-9 rounded-full border border-primary/45 bg-primary text-primary-foreground p-0 shadow-md"
                aria-label="Fermer l'aide"
                title="Fermer"
              >
                <X size={17} strokeWidth={2.4} />
              </button>
            </DialogClose>
          </div>

          <div className="tutorial-dialog-content space-y-4 p-4">
            <section>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles size={15} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">Le plus simple</h3>
                  <p className="text-xs text-muted-foreground">Ce qu'il faut retenir pour utiliser l'outil vite.</p>
                </div>
              </div>
              <div className="mt-2 divide-y divide-border/70">
                {simpleSteps.map((step, index) => (
                  <StepRow key={`${step.title}-${index}`} step={step} index={index} />
                ))}
              </div>
            </section>

            {hasCompleteMode && (
              <section className="rounded-xl border border-border bg-secondary/35 p-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Fonctions utiles</h3>
                  <p className="text-xs text-muted-foreground">À utiliser seulement si vous en avez besoin.</p>
                </div>
                <div className="mt-2 grid gap-2">
                  {completeSteps!.map((step, index) => (
                    <div key={`${step.title}-${index}`} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-bold text-primary">{step.icon || index + 1}</span>
                      <span><strong className="text-foreground">{step.title}</strong> : {step.text}</span>
                    </div>
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
