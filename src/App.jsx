import { useState, useCallback, useEffect, useRef } from 'react'
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
  customRatioWidth: 1920,
  customRatioHeight: 1080,
  background: 'brand',
  overlayCategory: 'none',
  customOverlayImage: null,
  logoType: 'logoOnly',
  logoColor: 'white',
  logoPosX: 0.5,
  logoPosY: 0.5,
  logoScale: 1,
  logoSelected: false,
  overlayGrayscale: false,
  overlayOpacity: 20,
  texts: [],
  selectedTextId: null,
  editingTextId: null,
  defaultTextSizeId: 'm',
  defaultTextWeightId: '400',
  defaultTextColorId: 'white',
  defaultTextAlign: 'center',
}

function cloneState(obj) {
  // State is plain JSON-safe data (strings/numbers/arrays), so JSON clone is enough.
  return JSON.parse(JSON.stringify(obj))
}

export default function App() {
  const [state, setState] = useState(INITIAL_STATE)
  const [historyInfo, setHistoryInfo] = useState({ pastCount: 0, futureCount: 0 })
  const pastRef = useRef([])
  const futureRef = useRef([])
  const stateRef = useRef(state)
  const isRestoringRef = useRef(false)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const pushHistorySnapshot = useCallback(() => {
    const current = stateRef.current
    pastRef.current.push(cloneState(current))
    // Limit history to avoid uncontrolled memory growth.
    if (pastRef.current.length > 60) pastRef.current.shift()
    futureRef.current = []
    setHistoryInfo({ pastCount: pastRef.current.length, futureCount: futureRef.current.length })
  }, [])

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return
    isRestoringRef.current = true
    const previous = pastRef.current.pop()
    futureRef.current.unshift(cloneState(stateRef.current))
    setState(previous)
    stateRef.current = previous
    isRestoringRef.current = false
    setHistoryInfo({ pastCount: pastRef.current.length, futureCount: futureRef.current.length })
  }, [])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    isRestoringRef.current = true
    const next = futureRef.current.shift()
    pastRef.current.push(cloneState(stateRef.current))
    setState(next)
    stateRef.current = next
    isRestoringRef.current = false
    setHistoryInfo({ pastCount: pastRef.current.length, futureCount: futureRef.current.length })
  }, [])

  const updateState = useCallback((updates, options = {}) => {
    const { history = true } = options
    setState((prev) => {
      if (history && !isRestoringRef.current) {
        pastRef.current.push(cloneState(prev))
        if (pastRef.current.length > 60) pastRef.current.shift()
        futureRef.current = []
        setHistoryInfo({ pastCount: pastRef.current.length, futureCount: futureRef.current.length })
      }
      return { ...prev, ...updates }
    })
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
    // Reset should be undoable as a single step.
    pushHistorySnapshot()
  }, [])

  const addText = useCallback((content) => {
    if (!content.trim()) return
    pushHistorySnapshot()
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
          textAlign: prev.defaultTextAlign || 'center',
        },
      ],
      selectedTextId: null,
      editingTextId: null,
    }))
  }, [])

  const updateText = useCallback((id, updates) => {
    const history = arguments.length >= 3 ? arguments[2]?.history !== false : true
    if (history && !isRestoringRef.current) pushHistorySnapshot()
    setState((prev) => ({
      ...prev,
      texts: prev.texts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
  }, [pushHistorySnapshot])

  const removeText = useCallback((id) => {
    pushHistorySnapshot()
    setState((prev) => ({
      ...prev,
      texts: prev.texts.filter((t) => t.id !== id),
      selectedTextId: prev.selectedTextId === id ? null : prev.selectedTextId,
      editingTextId: prev.editingTextId === id ? null : prev.editingTextId,
    }))
  }, [pushHistorySnapshot])

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
          onUndo={undo}
          onRedo={redo}
          canUndo={historyInfo.pastCount > 0}
          canRedo={historyInfo.futureCount > 0}
          onPushHistorySnapshot={pushHistorySnapshot}
        />
      </div>
    </ConfigProvider>
  )
}
