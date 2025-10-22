// hooks/useTheme.js
import { useState, useEffect } from 'react'

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme || 'system'
    }
    return 'system'
  })

  const applyTheme = () => {
    document.documentElement.classList.toggle(
      "dark",
      localStorage.theme === "dark" ||
        (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
    )
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      if (!("theme" in localStorage)) {
        applyTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const setLight = () => {
    localStorage.theme = "light"
    setTheme("light")
    applyTheme()
  }

  const setDark = () => {
    localStorage.theme = "dark" 
    setTheme("dark")
    applyTheme()
  }

  const setSystem = () => {
    localStorage.removeItem("theme")
    setTheme("system")
    applyTheme()
  }

  return {
    theme,
    setLight,
    setDark, 
    setSystem
  }
}