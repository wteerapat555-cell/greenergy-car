"use client";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, idx) => {
        const num = idx + 1;
        const done = num < currentStep;
        const active = num === currentStep;
        return (
          <div key={idx} className="flex-1 flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-caption font-semibold border-2 transition-colors
                  ${done ? "bg-forest-green border-forest-green text-white" : ""}
                  ${active ? "border-forest-green text-forest-green bg-white" : ""}
                  ${!done && !active ? "border-neutral-gray text-neutral-gray bg-white" : ""}
                `}
              >
                {done ? "✓" : num}
              </div>
              <span
                className={`text-caption mt-1 text-center hidden sm:block ${
                  active ? "text-forest-green font-semibold" : "text-neutral-gray"
                }`}
              >
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  done ? "bg-forest-green" : "bg-neutral-gray"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
