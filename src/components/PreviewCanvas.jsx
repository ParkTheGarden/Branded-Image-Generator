import { useRef, useEffect, useState, useCallback } from 'react'
import { useConfig } from '../context/ConfigContext'
import { renderToCanvas } from '../utils/canvasRender'
import { trackPngDownload } from '../utils/tracking'

export default function PreviewCanvas({
  state,
  onUpdate,
  onAddText,
  onUpdateText,
  onRemoveText,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onPushHistorySnapshot,
}) {
  const config = useConfig()
  const canvasRef = useRef(null)
  const wrapperRef = useRef(null)
  const textInputRef = useRef(null)
  const [overlayImages, setOverlayImages] = useState({})
  const [defaultLogoImages, setDefaultLogoImages] = useState({})
  const [backgroundImages, setBackgroundImages] = useState({})
  const [customOverlayImg, setCustomOverlayImg] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [dragState, setDragState] = useState({ id: null, startX: 0, startY: 0, startTexX: 0, startTexY: 0 })
  const [logoDragState, setLogoDragState] = useState({
    mode: null, // 'move' | 'resize' | null
    startClientX: 0,
    startClientY: 0,
    startPosX: 0.5,
    startPosY: 0.5,
    startScale: 1,
    baseW: 0,
    baseH: 0,
  })

  const clampPx = (n, min, max) => {
    const x = Number(n)
    if (Number.isNaN(x)) return min
    return Math.max(min, Math.min(max, x))
  }

  const isCustomRatio = state.ratio === 'custom'
  const ratioCfg = isCustomRatio
    ? {
        width: clampPx(state.customRatioWidth ?? 1920, 1, 3000),
        height: clampPx(state.customRatioHeight ?? 1080, 1, 3000),
      }
    : (config.ratios || []).find((r) => r.id === state.ratio) || (config.ratios || [])[0] || { width: 1920, height: 1080 }

  const w = ratioCfg.width
  const h = ratioCfg.height

  const [customDraftW, setCustomDraftW] = useState(ratioCfg.width)
  const [customDraftH, setCustomDraftH] = useState(ratioCfg.height)

  useEffect(() => {
    if (!isCustomRatio) return
    setCustomDraftW(ratioCfg.width)
    setCustomDraftH(ratioCfg.height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ratio])

  useEffect(() => {
    const logos = config.logos || {}
    const srcs = new Set()
    Object.values(logos).forEach((v) => {
      if (typeof v === 'object' && v !== null) {
        Object.values(v).forEach((s) => s && srcs.add(s))
      }
    })
    Promise.all(
      [...srcs].map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve({ src, img })
            img.onerror = () => resolve(null)
            img.src = src
          })
      )
    ).then((results) => {
      const map = {}
      results.forEach((r) => r && (map[r.src] = r.img))
      setDefaultLogoImages(map)
    })
  }, [config.logos])

  useEffect(() => {
    const overlays = config.overlays || []
    const loaders = overlays.filter((c) => c.src).map((cat) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve({ id: cat.id, img })
        img.onerror = () => resolve(null)
        img.src = cat.src
      })
    })
    Promise.all(loaders).then((results) => {
      const map = {}
      results.forEach((r) => r && (map[r.id] = r.img))
      setOverlayImages(map)
    })
  }, [config.overlays])

  useEffect(() => {
    const bgs = config.backgrounds || []
    const loaders = bgs
      .filter((b) => b.type === 'image' && b.src)
      .map((bg) => {
        return new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve({ id: bg.id, img })
          img.onerror = () => resolve(null)
          img.src = bg.src
        })
      })

    Promise.all(loaders).then((results) => {
      const map = {}
      results.forEach((r) => r && (map[r.id] = r.img))
      setBackgroundImages(map)
    })
  }, [config.backgrounds])

  const customOverlayUrlRef = useRef(null)
  useEffect(() => {
    const url = state.customOverlayImage
    if (customOverlayUrlRef.current) {
      URL.revokeObjectURL(customOverlayUrlRef.current)
      customOverlayUrlRef.current = null
    }
    if (!url) {
      setCustomOverlayImg(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      customOverlayUrlRef.current = url
      setCustomOverlayImg(img)
    }
    img.onerror = () => setCustomOverlayImg(null)
    img.src = url
    return () => {
      if (customOverlayUrlRef.current) {
        URL.revokeObjectURL(customOverlayUrlRef.current)
        customOverlayUrlRef.current = null
      }
    }
  }, [state.customOverlayImage])

  const overlayImgForRender =
    state.overlayCategory === 'custom' ? customOverlayImg : overlayImages[state.overlayCategory]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const wrapper = wrapperRef.current
    const wrapperRect = wrapper?.getBoundingClientRect()
    const availW = Math.max(1, (wrapperRect?.width ?? window.innerWidth) - 48)
    const availH = Math.max(1, (wrapperRect?.height ?? window.innerHeight) - 48)
    const baseScale = Math.min(1, availW / w, availH / h)
    const scale = baseScale * zoom
    const dpr = window.devicePixelRatio || 1
    // Render at zoom*DPR resolution and keep CSS display size derived from the
    // unrounded logical size (w/h) to prevent aspect drift during zoom.
    const displayW = w * scale
    const displayH = h * scale
    const bufferW = Math.max(1, Math.round(displayW * dpr))
    // Match buffer height to the actual CSS display height to avoid any non-uniform resampling.
    const bufferH = Math.max(1, Math.round(displayH * dpr))

    canvas.width = bufferW
    canvas.height = bufferH
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    renderToCanvas(canvas, state, overlayImages, {
      forDownload: false,
      config,
      defaultLogoImages,
      backgroundImages,
      customOverlayImage: state.overlayCategory === 'custom' ? overlayImgForRender : null,
      typography: config.typography,
      // Draw in logical coordinate system; renderToCanvas will map it to the
      // actual buffer size via ctx.scale.
      dimensions: { width: w, height: h },
    })
  }, [state, overlayImages, config, defaultLogoImages, backgroundImages, zoom, overlayImgForRender])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const off = document.createElement('canvas')
    off.width = w
    off.height = h

    // Track "button click" as a single event per download attempt.
    trackPngDownload({
      ratio: state.ratio,
      background: state.background,
      overlayCategory: state.overlayCategory,
      overlayOpacity: state.overlayOpacity,
      overlayGrayscale: state.overlayGrayscale,
    })

    renderToCanvas(off, state, overlayImages, {
      forDownload: true,
      config,
      defaultLogoImages,
      backgroundImages,
      customOverlayImage: state.overlayCategory === 'custom' ? overlayImgForRender : null,
      typography: config.typography,
      dimensions: { width: w, height: h },
    })
    off.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const sizePart = state.ratio === 'custom' ? `${w}x${h}` : state.ratio.replace(':', 'x')
      a.download = `brand-image-${sizePart}-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const getDefaultLogoSrc = (logoType, background, logoColorId) => {
    const logos = config?.logos || {}
    const typeConfig = logos[logoType] || logos.logoOnly || {}
    const desired = logoColorId || 'white'
    if (typeConfig[desired]) return typeConfig[desired]

    const isLightBg = background === 'white' || background === 'lightgray' || background === 'transparent'
    if (isLightBg && typeConfig.black) return typeConfig.black
    if (!isLightBg && typeConfig.white) return typeConfig.white

    return Object.values(typeConfig)[0]
  }

  const logoEditable = state.logoType && state.logoType !== 'none'
  const logoSrc = logoEditable ? getDefaultLogoSrc(state.logoType, state.background, state.logoColor) : null
  const logoToDraw = logoSrc ? defaultLogoImages[logoSrc] : null

  const safeLogoPosX = clampPx(state.logoPosX ?? 0.5, 0, 1)
  const safeLogoPosY = clampPx(state.logoPosY ?? 0.5, 0, 1)
  const safeLogoScale = Math.max(0.1, Math.min(5, state.logoScale ?? 1))

  const logoBase = (() => {
    if (!logoToDraw?.width || !logoToDraw?.height) return null
    let sizeFactor = 1
    if (state.logoType === 'logoOnly') sizeFactor = 1.25
    else if (state.logoType === 'logoHorizontal') sizeFactor = 1.8
    else if (state.logoType === 'logoVertical') sizeFactor = 1.5

    const maxLogoW = w * 0.4 * sizeFactor
    const maxLogoH = h * 0.25 * sizeFactor
    const lw0 = logoToDraw.width
    const lh0 = logoToDraw.height
    const baseScale = Math.min(maxLogoW / lw0, maxLogoH / lh0, 1)
    return {
      baseW: lw0 * baseScale,
      baseH: lh0 * baseScale,
    }
  })()

  const logoDrawW = logoBase ? logoBase.baseW * safeLogoScale : 0
  const logoDrawH = logoBase ? logoBase.baseH * safeLogoScale : 0


  const typo = config.typography || {}
  const textSizes = typo.textSizes || []
  const textWeights = typo.textWeights || []
  const textColors = typo.textColors || []
  const lineHeightRatio = typo.lineHeightRatio ?? 1.4
  const letterSpacing = typo.letterSpacing ?? '-0.01em'
  const selectedText = state.texts?.find((t) => t.id === state.selectedTextId)
  const effectiveSizeId = selectedText ? selectedText.fontSizeId : (state.defaultTextSizeId || 'm')
  const effectiveWeightId = selectedText ? selectedText.fontWeightId : (state.defaultTextWeightId || '400')
  const effectiveColorId = selectedText ? selectedText.colorId : (state.defaultTextColorId || 'white')
  const effectiveTextAlign = (selectedText?.textAlign || state.defaultTextAlign || 'center')

  const handleAddText = () => {
    const value = textInputRef.current?.value?.trim()
    if (value) {
      onAddText(value)
      if (textInputRef.current) textInputRef.current.value = ''
    }
  }

  const getSizePx = useCallback(
    (id) => {
      const s = textSizes.find((x) => x.id === id)
      const base = s?.value ?? 18
      const canvas = canvasRef.current
      if (!canvas) return Math.max(12, base)
      const rect = canvas.getBoundingClientRect()
      const exportScale = Math.min(w, h) / 540
      const displayScale = rect.width / w
      return Math.max(12, Math.round(base * exportScale * displayScale))
    },
    [textSizes, w, h]
  )
  const getWeight = (id) => textWeights.find((x) => x.id === id)?.value ?? 400
  const getColor = (id) => textColors.find((c) => c.id === id)?.value ?? '#000000'

  const handleTextMouseDown = (e, id) => {
    e.preventDefault()
    if (state.editingTextId === id) return
    const t = state.texts.find((x) => x.id === id)
    if (!t) return
    onPushHistorySnapshot?.()
    onUpdate({ selectedTextId: id }, { history: false })
    setDragState({ id, startX: e.clientX, startY: e.clientY, startTexX: t.x, startTexY: t.y })
  }

  useEffect(() => {
    if (!dragState.id) return
    const onMove = (e) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dx = (e.clientX - dragState.startX) / rect.width
      const dy = (e.clientY - dragState.startY) / rect.height
      const newX = Math.min(1, Math.max(0, dragState.startTexX + dx))
      const newY = Math.min(1, Math.max(0, dragState.startTexY + dy))
      onUpdateText(dragState.id, { x: newX, y: newY }, { history: false })
    }
    const onUp = () => setDragState((prev) => (prev.id ? { ...prev, id: null } : prev))
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragState, onUpdateText])

  useEffect(() => {
    if (!logoDragState.mode) return
    const onMove = (e) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()

      if (logoDragState.mode === 'move') {
        const dx = (e.clientX - logoDragState.startClientX) / rect.width
        const dy = (e.clientY - logoDragState.startClientY) / rect.height
        const newX = Math.min(1, Math.max(0, logoDragState.startPosX + dx))
        const newY = Math.min(1, Math.max(0, logoDragState.startPosY + dy))
        onUpdate?.({ logoPosX: newX, logoPosY: newY }, { history: false })
      }

      if (logoDragState.mode === 'resize') {
        const dxNorm = (e.clientX - logoDragState.startClientX) / rect.width
        const dyNorm = (e.clientY - logoDragState.startClientY) / rect.height
        const dxCanvas = dxNorm * w
        const dyCanvas = dyNorm * h

        const baseW = logoDragState.baseW || 1
        const baseH = logoDragState.baseH || 1
        const scaleFromX = logoDragState.startScale + dxCanvas / baseW
        const scaleFromY = logoDragState.startScale + dyCanvas / baseH
        const nextScale = (scaleFromX + scaleFromY) / 2
        const safeNextScale = Math.max(0.1, Math.min(5, nextScale))
        onUpdate?.({ logoScale: safeNextScale }, { history: false })
      }
    }

    const onUp = () => setLogoDragState((prev) => ({ ...prev, mode: null }))
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [logoDragState, onUpdate, w, h])

  const handleTextDoubleClick = (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    onPushHistorySnapshot?.()
    onUpdate({ editingTextId: id, selectedTextId: id }, { history: false })
  }

  const handleTextBlur = (id, newContent) => {
    onUpdateText(id, { content: newContent }, { history: false })
    onUpdate({ editingTextId: null }, { history: false })
  }

  const handleWrapperClick = (e) => {
    if (
      e.target === e.currentTarget ||
      e.target.closest('.preview-text-item') ||
      e.target.closest('.preview-logo-box')
    ) {
      return
    }
    onUpdate({ selectedTextId: null, editingTextId: null, logoSelected: false }, { history: false })
  }

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA'
      if (!isTyping && (e.metaKey || e.ctrlKey)) {
        const key = e.key.toLowerCase()
        if (key === 'z' && !e.shiftKey) {
          if (!canUndo) return
          e.preventDefault()
          onUndo?.()
          return
        }
        if ((key === 'z' && e.shiftKey) || key === 'y') {
          if (!canRedo) return
          e.preventDefault()
          onRedo?.()
          return
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedTextId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          onRemoveText(state.selectedTextId)
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        if (state.selectedTextId) {
          const t = state.texts.find((x) => x.id === state.selectedTextId)
          if (t?.content) navigator.clipboard?.writeText(t.content)
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          navigator.clipboard?.readText().then((text) => {
            if (!text.trim()) return
            const sel = state.selectedTextId ? state.texts.find((x) => x.id === state.selectedTextId) : null
            const x = sel ? Math.min(0.9, sel.x + 0.02) : 0.5
            const y = sel ? Math.min(0.9, sel.y + 0.02) : 0.5
            onUpdate({
              texts: [
                ...state.texts,
                {
                  id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                  content: text.trim(),
                  x,
                  y,
                  fontSizeId: state.defaultTextSizeId || 'm',
                  fontWeightId: state.defaultTextWeightId || '400',
                  colorId: state.defaultTextColorId || 'white',
                },
              ],
            })
          })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.selectedTextId, state.texts, state.defaultTextSizeId, state.defaultTextWeightId, state.defaultTextColorId, onUpdate, onRemoveText, onUndo, onRedo, canUndo, canRedo])

  const handleWheel = (e) => {
    const delta = e.deltaY
    setZoom((prev) => {
      const factor = delta > 0 ? 0.9 : 1.1
      const next = prev * factor
      // Logo가 깨지는 이슈는 "100%보다 훨씬 큰 줌"에서 발생해서
      // 안전하게 최대 줌을 제한합니다.
      return Math.min(2.0, Math.max(0.5, next))
    })
  }

  return (
    <main className="preview-area">
      <header className="preview-header">
        <div className="preview-info">
          <span className="preview-title">미리보기</span>
          <span className="preview-sub">스크롤하여 줌을 조절할 수 있어요</span>
        </div>
        <div className="preview-header-right">
          <div className="preview-header-ratio">
            <span className="preview-ratio-label">이미지 비율</span>
            {(config.ratios || []).map((r) => (
              <button
                key={r.id}
                type="button"
                className={`preview-ratio-chip ${state.ratio === r.id ? 'active' : ''}`}
                onClick={() => onUpdate?.({ ratio: r.id })}
              >
                {r.label}
              </button>
            ))}
              <button
                type="button"
                className={`preview-ratio-chip ${state.ratio === 'custom' ? 'active' : ''}`}
                onClick={() => onUpdate?.({ ratio: 'custom' })}
                title="커스텀 해상도 입력"
              >
                커스텀
              </button>
              {isCustomRatio && (
                <div className="custom-ratio-inputs" onClick={(e) => e.stopPropagation()}>
                  <label className="custom-ratio-field">
                    W
                    <input
                      type="number"
                      min={1}
                      max={3000}
                      value={customDraftW}
                      onFocus={() => onPushHistorySnapshot?.()}
                      onChange={(e) => {
                        const nextW = clampPx(e.target.value, 1, 3000)
                        setCustomDraftW(nextW)
                        onUpdate?.(
                          { ratio: 'custom', customRatioWidth: nextW, customRatioHeight: customDraftH },
                          { history: false }
                        )
                      }}
                    />
                  </label>
                  <span className="custom-ratio-x">×</span>
                  <label className="custom-ratio-field">
                    H
                    <input
                      type="number"
                      min={1}
                      max={3000}
                      value={customDraftH}
                      onFocus={() => onPushHistorySnapshot?.()}
                      onChange={(e) => {
                        const nextH = clampPx(e.target.value, 1, 3000)
                        setCustomDraftH(nextH)
                        onUpdate?.(
                          { ratio: 'custom', customRatioWidth: customDraftW, customRatioHeight: nextH },
                          { history: false }
                        )
                      }}
                    />
                  </label>
                  <span className="custom-ratio-unit">px</span>
                </div>
              )}
          </div>
          <span className="preview-dimensions">{w} × {h} px</span>
          <button type="button" className="download-btn" onClick={handleDownload}>
            PNG 다운로드
          </button>
        </div>
      </header>

      <div className="preview-wrapper" onWheel={handleWheel} ref={wrapperRef}>
        <div className="preview-canvas-layer" onClick={handleWrapperClick}>
          <canvas ref={canvasRef} className="preview-canvas" />
          <div className="preview-guides" aria-hidden="true" />
          {logoEditable && logoBase && (
            <div
              className="preview-logo-overlay"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
              }}
            >
              <div
                className={`preview-logo-box ${state.logoSelected ? 'selected' : ''}`}
                style={{
                  position: 'absolute',
                  left: `${safeLogoPosX * 100}%`,
                  top: `${safeLogoPosY * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${(logoDrawW / w) * 100}%`,
                  height: `${(logoDrawH / h) * 100}%`,
                  pointerEvents: 'auto',
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onUpdate?.({ logoSelected: true, selectedTextId: null, editingTextId: null }, { history: false })
                  onPushHistorySnapshot?.()
                  const box = e.currentTarget
                  const rect = box.getBoundingClientRect()
                  const cornerPx = 14
                  const offsetX = e.clientX - rect.left
                  const offsetY = e.clientY - rect.top
                  const shouldResize = state.logoSelected && offsetX > rect.width - cornerPx && offsetY > rect.height - cornerPx
                  setLogoDragState({
                    mode: shouldResize ? 'resize' : 'move',
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    startPosX: safeLogoPosX,
                    startPosY: safeLogoPosY,
                    startScale: safeLogoScale,
                    baseW: logoBase.baseW,
                    baseH: logoBase.baseH,
                  })
                }}
              >
                {state.logoSelected && (
                  <div
                    className="preview-logo-handle"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onUpdate?.({ logoSelected: true, selectedTextId: null, editingTextId: null }, { history: false })
                      onPushHistorySnapshot?.()
                      setLogoDragState({
                        mode: 'resize',
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        startPosX: safeLogoPosX,
                        startPosY: safeLogoPosY,
                        startScale: safeLogoScale,
                        baseW: logoBase.baseW,
                        baseH: logoBase.baseH,
                      })
                    }}
                  />
                )}
              </div>
            </div>
          )}
          {(state.texts || []).length > 0 && (
            <div
              className="preview-text-overlay"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
              }}
            >
              {(state.texts || []).map((t) => (
                <div
                  key={t.id}
                  className={`preview-text-item ${state.selectedTextId === t.id ? 'selected' : ''} ${state.editingTextId === t.id ? 'editing' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${t.x * 100}%`,
                    top: `${t.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    fontSize: `${getSizePx(t.fontSizeId)}px`,
                    lineHeight: lineHeightRatio,
                    letterSpacing,
                    fontWeight: getWeight(t.fontWeightId),
                    color: getColor(t.colorId),
                    fontFamily: typo.fontFamily || 'Pretendard Variable, sans-serif',
                    pointerEvents: 'auto',
                    cursor: dragState.id ? 'grabbing' : 'grab',
                    whiteSpace: 'pre',
                    textAlign: t.textAlign || state.defaultTextAlign || 'center',
                    userSelect: state.editingTextId === t.id ? 'text' : 'none',
                  }}
                  onMouseDown={(e) => handleTextMouseDown(e, t.id)}
                  onDoubleClick={(e) => handleTextDoubleClick(e, t.id)}
                >
                  {state.editingTextId === t.id ? (
                    <>
                      <textarea
                        className="preview-text-edit"
                        value={t.content}
                        autoFocus
                        style={{
                          lineHeight: lineHeightRatio,
                          letterSpacing,
                          textAlign: t.textAlign || state.defaultTextAlign || 'center',
                          minHeight: `${Math.ceil(getSizePx(t.fontSizeId) * lineHeightRatio)}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdateText(t.id, { content: e.target.value }, { history: false })}
                        onBlur={(e) => handleTextBlur(t.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            onUpdate({ editingTextId: null }, { history: false })
                            e.target.blur()
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="text-item-delete-small"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveText(t.id)
                        }}
                        title="삭제"
                        aria-label="텍스트 삭제"
                      >
                        <svg className="text-item-delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="preview-text-content">{t.content}</span>
                      {state.selectedTextId === t.id && (
                        <div
                          className="text-align-overlay"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={`text-align-btn ${((t.textAlign || state.defaultTextAlign || 'center') === 'left') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            onClick={() => onUpdateText(t.id, { textAlign: 'left' })}
                            title="왼쪽 정렬"
                            aria-label="왼쪽 정렬"
                          >
                            L
                          </button>
                          <button
                            type="button"
                            className={`text-align-btn ${((t.textAlign || state.defaultTextAlign || 'center') === 'center') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            onClick={() => onUpdateText(t.id, { textAlign: 'center' })}
                            title="가운데 정렬"
                            aria-label="가운데 정렬"
                          >
                            C
                          </button>
                          <button
                            type="button"
                            className={`text-align-btn ${((t.textAlign || state.defaultTextAlign || 'center') === 'right') ? 'active' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            onClick={() => onUpdateText(t.id, { textAlign: 'right' })}
                            title="오른쪽 정렬"
                            aria-label="오른쪽 정렬"
                          >
                            R
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="preview-history-buttons" onClick={(e) => e.stopPropagation()}>
          <div className="preview-zoom-indicator" title="현재 줌">
            {Math.round(zoom * 100)}%
          </div>
          <button
            type="button"
            className={`preview-history-btn ${canUndo ? '' : 'disabled'}`}
            disabled={!canUndo}
            onClick={(e) => {
              e.stopPropagation()
              onUndo?.()
            }}
            title="Undo (Cmd/Ctrl+Z)"
          >
            ↶
          </button>
          <button
            type="button"
            className={`preview-history-btn ${canRedo ? '' : 'disabled'}`}
            disabled={!canRedo}
            onClick={(e) => {
              e.stopPropagation()
              onRedo?.()
            }}
            title="Redo (Cmd/Ctrl+Shift+Z)"
          >
            ↷
          </button>
        </div>
      </div>

      {/* 텍스트 입력: 캔버스 하단(완료 영역) */}
      <section className="preview-text-section preview-text-section-bottom">
        <h2 className="preview-text-section-label">텍스트</h2>
        <div className="text-add-row">
          <input
            ref={textInputRef}
            type="text"
            className="text-input"
            placeholder="텍스트 입력"
            onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
          />
          <button type="button" className="text-add-btn" onClick={handleAddText}>
            추가
          </button>
        </div>
        <div className="preview-text-options-row">
          <div className="keynote-segment-row">
            <span className="keynote-segment-label">크기</span>
            <div className="keynote-segment-group" role="group" aria-label="글자 크기">
              {textSizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`keynote-segment-btn ${effectiveSizeId === s.id ? 'active' : ''}`}
                  onClick={() => {
                    if (state.selectedTextId) {
                      onUpdateText(state.selectedTextId, { fontSizeId: s.id })
                    } else {
                      onUpdate({ defaultTextSizeId: s.id })
                    }
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="keynote-segment-row">
            <span className="keynote-segment-label">굵기</span>
            <div className="keynote-segment-group" role="group" aria-label="글자 굵기">
              {textWeights.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`keynote-segment-btn ${effectiveWeightId === w.id ? 'active' : ''}`}
                  onClick={() => {
                    if (state.selectedTextId) {
                      onUpdateText(state.selectedTextId, { fontWeightId: w.id })
                    } else {
                      onUpdate({ defaultTextWeightId: w.id })
                    }
                  }}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-color-row">
            <span className="keynote-segment-label">색상</span>
            <div className="text-color-chips">
              {textColors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`text-color-chip ${effectiveColorId === c.id ? 'active' : ''}`}
                  style={{ '--chip-color': c.value }}
                  onClick={() => {
                    if (state.selectedTextId) {
                      onUpdateText(state.selectedTextId, { colorId: c.id })
                    } else {
                      onUpdate({ defaultTextColorId: c.id })
                    }
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="keynote-segment-row">
            <span className="keynote-segment-label">정렬</span>
            <div className="keynote-segment-group" role="group" aria-label="텍스트 정렬">
              {[
                { id: 'left', label: '왼쪽' },
                { id: 'center', label: '가운데' },
                { id: 'right', label: '오른쪽' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`keynote-segment-btn ${effectiveTextAlign === opt.id ? 'active' : ''}`}
                  onClick={() => {
                    if (state.selectedTextId) {
                      onUpdateText(state.selectedTextId, { textAlign: opt.id })
                    } else {
                      onUpdate({ defaultTextAlign: opt.id })
                    }
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}
