// Verified 2026-10-20 against BFL's own publications. Official FLUX 3
// specifications must stay distinct from this site's H3 / GPT Image trial.
export const FLUX_3_PATH = '/app/video/flux-3';
export const FLUX_3_SOURCES = {
  announcement: 'https://bfl.ai/blog/flux-3',
  video: 'https://bfl.ai/models/flux-3-video',
  klein: 'https://bfl.ai/blog/flux-3-image-klein',
  previous: 'https://bfl.ai/models/flux-2',
  dashboard: 'https://dashboard.bfl.ai/',
};
export const FLUX_3_VIDEO_DISCLOSURE = 'Powered by MiniMax H3, not the official Black Forest Labs FLUX 3.';
export const FLUX_3_IMAGE_DISCLOSURE = 'Powered by GPT Image 2.5, not the official Black Forest Labs FLUX 3.';

const english = {
  title: 'FLUX 3 Video & Image Generator | Features & Trial',
  description: 'Explore FLUX 3 video, image and audio capabilities. Try MiniMax H3 video and GPT Image 2.5 image generation here, with clear model disclosure.',
  h1: 'FLUX 3 Video & Image Generator',
  intro: 'FLUX 3 is Black Forest Labs’ multimodal family for images, video and audio. Learn about the official models or try our current generators below.',
  videoCta: 'Try MiniMax H3 video',
  imageCta: 'Create images with GPT Image 2.5',
  headings: ['What is FLUX 3', 'FLUX 3 video generation', 'FLUX 3 image generation', 'FLUX 3 vs FLUX 2', 'Early Access', 'How to use', 'FAQ'],
  about: 'Black Forest Labs introduced FLUX 3 on July 23, 2026 as a shared architecture trained across image, video and audio. Video creation and image creation are separate products in the family.',
  videoFeatures: [
    ['Video and sound', 'The official video model creates clips up to 20 seconds, with optional synchronized audio and multilingual dialogue.'],
    ['Visual direction', 'Inputs include text, images, video and ordered keyframes; output ranges from HD to UHD/4K.'],
    ['Continue or edit', 'Video continuation and prompt-guided editing extend the workflow beyond a single new clip.'],
  ],
  image: 'Released on October 15, 2026, FLUX 3 Image Klein is a 5.6B-parameter model for generating and editing pictures. It supports native 4K, up to 10 reference images and bounding boxes for placement or local edits.',
  imageNote: 'Klein’s downloadable weights use the FLUX Kommunity License. This is an image-model release, not an open release of the complete video-and-audio family.',
  columns: ['Dimension', 'FLUX 2', 'FLUX 3'],
  comparison: [
    ['Model scope', 'Image generation and editing', 'Image, video and audio in a multimodal family'],
    ['Video and sound', 'Documented as an image model', 'Up to 20-second videos with optional native audio'],
    ['Image output', 'Up to 4 megapixels', 'Native 4K in Image Klein'],
    ['Image references', 'Up to 10 images', 'Up to 10 images in Image Klein'],
  ],
  comparisonNote: 'The image comparison names the specific product variant; it does not equate 4 megapixels with 4K.',
  access: 'The original announcement opened Early Access. BFL’s current video page offers dashboard and API access with usage-based billing; Image Klein is also available through the API and as downloadable weights.',
  accessNote: 'This site has no official FLUX 3 integration. The video form on this page uses MiniMax H3; the image link opens GPT Image 2.5.',
  officialCta: 'Open official BFL dashboard ↗',
  steps: [
    'For official FLUX 3, open the BFL dashboard and check access to the video or image product you need.',
    'Enter a prompt and add references supported by that product; describe motion and sound when creating a video.',
    'Choose the output settings, review BFL’s credit cost, and submit through its dashboard or API.',
    'To try this site instead, use the MiniMax H3 form on this page or open GPT Image 2.5 for images; each uses its own displayed limits.',
  ],
  trial: 'Here, guests can try 10 video seconds with MiniMax H3 and 2 images shared across GPT Image 2 and 2.5. These are this site’s trial allowances, not free FLUX 3 access.',
  questions: [
    ['Is FLUX 3 available now?', 'Yes. FLUX 3 Video is offered through BFL’s dashboard and API, while Image Klein is available through the API and downloadable weights. This website provides alternatives using MiniMax H3 and GPT Image 2.5.'],
    ['Is FLUX 3 open source?', 'Only specific releases have downloadable weights; the whole family is not established as open source. Image Klein uses the FLUX Kommunity License, so check its terms before deploying it.'],
    ['What is the difference between FLUX 3 and FLUX 2?', 'FLUX 3 brings video and audio into a multimodal family, whereas FLUX 2 is documented for image generation and editing. Compare individual variants rather than assuming every family member has the same features.'],
    ['Can FLUX 3 generate video?', 'Yes, the official video model supports clips up to 20 seconds and optional native sound. Generation in the form on this page uses MiniMax H3 instead.'],
    ['Is FLUX 3 free?', 'BFL charges for hosted video generation according to usage. Image Klein’s weights are available under a conditional license; this site’s free trials use different models.'],
    ['What resolution does FLUX 3 support?', 'BFL documents video output from HD to UHD/4K and native 4K for Image Klein. Those official specifications do not apply to this site’s MiniMax H3 or GPT Image 2.5 trials.'],
  ],
  sourcesLabel: 'Official sources · checked October 20, 2026',
  sourceLabels: ['FLUX 3 announcement', 'FLUX 3 Video', 'FLUX 3 Image Klein', 'FLUX 2'],
};

