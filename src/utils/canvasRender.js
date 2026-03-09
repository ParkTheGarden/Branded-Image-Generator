export function drawCheckerboard(ctx, x, y, w, h, size = 12) {
  for (let py = 0; py < h; py += size) {
    for (let px = 0; px < w; px += size) {
      const even = ((px + py) / size) % 2 === 0
      ctx.fillStyle = even ? '#e0e0e0' : '#f5f5f5'
      ctx.fillRect(x + px, y + py, size, size)
    }
  }
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

function getDefaultLogoSrc(logoType, background, config, logoColor) {
  const logos = config?.logos || {}
  const typeConfig = logos[logoType] || logos.logoOnly || {}
  const desired = logoColor || 'white'
  if (typeConfig[desired]) return typeConfig[desired]

  const isLightBg =
    background === 'white' || background === 'lightgray' || background === 'transparent'
  if (isLightBg && typeConfig.black) return typeConfig.black
  if (!isLightBg && typeConfig.white) return typeConfig.white

  const any = Object.values(typeConfig)[0]
  return any
}

export function drawLogoLayer(ctx, w, h, state, config, defaultLogoImages = {}) {
  const logoColor = getLogoColor(state.background, config)
  const { logoType, logoColor: logoColorId } = state
  const logoSrc = getDefaultLogoSrc(logoType, state.background, config, logoColorId)
  const logoToDraw = defaultLogoImages[logoSrc]

  if (logoToDraw && logoToDraw.complete && logoToDraw.naturalWidth) {
    let sizeFactor = 1
    if (logoType === 'logoOnly') {
      // 로고만일 때 기본보다 약간 크게
      sizeFactor = 1.25
    } else if (logoType === 'logoHorizontal') {
      // 로고+슬로건 가로형: 기존(1.5배)보다 1.2배 더 크게 → 1.8배
      sizeFactor = 1.8
    } else if (logoType === 'logoVertical') {
      // 세로형은 기존 1.5배 유지
      sizeFactor = 1.5
    }
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
    lightgray: colors.lightgray || '#FAFAFC',
  }
  return map[background]
}

function drawImageCoverByWidth(ctx, img, canvasW, canvasH) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) return
  // object-fit: cover와 동일한 동작
  const scale = Math.max(canvasW / iw, canvasH / ih)
  const dw = iw * scale
  const dh = ih * scale
  const dx = (canvasW - dw) / 2
  const dy = (canvasH - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

export function renderToCanvas(bufferCanvas, state, overlayImages, options = {}) {
  const { forDownload = false, config = {}, defaultLogoImages = {}, backgroundImages = {} } = options
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
    const img = backgroundImages[state.background]
    if (img && img.complete && img.naturalWidth) {
      drawImageCoverByWidth(ctx, img, w, h)
    } else {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)
    }
  } else {
    ctx.fillStyle = getBgColor(state.background, config)
    ctx.fillRect(0, 0, w, h)
  }

  const isAbstractBackground = state.background === 'abstract01' || state.background === 'abstract02'
  const overlayImg =
    !isAbstractBackground && state.overlayCategory !== 'none' && state.overlayCategory !== 'custom'
      ? overlayImages[state.overlayCategory]
      : null

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
