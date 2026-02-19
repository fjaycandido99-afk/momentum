'use client'

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  labels?: string[]
}

export function ProgressIndicator({ currentStep, totalSteps, labels }: ProgressIndicatorProps) {
  const progress = ((currentStep) / totalSteps) * 100

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        className="relative h-1 bg-white/10 rounded-full overflow-hidden"
      >
        <div
          className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex justify-between mt-3">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
          >
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < currentStep
                  ? 'bg-white'
                  : i === currentStep
                  ? 'bg-white animate-dot-pulse'
                  : 'bg-white/20'
              }`}
            />
            {labels?.[i] && (
              <span className={`text-[10px] mt-1 ${
                i <= currentStep ? 'text-white/85' : 'text-white/50'
              }`}>
                {labels[i]}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Step count */}
      <p className="text-center text-white/60 text-xs mt-2">
        Step {currentStep + 1} of {totalSteps}
      </p>
    </div>
  )
}
