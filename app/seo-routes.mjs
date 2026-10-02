import { localeFromPath, localizedPath, stripLocalePath } from './site-locale.mjs'

const modelPaths = Object.freeze({
  'seedance-2-5': '/app/video/seedance-2-5',
  'minimax-h3': '/app/video/minimax-h3',
  'seedance-3': '/app/video/seedance-3',
  'gpt-image-2': '/app/image/gpt-image-2',
})

const legacyPaths = Object.freeze({
  '/minimax-h3-ai-video-generator': modelPaths['minimax-h3'],
  '/minimax-h3-ai-video-generator.html': modelPaths['minimax-h3'],
  '/gpt-image-2': modelPaths['gpt-image-2'],
  '/gpt-image-2.html': modelPaths['gpt-image-2'],
})

export function canonicalModelPath(modelId, locale = 'en') {
  return Object.hasOwn(modelPaths, modelId) ? localizedPath(modelPaths[modelId], locale) : null
}

export function modelIdFromPath(pathname) {
  return Object.keys(modelPaths).find(id => modelPaths[id] === stripLocalePath(pathname)) ?? null
}

export function legacyModelRedirect(url) {
  const pathname = stripLocalePath(url.pathname)
  const locale = localeFromPath(url.pathname)
  if (legacyPaths[pathname]) return localizedPath(legacyPaths[pathname], locale) + url.search
  if (pathname === '/app' || pathname === '/app/') {
    const modelId = url.searchParams.get('model')
    if (modelId && [...url.searchParams.keys()].every(key => key === 'model')) {
      return canonicalModelPath(modelId, locale)
    }
  }
  return null
}
