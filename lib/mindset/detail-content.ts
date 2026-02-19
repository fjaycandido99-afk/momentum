import type { MindsetId } from './types'

export interface MindsetPrinciple {
  title: string
  description: string
}

export interface MindsetDetail {
  figureName: string
  figureDates: string
  figureTitle: string
  quote: string
  overview: string
  principles: MindsetPrinciple[]
  appExperience: string[]
}

export const MINDSET_DETAILS: Record<MindsetId, MindsetDetail> = {
  stoic: {
    figureName: 'Marcus Aurelius',
    figureDates: '121 – 180 AD',
    figureTitle: 'Roman Emperor & Philosopher',
    quote: 'You have power over your mind — not outside events. Realize this, and you will find strength.',
    overview:
      'Stoicism teaches that we cannot control external events, only our responses to them. By focusing on virtue, reason, and inner peace, we build resilience against life\'s chaos. The Stoic path transforms every daily challenge into an opportunity for growth — not by avoiding difficulty, but by meeting it with clarity and composure.',
    principles: [
      {
        title: 'Dichotomy of Control',
        description: 'Focus only on what is within your power — your thoughts, actions, and responses. Release everything else.',
      },
      {
        title: 'Amor Fati',
        description: 'Love your fate. Embrace everything that happens as necessary and meaningful for your growth.',
      },
      {
        title: 'Memento Mori',
        description: 'Remember that life is finite. Use this awareness to appreciate each day and act with urgency.',
      },
      {
        title: 'Virtue as the Highest Good',
        description: 'Character matters more than circumstances. Courage, wisdom, justice, and temperance guide every choice.',
      },
    ],
    appExperience: [
      'AI coach speaks with calm, measured wisdom — like a mentor who has weathered many storms',
      'Quotes drawn from Marcus Aurelius, Seneca, and Epictetus',
      'Journal prompts focus on emotional control, virtue, and inner strength',
      'Geometric, structured background visuals',
    ],
  },
  existentialist: {
    figureName: 'Albert Camus',
    figureDates: '1913 – 1960',
    figureTitle: 'Writer & Philosopher',
    quote: 'In the midst of winter, I found there was, within me, an invincible summer.',
    overview:
      'Existentialism holds that we are radically free — and with that freedom comes the responsibility to create our own meaning. Rather than despairing at life\'s absurdity, we choose to live fully, authentically, and on our own terms. This path is for those who refuse to live by someone else\'s script.',
    principles: [
      {
        title: 'Radical Freedom',
        description: 'You are free to choose who you become. No excuse, no determinism — only your choices define you.',
      },
      {
        title: 'Authenticity',
        description: 'Live by your own values, not the expectations of society, family, or convention.',
      },
      {
        title: 'Embrace the Absurd',
        description: 'Life has no inherent meaning — and that is liberating. You get to write the story.',
      },
      {
        title: 'Radical Responsibility',
        description: 'Every choice you make is yours alone. Own your decisions completely, without regret.',
      },
    ],
    appExperience: [
      'AI coach speaks with raw honesty and poetic depth — illuminating, never sugarcoating',
      'Quotes from Camus, Sartre, Simone de Beauvoir, and Kierkegaard',
      'Journal prompts explore meaning-making, freedom, and authentic choices',
      'Fluid, organic background visuals',
    ],
  },
  cynic: {
    figureName: 'Diogenes of Sinope',
    figureDates: '412 – 323 BC',
    figureTitle: 'The Original Rebel Philosopher',
    quote: 'It is the privilege of the gods to want nothing, and of godlike men to want little.',
    overview:
      'Cynicism strips away the unnecessary — wealth, status, social approval — to reveal what truly matters. By questioning everything society tells you to value, you discover a freedom that no material possession can provide. Diogenes lived in a barrel and mocked Alexander the Great. That energy.',
    principles: [
      {
        title: 'Radical Simplicity',
        description: 'The less you need, the freer you become. Strip away what doesn\'t serve you.',
      },
      {
        title: 'Parrhesia',
        description: 'Speak truth without fear. Say what needs to be said, even when it\'s uncomfortable.',
      },
      {
        title: 'Live According to Nature',
        description: 'Strip away artifice. Reject the unnecessary complexity that society imposes on you.',
      },
      {
        title: 'Question Everything',
        description: 'No convention is sacred. Challenge assumptions, including your own.',
      },
    ],
    appExperience: [
      'AI coach is blunt, witty, and cuts through your excuses like a sharp friend',
      'Quotes from Diogenes, Antisthenes, and Crates of Thebes',
      'Journal prompts challenge your assumptions and strip away pretense',
      'Minimal, clean background visuals',
    ],
  },
  hedonist: {
    figureName: 'Epicurus',
    figureDates: '341 – 270 BC',
    figureTitle: 'Philosopher of Pleasure & Peace',
    quote: 'Do not spoil what you have by desiring what you have not; remember that what you now have was once among the things you only hoped for.',
    overview:
      'True Epicurean philosophy isn\'t about excess — it\'s about finding deep joy in simple pleasures, meaningful friendships, and peace of mind. By distinguishing necessary desires from empty ones, you discover lasting contentment. Epicurus taught in a garden, surrounded by friends. That\'s the life.',
    principles: [
      {
        title: 'Ataraxia',
        description: 'Cultivate unshakable peace of mind. Tranquility is the highest form of pleasure.',
      },
      {
        title: 'Simple Pleasures',
        description: 'The greatest joys are already here — good food, warm sun, a conversation with a friend.',
      },
      {
        title: 'Deep Friendship',
        description: 'Of all the things wisdom provides for living a happy life, the greatest is friendship.',
      },
      {
        title: 'Freedom from Fear',
        description: 'Release anxiety about the future. Most of what you fear will never come to pass.',
      },
    ],
    appExperience: [
      'AI coach is warm, gentle, and gratitude-focused — like sharing wisdom over a long meal',
      'Quotes from Epicurus, Lucretius, and Metrodorus',
      'Journal prompts explore pleasure, gratitude, and savoring the present',
      'Warm, nature-inspired background visuals',
    ],
  },
  samurai: {
    figureName: 'Miyamoto Musashi',
    figureDates: '1584 – 1645',
    figureTitle: 'Legendary Swordsman & Ronin',
    quote: 'There is nothing outside of yourself that can ever enable you to get better, stronger, richer, quicker, or smarter. Everything is within.',
    overview:
      'Bushido — the way of the warrior — is a path of discipline, honor, and relentless self-mastery. Every action is training, every moment an opportunity to sharpen your spirit. Musashi was undefeated in 61 duels and wrote The Book of Five Rings. The samurai path transforms mundane routines into sacred practice.',
    principles: [
      {
        title: 'Discipline as Freedom',
        description: 'Structure creates limitless potential. The disciplined mind can accomplish anything.',
      },
      {
        title: 'Mushin — No-Mind',
        description: 'Act without hesitation or overthinking. In the moment of action, the mind is clear.',
      },
      {
        title: 'Kaizen',
        description: 'Continuous improvement through daily practice. Small gains compound into mastery.',
      },
      {
        title: 'Honor',
        description: 'Let integrity guide every action. Your word is your bond, your character is your legacy.',
      },
    ],
    appExperience: [
      'AI coach is precise, disciplined, and action-oriented — every word placed with intention',
      'Quotes from Musashi, Hagakure, and Zen masters',
      'Journal prompts focus on discipline, mastery, presence, and honor',
      'Clean, cosmic background visuals',
    ],
  },
  scholar: {
    figureName: 'Carl Jung',
    figureDates: '1875 – 1961',
    figureTitle: 'Psychologist & Explorer of the Unconscious',
    quote: 'Who looks outside, dreams; who looks inside, awakes.',
    overview:
      'The Scholar\'s path combines the depth of Jungian psychology, the wonder of cosmic exploration, and the wisdom of ancient mythology. By understanding archetypes, symbols, and universal patterns, you unlock profound self-knowledge. This is the only path that includes astrology features — mapping your inner world to the cosmos above.',
    principles: [
      {
        title: 'Know Thyself',
        description: 'Explore your inner world fearlessly. The unconscious holds the keys to transformation.',
      },
      {
        title: 'The Hero\'s Journey',
        description: 'Every challenge is a call to transformation. Your life follows the patterns of myth.',
      },
      {
        title: 'Cosmic Perspective',
        description: 'See yourself as part of something vast. Your story is woven into the fabric of the universe.',
      },
      {
        title: 'Integration',
        description: 'Embrace your shadow to become whole. The parts of yourself you reject hold your greatest potential.',
      },
    ],
    appExperience: [
      'AI coach weaves psychology, mythology, and cosmic insight into every interaction',
      'Quotes from Jung, Carl Sagan, Joseph Campbell, and Alan Watts',
      'Journal prompts explore archetypes, dreams, symbols, and inner patterns',
      'Cosmic backgrounds + astrology features unlocked',
    ],
  },
  manifestor: {
    figureName: 'Neville Goddard',
    figureDates: '1905 – 1972',
    figureTitle: 'Mystic & Manifestation Pioneer',
    quote: 'Assume the feeling of your wish fulfilled.',
    overview:
      'The Manifestor path teaches that your imagination is the creative force of reality. What you believe, feel, and visualize with conviction becomes your lived experience. This isn\'t passive wishful thinking — it\'s the disciplined practice of aligning your inner state with your desired outcome. Neville Goddard, Joe Dispenza, and Wayne Dyer all point to the same truth: you create your world from the inside out.',
    principles: [
      {
        title: 'Assumption',
        description: 'Assume the feeling of your wish fulfilled. Live from the end, not toward it.',
      },
      {
        title: 'Emotional Alignment',
        description: 'Your emotions are your signal. When you feel it as real, the universe responds.',
      },
      {
        title: 'Revision',
        description: 'Rewrite the story of your day before sleep. What you imagine overwrites what happened.',
      },
      {
        title: 'Inspired Action',
        description: 'Manifestation isn\'t passive. When you align your inner world, the right actions become obvious.',
      },
    ],
    appExperience: [
      'AI coach is empowering and affirming — speaks to your highest potential',
      'Quotes from Neville Goddard, Joe Dispenza, Florence Scovel Shinn, and Wayne Dyer',
      'Journal prompts focus on visualization, intention-setting, and gratitude',
      'Cosmic, luminous background visuals',
    ],
  },
  hustler: {
    figureName: 'David Goggins',
    figureDates: '1975 – Present',
    figureTitle: 'Ultra-Endurance Athlete & Author',
    quote: 'You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.',
    overview:
      'The Hustler path is for those who believe in outworking everyone in the room. No excuses, no shortcuts, no days off. This mindset draws from modern warriors of discipline — David Goggins, Jocko Willink, Alex Hormozi, and Gary Vee — who prove that relentless execution beats talent every time. Pain is the price of growth, and the grind is the way.',
    principles: [
      {
        title: 'No Excuses',
        description: 'Your circumstances don\'t define you. Your response to them does. Eliminate every excuse.',
      },
      {
        title: 'Discipline Over Motivation',
        description: 'Motivation fades. Discipline stays. Show up and execute whether you feel like it or not.',
      },
      {
        title: 'Embrace the Suck',
        description: 'Growth lives on the other side of discomfort. Seek the hard path — that\'s where the gains are.',
      },
      {
        title: 'Extreme Ownership',
        description: 'Everything in your life is your responsibility. No blaming, no complaining — only action.',
      },
    ],
    appExperience: [
      'AI coach is direct, intense, and won\'t let you make excuses',
      'Quotes from Goggins, Jocko Willink, Alex Hormozi, and Gary Vee',
      'Journal prompts push accountability, execution, and mental toughness',
      'Bold, high-energy background visuals',
    ],
  },
}
