export type MuseModel = 'muse-video' | 'muse-image'

export interface MusePrompt {
  slug: string
  title: string
  category: string
  summary: string
  prompt: string
}

// Writing templates for workspace drafts, not generated results or model capability claims.
export const museVideoPrompts: MusePrompt[] = [
  {
    slug: 'bookshop-window-rain',
    title: 'A bookshop window in the rain',
    category: 'Cinematic atmosphere',
    summary: 'Plan a quiet scene with a clear camera move and a small character action.',
    prompt: 'Outside a small bookshop on a rainy evening, a reader closes a book beside the warm window and watches the rain. Start on droplets running down the glass, then slowly move sideways to reveal the reader in the same shot. Warm interior light against cool blue reflections, natural facial expression, restrained movement, no readable text or logos.',
  },
  {
    slug: 'tea-pour-macro',
    title: 'Tea leaves and a slow pour',
    category: 'Product motion',
    summary: 'Describe a product shot through material, movement and a single focal point.',
    prompt: 'A clear glass teapot sits on a pale stone table beside a small ceramic cup. A hand pours amber tea into the cup as steam rises and loose tea leaves settle in the pot. Begin with a close view of the pour, then gently pull back to show both vessels. Soft side lighting, realistic glass reflections and liquid motion, calm premium product mood, no text or logos.',
  },
  {
    slug: 'paper-boat-stream',
    title: 'A paper boat finds its way',
    category: 'Handcrafted animation',
    summary: 'Use a simple action sequence to outline an animated story.',
    prompt: 'A tiny folded-paper boat travels along a narrow stream through a handmade paper forest. It pauses against a pebble, turns with the current, then drifts under a leaf bridge. Track beside the boat at water level in one continuous shot. Visible paper folds, tactile miniature scenery, gentle stop-motion feeling, soft green and cream palette, no text or logos.',
  },
  {
    slug: 'cyclist-sunrise',
    title: 'A cyclist meets the sunrise',
    category: 'Outdoor action',
    summary: 'Connect subject motion, camera direction and the final framing.',
    prompt: 'A cyclist rides along an empty coastal road just after sunrise. The camera tracks parallel at a steady pace, then eases back to reveal the coastline as the cyclist rounds a gentle bend. Consistent direction of travel, believable pedaling and wheel movement, long shadows, warm hazy light, documentary mood, no text or logos.',
  },
  {
    slug: 'cat-curtain-surprise',
    title: 'The cat behind the curtain',
    category: 'Playful storytelling',
    summary: 'Write a visual joke with a setup, one action and a clear ending.',
    prompt: 'In a sunny living room, a curtain moves slightly even though the window is closed. A curious cat reaches one paw out from behind it, bats at a loose thread, then steps into the sunlight and sits as if nothing happened. Keep the curtain and cat visible in a static low-angle shot. Natural cat behavior, soft fabric texture, gentle dry humor, no text or logos.',
  },
]

export const museImagePrompts: MusePrompt[] = [
  {
    slug: 'ceramic-vase-still-life',
    title: 'Ceramic vase, soft morning light',
    category: 'Still life photography',
    summary: 'Specify composition, surface detail and light for a simple still life.',
    prompt: 'An unbranded handmade ceramic vase holding three delicate branches on a warm off-white table. Place the vase slightly left of center with generous empty space on the right. Soft morning light from the left, subtle natural shadows, visible glaze texture and small imperfections, muted sand and sage colors, editorial still life photography, no text or logos.',
  },
  {
    slug: 'city-garden-editorial',
    title: 'A garden above the city',
    category: 'Editorial illustration',
    summary: 'Build an illustrated scene around a subject, viewpoint and limited palette.',
    prompt: 'An editorial illustration of neighbors caring for a rooftop vegetable garden above a dense city. View the scene from a slightly elevated three-quarter angle, with the garden in the foreground and simple apartment shapes beyond. Hand-drawn ink contours, flat terracotta, teal and cream color areas, small expressive gestures, balanced composition, no text or logos.',
  },
  {
    slug: 'forest-paper-cut',
    title: 'A forest made from layered paper',
    category: 'Paper cut art',
    summary: 'Define a tactile style through layers, edges, shadows and color.',
    prompt: 'A small deer standing in a moonlit forest rendered as layered cut paper. Arrange dark navy trees around a pale circular moon, with the deer in a clear opening near the lower center. Visible paper fibers, crisp cut edges, soft shadows between layers, restrained indigo and silver palette, handcrafted depth, no text or logos.',
  },
  {
    slug: 'portrait-window-light',
    title: 'A portrait beside the window',
    category: 'Portrait study',
    summary: 'Plan an original character portrait through expression, framing and light.',
    prompt: 'A portrait of a fictional adult ceramic artist seated beside a tall studio window, wearing a simple linen shirt with clay dust on the sleeves. Frame from the chest up at eye level, with a relaxed direct gaze and a softly blurred shelf of handmade bowls behind. Gentle window light, realistic skin texture, warm neutral colors, quiet editorial photography, no text or logos.',
  },
  {
    slug: 'reading-nook-interior',
    title: 'A quiet reading nook',
    category: 'Interior concept',
    summary: 'Describe a room using spatial arrangement, materials and a coherent mood.',
    prompt: 'A compact reading nook built into the corner of a small apartment: a low oak bench beneath a wide window, oatmeal linen cushions, one olive-green throw, a slim brass reading lamp and a wall shelf of plain-covered books. Three-quarter view showing the entire corner, soft afternoon light, believable proportions, tactile wood and fabric, calm lived-in atmosphere, no text or logos.',
  },
]

export function musePromptTryUrl(model: MuseModel, prompt: string) {
  const workspace = model === 'muse-video' ? '/app/video/muse-video' : '/app/image/muse-image'
  return `${workspace}?${new URLSearchParams({ prompt }).toString()}`
}
