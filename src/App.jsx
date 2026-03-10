import { useState, useCallback } from 'react'
import { ConfigProvider } from './context/ConfigContext'
import OptionPanel from './components/OptionPanel'
import PreviewCanvas from './components/PreviewCanvas'

const INITIAL_STATE = {
  ratio: '16:9',
  background: 'brand',
  overlayCategory: 'none',
  logoType: 'logoOnly',
  logoColor: 'white',
  overlayGrayscale: false,
  overlayOpacity: 20,
}

export default function App() {
  const [state, setState] = useState(INITIAL_STATE)

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const reset = useCallback(() => {
    setState({
      ...INITIAL_STATE,
    })
  }, [])

  return (
    <ConfigProvider>
      <div className="app">
        <OptionPanel state={state} onUpdate={updateState} onReset={reset} />
        <PreviewCanvas state={state} onUpdate={updateState} />
      </div>
    </ConfigProvider>
  )
}
