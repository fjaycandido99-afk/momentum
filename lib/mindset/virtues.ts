import type { MindsetId } from './types'

export interface Virtue {
  name: string
  description: string
  practices: string[]
}

export const MINDSET_VIRTUES: Record<MindsetId, Virtue[]> = {
  stoic: [
    {
      name: 'Wisdom',
      description: 'The ability to navigate complex situations with clear judgment and understanding of what truly matters.',
      practices: [
        'Before reacting, pause and ask: "Is this within my control?"',
        'Read one passage from a philosophical text and reflect on it.',
        'Identify one assumption you made today and question it.',
      ],
    },
    {
      name: 'Courage',
      description: 'Acting rightly despite fear, discomfort, or social pressure.',
      practices: [
        'Do one thing today that makes you uncomfortable but is right.',
        'Speak a truth you have been avoiding.',
        'Face a fear you have been postponing.',
      ],
    },
    {
      name: 'Justice',
      description: 'Treating others with fairness, kindness, and respect regardless of their status.',
      practices: [
        'Help someone today without expecting anything in return.',
        'Listen fully to someone you disagree with before responding.',
        'Acknowledge someone whose contribution often goes unnoticed.',
      ],
    },
    {
      name: 'Temperance',
      description: 'Self-restraint and moderation in all things — desires, emotions, and reactions.',
      practices: [
        'Skip one indulgence you normally reach for automatically.',
        'When provoked, count to ten before responding.',
        'Practice eating one meal today slowly and mindfully.',
      ],
    },
    {
      name: 'Discipline',
      description: 'Consistent commitment to your principles regardless of mood or circumstance.',
      practices: [
        'Complete your most important task before checking your phone.',
        'Follow through on one commitment you have been delaying.',
        'Maintain your routine even when you don\'t feel motivated.',
      ],
    },
  ],
  existentialist: [
    {
      name: 'Authenticity',
      description: 'Living in alignment with your true self rather than conforming to others\' expectations.',
      practices: [
        'Identify one way you act differently to please others and choose honesty instead.',
        'Express an opinion you usually keep quiet about.',
        'Make one choice today based purely on what feels true to you.',
      ],
    },
    {
      name: 'Freedom',
      description: 'Embracing your radical freedom to choose and taking full ownership of your life direction.',
      practices: [
        'Identify one area where you say "I have to" and reframe it as "I choose to."',
        'Make a decision you have been delegating to others.',
        'Do something spontaneous that breaks your usual pattern.',
      ],
    },
    {
      name: 'Responsibility',
      description: 'Accepting that you are the author of your life, without blaming circumstances or others.',
      practices: [
        'Own one outcome today without deflecting blame.',
        'Ask "What is my role in this situation?" before looking outward.',
        'Apologize for something without adding excuses.',
      ],
    },
    {
      name: 'Engagement',
      description: 'Fully investing in life despite its absurdity, choosing meaning through action.',
      practices: [
        'Throw yourself completely into one task with full attention.',
        'Start a project you care about without worrying about the outcome.',
        'Have a deep conversation instead of small talk.',
      ],
    },
    {
      name: 'Commitment',
      description: 'Making and honoring your choices even when uncertainty and doubt arise.',
      practices: [
        'Follow through on a promise that has become inconvenient.',
        'Recommit to a value or goal you have been wavering on.',
        'Stay with a difficult emotion instead of distracting yourself.',
      ],
    },
  ],
  cynic: [
    {
      name: 'Self-Sufficiency',
      description: 'Reducing dependence on external things, people, and approval for your well-being.',
      practices: [
        'Go without one comfort you usually rely on today.',
        'Complete a task entirely on your own that you would normally outsource.',
        'Spend time alone without entertainment or distraction.',
      ],
    },
    {
      name: 'Honesty',
      description: 'Speaking truth without sugar-coating, especially when it challenges social norms.',
      practices: [
        'Say "no" to something you would usually agree to out of politeness.',
        'Give honest feedback to someone who asked for your opinion.',
        'Admit one thing to yourself that you have been avoiding.',
      ],
    },
    {
      name: 'Simplicity',
      description: 'Stripping life down to what is essential and finding freedom in having less.',
      practices: [
        'Remove or give away one possession you do not truly need.',
        'Eat a simple meal and notice if your enjoyment decreases — or increases.',
        'Simplify your schedule by removing one non-essential activity.',
      ],
    },
    {
      name: 'Shamelessness',
      description: 'Freedom from concern about others\' judgments, living naturally without pretense.',
      practices: [
        'Do something you normally avoid because of "what others might think."',
        'Wear something comfortable instead of something impressive.',
        'Share an unpopular opinion openly and own it.',
      ],
    },
    {
      name: 'Virtue',
      description: 'Living according to nature and reason, valuing character over convention.',
      practices: [
        'Question one social norm you follow without thinking.',
        'Choose the virtuous action even when no one is watching.',
        'Ask yourself: "Would I do this if no one could see me?"',
      ],
    },
  ],
  hedonist: [
    {
      name: 'Pleasure',
      description: 'Cultivating the art of genuine enjoyment through presence and mindful appreciation.',
      practices: [
        'Fully savor one meal today — taste, texture, aroma.',
        'Spend 10 minutes doing something purely for enjoyment.',
        'Notice three sources of pleasure you usually overlook.',
      ],
    },
    {
      name: 'Moderation',
      description: 'Finding the sweet spot between too much and too little to maximize lasting enjoyment.',
      practices: [
        'Stop eating or drinking before you feel completely full.',
        'Set a time limit on a pleasurable activity to keep it special.',
        'Choose quality over quantity in one area today.',
      ],
    },
    {
      name: 'Friendship',
      description: 'Nurturing deep connections as the highest and most enduring source of pleasure.',
      practices: [
        'Reach out to a friend you haven\'t spoken to recently.',
        'Give someone your full, undivided attention in conversation.',
        'Share a genuine compliment with someone you care about.',
      ],
    },
    {
      name: 'Tranquility',
      description: 'Cultivating inner peace by removing unnecessary anxieties and desires.',
      practices: [
        'Identify one worry that is outside your control and consciously release it.',
        'Spend 5 minutes in quiet stillness without any inputs.',
        'Simplify your to-do list to reduce mental noise.',
      ],
    },
    {
      name: 'Gratitude',
      description: 'Appreciating what you have rather than fixating on what you lack.',
      practices: [
        'Write down three things you enjoyed today.',
        'Thank someone for something specific they did.',
        'Reflect on a pleasure you once wished for that is now part of your daily life.',
      ],
    },
  ],
  samurai: [
    {
      name: 'Honor',
      description: 'Conducting yourself with integrity so your actions match your word and your values.',
      practices: [
        'Keep every promise you make today, no matter how small.',
        'Admit a mistake before anyone else discovers it.',
        'Do the right thing even when the easier path is available.',
      ],
    },
    {
      name: 'Loyalty',
      description: 'Staying devoted to your commitments, your people, and your purpose.',
      practices: [
        'Follow through on a commitment that has become difficult.',
        'Support someone in your circle who is struggling.',
        'Reaffirm your dedication to a long-term goal.',
      ],
    },
    {
      name: 'Courage',
      description: 'Facing challenges head-on with a calm spirit, neither reckless nor hesitant.',
      practices: [
        'Take action on something you have been avoiding out of fear.',
        'Have a difficult conversation you have been postponing.',
        'Train or practice something that challenges your current skill level.',
      ],
    },
    {
      name: 'Respect',
      description: 'Treating others with dignity and treating yourself with the same standard.',
      practices: [
        'Bow — literally or figuratively — to someone who taught you something.',
        'Listen more than you speak in your next conversation.',
        'Treat a routine interaction with care and attention.',
      ],
    },
    {
      name: 'Self-Control',
      description: 'Mastering your impulses, emotions, and reactions through daily discipline.',
      practices: [
        'Resist one impulse today and observe what happens.',
        'Maintain composure in a frustrating situation.',
        'Complete a physical or mental exercise to its full extent without quitting early.',
      ],
    },
  ],
  scholar: [
    {
      name: 'Self-Knowledge',
      description: 'Exploring the depths of your own psyche — conscious and unconscious — to understand who you truly are.',
      practices: [
        'Write down a dream you had recently and reflect on its possible meaning.',
        'Identify a strong emotional reaction you had today and ask what deeper need it reveals.',
        'Notice one pattern in your behavior that repeats and consider its origin.',
      ],
    },
    {
      name: 'Integration',
      description: 'Bringing together the light and shadow aspects of your personality into a more complete whole.',
      practices: [
        'Acknowledge one quality in yourself that you usually try to hide or deny.',
        'Find something valuable in a trait you normally criticize in yourself.',
        'Practice holding two contradictory feelings at once without choosing sides.',
      ],
    },
    {
      name: 'Curiosity',
      description: 'Approaching the unknown with wonder rather than fear, seeking to understand rather than judge.',
      practices: [
        'Read or listen to something from a perspective completely different from your own.',
        'Ask a question today that you are genuinely uncertain about the answer to.',
        'Observe something familiar as if seeing it for the very first time.',
      ],
    },
    {
      name: 'Imagination',
      description: 'Engaging with symbols, myths, and creative vision as pathways to deeper understanding.',
      practices: [
        'Spend five minutes with a piece of art and notice what feelings or memories it evokes.',
        'Write a brief myth or story about a challenge you are currently facing.',
        'Imagine your life as a hero\'s journey — what stage are you in right now?',
      ],
    },
    {
      name: 'Synchronicity',
      description: 'Cultivating awareness of meaningful coincidences and the hidden connections in life.',
      practices: [
        'Notice one unexpected connection between two unrelated events today.',
        'Pay attention to a recurring symbol, number, or theme that keeps appearing in your life.',
        'Before making a decision, pause and ask your intuition what it senses.',
      ],
    },
  ],
  manifestor: [
    {
      name: 'Intention',
      description: 'Setting clear, focused desires and holding them in mind with conviction and feeling.',
      practices: [
        'Write down your primary intention for today and read it aloud with feeling.',
        'Before each task, set a micro-intention for the outcome you want.',
        'Spend five minutes visualizing one goal as if it has already been achieved.',
      ],
    },
    {
      name: 'Belief',
      description: 'Cultivating unwavering faith that your desires are not only possible but inevitable.',
      practices: [
        'Catch one limiting belief today and consciously replace it with an empowering one.',
        'Recall a time something "impossible" happened in your life and feel that certainty again.',
        'Affirm "It is done" about one desire and hold the feeling throughout the day.',
      ],
    },
    {
      name: 'Alignment',
      description: 'Matching your emotional state to the reality you want to experience.',
      practices: [
        'Notice your dominant emotion right now — does it match who you want to become?',
        'Choose one activity today purely because it raises your vibration.',
        'Before reacting to a situation, ask: "What would the version of me who already has this feel?"',
      ],
    },
    {
      name: 'Gratitude',
      description: 'Appreciating what you have and what is coming as if it has already arrived.',
      practices: [
        'Write three things you are grateful for as if they just appeared today for the first time.',
        'Thank the universe for one desire as though it has already manifested.',
        'End the day by acknowledging three things that went right, no matter how small.',
      ],
    },
    {
      name: 'Surrender',
      description: 'Releasing attachment to the "how" and trusting the process of manifestation.',
      practices: [
        'Identify one outcome you are gripping tightly and consciously release control over how it arrives.',
        'When anxiety arises about a goal, repeat: "I trust the timing of my life."',
        'Practice doing nothing productive for ten minutes and notice what surfaces.',
      ],
    },
  ],
  hustler: [
    {
      name: 'Discipline',
      description: 'Showing up and doing the work regardless of how you feel.',
      practices: [
        'Complete your hardest task first thing in the morning.',
        'Follow your schedule exactly as planned — no negotiations with yourself.',
        'Do one thing today you do not feel like doing, simply because you committed to it.',
      ],
    },
    {
      name: 'Accountability',
      description: 'Taking full ownership of your results — no excuses, no blame, no victim mentality.',
      practices: [
        'Look in the mirror and honestly assess one area where you have been slacking.',
        'Own one failure or shortcoming today without deflecting to anyone else.',
        'Write down the result you got today and the effort you actually put in — be brutally honest.',
      ],
    },
    {
      name: 'Mental Toughness',
      description: 'Building the capacity to endure discomfort, push through resistance, and keep going.',
      practices: [
        'When you want to quit a task, do ten more minutes before stopping.',
        'Take a cold shower or do something physically uncomfortable on purpose.',
        'When your mind says "I can\'t," respond with "Watch me."',
      ],
    },
    {
      name: 'Execution',
      description: 'Bias toward action over planning, talking, or waiting for the perfect moment.',
      practices: [
        'Pick one thing you have been overthinking and take the first action within the next hour.',
        'Set a timer for 25 minutes and work with zero distractions.',
        'At the end of the day, count the number of things you did versus the number you planned.',
      ],
    },
    {
      name: 'Relentlessness',
      description: 'Refusing to stop, slow down, or give up until the mission is complete.',
      practices: [
        'Finish something today that you started and abandoned before.',
        'When faced with a setback, immediately ask: "What is my next move?"',
        'Extend one work session beyond what feels comfortable — push the limit.',
      ],
    },
  ],
}
