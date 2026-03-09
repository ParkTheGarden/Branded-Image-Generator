import { useRef, useEffect, useState } from 'react'
import { useConfig } from '../context/ConfigContext'
import { renderToCanvas } from '../utils/canvasRender'

export default function PreviewCanvas({ state }) {
  const config = useConfig()
  const canvasRef = useRef(null)
  const [overlayImages, setOverlayImages] = useState({})
  const [defaultLogoImages, setDefaultLogoImages] = useState({})

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
    const canvas = canvasRef.current
    if (!canvas) return

    const { w, h } = state.dimensions
    const scale = Math.min(
      1,
      (window.innerWidth - 460 - 48 - 48) / w,
      (window.innerHeight - 48 - 80) / h
    )
    const displayW = Math.round(w * scale)
    const displayH = Math.round(h * scale)

    canvas.width = displayW
    canvas.height = displayH
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    const buffer = document.createElement('canvas')
    renderToCanvas(buffer, state, overlayImages, {
      forDownload: false,
      config,
      defaultLogoImages,
    })

    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(buffer, 0, 0, w, h, 0, 0, displayW, displayH)
  }, [state, overlayImages, config, defaultLogoImages])

  const handleDownload = () => {
    const buffer = document.createElement('canvas')
    renderToCanvas(buffer, state, overlayImages, {
      forDownload: true,
      config,
      defaultLogoImages,
    })

    buffer.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `brand-image-${state.ratio.replace(':', 'x')}-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const ratioCfg =
    (config.ratios || []).find((r) => r.id === state.ratio) ||
    (config.ratios || [])[0] || { width: 1920, height: 1080 }
  const w = ratioCfg.width
  const h = ratioCfg.height

  return (
    <main className="preview-area">
      <header className="preview-header">
        <div className="preview-info">
          <span className="preview-title">미리보기</span>
          <span className="preview-ratio">{state.ratio}</span>
          <span className="preview-dimensions">{w} × {h} px</span>
        </div>
        <button type="button" className="download-btn" onClick={handleDownload}>
          PNG 다운로드
        </button>
      </header>
      <div className="preview-wrapper">
        <canvas ref={canvasRef} className="preview-canvas" />
      </div>
    </main>
  )
}
