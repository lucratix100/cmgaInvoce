'use client'

import { useEffect } from 'react'

export default function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const cleanupServiceWorkers = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((registration) => registration.unregister()))
        }

        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
        }
      } catch (error) {
        console.warn('Impossible de nettoyer les caches de développement:', error)
      }
    }

    cleanupServiceWorkers()
  }, [])

  return null
}
