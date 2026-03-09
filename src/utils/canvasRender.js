export function drawCheckerboard(ctx, x, y, w, h, size = 12) {
  for (let py = 0; py < h; py += size) {
    for (let px = 0; px < w; px += size) {
      const even = ((px + py) / size) % 2 === 0
      ctx.fillStyle = even ? '#e0e0e0' : '#f5f5f5'
      ctx.fillRect(x + px, y + py, size, size)
    }
  }
}

function hexToRgba(hex, opacity) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return `rgba(0,0,0,${opacity})`
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  return `rgba(${r},${g},${b},${opacity})`
}

export function getLogoColor(background, config) {
  const colors = config?.colors || {}
  const lightText = '#333333'
  const darkText = '#ffffff'
  if (background === 'white' || background === 'transparent') return lightText
  return darkText
}

export function drawPlaceholderLogo(ctx, w, h, logoColor) {
  const centerX = w / 2
  const centerY = h / 2
  const hexR = Math.min(w, h) * 0.08
  const hexCenterY = centerY - hexR * 0.3

  ctx.save()
  ctx.fillStyle = logoColor
  ctx.strokeStyle = logoColor
  ctx.lineWidth = 2

  const hexPoints = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    hexPoints.push([
      centerX - hexR * 1.2 + hexR * Math.cos(angle),
      hexCenterY + hexR * Math.sin(angle),
    ])
  }
  ctx.beginPath()
  hexPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])))
  ctx.closePath()
  ctx.stroke()

  ctx.font = `bold ${hexR * 1.4}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', centerX - hexR * 1.2, hexCenterY)

  ctx.font = `bold ${Math.min(w, h) * 0.055}px sans-serif`
  ctx.fillText('NEXUS AI', centerX + hexR * 0.5, centerY)
  ctx.restore()
}

function getDimensionsFromConfig(config, ratioId) {
  const list = config?.ratios || []
  const found = list.find((r) => r.id === ratioId) || list[0]
  if (!found) {
    return { w: 1920, h: 1080 }
  }
  return { w: found.width, h: found.height }
}

function getDefaultLogoSrc(logoType, background, config) {
  const logos = config?.logos || {}
  const typeConfig = logos[logoType] || logos.logoOnly
  const isLight = background === 'white' || background === 'transparent'
  const variant = isLight ? 'light' : 'dark'
  return typeConfig?.[variant] || typeConfig?.light || typeConfig?.dark
}

export function drawLogoLayer(ctx, w, h, state, config, defaultLogoImages = {}) {
  const logoColor = getLogoColor(state.background, config)
  const { logoImage, logoType } = state
  const logoToDraw = logoImage || defaultLogoImages[getDefaultLogoSrc(logoType, state.background, config)]

  if (logoToDraw && logoToDraw.complete && logoToDraw.naturalWidth) {
    const isCombo = logoType === 'logoHorizontal' || logoType === 'logoVertical'
    const sizeFactor = isCombo ? 1.5 : 1
    const maxLogoW = w * 0.4 * sizeFactor
    const maxLogoH = h * 0.25 * sizeFactor
    let lw = logoToDraw.width
    let lh = logoToDraw.height
    const scale = Math.min(maxLogoW / lw, maxLogoH / lh, 1)
    lw *= scale
    lh *= scale
    const lx = (w - lw) / 2
    const ly = (h - lh) / 2

    ctx.save()
    ctx.drawImage(logoToDraw, lx, ly, lw, lh)
    ctx.restore()

  } else {
    drawPlaceholderLogo(ctx, w, h, logoColor)
  }
}

function getBgColor(background, config) {
  const colors = config?.colors || {}
  const map = {
    brand: colors.brand || '#FF5900',
    white: colors.white || '#FFFFFF',
    darkgray: colors.darkgray || '#323339',
    black: colors.black || '#000000',
  }
  return map[background]
}

function drawImageCoverByWidth(ctx, img, canvasW, canvasH) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return
  const scale = canvasW / iw
  const dw = canvasW
  const dh = ih * scale
  const dx = 0
  const dy = (canvasH - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

export function renderToCanvas(bufferCanvas, state, overlayImages, options = {}) {
  const { forDownload = false, config = {}, defaultLogoImages = {} } = options
  const { w, h } = getDimensionsFromConfig(config, state.ratio)
  const ctx = bufferCanvas.getContext('2d')
  bufferCanvas.width = w
  bufferCanvas.height = h

  if (state.background === 'transparent') {
    if (forDownload) {
      ctx.clearRect(0, 0, w, h)
    } else {
      drawCheckerboard(ctx, 0, 0, w, h)
    }
  } else if (state.background === 'abstract01' || state.background === 'abstract02') {
    const path =
      state.background === 'abstract01'
        ? '/assets/overlays/BG-abstract01.png'
        : '/assets/overlays/BG-abstract02.png'
    const img = new Image()
    img.onload = () => {
      drawImageCoverByWidth(ctx, img, w, h)
      drawLogoLayer(ctx, w, h, state, config, defaultLogoImages)
    }
    img.src = path
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, w, h)
    return
  } else {
    ctx.fillStyle = getBgColor(state.background, config)
    ctx.fillRect(0, 0, w, h)
  }

  const overlayImg = state.overlayCategory !== 'none' && state.overlayCategory !== 'custom'
    ? overlayImages[state.overlayCategory]
    : state.customOverlayImage || null

  if (overlayImg && overlayImg.complete && overlayImg.naturalWidth) {
    ctx.save()
    ctx.globalAlpha = 0.2
    if (state.overlayGrayscale) {
      ctx.filter = 'saturate(0%)'
    }
    drawImageCoverByWidth(ctx, overlayImg, w, h)
    ctx.restore()
  }

  drawLogoLayer(ctx, w, h, state, config, options.defaultLogoImages)
}
