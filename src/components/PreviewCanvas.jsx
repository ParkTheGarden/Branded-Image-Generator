import { useRef, useEffect, useState } from 'react'
import { useConfig } from '../context/ConfigContext'
import { renderToCanvas } from '../utils/canvasRender'

export default function PreviewCanvas({ state, onUpdate }) {
  const config = useConfig()
  const canvasRef = useRef(null)
  const [overlayImages, setOverlayImages] = useState({})
  const [defaultLogoImages, setDefaultLogoImages] = useState({})
  const [backgroundImages, setBackgroundImages] = useState({})
  const [zoom, setZoom] = useState(1)

  const ratioCfg =
    (config.ratios || []).find((r) => r.id === state.ratio) ||
    (config.ratios || [])[0] || { width: 1920, height: 1080 }
  const w = ratioCfg.width
  const h = ratioCfg.height

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const baseScale = Math.min(
      1,
      (window.innerWidth - 460 - 48 - 48) / w,
      (window.innerHeight - 48 - 80) / h
    )
    const scale = baseScale * zoom
    const displayW = Math.round(w * scale)
    const displayH = Math.round(h * scale)

    canvas.width = w
    canvas.height = h
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    renderToCanvas(canvas, state, overlayImages, {
      forDownload: false,
      config,
      defaultLogoImages,
      backgroundImages,
    })
  }, [state, overlayImages, config, defaultLogoImages, backgroundImages, zoom])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `brand-image-${state.ratio.replace(':', 'x')}-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY
    setZoom((prev) => {
      const factor = delta > 0 ? 0.9 : 1.1
      const next = prev * factor
      return Math.min(2, Math.max(0.5, next))
    })
  }

  return (
    <main className="preview-area">
      <header className="preview-header">
        <div className="preview-info">
          <span className="preview-title">미리보기</span>
          <span className="preview-sub">스크롤하여 줌을 조절할 수 있어요</span>
        </div>
        <button type="button" className="download-btn" onClick={handleDownload}>
          PNG 다운로드
        </button>
      </header>
      <div className="preview-ratio-bar">
        <div className="preview-ratio-left">
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
        </div>
        <span className="preview-dimensions">{w} × {h} px</span>
      </div>
      <div className="preview-wrapper" onWheel={handleWheel}>
        <canvas ref={canvasRef} className="preview-canvas" />
      </div>
    </main>
  )
}
