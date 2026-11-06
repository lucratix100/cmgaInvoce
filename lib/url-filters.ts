export function replaceQuery(pathname: string, updates: Record<string, string | null | undefined>) {
  if (typeof window === "undefined") return

  const params = new URLSearchParams(window.location.search)
  for (const [key, value] of Object.entries(updates)) {
    const next = value?.trim()
    if (next) params.set(key, next)
    else params.delete(key)
  }

  const query = params.toString()
  const url = query ? `${pathname}?${query}` : pathname
  const current = `${window.location.pathname}${window.location.search}`
  if (current === url) return

  window.history.replaceState(window.history.state, "", url)
}
