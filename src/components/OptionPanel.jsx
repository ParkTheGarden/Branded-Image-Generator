import { useRef } from 'react'
import { useConfig } from '../context/ConfigContext'

export default function OptionPanel({ state, onUpdate, onReset }) {
  const config = useConfig()
  const overlays = config.overlays || []
  const ratios = config.ratios || []
  const backgrounds = config.backgrounds || []
  const logoTypes = config.logoTypes || []

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      onUpdate({ logoImage: img })
    }
    img.onerror = () => onUpdate({ logoImage: null })
    img.src = url
  }

  const handleOverlayUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      onUpdate({ overlayCategory: 'custom', customOverlayImage: img })
    }
    img.onerror = () => {}
    img.src = url
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">AIVEX Branded Image Generator</h1>
        <p className="sidebar-subtitle">아이벡스의 아이덴티티가 담긴 이미지를 빠르게 생성해 보세요.</p>
      </div>

      {/* 01 이미지 비율 */}
      <section className="option-section">
        <h2 className="option-label">01 이미지 비율</h2>
        <div className="ratio-grid">
          {ratios.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`option-btn ${state.ratio === r.id ? 'active' : ''}`}
              onClick={() => onUpdate({ ratio: r.id })}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      {/* 02 배경 */}
      <section className="option-section">
        <h2 className="option-label">02 배경</h2>
        <div className="background-grid">
          {backgrounds.map((bg) => (
            <button
              key={bg.id}
              type="button"
              className={`option-btn bg-option ${state.background === bg.id ? 'active' : ''}`}
              onClick={() => onUpdate({ background: bg.id })}
            >
              <span
                className={`bg-swatch ${bg.id}`}
              />
              <span className="bg-label">
                {bg.label}
                {bg.sub && <small> ({bg.sub})</small>}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 03 사진 오버레이 */}
      <section className="option-section">
        <h2 className="option-label">03 사진 오버레이</h2>
        <p className="option-desc">선택 시 사진이 20% 투명도로 배경에 깔립니다</p>

        <button
          type="button"
          className={`overlay-toggle-container ${state.overlayGrayscale ? 'on' : 'off'}`}
          onClick={() => onUpdate({ overlayGrayscale: !state.overlayGrayscale })}
          aria-pressed={state.overlayGrayscale}
        >
          <div className="overlay-toggle-text">
            <span className="overlay-toggle-title">사진 흑백 처리</span>
            <span className="overlay-toggle-sub">채도 0%로 일괄 적용</span>
          </div>
          <div className={`toggle-switch ${state.overlayGrayscale ? 'on' : 'off'}`}>
            <span className="toggle-knob" />
          </div>
        </button>

        <div className={`overlay-options ${state.overlayGrayscale ? 'overlay-desat' : ''}`}>
          {overlays.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`overlay-thumb ${cat.id === 'none' ? 'overlay-none' : ''} ${state.overlayCategory === cat.id ? 'active' : ''}`}
              onClick={() => onUpdate({ overlayCategory: cat.id, customOverlayImage: null })}
              title={cat.label}
            >
              {cat.src ? (
                <img className="overlay-img" src={cat.src} alt={cat.label} onError={(e) => (e.target.style.display = 'none')} />
              ) : (
                <div className="overlay-empty" aria-hidden="true" />
              )}
              <div className="overlay-gradient" aria-hidden="true" />
              <div className="overlay-title">{cat.label}</div>
            </button>
          ))}
        </div>
        {state.overlayGrayscale && state.overlayCategory === 'none' && (
          <p className="option-hint">사진을 먼저 선택해주세요</p>
        )}
      </section>

      {/* 04 로고 */}
      <section className="option-section">
        <h2 className="option-label">04 로고</h2>
        <div className="logo-style-options">
          {logoTypes.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`option-btn logo-option ${state.logoType === opt.id ? 'active' : ''}`}
              onClick={() => onUpdate({ logoType: opt.id })}
            >
              {opt.label}
              {opt.hint && <small>{opt.hint}</small>}
            </button>
          ))}
        </div>
      </section>

      <button type="button" className="reset-btn" onClick={onReset}>
        옵션 초기화
      </button>
    </aside>
  )
}
