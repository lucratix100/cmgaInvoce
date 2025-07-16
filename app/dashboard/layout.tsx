
import Header from "@/components/navbar/navbar"
import SideBar from "@/components/side-bar"
import { getCurrentUser } from "@/actions/user"
import { redirect } from "next/navigation"


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex-1">
        <main className="bg-gray-50 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  )
} 