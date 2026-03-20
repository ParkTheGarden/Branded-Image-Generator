import { useState, useCallback, useEffect } from 'react'
import { ConfigProvider } from './context/ConfigContext'
import OptionPanel from './components/OptionPanel'
import PreviewCanvas from './components/PreviewCanvas'
import { trackPageViewOncePerSession } from './utils/tracking'
import { supabase } from './utils/supabaseClient'

function generateId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

const INITIAL_STATE = {
  ratio: '16:9',
  background: 'brand',
  overlayCategory: 'none',
  customOverlayImage: null,
  logoType: 'logoOnly',
  logoColor: 'white',
  overlayGrayscale: false,
  overlayOpacity: 20,
  texts: [],
  selectedTextId: null,
  editingTextId: null,
  defaultTextSizeId: 'm',
  defaultTextWeightId: '400',
  defaultTextColorId: 'white',
}

export default function App() {
  const [state, setState] = useState(INITIAL_STATE)

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const reset = useCallback(() => {
    setState((prev) => {
      if (prev.customOverlayImage) try { URL.revokeObjectURL(prev.customOverlayImage) } catch (_) {}
      return {
        ...INITIAL_STATE,
        texts: [],
        selectedTextId: null,
        editingTextId: null,
        customOverlayImage: null,
      }
    })
  }, [])

  const addText = useCallback((content) => {
    if (!content.trim()) return
    setState((prev) => ({
      ...prev,
      texts: [
        ...prev.texts,
        {
          id: generateId(),
          content: content.trim(),
          x: 0.5,
          y: 0.5,
          fontSizeId: prev.defaultTextSizeId || 'm',
          fontWeightId: prev.defaultTextWeightId || '400',
          colorId: prev.defaultTextColorId || 'white',
        },
      ],
      selectedTextId: null,
      editingTextId: null,
    }))
  }, [])

  const updateText = useCallback((id, updates) => {
    setState((prev) => ({
      ...prev,
      texts: prev.texts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
  }, [])

  const removeText = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      texts: prev.texts.filter((t) => t.id !== id),
      selectedTextId: prev.selectedTextId === id ? null : prev.selectedTextId,
      editingTextId: prev.editingTextId === id ? null : prev.editingTextId,
    }))
  }, [])

  useEffect(() => {
    trackPageViewOncePerSession({
      ratio: state.ratio,
      background: state.background,
      overlayCategory: state.overlayCategory,
      overlayOpacity: state.overlayOpacity,
      overlayGrayscale: state.overlayGrayscale,
    })
  }, [state.ratio, state.background, state.overlayCategory, state.overlayOpacity, state.overlayGrayscale])

  // Next.js의 middleware(cookie refresh)와 유사하게, SPA에서는 브라우저에서 필요할 때 세션을 갱신합니다.
  // 현재 앱은 anon 기반 이벤트 insert만 사용하므로 실질적으로는 no-op일 가능성이 높습니다.
  useEffect(() => {
    if (!supabase?.auth?.refreshSession) return

    let cancelled = false
    const refresh = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (!data?.session) return
        await supabase.auth.refreshSession()
      } catch (e) {
        // Tracking insert와 무관하게 세션 refresh는 실패해도 앱은 계속 동작해야 합니다.
        console.warn('[supabase] session refresh failed', e)
      }
    }

    void refresh()
    const intervalId = window.setInterval(refresh, 60 * 60 * 1000) // 1 hour
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <ConfigProvider>
      <div className="app">
        <OptionPanel state={state} onUpdate={updateState} onReset={reset} />
        <PreviewCanvas
          state={state}
          onUpdate={updateState}
          onAddText={addText}
          onUpdateText={updateText}
          onRemoveText={removeText}
        />
      </div>
    </ConfigProvider>
  )
}
