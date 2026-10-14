export type ChristmasPhotoCategory = 'portraits' | 'couples' | 'families' | 'pets' | 'cards'
export type ChristmasPhotoFilter = 'all' | ChristmasPhotoCategory

export interface ChristmasPhotoPrompt {
  slug: string
  title: string
  category: ChristmasPhotoCategory
  summary: string
  editGuidance: string
  aspectRatio: '1:1' | '3:2' | '2:3'
  prompt: string
}

export const christmasPhotoUrl = 'https://seedance3-pro.com/ai-christmas-photo-prompt'
export const christmasPhotoTitle = 'AI Christmas Photo Prompts | Portraits, Families & Cards'
export const christmasPhotoDescription = 'Find 12 AI Christmas photo prompt templates for portraits, couples, families, pets and holiday cards. Copy a prompt or customize it in GPT Image 2.'

export const christmasPhotoCategories: { id: ChristmasPhotoFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'portraits', label: 'Portraits' },
  { id: 'couples', label: 'Couples' },
  { id: 'families', label: 'Families' },
  { id: 'pets', label: 'Pets' },
  { id: 'cards', label: 'Cards' },
]

export const christmasPhotoPrompts: ChristmasPhotoPrompt[] = [
  {
    slug: 'evergreen-window-portrait',
    title: 'Evergreen window portrait',
    category: 'portraits',
    summary: 'Soft daylight, cream knitwear and a quietly festive background.',
    editGuidance: 'Change the sweater color and tree decorations. Keep the face and window light as the focal points.',
    aspectRatio: '2:3',
    prompt: 'Create a photorealistic Christmas portrait of one adult seated beside a tall window, wearing a cream cable-knit sweater. If a reference image is provided, preserve the person\'s identity, facial proportions, skin tone and hairstyle. Frame chest-up at eye level, relaxed expression, hands resting naturally outside the frame. Soft winter daylight from the left, gentle shadow on the right cheek, realistic skin texture. A small evergreen tree with muted gold ornaments and warm blurred lights sits behind the subject. Restrained forest-green and cream palette, 85mm portrait lens look, no text or logos.',
  },
  {
    slug: 'snowy-morning-portrait',
    title: 'Snowy morning portrait',
    category: 'portraits',
    summary: 'A natural outdoor portrait with crisp snow and warm backlight.',
    editGuidance: 'Swap the scarf and coat colors. Use light snowfall so the eyes and facial details stay clear.',
    aspectRatio: '2:3',
    prompt: 'Photorealistic waist-up Christmas portrait of one adult on a snowy garden path, wearing a wool coat and a deep red scarf. If a reference image is provided, preserve the person\'s identity and recognizable facial features. The subject looks toward the camera with a small natural smile; shoulders relaxed, no exaggerated pose. Low morning sunlight outlines the hair, soft reflected light from snow illuminates the face. Sparse snowflakes, frost on evergreen branches, distant warm house lights, shallow depth of field with both eyes sharp. Realistic cold-weather skin and fabric texture, no text or logos.',
  },
  {
    slug: 'candlelit-holiday-portrait',
    title: 'Candlelit holiday portrait',
    category: 'portraits',
    summary: 'An intimate evening portrait with warm light and natural skin detail.',
    editGuidance: 'Choose the subject\'s age and outfit when no reference is attached. Keep candles below the face.',
    aspectRatio: '1:1',
    prompt: 'Create a photorealistic Christmas evening portrait of an older adult seated at a simple wooden dining table, wearing a dark green cardigan over an ivory shirt. If a reference image is provided, use that person and preserve their identity, age and natural skin details. Frame from the chest up with a calm, welcoming expression. A soft warm lamp provides the main light; two small candles below face level add a subtle glow. Evergreen sprigs and plain ceramic dishes in the foreground, softly blurred tree lights behind. Natural wrinkles, believable hands and warm shadows, no skin smoothing, text or logos.',
  },
  {
    slug: 'christmas-city-lights-portrait',
    title: 'Christmas city lights portrait',
    category: 'portraits',
    summary: 'A festive street portrait with reflected lights and a candid mood.',
    editGuidance: 'Replace the coat or street setting. Keep background shop signs out of focus and unreadable.',
    aspectRatio: '2:3',
    prompt: 'Photorealistic Christmas street portrait at blue hour, one adult in a charcoal wool coat holding a closed umbrella by their side. If a reference image is provided, preserve the person\'s identity, face shape and hairstyle. Three-quarter waist-up framing, subject glancing back toward the camera with an easy smile. Soft warm light from a nearby window lights the face; cool evening sky provides gentle fill. Small evergreen garlands and golden string lights overhead, damp pavement reflecting the glow, softly blurred pedestrians far behind. Natural proportions and realistic fabric, no readable signs, text or logos.',
  },
  {
    slug: 'couple-christmas-doorway',
    title: 'A Christmas welcome for two',
    category: 'couples',
    summary: 'A relaxed couple portrait at an evergreen decorated doorway.',
    editGuidance: 'Specify the two people and their outfits. Keep the pose comfortable rather than tightly intertwined.',
    aspectRatio: '2:3',
    prompt: 'Create a photorealistic Christmas couple portrait at a wooden front doorway decorated with a simple evergreen wreath. If reference images are provided, preserve each person\'s distinct identity and facial features without blending their faces. Two adults stand shoulder to shoulder, one gently holding the other\'s arm, looking at the camera with relaxed smiles. Coordinated oatmeal and forest-green winter layers, no matching costumes. Soft overcast daylight, warm indoor glow through the doorway, eye-level waist-up framing, both faces in sharp focus, realistic hands and skin texture. No text or logos.',
  },
  {
    slug: 'couple-tree-farm-walk',
    title: 'A walk through the tree farm',
    category: 'couples',
    summary: 'A candid holiday moment between rows of winter evergreens.',
    editGuidance: 'Adjust the coats, location and snowfall. Keep the camera wide enough to show the setting.',
    aspectRatio: '3:2',
    prompt: 'Photorealistic candid Christmas photo of two adults walking slowly between rows of evergreen trees at a small tree farm. If reference images are provided, preserve each person\'s identity, facial features and relative height. They turn slightly toward each other while sharing a quiet laugh, hands visible and naturally positioned. Tan and navy winter coats, knitted scarves, a light dusting of snow on the ground. Frame both people from the knees up with trees on either side, late afternoon side light, gentle shadows, faces clearly visible. Documentary photography, realistic movement and texture, no text or logos.',
  },
  {
    slug: 'family-christmas-morning',
    title: 'Christmas morning together',
    category: 'families',
    summary: 'A warm living room family photo with coordinated everyday clothes.',
    editGuidance: 'Set the number of family members and their ages. Replace gifts with a book or simple decorations.',
    aspectRatio: '3:2',
    prompt: 'Create a photorealistic Christmas morning family photo in a bright living room. If reference images are provided, preserve every person\'s distinct identity, age and recognizable features, and include the same people. Otherwise show two adults and two children sitting comfortably together on a rug beside a modest Christmas tree. Coordinated cream, muted red and olive knitwear; relaxed smiles and natural interaction. Eye-level group framing, all faces sharp and unobstructed, soft window daylight balanced with warm tree lights, plain wrapped gifts at the edge, realistic hands and body proportions. No text or logos.',
  },
  {
    slug: 'multigeneration-holiday-table',
    title: 'Three generations at the table',
    category: 'families',
    summary: 'A candid family gathering with clear faces and a simple holiday table.',
    editGuidance: 'Describe your actual family group. Keep table decorations low so no face is hidden.',
    aspectRatio: '3:2',
    prompt: 'Photorealistic Christmas family photograph of three generations gathered around a small dining table. If reference images are provided, preserve each person\'s identity, age and distinctive features; do not add or duplicate family members. Otherwise include five people of different ages sharing a relaxed conversation. Frame from a slightly raised eye-level angle so every face is visible. Simple green and cream clothes, low evergreen centerpiece, plain dishes, soft side-window light and a warm ceiling light. Natural smiles, realistic skin texture, believable hands, enough depth of field for the whole group. No text or logos.',
  },
  {
    slug: 'dog-beside-christmas-tree',
    title: 'A dog beside the Christmas tree',
    category: 'pets',
    summary: 'An eye-level pet portrait with a simple festive bandana.',
    editGuidance: 'Specify the dog\'s breed and markings without a reference. Change the bandana, keeping the pose natural.',
    aspectRatio: '1:1',
    prompt: 'Create a photorealistic Christmas photo of a dog sitting naturally on a soft cream rug beside an evergreen tree. If a pet reference image is provided, preserve the dog\'s breed, face shape, coat colors and distinctive markings. A loosely fitted plain red bandana, ears in their natural position, bright eyes looking toward the camera. Photograph at the dog\'s eye level with the full head and front paws visible. Soft daylight from a nearby window, warm blurred tree lights, muted gold ornaments placed high in the background, detailed fur and realistic anatomy. No human hands, text or logos.',
  },
  {
    slug: 'cat-christmas-window',
    title: 'A cat in the winter window',
    category: 'pets',
    summary: 'A quiet cat portrait with winter daylight and subtle decorations.',
    editGuidance: 'Replace the cat\'s coat pattern or window view. Keep decorations behind the pet and the fur natural.',
    aspectRatio: '2:3',
    prompt: 'Photorealistic Christmas pet portrait of a cat resting on a wide wooden windowsill on a folded oatmeal blanket. If a pet reference image is provided, preserve the cat\'s face, eye color, coat pattern and distinctive markings. The cat looks calmly toward the camera, paws tucked naturally, no costume. Cool winter daylight from the window with soft warm room light on the fur. A small evergreen arrangement and blurred golden lights remain in the distant background; faint snowy garden outside. Eye-level close framing with ears and tail inside the composition, sharp whiskers, realistic fur, no text or logos.',
  },
  {
    slug: 'family-christmas-card-space',
    title: 'A family card with room to write',
    category: 'cards',
    summary: 'A landscape family photo with a clean area for your own greeting.',
    editGuidance: 'Set the family size and clothing palette. Keep the right third blank, then add your greeting in an editor.',
    aspectRatio: '3:2',
    prompt: 'Create a photorealistic landscape Christmas family card photo. If reference images are provided, preserve each family member\'s distinct identity, age and facial features. Arrange the family close together in the left two-thirds of the frame beside a small evergreen tree, wearing cream and forest-green clothes with relaxed smiles. Soft window light, all faces sharp, realistic skin and hands, restrained gold decorations. Reserve the entire right third as clean, softly lit warm ivory wall with no objects, shadows crossing it, or decorations. Leave this copy space blank for a greeting to be added manually later. Generate no text, letters, watermark or logos.',
  },
  {
    slug: 'pet-christmas-card-space',
    title: 'A pet card with a blank greeting area',
    category: 'cards',
    summary: 'A vertical holiday card composition with open space above the pet.',
    editGuidance: 'Choose a dog or cat and your colors. Keep the upper half clear, then add greeting text manually.',
    aspectRatio: '2:3',
    prompt: 'Photorealistic vertical Christmas card photo featuring one pet seated naturally in the lower half of the frame on a cream wool blanket. If a pet reference image is provided, preserve its species, face shape, coat pattern and distinctive markings; otherwise show a small dog with a plain forest-green bandana. Soft studio window light, sharp eyes, detailed fur and realistic anatomy. Place a few blurred evergreen branches and muted gold ornaments only along the bottom corners. Reserve the upper half as a clean warm beige background with generous blank copy space for a greeting added manually afterward. No generated text, letters, watermark or logos.',
  },
]

export function filterChristmasPhotoPrompts(category: ChristmasPhotoFilter): ChristmasPhotoPrompt[] {
  return category === 'all' ? christmasPhotoPrompts : christmasPhotoPrompts.filter(item => item.category === category)
}

export function christmasPhotoPromptTryUrl(item: Pick<ChristmasPhotoPrompt, 'prompt' | 'aspectRatio'>) {
  return `/app/image/gpt-image-2?${new URLSearchParams({ prompt: item.prompt, aspect_ratio: item.aspectRatio }).toString()}`
}
