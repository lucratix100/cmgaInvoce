import { cookies } from "next/headers"

export async function getServerAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("accessToken")

    if (!accessToken?.value) {
      return null
    }

    const parsed = JSON.parse(accessToken.value)
    return typeof parsed?.token === "string" && parsed.token.length > 0
      ? parsed.token
      : null
  } catch {
    return null
  }
}
