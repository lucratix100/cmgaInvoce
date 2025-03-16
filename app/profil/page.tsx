import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ProfilClient from "./profilClient"

async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")

  if (!token) {
    redirect("/")
  }

  return null
}

export default async function ProfilePage() {
  await getUser()

  return <ProfilClient />
}

