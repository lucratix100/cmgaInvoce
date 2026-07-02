export function getWebSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
    return process.env.NEXT_PUBLIC_WEBSOCKET_URL
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/'
  try {
    const url = new URL(apiUrl)
    url.port = '3334'
    url.pathname = ''
    return url.origin
  } catch {
    return 'http://localhost:3334'
  }
}
