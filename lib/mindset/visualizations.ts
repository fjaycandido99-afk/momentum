import type { MindsetId } from './types'

export interface Visualization {
  title: string
  duration: string
  steps: string[]
}

export const MINDSET_VISUALIZATIONS: Record<Exclude<MindsetId, 'scholar'>, Visualization[]> = {
  stoic: [
    {
      title: 'The Inner Citadel',
      duration: '3 min',
      steps: [
        'Close your eyes. Take three slow, deep breaths. Let your body settle.',
        'Imagine a vast, open plain. In the center stands a fortress — your Inner Citadel. Its walls are made of stone, thick and ancient, built from every challenge you have ever overcome.',
        'Visualize yourself walking toward the gates. With each step, the noise of the outside world — opinions, worries, distractions — grows quieter.',
        'You step inside. The air is still. This is the seat of your reason, your judgment, your will. Nothing external can enter without your permission.',
        'Sit in the center of your citadel. Feel the calm strength of knowing that your mind belongs to you alone. No storm outside can shake these walls.',
        'When you are ready, open your eyes. Carry this fortress with you. It is always there.',
      ],
    },
    {
      title: 'Morning Preparation',
      duration: '2 min',
      steps: [
        'Before your day begins, sit quietly for a moment. Breathe naturally.',
        'Imagine the day ahead — the people you will meet, the tasks you will face, the moments that might test your patience or resolve.',
        'Now say to yourself: "Today I will encounter difficulty. People may be rude, tasks may frustrate me, plans may fail."',
        'Visualize yourself meeting each challenge with calm composure. See yourself responding with reason, not reaction.',
        'Feel the quiet power of being prepared. You are not hoping the day is easy — you are ready for it to be hard.',
        'Open your eyes. You are prepared. Begin.',
      ],
    },
    {
      title: 'Evening Review',
      duration: '3 min',
      steps: [
        'The day is ending. Sit comfortably and close your eyes.',
        'Replay the day like a film. Watch yourself from a distance, without judgment. Simply observe.',
        'Notice moments where you acted with virtue — patience, courage, kindness. Acknowledge them quietly.',
        'Notice moments where you fell short — where anger, impatience, or distraction won. Do not condemn yourself. Simply note: "Here, I can improve."',
        'Imagine tomorrow as a clean page. You carry the lessons of today but none of its weight.',
        'Take one final breath. Release the day. You have done your review — that alone is an act of wisdom.',
      ],
    },
    {
      title: 'The Obstacle as the Path',
      duration: '2 min',
      steps: [
        'Bring to mind a current challenge — something you are avoiding or struggling with.',
        'Visualize this challenge as a large stone blocking your path. Feel its weight, its resistance.',
        'Now, instead of pushing against it, examine it. What can this obstacle teach you? What strength does it demand you develop?',
        'See yourself climbing over the stone, using it as a stepping stone. The obstacle has become the path forward.',
        'Feel the shift: from frustration to opportunity. The impediment to action advances action.',
      ],
    },
    {
      title: 'The View from Above',
      duration: '3 min',
      steps: [
        'Close your eyes. Imagine yourself rising slowly from where you sit — through the ceiling, above the building.',
        'You rise higher. Your city becomes small — a cluster of lights and movement. The people, their problems, their dramas — all miniature.',
        'Higher still. You see your country, then the curve of the Earth. Oceans, continents, weather systems swirling.',
        'From here, the argument you had, the email that stressed you, the worry keeping you awake — where are they? They exist, but they are tiny. A speck.',
        'Hold this perspective. You are part of something vast and ancient. Your problems are real but they are not the whole story.',
        'Slowly descend back to your body. Bring this perspective with you. Let it lighten what felt heavy.',
      ],
    },
  ],
  existentialist: [
    {
      title: 'The Blank Canvas',
      duration: '3 min',
      steps: [
        'Close your eyes and breathe deeply. Let go of plans, expectations, and routines.',
        'Imagine you are standing in a vast white room. There is nothing here — no furniture, no signs, no instructions. Just empty space and possibility.',
        'This room is your life. No one has told you what to put in it. There are no rules, no blueprints. The emptiness may feel terrifying — let that feeling exist.',
        'Now pick up an invisible brush. What is the first mark you would make? Not what you should make — what you want to make. What color? What shape?',
        'Begin to fill the space with your choices. Each mark is an act of creation, an assertion of your freedom.',
        'When ready, open your eyes. Remember: your life is the canvas. You hold the brush. Always.',
      ],
    },
    {
      title: 'Meeting Your Future Self',
      duration: '3 min',
      steps: [
        'Breathe deeply and close your eyes. Imagine walking down a long corridor.',
        'At the end of the corridor, a door. Behind it sits the person you will become in ten years — the version of you that made all the right choices.',
        'Open the door. See this future self clearly. How do they sit? How do they look at you? What is in their eyes?',
        'They speak: "I am what you become when you stop waiting for permission and start living authentically." Feel the weight of those words.',
        'Ask them one question — anything. Listen to the answer that arises from within you. It already knows.',
        'Thank this future self. Walk back through the corridor carrying their clarity. Open your eyes.',
      ],
    },
    {
      title: 'The Absurd Morning',
      duration: '2 min',
      steps: [
        'Sit quietly and consider: the universe has no inherent plan for you. No script. No audience keeping score.',
        'Feel the initial vertigo of meaninglessness. Let it wash over you without fighting it.',
        'Now notice — you are still here. Still breathing. Still choosing. The absence of given meaning does not erase your capacity to create meaning.',
        'Visualize yourself as Sisyphus at the base of the mountain, but smiling. You push the boulder not because it matters cosmically, but because the pushing is yours.',
        'Choose one thing today that you will do with full engagement, knowing it may not "matter" — and doing it anyway because you choose it.',
      ],
    },
    {
      title: 'Shedding the Masks',
      duration: '3 min',
      steps: [
        'Close your eyes. Visualize yourself wearing layers of masks — one for work, one for family, one for friends, one for strangers.',
        'Reach up and remove the first mask. Feel the relief as one performance ends. Notice who you are without it.',
        'Remove the next mask. And the next. Each layer falls away, revealing something rawer, more vulnerable, more real.',
        'When the last mask falls, who is left? Sit with this person. They may feel unfamiliar. That is okay — authenticity often does.',
        'This is you, unperformed. Not perfect, not polished, but real. Real is enough. Real is everything.',
        'Open your eyes. You do not have to wear every mask today. Choose which ones serve you — and wear them knowingly.',
      ],
    },
    {
      title: 'The Last Hour',
      duration: '2 min',
      steps: [
        'Imagine you have one hour left. Not with panic — with clarity. Sixty minutes remain.',
        'What would you say? To whom? What would you do with these final moments?',
        'Notice what falls away: the unfinished emails, the grudges, the plans. Notice what remains: love, presence, truth.',
        'The hour passes. But here is the secret — you are given this exercise every day. Each hour could be the last you treat with such clarity.',
        'Open your eyes. Take one action from this visualization and do it today. Do not wait for the real last hour.',
      ],
    },
  ],
  cynic: [
    {
      title: 'The Stripping Away',
      duration: '3 min',
      steps: [
        'Close your eyes. Imagine everything you own, lined up in front of you — your possessions, your status, your reputation.',
        'One by one, items disappear. Your expensive clothes. Your phone. Your job title. Your social media. Each one vanishes.',
        'With each loss, notice: does the core of you diminish? Or does it feel lighter?',
        'When everything external is gone, what remains is you — your thoughts, your will, your capacity to think and act. This is what Diogenes kept.',
        'Feel the strange freedom of having nothing to lose. Nothing to protect. Nothing to maintain.',
        'Open your eyes. You do not need to throw everything away — but knowing you could is the beginning of freedom.',
      ],
    },
    {
      title: 'Walking Through the Marketplace',
      duration: '2 min',
      steps: [
        'Imagine yourself in a crowded marketplace. Merchants shout about their wares — fame, beauty, wealth, approval.',
        'Everyone around you is buying eagerly, filling their arms with things they do not need.',
        'You walk through with empty hands. You see what is being sold: not products, but promises of happiness that never quite deliver.',
        'A merchant calls to you: "Don\'t you want anything?" You smile and reply: "I have everything I need."',
        'Feel the power of that sentence. Walk out of the marketplace into the sunlight, unburdened.',
      ],
    },
    {
      title: 'The Barrel Meditation',
      duration: '3 min',
      steps: [
        'Visualize Diogenes\' barrel — small, simple, open to the sky. Imagine stepping inside.',
        'The barrel contains everything you truly need: shelter from rain, a place to think, a view of the stars.',
        'From inside the barrel, watch the world go by. People rushing, worrying, accumulating. You are still.',
        'A king approaches and asks what you want. You want nothing from him. This shocks him. This frees you.',
        'The barrel is not poverty. It is a choice to need less so that you can think more clearly.',
        'Step out of the barrel and into your day. Carry the simplicity with you.',
      ],
    },
    {
      title: 'Questioning Convention',
      duration: '2 min',
      steps: [
        'Think of one thing you do every day without questioning — a habit, a social norm, a belief.',
        'Ask: "Why do I do this? Who told me to? What would happen if I stopped?"',
        'Visualize yourself doing the opposite. How does it feel? Uncomfortable? Liberating? Both?',
        'The Cynic\'s power is the willingness to question everything society takes for granted.',
        'You do not have to reject every convention — but you should choose which ones you follow consciously, not automatically.',
      ],
    },
    {
      title: 'The Honest Mirror',
      duration: '2 min',
      steps: [
        'Close your eyes. Imagine a mirror that shows not your face, but your true self — your actual values, your real priorities, your honest motivations.',
        'Look closely. Some of what you see will make you proud. Some may surprise you. Some may make you uncomfortable.',
        'The Cynic does not look away. The Cynic says: "This is who I am. Not who I pretend to be."',
        'Accept what you see without judgment, but with resolve. If something needs to change, you now see it clearly.',
        'Open your eyes. Carry this honesty forward today.',
      ],
    },
  ],
  hedonist: [
    {
      title: 'The Garden of Senses',
      duration: '3 min',
      steps: [
        'Close your eyes and imagine a beautiful garden — Epicurus\' Garden, warm and green.',
        'Walk slowly through it. Feel the grass beneath your feet, soft and cool. Notice the sensation fully.',
        'Breathe in. The air carries the scent of flowers, herbs, warm earth. Let the fragrance fill you.',
        'Reach out and touch a sun-warmed stone wall. Feel its rough texture, its stored heat. Simple, satisfying.',
        'Sit on a bench. A friend appears and sits beside you. You share comfortable silence. This is the highest pleasure.',
        'Open your eyes and carry this garden with you. Today, notice one pleasure you usually rush past.',
      ],
    },
    {
      title: 'The First Taste',
      duration: '2 min',
      steps: [
        'Imagine you are about to eat your favorite food — but you have never tasted it before. This is the first time.',
        'See it in front of you. Notice its color, its texture, its aroma. Anticipation builds.',
        'Take the first bite. Experience the explosion of flavor as if your tongue has never known this before. Every taste bud awakens.',
        'Chew slowly. The pleasure is not in swallowing — it is in savoring. Time stretches.',
        'This is how every experience can feel when approached with beginner\'s mind. Open your eyes and bring that freshness to today.',
      ],
    },
    {
      title: 'The Warm Light',
      duration: '3 min',
      steps: [
        'Sit comfortably and close your eyes. Imagine a warm, golden light at the center of your chest.',
        'This light is your capacity for joy — it has always been there, even in dark times.',
        'With each breath, the light expands. It reaches your arms, your legs, the top of your head. You are glowing.',
        'The warmth is not excitement or thrill — it is deep, quiet contentment. Ataraxia. The tranquil pleasure of simply being alive.',
        'Imagine this light radiating outward — touching the people around you, warming them too. Joy shared is joy multiplied.',
        'Open your eyes gently. The light remains. Carry this warmth into your day.',
      ],
    },
    {
      title: 'The Gratitude Walk',
      duration: '2 min',
      steps: [
        'Imagine yourself on a walk — your usual route, nothing special. But today, you see everything differently.',
        'The air in your lungs — a pleasure so constant you forgot it was there. The ability to walk — a gift many lack.',
        'The sunlight on your skin. The sound of your footsteps. The sight of colors, shapes, movement. Each one a small miracle.',
        'With each step, silently name one thing you are grateful for. Let the list grow long.',
        'By the end of the walk, you realize: the world has not changed. Your attention has. And attention is the source of all pleasure.',
      ],
    },
    {
      title: 'Release of Anxiety',
      duration: '3 min',
      steps: [
        'Close your eyes. Identify one worry sitting in your mind — name it clearly.',
        'Now ask Epicurus\' question: "Is this something that is happening now, or something I fear might happen?"',
        'If it is in the future, it does not exist yet. You are suffering from imagination, not reality.',
        'Visualize the worry as a dark cloud above your head. With each exhale, the cloud thins and dissolves.',
        'Beneath the cloud is clear sky — the present moment, where you are actually safe, actually alive, actually free.',
        'Open your eyes. The present moment is the only one that contains real pleasure. Stay here.',
      ],
    },
  ],
  samurai: [
    {
      title: 'The Warrior\'s Dawn',
      duration: '3 min',
      steps: [
        'Stand or sit with a straight spine. Close your eyes. Breathe as if drawing a bow — slow, controlled, powerful.',
        'Imagine yourself as a samurai at dawn. The world is still. Mist rises from the ground. You stand at the edge of your training ground.',
        'Draw your sword slowly. Feel its weight — the weight of your commitment, your discipline, your purpose.',
        'Hold the blade before you. On its surface, you see your reflection — not your face, but your character. What do you see?',
        'Sheathe the sword. You are ready. Not because today will be easy, but because you are prepared for it to be hard.',
        'Open your eyes. Carry this readiness into every moment of your day.',
      ],
    },
    {
      title: 'The Way of Water',
      duration: '2 min',
      steps: [
        'Close your eyes. Imagine a stream flowing over rocks — effortlessly finding its way around every obstacle.',
        'Water does not fight the rocks. It does not stop. It adapts, flows, and continues with quiet persistence.',
        'Now become the water. Feel yourself flowing around the challenges in your life — not avoiding them, but moving through them without losing your nature.',
        'Musashi taught: "Be like water — formless, adaptable, unstoppable." Rigidity breaks. Flexibility endures.',
        'Open your eyes. Today, when you meet resistance, flow around it. The stream always reaches the sea.',
      ],
    },
    {
      title: 'Meditation on Mortality',
      duration: '3 min',
      steps: [
        'Sit quietly. The Hagakure says: "Meditate on your death every morning." This is not morbid — it is clarifying.',
        'Imagine this is your last day. Not with fear, but with acceptance. All things end. This is natural.',
        'What matters now? Not the small irritations, not the petty conflicts. What remains is purpose, honor, and the people you love.',
        'Feel the liberation of having nothing to lose. When death is accepted, fear loses its power. You act from clarity, not anxiety.',
        'Resolve to live today with the intensity of someone who knows time is finite. Not frantic — focused.',
        'Open your eyes. You are alive. Treat this day as the gift it is.',
      ],
    },
    {
      title: 'The Forge',
      duration: '2 min',
      steps: [
        'Visualize a blacksmith\'s forge — blazing hot, ringing with hammer strikes.',
        'You are the blade being forged. Every difficulty, every hardship, every failure — these are the hammer strikes shaping you.',
        'The fire is uncomfortable but necessary. Without heat, the metal stays soft. Without pressure, no edge forms.',
        'Feel yourself being refined. The impurities — laziness, excuses, weakness — burn away. What remains is steel.',
        'You emerge from the forge sharper, stronger, and more resilient. Today\'s challenges are not punishments. They are the forge.',
      ],
    },
    {
      title: 'The Dojo of Stillness',
      duration: '3 min',
      steps: [
        'Close your eyes. Imagine entering an empty dojo — wooden floors, clean air, silence.',
        'Kneel in the center. There is no opponent here — only you. The hardest battles are fought within.',
        'Observe your thoughts like an opponent\'s movements. Watch them without engaging. A thought of worry — noted. A thought of desire — noted. Let them pass.',
        'In this stillness, find your center — the quiet place beneath all the noise. This is where true strength lives.',
        'A master once said: "The warrior who can sit in stillness for an hour can face anything for a lifetime."',
        'Rise slowly. Bow to the empty dojo. Open your eyes. Carry this stillness into the noise of your day.',
      ],
    },
  ],
}
