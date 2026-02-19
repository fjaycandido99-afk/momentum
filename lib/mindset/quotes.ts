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
  manifestor: [
    { text: 'Assume the feeling of your wish fulfilled.', author: 'Neville Goddard', category: 'manifestation' },
    { text: 'An awakened imagination works with a purpose. It creates and conserves the desirable, and transforms or destroys the undesirable.', author: 'Neville Goddard', category: 'wisdom' },
    { text: 'Change your conception of yourself and you will automatically change the world in which you live.', author: 'Neville Goddard', category: 'growth' },
    { text: 'To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.', author: 'Neville Goddard', category: 'strength' },
    { text: 'The moment you accept yourself, you become beautiful.', author: 'Neville Goddard', category: 'purpose' },
    { text: 'You are the placebo. Your mind can create or cure.', author: 'Joe Dispenza', category: 'wisdom' },
    { text: 'If you want a new outcome, you will have to break the habit of being yourself, and reinvent a new self.', author: 'Joe Dispenza', category: 'growth' },
    { text: 'Your personality creates your personal reality.', author: 'Joe Dispenza', category: 'manifestation' },
    { text: 'The best way to predict the future is to create it.', author: 'Joe Dispenza', category: 'action' },
    { text: 'When you hold a clear vision and feel it as already real, the universe conspires to make it happen.', author: 'Joe Dispenza', category: 'motivation' },
    { text: 'The game of life is a game of boomerangs. Our thoughts, deeds and words return to us sooner or later with astounding accuracy.', author: 'Florence Scovel Shinn', category: 'wisdom' },
    { text: 'Your word is your wand. The words you speak create your reality.', author: 'Florence Scovel Shinn', category: 'manifestation' },
    { text: 'You\'ll see it when you believe it.', author: 'Wayne Dyer', category: 'purpose' },
    { text: 'Change the way you look at things and the things you look at change.', author: 'Wayne Dyer', category: 'growth' },
    { text: 'Abundance is not something we acquire. It is something we tune into.', author: 'Wayne Dyer', category: 'gratitude' },
  ],

  hustler: [
    { text: 'Be uncommon amongst uncommon people.', author: 'David Goggins', category: 'strength' },
    { text: 'You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.', author: 'David Goggins', category: 'motivation' },
    { text: 'The only thing more contagious than a good attitude is a bad one. Don\'t let negativity infect your grind.', author: 'David Goggins', category: 'resilience' },
    { text: 'Suffering is the true test of life. Only through suffering do we find our true selves.', author: 'David Goggins', category: 'growth' },
    { text: 'Nobody cares what you did yesterday. What have you done today to better yourself?', author: 'David Goggins', category: 'action' },
    { text: 'Discipline equals freedom.', author: 'Jocko Willink', category: 'focus' },
    { text: 'Don\'t expect to be motivated every day to get out there and make things happen. You won\'t be. Don\'t count on motivation. Count on discipline.', author: 'Jocko Willink', category: 'action' },
    { text: 'The more you sweat in training, the less you bleed in combat.', author: 'Jocko Willink', category: 'resilience' },
    { text: 'Default aggressive. When in doubt, attack.', author: 'Jocko Willink', category: 'action' },
    { text: 'Stop thinking about what\'s the least you can do. Start thinking about what\'s the most you can do.', author: 'Jocko Willink', category: 'motivation' },
    { text: 'Skills are cheap. Passion is priceless.', author: 'Gary Vaynerchuk', category: 'purpose' },
    { text: 'Without hustle, talent will only carry you so far.', author: 'Gary Vaynerchuk', category: 'action' },
    { text: 'You don\'t learn from successes; you don\'t learn from awards; you don\'t learn from getting on the news. You learn from the grind.', author: 'Gary Vaynerchuk', category: 'growth' },
    { text: '99% of people are not willing to do what it takes to make their dreams come true.', author: 'Alex Hormozi', category: 'strength' },
    { text: 'The person who does the most wins. Period.', author: 'Alex Hormozi', category: 'action' },
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
