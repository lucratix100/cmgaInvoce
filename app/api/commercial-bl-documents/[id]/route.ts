import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ message: "Document introuvable" }, { status: 404 })
  }

  const cookieStore = await cookies()
  const token = JSON.parse(cookieStore.get("accessToken")?.value || "{}").token
  if (!token) {
    return NextResponse.json({ message: "Authentification requise" }, { status: 401 })
  }

  const upstream = await fetch(`${process.env.API_URL}commercial-bl-documents/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  const headers = new Headers()
  const contentType = upstream.headers.get("content-type")
  const disposition = upstream.headers.get("content-disposition")
  if (contentType) headers.set("Content-Type", contentType)
  if (disposition) headers.set("Content-Disposition", disposition)
  headers.set("Cache-Control", "private, no-store")

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers,
  })
}
