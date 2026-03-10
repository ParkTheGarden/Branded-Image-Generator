const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i

export function withBasePath(path) {
  if (!path) return path
  if (
    ABSOLUTE_URL_PATTERN.test(path) ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path
  }

  const baseUrl = import.meta.env.BASE_URL || '/'
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${normalizedBaseUrl}${normalizedPath}`
}

export function normalizeConfigPaths(config) {
  if (!config) return config

  const logos = Object.fromEntries(
    Object.entries(config.logos || {}).map(([logoType, variants]) => [
      logoType,
      Object.fromEntries(
        Object.entries(variants || {}).map(([color, src]) => [color, withBasePath(src)])
      ),
    ])
  )

  const backgrounds = (config.backgrounds || []).map((background) => ({
    ...background,
    src: withBasePath(background.src),
  }))

  const overlays = (config.overlays || []).map((overlay) => ({
    ...overlay,
    src: withBasePath(overlay.src),
  }))

  return {
    ...config,
    logos,
    backgrounds,
    overlays,
  }
}
