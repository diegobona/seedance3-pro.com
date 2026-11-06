import { h3VideoCases } from './h3-video-cases'
import { SEEDANCE_VIDEO_EXAMPLES } from '../../app/seedance-video-examples.mjs'
const falSource = 'https://fal.ai/learn/devs/seedance-2-5-prompting-guide'
const additions = [
  [0, 'Rainy morning errand', '雨天街角小店', 'Follow a raincoat-wearing customer into a warmly lit convenience store. Five seconds, steady shoulder-height tracking, wet reflections, natural footsteps.'],
  [2, 'Across the platform', '站台上的旅人', 'A traveler pulls a suitcase along a quiet train platform. Five seconds, fixed wide camera, even walking pace, soft daylight, continuous motion.'],
  [4, 'Coffee maker close-up', '咖啡机产品特写', 'A compact blue coffee maker rests on a bright kitchen counter. Five seconds, gentle camera push toward its material details, unchanged product shape.'],
  [6, 'Blue-hour city drive', '蓝调时刻城市行车', 'Track one silver car along a wet city street at dusk. Five seconds, low parallel camera, realistic reflections, steady speed and consistent vehicle shape.'],
  [7, 'Everyday product portrait', '日常好物展示', 'An adult presents a reusable drink container to the camera. Five seconds, steady medium shot, simple relaxed movement, natural indoor lighting.'],
  [8, 'Breakfast in close-up', '早餐糖浆特写', 'Amber syrup trickles onto a pancake stack. Five seconds, stationary macro view, warm light, slow natural liquid flow, unchanged plate and food.'],
] as const
export const seedanceVideoPromptCards = [
  ...additions.map(([index, en, zh, prompt]) => ({id: 'fal-' + index, title: [en, zh], prompt, src: '/assets/prompt-video-samples/fal-' + index + '.mp4', poster: '/assets/prompt-video-samples/fal-' + index + '.webp', sourceUrl: falSource, publisher: 'fal', ratio: index === 7 ? '9:16' : '16:9'})),
  ...SEEDANCE_VIDEO_EXAMPLES.map((item: {id:string;title:string[];prompt:string;src:string;poster:string;sourceUrl:string}) => ({...item, publisher: 'ByteDance Seed', ratio: '16:9'})),
]

const portraitSource = 'https://fal.ai/learn/tools/seedance-2-5-prompt-examples'
const portraits = [
  { index: 2, title: ['A tower above the crowd', '人群之上的高塔'], previewRatio: '3 / 4', prompt: 'A human tower stands in a sunlit plaza. Five seconds, slow upward camera movement, consistent formation, festive atmosphere and distant crowd ambience.' },
  { index: 19, title: ['Silk in the spotlight', '聚光灯下的丝绸礼服'], previewRatio: '9 / 16', prompt: 'A model poses in a flowing ivory silk gown. Five seconds, billowing fabric, vertical framing, dramatic stage lighting and a steady camera.' },
  { index: 24, title: ['A moment on the water', '水上自拍时刻'], previewRatio: '9 / 16', prompt: 'A person wearing a life vest films a relaxed selfie on a watercraft. Five seconds, vertical handheld composition, daylight, natural expression and sparkling water.' },
].map(item => ({ id: 'portrait-' + item.index, title: item.title, prompt: item.prompt, src: '/assets/prompt-video-samples/portrait-' + item.index + '.mp4', poster: '/assets/prompt-video-samples/portrait-' + item.index + '.webp', sourceUrl: portraitSource, publisher: 'fal', ratio: '9:16', previewRatio: item.previewRatio }))
const existingCards = h3VideoCases.map(item => ({ id: item.slug, title: [item.title, item.title], prompt: item.prompt, src: item.videoUrl, poster: item.posterUrl, sourceUrl: '', publisher: '', ratio: item.aspectRatio, previewRatio: item.aspectRatio.replace(':', ' / ') }))
const enriched = seedanceVideoPromptCards.map(item => ({...item, previewRatio: item.ratio.replace(':', ' / ')}))
// Mix portrait and landscape scenes; the three pinned examples stay in the final section.
export const mixedVideoPromptCards = [enriched[0], portraits[0], enriched[1], enriched[2], portraits[1], enriched[3], enriched[4], enriched[5], portraits[2], ...enriched.slice(6), ...existingCards]
