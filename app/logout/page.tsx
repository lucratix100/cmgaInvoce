import { redirect } from "next/navigation"
import logout from "@/actions/logout"

export default async function LogoutPage() {
  await logout()
  redirect("/")
}
