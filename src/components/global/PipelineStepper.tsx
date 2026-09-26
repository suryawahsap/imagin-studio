import { Fragment } from "react";

export interface PipelineStep {
  id: number;
  label: string;
}

export interface PipelineStepperProps {
  steps: Array<PipelineStep>;
  activeStep: number;
  accent?: string;
}

export default function PipelineStepper({ steps, activeStep }: PipelineStepperProps) {
  return (
    <div className="flex items-center justify-between gap-1 w-full bg-[var(--color-bg-card)] border border-[var(--color-border-color)] rounded-xl px-4 py-2.5">
      {steps.map((step, i) => {
        const isDone = i < activeStep;
        const isActive = i === activeStep;
        return (
          <Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  isActive || isDone
                    ? "bg-[var(--color-accent-gold)] text-black shadow-sm font-black"
                    : "text-[var(--color-text-secondary)] font-medium"
                }`}
              >
                {step.id}
              </div>
              <span
                className={`text-[11px] font-bold tracking-tight ${
                  isActive || isDone ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]/60 font-normal"
                }`}
              >
                {step.label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}