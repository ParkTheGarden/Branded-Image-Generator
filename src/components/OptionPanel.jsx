import { useRef } from 'react'
import { useConfig } from '../context/ConfigContext'

export default function OptionPanel({ state, onUpdate, onReset }) {
  const config = useConfig()
  const overlays = config.overlays || []
  const backgrounds = config.backgrounds || []
  const logoTypes = config.logoTypes || []
  const logoColors = config.logoColors || []
  const overlayInputRef = useRef(null)
  const isAbstractBackground = backgrounds.some(
    (b) => b.id === state.background && b.type === 'image'
  )

  const handleOverlayUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    onUpdate({ overlayCategory: 'custom', customOverlayImage: url })
    e.target.value = ''
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">AIVEX Branded Image Generator</h1>
        <p className="sidebar-subtitle">아이벡스의 아이덴티티가 담긴 이미지를 빠르게 생성해 보세요.</p>
      </div>

      {/* 02 배경 */}
      <section className="option-section">
        <h2 className="option-label">배경</h2>
        <div className="background-grid">
          {backgrounds.map((bg) => (
            <button
              key={bg.id}
              type="button"
              className={`option-btn bg-option ${state.background === bg.id ? 'active' : ''}`}
              onClick={() =>
                onUpdate({
                  background: bg.id,
                  ...(bg.type === 'image' ? { overlayCategory: 'none' } : {}),
                })
              }
            >
              <span
                className={`bg-swatch ${bg.id}`}
                style={bg.type === 'image' && bg.src ? { backgroundImage: `url("${bg.src}")` } : undefined}
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
        <h2 className="option-label">사진 오버레이</h2>
        <p className="option-desc">선택한 이미지를 배경 위에 덧씌웁니다</p>

        {!isAbstractBackground && state.overlayCategory !== 'none' && (
          <div className="overlay-opacity-row">
            <label className="overlay-opacity-label" htmlFor="overlay-opacity">
              투명도 <span className="overlay-opacity-value">{state.overlayOpacity ?? 20}%</span>
            </label>
            <input
              id="overlay-opacity"
              type="range"
              className="overlay-opacity-slider"
              min={0}
              max={100}
              step={5}
              value={state.overlayOpacity ?? 20}
              onChange={(e) => onUpdate({ overlayOpacity: Number(e.target.value) })}
            />
          </div>
        )}

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

        <div
          className={`overlay-options ${state.overlayGrayscale ? 'overlay-desat' : ''} ${
            isAbstractBackground ? 'overlay-disabled' : ''
          }`}
        >
          {overlays.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`overlay-thumb ${cat.id === 'none' ? 'overlay-none' : ''} ${state.overlayCategory === cat.id ? 'active' : ''}`}
              onClick={() => {
                if (isAbstractBackground) return
                onUpdate({ overlayCategory: cat.id, customOverlayImage: null })
              }}
              title={cat.label}
            >
              {cat.src ? (
                <img
                  className="overlay-img"
                  src={cat.src}
                  alt={cat.label}
                  onError={(e) => (e.target.style.display = 'none')}
                />
              ) : (
                <div className="overlay-empty" aria-hidden="true" />
              )}
              <div className="overlay-gradient" aria-hidden="true" />
              <div className="overlay-title">{cat.label}</div>
            </button>
          ))}
          {!isAbstractBackground && (
            <>
              <input
                ref={overlayInputRef}
                type="file"
                accept="image/*"
                className="overlay-upload-input"
                aria-hidden
                onChange={handleOverlayUpload}
              />
              <button
                type="button"
                className={`overlay-thumb overlay-upload ${state.overlayCategory === 'custom' ? 'active' : ''}`}
                onClick={() => overlayInputRef.current?.click()}
                title="사진 업로드"
              >
                <span className="overlay-upload-icon" aria-hidden="true">+</span>
                <div className="overlay-title">업로드</div>
              </button>
            </>
          )}
        </div>
        {isAbstractBackground ? (
          <p className="option-hint">추상 배경 선택 시 이미지를 오버레이할 수 없어요.</p>
        ) : (
          state.overlayGrayscale &&
          state.overlayCategory === 'none' && (
            <p className="option-hint">사진을 먼저 선택해주세요</p>
          )
        )}
      </section>

      {/* 04 로고 */}
      <section className="option-section">
        <h2 className="option-label">로고</h2>
        <p className="option-desc">
          로고의 가시성을 위해 배경 컬러에 따라 일부 옵션이 제한될 수 있습니다.
        </p>
        {state.logoType !== 'none' && (
        <div className="logo-color-options">
          {logoColors.map((c) => {
            const bgId = state.background
            const isWhiteBg = bgId === 'white' || bgId === 'lightgray'
            const isDarkBg =
              bgId === 'darkgray' || bgId === 'black' || bgId === 'abstract01' || bgId === 'abstract02'
            const isBrandBg = bgId === 'brand'

            let disabled = false
            if (c.id === 'white' && isWhiteBg) disabled = true
            if (c.id === 'black' && isDarkBg) disabled = true
            if (c.id === 'orange' && isBrandBg) disabled = true

            return (
              <button
                key={c.id}
                type="button"
                className={`logo-color-chip ${
                  state.logoColor === c.id ? 'active' : ''
                } ${disabled ? 'disabled' : ''}`}
                onClick={() => {
                  if (disabled) return
                  onUpdate({ logoColor: c.id })
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
        )}
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
