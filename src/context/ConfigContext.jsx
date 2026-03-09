import { createContext, useContext, useState, useEffect } from 'react'
import { DEFAULT_CONFIG } from '../config/defaultConfig'

const ConfigContext = createContext(null)

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)

  useEffect(() => {
    fetch('/config.json')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setConfig((prev) => ({ ...prev, ...data })))
      .catch(() => {})
  }, [])

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  return ctx || DEFAULT_CONFIG
}
