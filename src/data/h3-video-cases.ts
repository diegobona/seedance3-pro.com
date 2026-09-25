export interface H3VideoCase {
  slug: string
  title: string
  seoTitle: string
  summary: string
  creativeNote: string
  prompt: string
  aspectRatio: '16:9' | '9:16'
  videoUrl: string
  posterUrl: string
}

const mediaRoot = '/media/showcase-h3/2026-09-25'

export const h3VideoCases: H3VideoCase[] = [
  {
    slug: 'foldable-origami-crane',
    title: 'The phone that folded too far',
    seoTitle: 'Foldable Phone Origami Crane Video Prompt | MiniMax H3',
    summary: 'A polished phone reveal turns into a tiny origami escape in one café shot.',
    creativeNote: 'The prompt begins like a clean product demo, then adds one impossible physical transformation. Holding the café shot through the person’s deadpan reaction gives the visual joke room to land without captions.',
    prompt: 'A five-second single shot in a bright café. A person unfolds a sleek, unbranded foldable phone. It folds itself one more time into a tiny metallic origami crane and flies away. The person stares at their empty hands, deadpan. Playful physical comedy, realistic motion, clean commercial lighting, 16:9, no text or logos.',
    aspectRatio: '16:9',
    videoUrl: mediaRoot + '/foldable-origami-crane.mp4',
    posterUrl: mediaRoot + '/foldable-origami-crane.jpg',
  },
  {
    slug: 'smart-glasses-coffee',
    title: 'Directions to the coffee in your hand',
    seoTitle: 'Smart Glasses Coffee Navigation Video Prompt | MiniMax H3',
    summary: 'A pair of smart glasses offers directions to a coffee mug already within reach.',
    creativeNote: 'This vertical sketch makes the navigation arrow the setup and the wearer’s restrained reaction the payoff. The familiar kitchen setting keeps the augmented-reality gag easy to understand at a glance.',
    prompt: 'A five-second single shot in a kitchen. A person puts on unbranded smart glasses. A large glowing navigation arrow appears and points insistently toward the coffee mug already in their hand. They slowly look at the mug, then at the camera in embarrassment. Subtle AR effects, dry comedy, 9:16, no text or logos.',
    aspectRatio: '9:16',
    videoUrl: mediaRoot + '/smart-glasses-coffee.mp4',
    posterUrl: mediaRoot + '/smart-glasses-coffee.jpg',
  },
  {
    slug: 'corgi-sprint',
    title: 'The corgi wins the sprint',
    seoTitle: 'Corgi Wins a Sprint AI Video Prompt | MiniMax H3',
    summary: 'A serious track sprint gets an unexpected winner: a delighted corgi.',
    creativeNote: 'The sports-camera treatment makes a small neighborhood race feel momentous. Keeping the runner, corgi and finish line in one short shot makes the comic reversal immediate.',
    prompt: 'Five-second single shot at a fictional neighborhood running track. A serious adult sprinter explodes off the starting line, but a tiny corgi dashes past and crosses the finish tape first. The runner stops and stares; the corgi looks delighted. Dramatic sports-camera energy, playful comedy, 16:9, no official marks or text.',
    aspectRatio: '16:9',
    videoUrl: mediaRoot + '/corgi-sprint.mp4',
    posterUrl: mediaRoot + '/corgi-sprint.jpg',
  },
  {
    slug: 'cat-fashion-runway',
    title: 'The cat steals the runway',
    seoTitle: 'Black Cat Fashion Runway Video Prompt | MiniMax H3',
    summary: 'A black cat confidently takes center stage during a fashion walk.',
    creativeNote: 'The fashion lighting establishes an editorial mood before the cat becomes the unexpected star. A single vertical runway shot keeps the animal, model and shifting attention together.',
    prompt: 'Five-second single shot on a glamorous fashion runway. A model walks toward the camera with a serious expression. A confident black cat trots past her and takes center stage as camera flashes turn toward the cat. The model breaks character and smiles. Chic editorial lighting, realistic movement, 9:16, no logos or text.',
    aspectRatio: '9:16',
    videoUrl: mediaRoot + '/cat-fashion-runway.mp4',
    posterUrl: mediaRoot + '/cat-fashion-runway.jpg',
  },
  {
    slug: 'grandma-dance-floor',
    title: 'Grandma owns the dance floor',
    seoTitle: 'Grandma Dance Floor Party Video Prompt | MiniMax H3',
    summary: 'A grandmother leads the family party with one effortless dance move.',
    creativeNote: 'The scene flips the expected party dynamic: the hesitant younger guests follow the grandmother’s lead. A close vertical composition gives her expression and the family’s reaction equal weight.',
    prompt: 'Five-second single shot at a lively family party. Young adults hesitate on the dance floor; a stylish grandmother steps forward and does one effortless old-school dance move. Everyone immediately copies her as she gives the camera a knowing smile. Joyful, expressive faces, retro party lighting, 9:16, no recognizable music, text or logos.',
    aspectRatio: '9:16',
    videoUrl: mediaRoot + '/grandma-dance-floor.mp4',
    posterUrl: mediaRoot + '/grandma-dance-floor.jpg',
  },
]

export function getH3VideoCase(slug: string) {
  return h3VideoCases.find((videoCase) => videoCase.slug === slug)
}

export function h3VideoCaseUrl(slug: string) {
  return '/prompts/minimax-h3/videos/' + slug
}
