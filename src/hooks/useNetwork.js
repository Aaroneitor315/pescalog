import { useState, useEffect } from 'react'

export function useNetwork() {
  const [online, setOnline] = useState(navigator.onLine)
  const [volvioCon, setVolvioCon] = useState(false)

  useEffect(() => {
    let timer

    function handleOnline() {
      setOnline(true)
      setVolvioCon(true)
      timer = setTimeout(() => setVolvioCon(false), 3000)
    }

    function handleOffline() {
      setOnline(false)
      setVolvioCon(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearTimeout(timer)
    }
  }, [])

  return { online, volvioCon }
}
