import { useState, useCallback } from 'react'
import { ConfigProvider } from './context/ConfigContext'
import OptionPanel from './components/OptionPanel'
import PreviewCanvas from './components/PreviewCanvas'

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
