export const ONBOARDING_COPY = {
  preview: {
    title: 'Welcome to Voxu',
    subtitle: 'Everything you need for your daily growth',
  },
  step0: {
    title: 'Design Your Day',
    subtitle: "We'll build a system designed just for you",
    whyMatters: {
      professional: 'Your flow is optimized for peak performance during work hours',
      student: 'Your flow adapts to your class schedule and study rhythm',
    },
  },
  step1: {
    title: 'Choose Your Guide',
    subtitle: 'This voice will be with you every morning',
    tones: {
      calm: {
        label: 'Calm',
        description: 'Like a trusted friend walking beside you',
      },
      direct: {
        label: 'Direct',
        description: 'Like a coach who believes in your potential',
      },
      neutral: {
        label: 'Neutral',
        description: 'Like a guide who respects your autonomy',
      },
    },
  },
  // `step2` — "Set Your Scene" — lived here for a theme/background step the
  // wizard does not have and has never rendered. Removed rather than left
  // looking like a step somebody forgot to wire, because the next person to
  // read this file would try to wire it.
  step3: {
    title: "You're Ready",
    affirmation: "Every day, you're becoming the person you want to be",
    cta: 'Begin Your Journey',
  },
} as const