const chinese = {
  title: 'FLUX 3 视频与图像生成器 | 功能介绍与试用',
  description: '了解 FLUX 3 的视频、图像与音频能力、Early Access 状态和开放权重。本站提供 MiniMax H3 视频与 GPT Image 2.5 图像试用，并明确披露实际模型。',
  h1: 'FLUX 3 视频与图像生成器',
  intro: 'FLUX 3 是 Black Forest Labs 的图像、视频和音频多模态模型系列。了解官方模型，或使用下方本站现有模型进行创作。',
  videoCta: '试用 MiniMax H3 视频生成',
  imageCta: '使用 GPT Image 2.5 生成图像',
  headings: ['What is FLUX 3', 'FLUX 3 video generation', 'FLUX 3 image generation', 'FLUX 3 vs FLUX 2', 'Early Access', 'How to use', 'FAQ'],
  about: 'Black Forest Labs 于 2026 年 7 月 23 日介绍 FLUX 3，以统一架构联合学习图像、视频和音频。该系列分别提供视频创作和图像创作产品。',
  videoFeatures: [
    ['视频与声音', '官方视频模型单次最长生成 20 秒，可同时生成原生音频，并支持多语言对白。'],
    ['画面控制', '支持文本、图像、视频和有序关键帧输入，视频输出覆盖 HD 至 UHD/4K。'],
    ['续写与编辑', '支持视频续写和提示词驱动的编辑，可在现有片段上继续创作。'],
  ],
  image: 'FLUX 3 Image Klein 于 2026 年 10 月 15 日发布，是用于图像生成和编辑的 56 亿参数模型。支持原生 4K、最多 10 张参考图，以及通过边界框控制元素位置或局部编辑区域。',
  imageNote: 'Klein 可下载权重，采用 FLUX Kommunity License。这是图像模型的开放权重发布，不代表完整的视频和音频模型系列全部开放。',
  columns: ['维度', 'FLUX 2', 'FLUX 3'],
  comparison: [
    ['模型范围', '图像生成与编辑', '覆盖图像、视频和音频的多模态系列'],
    ['视频与音频', '官方将其定位为图像模型', '最长 20 秒视频，可选原生音频'],
    ['图像输出', '最高 400 万像素', 'Image Klein 支持原生 4K'],
    ['图像参考', '最多 10 张图像', 'Image Klein 最多 10 张图像'],
  ],
  comparisonNote: '图像规格按具体产品版本对比；400 万像素和 4K 不是同一个指标。',
  access: '最初公告已开放 Early Access。BFL 当前视频产品页提供控制台和 API 入口，按使用量计费；Image Klein 同时提供 API 和可下载权重。',
  accessNote: '本站尚未接入官方 FLUX 3。本页视频表单使用 MiniMax H3；图像入口进入 GPT Image 2.5。',
  officialCta: '打开 BFL 官方控制台 ↗',
  steps: [
    '使用官方 FLUX 3 时，先进入 BFL 控制台，确认账号可使用的视频或图像产品。',
    '输入提示词，并添加所选产品支持的参考素材；视频提示词可说明动作与声音。',
    '选择输出设置，查看 BFL 显示的费用，再通过控制台或 API 提交。',
    '若要使用本站试用，可在本页使用 MiniMax H3，或前往 GPT Image 2.5 生成图像；以各表单显示的实际限制为准。',
  ],
  trial: '本站游客可免费使用 MiniMax H3 生成共 10 秒视频；GPT Image 2 与 2.5 共用 2 张免费图像额度。这些是本站现有模型的体验额度，不是官方 FLUX 3 免费额度。',
  questions: [
    ['FLUX 3 现在可以使用吗？', '可以。BFL 提供 FLUX 3 Video 的控制台和 API，Image Klein 提供 API 和可下载权重。本站使用 MiniMax H3 和 GPT Image 2.5 提供替代创作入口。'],
    ['FLUX 3 开源吗？', '部分版本提供可下载权重，不能把整个系列统称为开源。Image Klein 采用 FLUX Kommunity License，部署前应查看对应条款。'],
    ['FLUX 3 和 FLUX 2 有什么区别？', 'FLUX 3 是加入视频和音频能力的多模态系列，FLUX 2 则定位于图像生成和编辑。应按具体版本对比，不能把某一版本的功能套用到整个系列。'],
    ['FLUX 3 可以生成视频吗？', '可以，官方视频模型支持最长 20 秒片段和可选原生音频。本页表单实际调用的是 MiniMax H3。'],
    ['FLUX 3 免费吗？', 'BFL 托管视频生成按使用量计费。Image Klein 权重采用有条件的许可证；本站免费试用使用其他模型。'],
    ['FLUX 3 支持什么分辨率？', 'BFL 视频文档列出 HD 至 UHD/4K，Image Klein 支持原生 4K。这些官方规格不等于本站 MiniMax H3 或 GPT Image 2.5 试用规格。'],
  ],
  sourcesLabel: '官方来源 · 核实于 2026 年 10 月 20 日',
  sourceLabels: ['FLUX 3 总公告', 'FLUX 3 Video', 'FLUX 3 Image Klein', 'FLUX 2'],
};

export function flux3Content(locale = 'en') { return locale === 'zh' ? chinese : english; }
export function flux3FaqSchema(locale = 'en') {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: flux3Content(locale).questions.map(([name, text]) => ({
      '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text },
    })),
  };
}
