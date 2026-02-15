import type { MindsetId } from './types'

export interface Parable {
  title: string
  story: string
  moral: string
}

export const MINDSET_PARABLES: Record<MindsetId, Parable[]> = {
  stoic: [
    {
      title: 'The Emperor\'s Cloak',
      story: 'Marcus Aurelius, ruler of the known world, would rise before dawn and sit on a simple wooden stool. His advisors found him once wearing a threadbare cloak instead of his imperial purple. "Caesar, your robe!" they cried. Marcus replied, "This cloak reminds me that beneath the purple, I am merely a man who must face the day with virtue, not vanity."',
      moral: 'Status and possessions do not define your character — your choices do.',
    },
    {
      title: 'Seneca and the Shipwreck',
      story: 'When Seneca lost his fortune in a shipwreck, his friends mourned for him. Seneca, however, laughed. "Fortune has taken back what it lent me," he said. "I still have the only things that were ever truly mine — my mind, my reason, and my will to live well." That night, he wrote some of his finest letters.',
      moral: 'What fortune gives, fortune can take. Only your inner virtues are truly yours.',
    },
    {
      title: 'The Slave\'s Freedom',
      story: 'Epictetus, born a slave, was once grabbed by his master who began twisting his leg. Epictetus said calmly, "You are going to break it." When his master broke it, Epictetus simply said, "I told you so." He never showed anger, for he knew his master could control his body but never his mind.',
      moral: 'True freedom is not in circumstances but in your response to them.',
    },
    {
      title: 'The Stoic\'s Garden',
      story: 'A student asked his Stoic teacher why he spent each morning tending his small garden when he could hire servants. "Each weed I pull teaches me patience," the teacher replied. "Each seed I plant teaches me hope without attachment. And the days when nothing grows teach me acceptance."',
      moral: 'Daily discipline in small matters builds the strength for life\'s great challenges.',
    },
    {
      title: 'Marcus at the Frontier',
      story: 'During the Marcomannic Wars, Marcus Aurelius sat writing his Meditations by candlelight while battles raged nearby. A general asked how he could remain so calm. Marcus replied, "The battle outside these walls may or may not go our way. But the battle within — for clarity, for virtue — that is the one I must win each night."',
      moral: 'Inner peace does not require outer peace. Master yourself first.',
    },
    {
      title: 'Seneca\'s Letter on Anger',
      story: 'A young Roman nobleman came to Seneca fuming about an insult at a banquet. Seneca listened, then asked, "Did this insult change who you are?" The nobleman paused. "No." Seneca smiled. "Then the insult was merely words released into the air. You chose to catch them and hold them. You could just as easily let them fall."',
      moral: 'Anger is not caused by events but by your judgment of events.',
    },
    {
      title: 'The Stoic and the Storm',
      story: 'A Stoic philosopher was aboard a ship caught in a terrible storm. While everyone panicked, he sat quietly. When the storm passed, a passenger asked if he had been afraid. "My face went pale and my hands trembled," he admitted. "But I did not allow my mind to add stories of doom to what was simply wind and water."',
      moral: 'Courage is not the absence of fear but the refusal to be governed by it.',
    },
    {
      title: 'Chrysippus and the Thief',
      story: 'When a thief stole Chrysippus\'s coat, friends urged him to pursue the man. Chrysippus shook his head. "He has taken my coat. If I chase him in anger, he will have taken my peace as well. One loss is bearable. Two is foolish."',
      moral: 'Do not add the loss of your tranquility to whatever else you may have lost.',
    },
    {
      title: 'The View from Above',
      story: 'Marcus Aurelius would imagine himself rising above Rome, seeing the city grow small, then the empire, then the Earth itself — a tiny sphere in infinite space. From that height, the senate\'s squabbles, the crowd\'s applause, and his own worries all seemed like ants arguing over crumbs.',
      moral: 'Perspective transforms problems. What seems enormous up close is small from a distance.',
    },
    {
      title: 'Epictetus and the Lamp',
      story: 'After his precious iron lamp was stolen, Epictetus replaced it with an earthenware one. "Tomorrow," he told his students, "if someone steals this one, I will use a candle. And if the candle is taken, I will sit in darkness and still be free. For the thief cannot steal the light within."',
      moral: 'Reduce your dependencies, and you reduce your vulnerabilities.',
    },
  ],
  existentialist: [
    {
      title: 'Sisyphus at Dawn',
      story: 'Every morning, Sisyphus opens his eyes at the base of the mountain. The boulder waits. He has pushed it a thousand times, and a thousand times it has rolled back. But today, he notices the texture of the stone under his palms, the warmth of the sun on his back. He begins to push — not because he must, but because the pushing is his.',
      moral: 'Meaning is not found in the outcome but in the engagement with the task itself.',
    },
    {
      title: 'The Stranger\'s Choice',
      story: 'A man at a crossroads found no signs, no maps, no guides. He stood frozen for hours, waiting for direction. Finally, an old woman passed by. "Which way should I go?" he asked. She laughed. "You\'re asking the wrong question. You should ask: who do I want to become? Then walk in the direction that person would walk."',
      moral: 'In the absence of given meaning, you create meaning through your choices.',
    },
    {
      title: 'The Café Philosopher',
      story: 'Sartre sat in his café, watching a waiter perform his role with perfect precision — filling glasses, nodding politely, moving efficiently. "He is playing at being a waiter," Sartre thought. Then he caught his own reflection and realized he was playing at being a philosopher. The question was: what lay beneath all the roles?',
      moral: 'Authenticity requires seeing through the roles you play to the freedom underneath.',
    },
    {
      title: 'Camus and the Plague',
      story: 'When the plague came to Oran, some prayed, some fled, and some denied it existed. Dr. Rieux simply continued treating patients. When asked why he bothered when most would die anyway, he replied, "I have no idea what awaits me after the last patient. But right now, this person needs help. That is enough."',
      moral: 'In an absurd world, showing up and doing what must be done is the highest rebellion.',
    },
    {
      title: 'Kierkegaard\'s Leap',
      story: 'A young student stood at the edge of a cliff, told that below was everything he wanted — purpose, love, meaning. But he couldn\'t see the bottom. "How do I know it\'s there?" he asked. "You don\'t," replied his teacher. "That\'s why they call it a leap. Faith is not about certainty. It\'s about jumping when certainty is impossible."',
      moral: 'Commitment requires courage precisely because guarantees are impossible.',
    },
    {
      title: 'The Empty Room',
      story: 'A woman entered an empty white room. "Make this your life," a voice said. She could paint the walls, arrange furniture, hang pictures — or leave it bare. The terror and the freedom were the same thing: no one would tell her what to do with it. She picked up a brush, hands shaking, and made the first mark.',
      moral: 'The blank canvas of existence is terrifying because it is free. Create anyway.',
    },
    {
      title: 'De Beauvoir\'s Mirror',
      story: 'Simone de Beauvoir once caught herself dressing for a party as she thought others expected — demure, quiet, ornamental. She stopped, stared at her reflection, and asked, "Whose life is this?" She changed into what she wanted, spoke her mind that evening, and lost several friends. She gained herself.',
      moral: 'Living for others\' expectations is a slow surrender of your existence.',
    },
    {
      title: 'The Last Day',
      story: 'A man was told he had one day to live. He expected panic but felt only clarity. He called the people he loved. He said what he had always meant to say. He watched the sunset as if seeing it for the first time. When evening came, the doctor called back — it had been a mistake. The man wept, not from relief, but because he knew he would forget this clarity.',
      moral: 'Death gives life its urgency. Do not wait for a deadline to live authentically.',
    },
    {
      title: 'Nietzsche\'s Eternal Return',
      story: 'Imagine a demon whispers: "You will live this exact life again, infinite times — every joy, every pain, every boredom." The question is not whether this is true, but whether you can hear it and say "Yes! Again!" If not, what must you change so that you could?',
      moral: 'Live so that you could will your life to repeat eternally without regret.',
    },
    {
      title: 'The Condemned Man\'s Walk',
      story: 'A condemned man was led to his execution at dawn. Along the way, he noticed dew on the grass, heard birdsong, and felt the cool air fill his lungs. He realized he had walked this path a hundred times before but never truly noticed it. Freedom, he understood, had never been about his chains.',
      moral: 'Awareness transforms any moment into freedom. Presence is its own liberation.',
    },
  ],
  cynic: [
    {
      title: 'Diogenes and Alexander',
      story: 'Alexander the Great, conqueror of nations, sought out Diogenes the philosopher who was sunbathing outside his barrel. "I am Alexander the Great," he announced. "Ask me for anything you desire." Diogenes squinted up at him and said, "Yes, you could move a little to the left. You\'re blocking my sun." Alexander later told his court, "If I were not Alexander, I would want to be Diogenes."',
      moral: 'True power is needing nothing from those who have everything.',
    },
    {
      title: 'The Lantern in Daylight',
      story: 'Diogenes walked through the marketplace at noon carrying a lit lantern, peering into people\'s faces. "What are you searching for?" they asked. "An honest person," he replied. The merchants hid their scales, the politicians covered their mouths, and the priests pulled their hoods lower. Only a child laughed and said, "I\'m right here!"',
      moral: 'Honesty is so rare that seeking it becomes an act of protest.',
    },
    {
      title: 'The Dog\'s Feast',
      story: 'Diogenes was invited to a wealthy man\'s banquet. He arrived, surveyed the gold plates and exotic foods, then sat on the floor and ate bread from his sack. "Why won\'t you eat our food?" the host asked. "Because your food comes with obligations. My bread comes with freedom."',
      moral: 'Every luxury accepted is a chain worn willingly. Choose your dependencies carefully.',
    },
    {
      title: 'Crates and the Fortune',
      story: 'Crates of Thebes inherited a vast fortune. He walked to the harbor, threw the money into the sea, and declared himself free. His family thought him mad. But Crates spent the rest of his life teaching, walking, and laughing — unburdened by the fear of losing what he no longer had.',
      moral: 'What you own, owns you. Sometimes liberation requires letting go of everything.',
    },
    {
      title: 'The Cynic\'s Home',
      story: 'When someone mocked Diogenes for living in a barrel, he replied, "A palace has a hundred rooms you never use, doors that need guarding, and walls that need repairing. My home has everything I need and nothing I don\'t. Tell me — who is the fool?"',
      moral: 'Simplicity is not poverty — it is the elimination of everything unnecessary.',
    },
    {
      title: 'Diogenes at the Bathhouse',
      story: 'At the public bathhouse, Diogenes saw men carefully oiling their skin and arranging their hair. He dipped his hand in mud and rubbed it on his arms. "What are you doing?" they gasped. "You spend hours making the outside beautiful while the inside rots. I\'m being honest about what I am — an animal, like you."',
      moral: 'Obsession with appearances is a distraction from the work of becoming genuine.',
    },
    {
      title: 'The Captured Philosopher',
      story: 'When Diogenes was captured by pirates and sold as a slave, the auctioneer asked what he could do. Diogenes shouted to the crowd, "I can govern men! Who needs a master? I am for sale!" His audacity was so great that a philosopher bought him and set him free, saying, "You enslaved me with your words."',
      moral: 'A free mind cannot be enslaved, and a bold spirit commands even its captors.',
    },
    {
      title: 'The Plucked Chicken',
      story: 'When Plato defined a human as "a featherless biped," Diogenes plucked a chicken and brought it to the Academy, declaring "Behold! Plato\'s human!" The students laughed. Plato added "with broad flat nails" to his definition. But the damage was done — Diogenes had shown that clever words without substance are just decoration.',
      moral: 'Question every definition, especially the ones everyone accepts without thinking.',
    },
    {
      title: 'The Cup and the Boy',
      story: 'Diogenes carried a wooden cup as one of his few possessions. One day he saw a child drinking water from cupped hands. Diogenes immediately threw away his cup, saying, "A child has beaten me in simplicity!" He realized he was still clinging to something unnecessary.',
      moral: 'There is always a deeper level of simplicity. Nature shows the way if you watch.',
    },
    {
      title: 'The Cynic\'s Funeral',
      story: 'When asked how he wished to be buried, Diogenes said, "Throw me over the wall. The dogs and birds will take care of the rest." His students protested. "Won\'t you be ashamed?" He replied, "I won\'t be there to be ashamed. Why should I care about a body I\'m done using?" Even in death, he refused convention.',
      moral: 'Do not let customs and expectations govern you, not even at the end.',
    },
  ],
  hedonist: [
    {
      title: 'The Garden of Epicurus',
      story: 'Epicurus did not live in a palace. His famous Garden was a simple plot outside Athens where he grew vegetables and talked with friends. When asked why the great philosopher of pleasure lived so modestly, he replied, "I have discovered the secret: the richest pleasures — friendship, conversation, a simple meal — cost almost nothing. It is the expensive pleasures that leave you empty."',
      moral: 'The highest pleasures are often the simplest ones, freely available to all.',
    },
    {
      title: 'The Water and the Wine',
      story: 'A student brought Epicurus an expensive bottle of wine. Epicurus tasted it, nodded appreciatively, then poured himself a cup of water. "The wine is excellent," he said, "but the water quenches my thirst just as well. If I drink wine daily, I lose the ability to enjoy water. Keep your pleasures rare, and they remain extraordinary."',
      moral: 'Moderation preserves your capacity for joy. Excess dulls the senses.',
    },
    {
      title: 'The Feast of Friends',
      story: 'Epicurus once held a dinner where the only food was bread, cheese, and olives. His wealthy guests complained. But as the evening went on, the conversation deepened, laughter erupted, and by midnight no one remembered the food. "You see?" Epicurus said. "The feast was never on the table. It was between us."',
      moral: 'Connection is the deepest pleasure. Everything else is just seasoning.',
    },
    {
      title: 'The Pain Calculation',
      story: 'A young follower wanted to leave everything and pursue endless adventure. Epicurus asked him to calculate: for every pleasure, what pain follows? Hangovers after drinking, regret after impulse, exhaustion after excess. "A wise hedonist," Epicurus taught, "counts the full cost. True pleasure is that which leaves no pain in its wake."',
      moral: 'Wise pleasure-seeking considers consequences. Today\'s indulgence may be tomorrow\'s suffering.',
    },
    {
      title: 'Epicurus and Death',
      story: 'A student came to Epicurus terrified of dying. Epicurus replied, "When death is, I am not. When I am, death is not. We will never meet. Why fear a stranger you will never encounter?" The student thought for a long time, then began to laugh. "I have been fearing nothing," he said. "Exactly," smiled Epicurus. "Now go and live."',
      moral: 'Fear of death steals the pleasure of living. Release the fear to find the joy.',
    },
    {
      title: 'The Ataraxia Lesson',
      story: 'A merchant told Epicurus he would be happy once he had enough wealth to retire. Epicurus asked, "What will you do when you retire?" "Sit in my garden, read, spend time with friends." Epicurus gestured around his simple Garden where he was doing exactly that. "Why wait?" The merchant opened his mouth to reply, then closed it.',
      moral: 'The tranquil life you seek is available now, not after some future achievement.',
    },
    {
      title: 'The Storm and the Shelter',
      story: 'During a violent storm, Epicurus and his students huddled in their simple shelter. Outside, grand villas were flooding. "See how little we need," Epicurus said. "A roof, warmth, and each other. The man in the mansion is no more sheltered than we are, but he is more afraid — he has more to lose."',
      moral: 'Security comes not from abundance but from needing less.',
    },
    {
      title: 'The Memory of Cheese',
      story: 'In his final illness, Epicurus wrote to a friend: "Send me a piece of cheese, so that I may have a feast." He was in terrible pain, yet the anticipation of a simple pleasure — a bite of cheese shared with memory — brought him joy. His last letter radiated gratitude, not complaint.',
      moral: 'Even in suffering, the capacity for small pleasures endures. Gratitude is the ultimate pleasure.',
    },
    {
      title: 'The Hedonist\'s Morning',
      story: 'Each morning in the Garden, Epicurus would pause before his first sip of water and say, "Yesterday I might not have tasted this. Tomorrow I might not. But now, this is the sweetest water in the world." His students learned that presence — truly being there for each sensation — multiplied pleasure infinitely.',
      moral: 'Mindful attention to simple pleasures yields more joy than mindless excess.',
    },
    {
      title: 'The Two Neighbors',
      story: 'Two men lived side by side. One filled his home with treasures from distant lands and was always anxious about theft. The other had a chair, a book, and a window facing the sunset. When asked who was happier, the townspeople all pointed to the man with the window. "He smiles every evening," they said. "The other only frowns at his locks."',
      moral: 'Wealth hoarded in fear produces less happiness than simplicity enjoyed in peace.',
    },
  ],
  samurai: [
    {
      title: 'Musashi\'s Last Duel',
      story: 'Before his most important duel, Miyamoto Musashi arrived late, having carved a wooden sword from an oar during the boat ride. His opponent, Sasaki Kojiro, was furious at the disrespect. Musashi knew that anger clouds judgment. With a calm mind and a simple weapon, he defeated the greatest swordsman in Japan. The battle was won before it began.',
      moral: 'Mastery of self defeats mastery of weapons. Composure is the ultimate advantage.',
    },
    {
      title: 'The Tea Master\'s Courage',
      story: 'A tea master was challenged to a duel by a ronin. Knowing nothing of combat, he visited a sword master and said, "Teach me to die well." The sword master watched him prepare tea — each movement precise, calm, present. "Face your opponent exactly as you prepare tea," he advised. When the ronin saw the tea master\'s perfect composure, he bowed and withdrew.',
      moral: 'Excellence in any discipline, practiced with total presence, becomes a form of courage.',
    },
    {
      title: 'The Broken Sword',
      story: 'A young samurai broke his katana in training and wept. His master said, "Good. Now you will learn to fight without a sword. Then without armor. Then without anger. The warrior who depends on nothing external has already won every battle."',
      moral: 'True strength lies not in your weapons but in your ability to function without them.',
    },
    {
      title: 'The Monk and the Warrior',
      story: 'A fierce samurai demanded that a Zen monk explain heaven and hell. The monk looked him over and said, "You? I wouldn\'t waste my time teaching a shabby, ignorant brute." The samurai drew his sword in rage. "That," said the monk calmly, "is hell." The samurai paused, understood, and sheathed his sword. "And that," said the monk, "is heaven."',
      moral: 'Hell is being controlled by your emotions. Heaven is the moment you choose mastery over reaction.',
    },
    {
      title: 'Bushido and the Fallen Enemy',
      story: 'After defeating an enemy general, a samurai lord ordered his men to treat the fallen warrior with full honors — cleaning his wounds, returning his sword, and burying him with ceremony. When asked why he honored his enemy, the lord said, "A man who had the courage to face me deserves my respect. Without worthy opponents, there is no worthy victory."',
      moral: 'Honor your challenges and your challengers. They forge your strength.',
    },
    {
      title: 'The Arrow and the Mind',
      story: 'An archery master told his student to shoot at a target blindfolded. The student protested. The master said, "You have been shooting with your eyes for years and still miss. Perhaps it is time to shoot with your mind." The student breathed deeply, drew, and released. The arrow found the center. He had stopped overthinking and let his training take over.',
      moral: 'Mastery transcends conscious effort. Trust your preparation and let go.',
    },
    {
      title: 'The Samurai\'s Garden',
      story: 'A retired samurai spent his last years perfecting a small garden. Visitors said it was too simple — just rocks, moss, and water. The samurai replied, "In battle I learned that the space between strikes matters more than the strikes themselves. In this garden, the emptiness between the stones is where the beauty lives."',
      moral: 'Discipline applied to any craft reveals the same truths. Simplicity is the ultimate sophistication.',
    },
    {
      title: 'Death in the Morning',
      story: 'The Hagakure teaches: "Meditate on death every morning." A young samurai found this morbid until his master explained. "When you have accepted death, you fear nothing. When you fear nothing, you act freely. When you act freely, you live fully. The meditation on death is really a meditation on life."',
      moral: 'Accepting mortality liberates you from hesitation. Live each day as if it is complete.',
    },
    {
      title: 'The Two Swords',
      story: 'Musashi was known for fighting with two swords simultaneously, a technique others called impossible. When asked his secret, he said, "Everyone has two hands but trains only one. I simply refused to ignore what was already there." He found advantage not by seeking the extraordinary but by fully using the ordinary.',
      moral: 'Before seeking new strengths, fully develop the ones you already possess.',
    },
    {
      title: 'The Loyal Retainer',
      story: 'A samurai\'s lord made a terrible decision that would harm innocent people. The samurai faced a choice: obey blindly or speak truth at the risk of his life. He chose to speak. His lord punished him, but years later admitted that the retainer\'s honesty saved the clan. True loyalty serves the principle, not just the person.',
      moral: 'Honor demands truth, even when truth demands courage. Loyalty without integrity is mere obedience.',
    },
  ],
  scholar: [
    {
      title: 'The Man and His Shadow',
      story: 'A scholar spent his life running from his shadow — literally and figuratively. Every flaw, every dark impulse, he denied and projected onto others. One day, exhausted, he stopped running and turned to face it. The shadow did not attack. It simply said, "I have been carrying everything you refused to hold." As he accepted it, he felt not weaker but strangely whole.',
      moral: 'What you deny in yourself does not disappear — it grows in the dark. Integration, not rejection, is the path to wholeness.',
    },
    {
      title: 'The Four Masks',
      story: 'A woman wore a different mask for every role in her life — the dutiful daughter, the ambitious professional, the carefree friend, the wise mentor. One evening, alone, she removed them all and found she could not recognize herself. Terrified, she sat in silence until a quiet voice said, "I am the one who chooses which mask to wear." She had found the Self beneath the personas.',
      moral: 'The roles you play are not who you are. Beneath every mask is the one who decides to wear them.',
    },
    {
      title: 'The Alchemist\'s Gold',
      story: 'An alchemist spent decades trying to turn lead into gold. He failed every time. On his deathbed, his apprentice asked if it was all for nothing. The old man smiled: "I never made gold from lead. But in the trying, I transformed myself from a foolish young man into someone who understands that the real transformation was always internal."',
      moral: 'The outer quest is always a mirror of the inner one. What you seek to change outside is what needs changing within.',
    },
    {
      title: 'The Dream That Would Not End',
      story: 'A king dreamed he was a butterfly, fluttering through gardens with no memory of being a king. When he woke, he was troubled: "Am I a king who dreamed of being a butterfly, or a butterfly dreaming of being a king?" He consulted Jung, who replied: "You are the dreamer who can be both. That is the miracle."',
      moral: 'Reality and imagination are not opposites — they are two sides of the same coin. The psyche contains multitudes.',
    },
    {
      title: 'The Tower and the Well',
      story: 'Two seekers of wisdom took different paths. One climbed a great tower to see far and wide. The other descended into a deep well. The tower-climber saw the whole landscape but felt disconnected. The well-diver found underground rivers connecting everything. When they met again, each envied the other — until they realized both perspectives were needed.',
      moral: 'Height gives perspective; depth gives understanding. True wisdom requires both the view from above and the dive within.',
    },
  ],
}
