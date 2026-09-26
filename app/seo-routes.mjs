const modelPaths = Object.freeze({
  'seedance-2-5': '/app/video/seedance-2-5',
  'minimax-h3': '/app/video/minimax-h3',
  'gpt-image-2': '/app/image/gpt-image-2',
})

const legacyPaths = Object.freeze({
  '/minimax-h3-ai-video-generator': modelPaths['minimax-h3'],
  '/minimax-h3-ai-video-generator.html': modelPaths['minimax-h3'],
  '/gpt-image-2': modelPaths['gpt-image-2'],
  '/gpt-image-2.html': modelPaths['gpt-image-2'],
})

export function canonicalModelPath(modelId) {
  return Object.hasOwn(modelPaths, modelId) ? modelPaths[modelId] : null
}

export function modelIdFromPath(pathname) {
  return Object.keys(modelPaths).find(id => modelPaths[id] === pathname) ?? null
}

export function legacyModelRedirect(url) {
  if (legacyPaths[url.pathname]) return legacyPaths[url.pathname]
  if (url.pathname === '/app' || url.pathname === '/app/') {
    const modelId = url.searchParams.get('model')
    if (modelId && [...url.searchParams.keys()].every(key => key === 'model')) {
      return canonicalModelPath(modelId)
    }
  }
  return null
}
