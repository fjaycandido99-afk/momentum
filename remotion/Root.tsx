import React from 'react'
import { Composition } from 'remotion'
import { Audiogram, type AudiogramProps } from './Audiogram'

// 9:16, 30fps. Duration is a sensible default for preview; in production set it
// from the audio length via calculateMetadata (see README) so the video matches
// the spoken quote exactly.
export const RemotionRoot: React.FC = () => {
  return (
    <Composition<Record<string, unknown>, AudiogramProps>
      id="Audiogram"
      component={Audiogram}
      durationInFrames={25 * 30}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        quote: 'You have power over your mind — not outside events. Realize this, and you find strength.',
        author: 'Marcus Aurelius',
        mindset: 'Stoic',
        audioSrc: 'https://voxu.app/sample-quote.mp3',
      }}
    />
  )
}
