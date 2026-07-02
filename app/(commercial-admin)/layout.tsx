import CommercialSideBar from "@/components/commercial-side-bar"
import Notification from "@/components/navbar/notification"
import { getCurrentUser } from "@/actions/user"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default async function CommercialAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <SidebarProvider>
      <CommercialSideBar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-white px-4 shadow-sm">
          <SidebarTrigger />
          <div className="ml-auto">
            {user && <Notification user={user} />}
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}


