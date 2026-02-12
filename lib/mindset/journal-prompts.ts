import type { MindsetId } from './types'

export interface MindsetJournalPrompts {
  prompt1: { label: string; placeholder: string; icon: 'sparkles' | 'heart' | 'target' }
  prompt2: { label: string; placeholder: string; icon: 'sparkles' | 'heart' | 'target' }
  prompt3: { label: string; placeholder: string; icon: 'sparkles' | 'heart' | 'target' }
}

export const MINDSET_JOURNAL_PROMPTS: Record<MindsetId, MindsetJournalPrompts> = {
  stoic: {
    prompt1: {
      label: 'What was within your control today?',
      placeholder: 'Today I controlled...',
      icon: 'sparkles',
    },
    prompt2: {
      label: 'What did you endure with grace?',
      placeholder: 'I faced this challenge...',
      icon: 'heart',
    },
    prompt3: {
      label: "Tomorrow's virtue to practice",
      placeholder: 'Tomorrow I will practice...',
      icon: 'target',
    },
  },
  existentialist: {
    prompt1: {
      label: 'What choice defined you today?',
      placeholder: 'I chose to...',
      icon: 'sparkles',
    },
    prompt2: {
      label: 'Where did you find meaning?',
      placeholder: 'I found meaning in...',
      icon: 'heart',
    },
    prompt3: {
      label: 'What will you create tomorrow?',
      placeholder: 'Tomorrow I will create...',
      icon: 'target',
    },
  },
  cynic: {
    prompt1: {
      label: 'What unnecessary thing did you let go of?',
      placeholder: 'I let go of...',
      icon: 'sparkles',
    },
    prompt2: {
      label: 'What truth did you face today?',
      placeholder: 'The honest truth is...',
      icon: 'heart',
    },
    prompt3: {
      label: 'What illusion will you challenge tomorrow?',
      placeholder: 'Tomorrow I will question...',
      icon: 'target',
    },
  },
  hedonist: {
    prompt1: {
      label: 'What brought you genuine joy today?',
      placeholder: 'I savored...',
      icon: 'sparkles',
    },
    prompt2: {
      label: 'What simple pleasure are you grateful for?',
      placeholder: "I'm grateful for...",
      icon: 'heart',
    },
    prompt3: {
      label: 'What experience will you savor tomorrow?',
      placeholder: 'Tomorrow I will enjoy...',
      icon: 'target',
    },
  },
  samurai: {
    prompt1: {
      label: 'Where did you show discipline today?',
      placeholder: 'I showed discipline by...',
      icon: 'sparkles',
    },
    prompt2: {
      label: 'What skill did you sharpen?',
      placeholder: 'I trained in...',
      icon: 'heart',
    },
    prompt3: {
      label: "Tomorrow's training focus",
      placeholder: 'Tomorrow I will master...',
      icon: 'target',
    },
  },
  scholar: {
    prompt1: {
      label: 'What did you learn today?',
      placeholder: 'Today I learned...',
      icon: 'sparkles',
    },
    prompt2: {
      label: 'What are you grateful for?',
      placeholder: "I'm grateful for...",
      icon: 'heart',
    },
    prompt3: {
      label: "Tomorrow's intention",
      placeholder: 'Tomorrow I will...',
      icon: 'target',
    },
  },
}
