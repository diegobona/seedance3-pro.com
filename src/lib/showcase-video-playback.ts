import type { SyntheticEvent } from 'react'

// One active preview across both new and original showcase cards.
export function playShowcaseVideo(event: SyntheticEvent<HTMLVideoElement>) {
  const active = event.currentTarget
  document.querySelectorAll<HTMLVideoElement>('video[data-showcase-video]').forEach(video => {
    if (video !== active && !video.paused) video.pause()
  })
}
