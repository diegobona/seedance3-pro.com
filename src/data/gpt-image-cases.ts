import rawCases from './gpt-image-cases.json'

export interface GptImageCase {
  slug: string
  title: string
  seoTitle: string
  summary: string
  creativeNote: string
  prompt: string
  style: string
  topic: string
  sourceUrl: string
  aspectRatio: '3:2' | '2:3' | '1:1'
  size: '1536x1024' | '1024x1536' | '1024x1024'
  imageUrl: string
}

export const gptImageCases = rawCases as GptImageCase[]

export function getGptImageCase(slug: string) {
  return gptImageCases.find((imageCase) => imageCase.slug === slug)
}

export function gptImageCaseUrl(slug: string) {
  return '/gpt-image-2-prompts/' + slug
}

export function gptImageCaseTryUrl(imageCase: GptImageCase) {
  const search = new URLSearchParams({
    prompt: imageCase.prompt,
    aspect_ratio: imageCase.aspectRatio,
  })
  return '/app/image/gpt-image-2?' + search.toString()
}
