import type { MindsetId } from './types'

export interface DecisionFramework {
  title: string
  description: string
  questions: { prompt: string; placeholder: string }[]
  conclusion: string
}

export const MINDSET_FRAMEWORKS: Record<MindsetId, DecisionFramework[]> = {
  stoic: [
    {
      title: 'Premeditatio Malorum',
      description: 'The Stoic practice of negative visualization — imagining what could go wrong to reduce fear and improve preparation.',
      questions: [
        { prompt: 'What decision or situation are you facing?', placeholder: 'Describe the situation...' },
        { prompt: 'What is the worst that could realistically happen?', placeholder: 'Imagine the worst outcome...' },
        { prompt: 'If the worst happened, how would you cope? What would you do?', placeholder: 'Describe how you would handle it...' },
        { prompt: 'Knowing you can survive the worst — what is the right action to take?', placeholder: 'What will you do now?' },
      ],
      conclusion: 'By facing the worst in your mind, you have already survived it. Now act with the courage of someone who has nothing left to fear.',
    },
    {
      title: 'The Dichotomy of Control',
      description: 'Separate what is within your control from what is not, and focus your energy accordingly.',
      questions: [
        { prompt: 'What situation is troubling you right now?', placeholder: 'Describe what is on your mind...' },
        { prompt: 'List what is entirely within your control in this situation.', placeholder: 'Your thoughts, actions, responses...' },
        { prompt: 'List what is outside your control.', placeholder: 'Others\' actions, outcomes, timing...' },
      ],
      conclusion: 'Focus your energy entirely on what you can control. Release your grip on the rest. This is not giving up — it is focusing your power where it can actually make a difference.',
    },
    {
      title: 'The View from Above',
      description: 'Gain perspective by imagining your situation from an increasingly broad viewpoint — city, country, planet, cosmos.',
      questions: [
        { prompt: 'What problem feels overwhelming right now?', placeholder: 'Describe what weighs on you...' },
        { prompt: 'How will this matter in one year? In ten years?', placeholder: 'Consider the time perspective...' },
        { prompt: 'If you could see this from a cosmic perspective, what advice would you give yourself?', placeholder: 'Zoom out and reflect...' },
      ],
      conclusion: 'From the vastness of time and space, most problems reveal their true size — small. Act on what matters, release what does not. You are part of something much larger than this moment.',
    },
  ],
  existentialist: [
    {
      title: 'The Radical Freedom Audit',
      description: 'Examine areas where you tell yourself "I have no choice" and discover the freedom hidden within.',
      questions: [
        { prompt: 'What is something in your life you feel you "have to" do?', placeholder: 'Something that feels like an obligation...' },
        { prompt: 'What would actually happen if you stopped doing it?', placeholder: 'Be honest about the real consequences...' },
        { prompt: 'If you continue doing it, can you reframe it as a choice? Why do you choose it?', placeholder: 'Find the freedom within the obligation...' },
      ],
      conclusion: 'You are always choosing, even when it feels like you are not. Owning your choices — even the hard ones — is the foundation of an authentic life.',
    },
    {
      title: 'The Authenticity Check',
      description: 'Examine whether your current path reflects your true self or the expectations of others.',
      questions: [
        { prompt: 'Describe a major area of your life (career, relationship, goal).', placeholder: 'Choose one significant area...' },
        { prompt: 'Did you choose this path, or did you drift into it through others\' expectations?', placeholder: 'Be honest about the origin...' },
        { prompt: 'If no one would judge you, would you still choose this? If not, what would you choose instead?', placeholder: 'Imagine total freedom from judgment...' },
        { prompt: 'What is one small step you could take toward greater authenticity in this area?', placeholder: 'A concrete action you can take...' },
      ],
      conclusion: 'Authenticity is not a destination — it is a daily practice of choosing your own path over the path others laid out for you. Start with one honest step.',
    },
    {
      title: 'The Meaning Maker',
      description: 'In the face of absurdity, actively construct meaning rather than waiting for it to appear.',
      questions: [
        { prompt: 'What feels meaningless or absurd in your life right now?', placeholder: 'Something that feels purposeless...' },
        { prompt: 'If no external source will give this meaning, what meaning could you create from it?', placeholder: 'What value can you assign to it...' },
        { prompt: 'What project, relationship, or commitment could you throw yourself into today?', placeholder: 'Choose your rebellion against meaninglessness...' },
      ],
      conclusion: 'The universe does not owe you meaning. That is the bad news. The good news: you are free to create any meaning you choose. Choose boldly.',
    },
  ],
  cynic: [
    {
      title: 'The Necessity Test',
      description: 'Strip away what you think you need and discover what you actually need versus what society told you to want.',
      questions: [
        { prompt: 'Name something you believe you "need" to be happy.', placeholder: 'A possession, status, or achievement...' },
        { prompt: 'Have you ever been happy without it? When?', placeholder: 'Think of a time you were content without this...' },
        { prompt: 'Who benefits from you believing you need this?', placeholder: 'Advertisers? Social pressure? Your ego?' },
      ],
      conclusion: 'Most "needs" are manufactured wants in disguise. Diogenes lived in a barrel and was freer than kings. Question every need until only the genuine ones remain.',
    },
    {
      title: 'The Convention Breaker',
      description: 'Identify a social norm you follow unthinkingly and examine whether it actually serves you.',
      questions: [
        { prompt: 'Name one social rule or convention you follow without questioning.', placeholder: 'A habit, expectation, or norm...' },
        { prompt: 'Why does this convention exist? Who does it benefit?', placeholder: 'Think about its origins and purpose...' },
        { prompt: 'What would happen if you stopped following it? What is the real (not imagined) consequence?', placeholder: 'Separate real consequences from social fear...' },
      ],
      conclusion: 'The Cynic does not break rules for the sake of breaking them — but they refuse to follow rules for the sake of following them. Choose your conventions consciously.',
    },
    {
      title: 'The Brutal Honesty Check',
      description: 'Face a truth you have been avoiding and examine why you have been hiding from it.',
      questions: [
        { prompt: 'What is one truth about yourself or your life that you have been avoiding?', placeholder: 'Something you know but don\'t want to face...' },
        { prompt: 'What are you afraid would happen if you fully acknowledged this truth?', placeholder: 'Name the fear...' },
        { prompt: 'What becomes possible if you stop pretending and face it directly?', placeholder: 'What opens up when you stop hiding...' },
        { prompt: 'What is one honest action you can take today?', placeholder: 'A concrete step toward truth...' },
      ],
      conclusion: 'Diogenes carried a lantern in daylight searching for an honest person. Start by being one. Honesty may cost you comfort, but it buys you freedom.',
    },
  ],
  hedonist: [
    {
      title: 'The Pleasure Audit',
      description: 'Examine your pleasures to distinguish those that bring lasting joy from those that leave you empty.',
      questions: [
        { prompt: 'List three things you do for pleasure regularly.', placeholder: 'Daily habits, treats, activities...' },
        { prompt: 'For each, how do you feel one hour after? Do they leave you satisfied or wanting more?', placeholder: 'Notice the aftertaste of each pleasure...' },
        { prompt: 'Which pleasures would Epicurus approve of — the ones that bring peace, not just stimulation?', placeholder: 'Separate deep satisfaction from shallow thrills...' },
      ],
      conclusion: 'The wise hedonist seeks pleasures that compound — friendship, learning, presence, health. The unwise hedonist chases pleasures that borrow from tomorrow. Choose the ones that leave you richer.',
    },
    {
      title: 'The Pain-Pleasure Calculus',
      description: 'Before pursuing something pleasurable, calculate the full cost — including the pain that may follow.',
      questions: [
        { prompt: 'What pleasure are you tempted by right now?', placeholder: 'Something you want to pursue...' },
        { prompt: 'What pain or consequence might follow this pleasure?', placeholder: 'Hangover, regret, lost time, broken trust...' },
        { prompt: 'Is there a way to get a similar pleasure with less pain?', placeholder: 'A wiser version of the same enjoyment...' },
      ],
      conclusion: 'Epicurus taught that the goal is not maximum pleasure but the best ratio of pleasure to pain. Sometimes the wisest pleasure is the one you decline.',
    },
    {
      title: 'The Ataraxia Assessment',
      description: 'Identify what is disturbing your inner tranquility and design a path back to peace.',
      questions: [
        { prompt: 'What is currently disrupting your peace of mind?', placeholder: 'A worry, desire, conflict...' },
        { prompt: 'Is this disruption caused by something real or by your fear of something that hasn\'t happened?', placeholder: 'Real problem or anticipated problem...' },
        { prompt: 'What is the simplest change you could make to restore tranquility?', placeholder: 'Often it is letting go rather than doing more...' },
        { prompt: 'What simple pleasure could you enjoy right now to reconnect with the present moment?', placeholder: 'A walk, a conversation, a favorite drink...' },
      ],
      conclusion: 'Ataraxia — tranquility of mind — is the highest pleasure. Not excitement, not thrill, but deep, unshakeable peace. Protect it fiercely. Return to it often.',
    },
  ],
  samurai: [
    {
      title: 'The Bushido Decision',
      description: 'When facing a difficult choice, run it through the seven virtues of Bushido to find the honorable path.',
      questions: [
        { prompt: 'What decision are you facing?', placeholder: 'Describe the choice before you...' },
        { prompt: 'Which option aligns with courage and honor? Which option is the easy way out?', placeholder: 'Separate the brave path from the comfortable one...' },
        { prompt: 'If your actions were witnessed by your most respected mentor, which choice would make them proud?', placeholder: 'Imagine their eyes on you...' },
        { prompt: 'Which choice can you commit to completely, without hesitation?', placeholder: 'The samurai acts decisively...' },
      ],
      conclusion: 'A samurai does not choose the easy path — they choose the right path and walk it without looking back. Hesitation is a form of defeat. Decide, commit, act.',
    },
    {
      title: 'The Warrior\'s Assessment',
      description: 'Evaluate your current readiness — physical, mental, and spiritual — and identify where to strengthen.',
      questions: [
        { prompt: 'How would you rate your physical discipline right now? What has slipped?', placeholder: 'Training, sleep, nutrition, posture...' },
        { prompt: 'How would you rate your mental sharpness? Where are you unfocused or distracted?', placeholder: 'Focus, learning, clarity of thought...' },
        { prompt: 'How would you rate your spiritual resolve? Are you living by your principles?', placeholder: 'Honor, purpose, integrity...' },
      ],
      conclusion: 'The warrior trains every day — body, mind, and spirit. Not to be perfect, but to be ready. Identify your weakest area and train it today. Tomorrow, you will be stronger.',
    },
    {
      title: 'The Way of Resolve',
      description: 'When commitment wavers, use this framework to reconnect with your purpose and reignite your discipline.',
      questions: [
        { prompt: 'What commitment or goal have you been wavering on?', placeholder: 'A promise, a practice, a mission...' },
        { prompt: 'Why did you make this commitment in the first place? What was the fire that started it?', placeholder: 'Reconnect with the original motivation...' },
        { prompt: 'What would a warrior who never breaks their word do right now?', placeholder: 'What is the next honorable step...' },
      ],
      conclusion: 'Musashi said: "The way is in training." Not in feeling motivated, not in waiting for inspiration — in training. Recommit now. The way forward is always one more step.',
    },
  ],
  scholar: [
    {
      title: 'The Shadow Integration',
      description: 'Identify and integrate a shadow quality — something you deny or project onto others — to make a more conscious decision.',
      questions: [
        { prompt: 'What decision or conflict are you struggling with?', placeholder: 'Describe the situation...' },
        { prompt: 'What quality in others frustrates you most in this situation? Could this quality also exist in you?', placeholder: 'Explore what you might be projecting...' },
        { prompt: 'If you fully owned this shadow quality, how would it change your perspective on the decision?', placeholder: 'Imagine integrating rather than rejecting...' },
        { prompt: 'What is the most whole, integrated action you can take — honoring both light and shadow?', placeholder: 'A decision that embraces complexity...' },
      ],
      conclusion: 'Jung taught that what we resist persists, and what we integrate transforms. By acknowledging your shadow, you make decisions from wholeness rather than blind spots.',
    },
    {
      title: 'The Archetype Council',
      description: 'Consult the archetypes within you — the Warrior, the Sage, the Caregiver, the Trickster — to find a balanced path forward.',
      questions: [
        { prompt: 'What challenge are you facing right now?', placeholder: 'Describe what needs your attention...' },
        { prompt: 'What would the Warrior say? (courage, action, boundaries)', placeholder: 'The Warrior speaks...' },
        { prompt: 'What would the Sage say? (wisdom, patience, perspective)', placeholder: 'The Sage speaks...' },
        { prompt: 'What would the Trickster say? (creativity, disruption, humor)', placeholder: 'The Trickster speaks...' },
      ],
      conclusion: 'No single archetype has the full answer. Wisdom comes from hearing all inner voices and choosing the path that honors the whole council — not just the loudest voice.',
    },
    {
      title: 'The Synchronicity Map',
      description: 'Look for meaningful patterns and coincidences around your decision — signs from the unconscious that point toward alignment.',
      questions: [
        { prompt: 'What decision or direction are you contemplating?', placeholder: 'Describe what you are considering...' },
        { prompt: 'Have you noticed any recurring themes, symbols, or coincidences related to this recently?', placeholder: 'Dreams, repeated words, unexpected encounters...' },
        { prompt: 'What does your intuition say, beneath all the rational analysis?', placeholder: 'Listen to the quiet voice beneath thought...' },
      ],
      conclusion: 'Synchronicity is the universe whispering through pattern. It does not replace rational thought — it complements it. When logic and intuition align, you are on the right path.',
    },
  ],
}
