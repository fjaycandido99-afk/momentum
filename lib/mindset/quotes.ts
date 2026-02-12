import type { MindsetId } from './types'

export interface MindsetQuote {
  text: string
  author: string
  category?: string
}

export const MINDSET_QUOTES: Record<MindsetId, MindsetQuote[]> = {
  stoic: [
    { text: 'You have power over your mind — not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius', category: 'resilience' },
    { text: 'The happiness of your life depends upon the quality of your thoughts.', author: 'Marcus Aurelius', category: 'mindset' },
    { text: 'Waste no more time arguing about what a good man should be. Be one.', author: 'Marcus Aurelius', category: 'action' },
    { text: 'It is not that we have a short time to live, but that we waste a great deal of it.', author: 'Seneca', category: 'focus' },
    { text: 'We suffer more often in imagination than in reality.', author: 'Seneca', category: 'wisdom' },
    { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca', category: 'growth' },
    { text: 'Difficulties strengthen the mind, as labor does the body.', author: 'Seneca', category: 'resilience' },
    { text: 'It is not because things are difficult that we do not dare, it is because we do not dare that they are difficult.', author: 'Seneca', category: 'action' },
    { text: 'Man is not worried by real problems so much as by his imagined anxieties about real problems.', author: 'Epictetus', category: 'wisdom' },
    { text: 'First say to yourself what you would be; and then do what you have to do.', author: 'Epictetus', category: 'purpose' },
    { text: 'No man is free who is not master of himself.', author: 'Epictetus', category: 'strength' },
    { text: 'Make the best use of what is in your power, and take the rest as it happens.', author: 'Epictetus', category: 'resilience' },
    { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius', category: 'growth' },
    { text: 'Begin at once to live, and count each separate day as a separate life.', author: 'Seneca', category: 'motivation' },
    { text: 'How long are you going to wait before you demand the best for yourself?', author: 'Epictetus', category: 'action' },
  ],

  existentialist: [
    { text: 'In the midst of winter, I found there was, within me, an invincible summer.', author: 'Albert Camus', category: 'resilience' },
    { text: 'The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion.', author: 'Albert Camus', category: 'strength' },
    { text: 'Man is condemned to be free; because once thrown into the world, he is responsible for everything he does.', author: 'Jean-Paul Sartre', category: 'wisdom' },
    { text: 'Life begins on the other side of despair.', author: 'Jean-Paul Sartre', category: 'growth' },
    { text: 'Freedom is what we do with what is done to us.', author: 'Jean-Paul Sartre', category: 'resilience' },
    { text: 'One must imagine Sisyphus happy.', author: 'Albert Camus', category: 'purpose' },
    { text: 'The struggle itself toward the heights is enough to fill a man\'s heart.', author: 'Albert Camus', category: 'motivation' },
    { text: 'One\'s life has value so long as one attributes value to the life of others.', author: 'Simone de Beauvoir', category: 'wisdom' },
    { text: 'Change your life today. Don\'t gamble on the future, act now, without delay.', author: 'Simone de Beauvoir', category: 'action' },
    { text: 'Anxiety is the dizziness of freedom.', author: 'Soren Kierkegaard', category: 'wisdom' },
    { text: 'Life can only be understood backwards; but it must be lived forwards.', author: 'Soren Kierkegaard', category: 'growth' },
    { text: 'To dare is to lose one\'s footing momentarily. Not to dare is to lose oneself.', author: 'Soren Kierkegaard', category: 'action' },
    { text: 'I rebel; therefore I exist.', author: 'Albert Camus', category: 'strength' },
    { text: 'You will never be happy if you continue to search for what happiness consists of.', author: 'Albert Camus', category: 'wisdom' },
    { text: 'Existence precedes essence.', author: 'Jean-Paul Sartre', category: 'purpose' },
  ],

  cynic: [
    { text: 'It is not that I am mad, it is only that my head is different from yours.', author: 'Diogenes', category: 'wisdom' },
    { text: 'The foundation of every state is the education of its youth.', author: 'Diogenes', category: 'growth' },
    { text: 'I am a citizen of the world.', author: 'Diogenes', category: 'purpose' },
    { text: 'It is the privilege of the gods to want nothing, and of godlike men to want little.', author: 'Diogenes', category: 'wisdom' },
    { text: 'He has the most who is most content with the least.', author: 'Diogenes', category: 'gratitude' },
    { text: 'Dogs and philosophers do the greatest good and get the fewest rewards.', author: 'Diogenes', category: 'wisdom' },
    { text: 'We have two ears and one tongue so that we would listen more and talk less.', author: 'Diogenes', category: 'wisdom' },
    { text: 'The mob is the mother of tyrants.', author: 'Diogenes', category: 'strength' },
    { text: 'I threw my cup away when I saw a child drinking from his hands at the trough.', author: 'Diogenes', category: 'wisdom' },
    { text: 'As a matter of self-preservation, a man needs good friends or ardent enemies.', author: 'Diogenes', category: 'resilience' },
    { text: 'Poverty is a virtue which one can teach oneself.', author: 'Crates of Thebes', category: 'strength' },
    { text: 'The art of being wise is the art of knowing what to overlook.', author: 'Antisthenes', category: 'wisdom' },
    { text: 'Pay attention to your enemies, for they are the first to discover your mistakes.', author: 'Antisthenes', category: 'growth' },
    { text: 'The most useful piece of learning for the uses of life is to unlearn what is untrue.', author: 'Antisthenes', category: 'wisdom' },
    { text: 'Virtue is sufficient for happiness.', author: 'Antisthenes', category: 'purpose' },
  ],

  hedonist: [
    { text: 'Do not spoil what you have by desiring what you have not; remember that what you now have was once among the things you only hoped for.', author: 'Epicurus', category: 'gratitude' },
    { text: 'Not what we have, but what we enjoy, constitutes our abundance.', author: 'Epicurus', category: 'gratitude' },
    { text: 'Of all the means to insure happiness throughout the whole life, by far the most important is the acquisition of friends.', author: 'Epicurus', category: 'wisdom' },
    { text: 'He who is not satisfied with a little, is satisfied with nothing.', author: 'Epicurus', category: 'wisdom' },
    { text: 'The wealth required by nature is limited and is easy to procure; but the wealth required by vain ideals extends to infinity.', author: 'Epicurus', category: 'wisdom' },
    { text: 'It is impossible to live a pleasant life without living wisely and honorably and justly.', author: 'Epicurus', category: 'purpose' },
    { text: 'We must exercise ourselves in the things which bring happiness, since, if that be present, we have everything, and if that be absent, all our actions are directed toward attaining it.', author: 'Epicurus', category: 'motivation' },
    { text: 'The soul neither rids itself of disturbance nor gains a worthwhile joy through the possession of greatest wealth.', author: 'Epicurus', category: 'wisdom' },
    { text: 'All things are made of atoms and void, and nothing else.', author: 'Lucretius', category: 'wisdom' },
    { text: 'So it is more useful to watch a man in times of peril, and in adversity to discern what kind of man he is.', author: 'Lucretius', category: 'resilience' },
    { text: 'Life is one long struggle in the dark.', author: 'Lucretius', category: 'resilience' },
    { text: 'Pleasant it is to behold great encounters of warfare arrayed over the plains, with no part of yours in peril.', author: 'Lucretius', category: 'wisdom' },
    { text: 'Let nothing be done in your life which will cause you fear if it becomes known to your neighbor.', author: 'Epicurus', category: 'purpose' },
    { text: 'A free life cannot acquire many possessions, because this is not easy to do without servility to mobs or monarchs.', author: 'Epicurus', category: 'strength' },
    { text: 'I have never wished to cater to the crowd; for what I know they do not approve, and what they approve I do not know.', author: 'Epicurus', category: 'strength' },
  ],

  samurai: [
    { text: 'There is nothing outside of yourself that can ever enable you to get better, stronger, richer, quicker, or smarter. Everything is within.', author: 'Miyamoto Musashi', category: 'strength' },
    { text: 'Do nothing that is of no use.', author: 'Miyamoto Musashi', category: 'focus' },
    { text: 'Think lightly of yourself and deeply of the world.', author: 'Miyamoto Musashi', category: 'wisdom' },
    { text: 'Today is victory over yourself of yesterday; tomorrow is your victory over lesser men.', author: 'Miyamoto Musashi', category: 'growth' },
    { text: 'The Way is in training.', author: 'Miyamoto Musashi', category: 'action' },
    { text: 'You can only fight the way you practice.', author: 'Miyamoto Musashi', category: 'action' },
    { text: 'If you know the way broadly you will see it in everything.', author: 'Miyamoto Musashi', category: 'wisdom' },
    { text: 'The Way of the warrior is resolute acceptance of death.', author: 'Yamamoto Tsunetomo', category: 'resilience' },
    { text: 'There is surely nothing other than the single purpose of the present moment.', author: 'Yamamoto Tsunetomo', category: 'focus' },
    { text: 'In the end, you must forget about technique. The further you progress, the fewer teachings there are.', author: 'Yamamoto Tsunetomo', category: 'growth' },
    { text: 'A person who is said to be proficient at the arts is like a fool. Because of his foolish devotion to his art, he feels nothing else and thus becomes proficient.', author: 'Yamamoto Tsunetomo', category: 'purpose' },
    { text: 'The undisturbed mind is like the calm body of water reflecting the brilliance of the moon.', author: 'Takuan Soho', category: 'wisdom' },
    { text: 'Not twice this day. Inch time, foot gem.', author: 'Takuan Soho', category: 'focus' },
    { text: 'When sitting, sit. When standing, stand. Whatever you do, don\'t wobble.', author: 'Zen Proverb', category: 'action' },
    { text: 'Fall seven times, stand up eight.', author: 'Japanese Proverb', category: 'resilience' },
  ],

  scholar: [
    { text: 'Who looks outside, dreams; who looks inside, awakes.', author: 'Carl Jung', category: 'wisdom' },
    { text: 'Until you make the unconscious conscious, it will direct your life and you will call it fate.', author: 'Carl Jung', category: 'growth' },
    { text: 'The privilege of a lifetime is to become who you truly are.', author: 'Carl Jung', category: 'purpose' },
    { text: 'Knowing your own darkness is the best method for dealing with the darknesses of other people.', author: 'Carl Jung', category: 'wisdom' },
    { text: 'Everything that irritates us about others can lead us to an understanding of ourselves.', author: 'Carl Jung', category: 'growth' },
    { text: 'The cosmos is within us. We are made of star-stuff.', author: 'Carl Sagan', category: 'wisdom' },
    { text: 'Somewhere, something incredible is waiting to be known.', author: 'Carl Sagan', category: 'motivation' },
    { text: 'For small creatures such as we, the vastness is bearable only through love.', author: 'Carl Sagan', category: 'gratitude' },
    { text: 'We are a way for the cosmos to know itself.', author: 'Carl Sagan', category: 'purpose' },
    { text: 'The cave you fear to enter holds the treasure you seek.', author: 'Joseph Campbell', category: 'action' },
    { text: 'Follow your bliss and the universe will open doors where there were only walls.', author: 'Joseph Campbell', category: 'purpose' },
    { text: 'We must be willing to let go of the life we planned so as to have the life that is waiting for us.', author: 'Joseph Campbell', category: 'growth' },
    { text: 'The only way to make sense out of change is to plunge into it, move with it, and join the dance.', author: 'Alan Watts', category: 'resilience' },
    { text: 'Muddy water is best cleared by leaving it alone.', author: 'Alan Watts', category: 'wisdom' },
    { text: 'You are the universe experiencing itself.', author: 'Alan Watts', category: 'purpose' },
  ],
}

/**
 * Get a flat array of mindset quotes merged with a weight multiplier.
 * Each mindset quote appears `weight` times in the returned array.
 */
export function getWeightedQuotePool(mindsetId: MindsetId, generalQuotes: Array<{ text: string; author: string; category?: string }>, weight: number = 3): Array<{ text: string; author: string; category?: string }> {
  const mindsetQuotes = MINDSET_QUOTES[mindsetId] || []
  const weighted: Array<{ text: string; author: string; category?: string }> = []

  // Add mindset quotes with weight multiplier
  for (let i = 0; i < weight; i++) {
    weighted.push(...mindsetQuotes)
  }

  // Add general quotes once
  weighted.push(...generalQuotes)

  return weighted
}
