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
  if (state.logoType === 'none') return

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
    const userScale = typeof state.logoScale === 'number' ? state.logoScale : 1
    const safeLogoScale = Math.max(0.1, Math.min(5, userScale))
    lw *= safeLogoScale
    lh *= safeLogoScale

    const posX = typeof state.logoPosX === 'number' ? state.logoPosX : 0.5
    const posY = typeof state.logoPosY === 'number' ? state.logoPosY : 0.5
    const safePosX = Math.max(0, Math.min(1, posX))
    const safePosY = Math.max(0, Math.min(1, posY))
    const lx = w * safePosX - lw / 2
    const ly = h * safePosY - lh / 2

    ctx.save()
    ctx.drawImage(logoToDraw, lx, ly, lw, lh)
    ctx.restore()
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

function drawImageCoverByWidthGrayscale(ctx, img, canvasW, canvasH) {
  // Prefer native canvas filter when available.
  if (typeof ctx.filter === 'string') {
    const prev = ctx.filter
    ctx.filter = 'grayscale(1) saturate(0)'
    drawImageCoverByWidth(ctx, img, canvasW, canvasH)
    ctx.filter = prev
    return
  }

  // Fallback: draw to offscreen, desaturate pixels, then draw back.
  const off = document.createElement('canvas')
  off.width = canvasW
  off.height = canvasH
  const octx = off.getContext('2d')
  if (!octx) {
    drawImageCoverByWidth(ctx, img, canvasW, canvasH)
    return
  }

  drawImageCoverByWidth(octx, img, canvasW, canvasH)
  try {
    const imageData = octx.getImageData(0, 0, canvasW, canvasH)
    const d = imageData.data
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)
      d[i] = gray
      d[i + 1] = gray
      d[i + 2] = gray
    }
    octx.putImageData(imageData, 0, 0)
  } catch (_) {
    // If getImageData is blocked, fall back to normal draw.
    drawImageCoverByWidth(ctx, img, canvasW, canvasH)
    return
  }

  ctx.drawImage(off, 0, 0)
}

export function renderToCanvas(bufferCanvas, state, overlayImages, options = {}) {
  const { forDownload = false, config = {}, defaultLogoImages = {}, backgroundImages = {}, dimensions = null } = options
  const base = dimensions?.width && dimensions?.height ? { w: dimensions.width, h: dimensions.height } : getDimensionsFromConfig(config, state.ratio)
  const { w, h } = base // logical coordinate space
  const ctx = bufferCanvas.getContext('2d')

  // bufferCanvas.width/height are the actual pixel resolution we want to draw into.
  // When those differ from logical w/h (e.g. zoom preview), we map the logical
  // coordinate space to the actual buffer using ctx.scale().
  const actualW = bufferCanvas.width || w
  const actualH = bufferCanvas.height || h

  // Ensure we have a valid buffer.
  if (!bufferCanvas.width || !bufferCanvas.height) {
    bufferCanvas.width = w
    bufferCanvas.height = h
  }

  // Reset transform so we don't accumulate scaling.
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  // For transparent backgrounds (download), clear the full actual buffer first.
  if (state.background === 'transparent' && forDownload) {
    ctx.clearRect(0, 0, actualW, actualH)
  }

  ctx.save()
  ctx.scale(actualW / w, actualH / h)

  if (state.background === 'transparent') {
    if (forDownload) {
      // Already cleared in actual pixel space.
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
  let overlayImg =
    !isAbstractBackground && state.overlayCategory !== 'none' && state.overlayCategory !== 'custom'
      ? overlayImages[state.overlayCategory]
      : null
  if (state.overlayCategory === 'custom' && options.customOverlayImage) {
    overlayImg = options.customOverlayImage
  }

  if (overlayImg && (overlayImg.complete !== false) && (overlayImg.naturalWidth ?? overlayImg.width)) {
    const opacity = Math.min(1, Math.max(0, (state.overlayOpacity ?? 20) / 100))
    ctx.save()
    ctx.globalAlpha = opacity
    if (state.overlayGrayscale) {
      drawImageCoverByWidthGrayscale(ctx, overlayImg, w, h)
    } else {
      drawImageCoverByWidth(ctx, overlayImg, w, h)
    }
    ctx.restore()
  }

  drawLogoLayer(ctx, w, h, state, config, options.defaultLogoImages)

  /* 텍스트 레이어는 다운로드 시에만 캔버스에 그리기 (미리보기는 HTML 오버레이로 표시) */
  if (forDownload) {
    const texts = state.texts || []
    const typography = options.typography || config.typography
    if (texts.length && typography) {
      drawTextLayer(ctx, w, h, texts, typography)
    }
  }

  ctx.restore()
}

function drawTextLayer(ctx, w, h, texts, typography) {
  const fontFamily = typography.fontFamily || 'Pretendard Variable, sans-serif'
  const sizes = typography.textSizes || []
  const weights = typography.textWeights || []
  const colors = typography.textColors || []
  const lineHeightRatio = typography.lineHeightRatio ?? 1.4
  const letterSpacingEm = parseFloat(String(typography.letterSpacing || '').replace('em', '')) || -0.01
  const getSize = (id) => sizes.find((s) => s.id === id)?.value ?? 18
  const getWeight = (id) => weights.find((w) => w.id === id)?.value ?? 400
  const getColor = (id) => colors.find((c) => c.id === id)?.value ?? '#000000'
  const scale = Math.min(w, h) / 540

  texts.forEach((t) => {
    const px = t.x * w
    const py = t.y * h
    const size = getSize(t.fontSizeId)
    const weight = getWeight(t.fontWeightId)
    const color = getColor(t.colorId)
    const align = t.textAlign || 'center'
    const fontSize = Math.max(12, Math.round(size * scale))
    const lineHeight = fontSize * lineHeightRatio
    const letterSpacingPx = fontSize * letterSpacingEm
    const lines = (t.content || '').split('\n')

    ctx.save()
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    // We'll compute per-line X based on alignment while keeping the overall block centered at (px, py).
    ctx.textAlign = 'left'
    if (ctx.letterSpacing !== undefined) {
      ctx.letterSpacing = `${letterSpacingPx}px`
    }

    const lineWidths = lines.map((line) => ctx.measureText(line).width || 0)
    const maxWidth = Math.max(0, ...lineWidths)
    const totalHeight = lines.length * lineHeight
    lines.forEach((line, i) => {
      const lineY = py - totalHeight / 2 + (i + 0.5) * lineHeight
      const lineWidth = lineWidths[i] || 0
      let lineX = px
      if (align === 'left') {
        lineX = px - maxWidth / 2
      } else if (align === 'right') {
        lineX = px + maxWidth / 2 - lineWidth
      } else {
        // center
        lineX = px - lineWidth / 2
      }
      ctx.fillText(line, lineX, lineY)
    })
    ctx.restore()
  })
}
