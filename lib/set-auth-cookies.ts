import { cookies } from "next/headers"

export function getRedirectForRole(role?: string) {
  if (role === "ADMIN") return "/dashboard"
  if (role === "COMMERCIAL_ADMIN") return "/commercial-dashboard"
  if (role === "AGENT_COMMERCIAL") return "/agents"
  if (role === "FACTURATION") return "/facturation"
  return "/"
}

export async function setAuthCookies(accessToken: unknown, user: { role?: string }) {
  const cookieStore = await cookies()

  cookieStore.set({
    name: "accessToken",
    value: JSON.stringify(accessToken),
    httpOnly: true,
    maxAge: 60 * 60 * 24,
    path: "/",
  })

  cookieStore.set({
    name: "user",
    value: JSON.stringify(user),
    httpOnly: true,
    maxAge: 60 * 60 * 24,
    path: "/",
  })

  return getRedirectForRole(user.role)
}
