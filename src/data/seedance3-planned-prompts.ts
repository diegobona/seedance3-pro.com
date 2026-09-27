export interface Seedance3PlannedPrompt {
  slug: string
  title: string
  category: string
  prompt: string
}

// Test ideas only. These are not generated works or claims about the model's capabilities.
export const seedance3PlannedPrompts: Seedance3PlannedPrompt[] = [
  {
    slug: 'rainy-platform-reunion',
    title: 'Reunion on a rainy platform',
    category: 'Cinematic people',
    prompt: 'A traveler steps off a train onto a rain-soaked platform at dusk. Across the platform, an old friend recognizes them; both pause, smile, and walk toward each other. The camera starts behind the traveler, then glides sideways to hold both faces in one frame. Reflections in the puddles, soft station lights, natural body language, no text or logos.',
  },
  {
    slug: 'corgi-delivery',
    title: 'The corgi delivers the mail',
    category: 'Animal comedy',
    prompt: 'A determined corgi carries a single envelope down a quiet garden path. Just as it reaches the front door, a gust of wind lifts the envelope; the corgi leaps, catches it, and sits proudly for the camera. One continuous playful shot at the dog’s eye level, believable fur and motion, warm morning light, no text or logos.',
  },
  {
    slug: 'ceramic-cup-reveal',
    title: 'Ceramic cup in morning light',
    category: 'Product film',
    prompt: 'An unbranded handmade ceramic cup rests on a stone kitchen counter. A hand pours coffee as sunlight crosses the glaze and steam curls into the air. Begin with a close-up of the textured rim, then make a restrained camera orbit to reveal the full cup. Premium yet natural product photography, realistic liquid, no text or logos.',
  },
  {
    slug: 'paper-fox-lanterns',
    title: 'Paper fox and floating lanterns',
    category: 'Animation',
    prompt: 'A small folded-paper fox bounds across stepping stones above a moonlit pond while paper lanterns drift past. The fox stops to inspect its reflection, tilts its head, then hops onward. Handcrafted stop-motion texture, gentle sideways camera move, visible paper folds, rich indigo and amber color, no text or logos.',
  },
  {
    slug: 'night-market-chef',
    title: 'Chef at a night market',
    category: 'Food & motion',
    prompt: 'At a lively outdoor night market, a chef tosses vegetables in a wok and catches them cleanly as steam rises around the stall. Follow the motion from the chef’s hands to the sizzling pan, then settle on a delighted customer’s reaction. Warm practical lights, crisp food detail, believable hands and utensils, no readable signage or logos.',
  },
  {
    slug: 'skateboard-puddle',
    title: 'Skateboarder and the puddle',
    category: 'Action',
    prompt: 'A skateboarder rolls toward a shallow puddle on an empty city street after rain. They jump over it, and the reflection briefly seems to jump a beat later. Track alongside the board, then hold on the playful reflection as the rider exits frame. Grounded skating physics, overcast daylight, one continuous shot, no text or logos.',
  },
  {
    slug: 'greenhouse-time-lapse',
    title: 'A greenhouse wakes up',
    category: 'Nature',
    prompt: 'Inside a quiet greenhouse before sunrise, leaves unfurl and dew catches the first light. A gardener opens the door and walks through the rows as the camera moves slowly between plants. Blend the change from blue dawn to warm morning without a hard cut. Detailed foliage, natural atmosphere, calm cinematic motion, no text or logos.',
  },
  {
    slug: 'museum-portrait-wink',
    title: 'The museum portrait winks',
    category: 'Visual joke',
    prompt: 'A visitor studies a large painted portrait in a quiet museum gallery. As the visitor turns away, the figure in the painting gives a tiny wink; the visitor turns back, and the portrait is perfectly still. Keep the visitor and painting visible in one balanced shot. Subtle dry humor, realistic gallery lighting, no text or logos.',
  },
  {
    slug: 'underwater-ballet',
    title: 'Underwater fabric ballet',
    category: 'Fashion',
    prompt: 'A dancer in a flowing, unbranded blue costume moves slowly underwater while long ribbons spiral around them. The camera drifts from a wide silhouette to a close view of the fabric and hands. Clear sense of depth, graceful buoyant motion, filtered sunlight, editorial fashion mood, no text or logos.',
  },
  {
    slug: 'snow-fox-first-steps',
    title: 'Arctic fox in fresh snow',
    category: 'Wildlife',
    prompt: 'A young arctic fox steps out from behind a snow-covered rock, listens, then bounds into powdery snow. The camera stays low and steady as flakes catch the pale morning light. Natural animal movement, visible paw prints, soft winter colors, documentary-style observation, no text or logos.',
  },
]

export function seedance3PromptTryUrl(prompt: Seedance3PlannedPrompt) {
  return `/app/video/seedance-3?prompt=${encodeURIComponent(prompt.prompt)}`
}
