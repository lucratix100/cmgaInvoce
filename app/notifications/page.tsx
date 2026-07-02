import { getCurrentUser } from "@/actions/user"
import { AgentNavbar } from "@/components/agent-component/agent-navbar"
import CommercialSideBar from "@/components/commercial-side-bar"
import NotificationBell from "@/components/navbar/notification"
import NotificationClient from "./notificationClient"
import { Role } from "@/types/roles"
import { redirect } from "next/navigation"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default async function Notification() {
    const user = await getCurrentUser()
    
    // Redirection si l'utilisateur n'est pas connecté
    if (!user) {
        redirect("/login")
    }

    const commercialAgentRoles = [Role.AGENT_COMMERCIAL, Role.COMMERCIAL_DETAILLANT]
    const commercialManagerRoles = [Role.COMMERCIAL_ADMIN, Role.ADMIN_DETAILLANT]
    
    if (commercialAgentRoles.includes(user.role)) {
        return (
            <div className="min-h-screen bg-gray-50">
                <AgentNavbar user={user} />
                <NotificationClient user={user} />
            </div>
        )
    }

    if (commercialManagerRoles.includes(user.role)) {
        return (
            <SidebarProvider>
                <CommercialSideBar />
                <SidebarInset>
                    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-white px-4 shadow-sm">
                        <SidebarTrigger />
                        <div className="ml-auto">
                            <NotificationBell user={user} />
                        </div>
                    </header>
                    <NotificationClient user={user} />
                </SidebarInset>
            </SidebarProvider>
        )
    }

    return (
        <div className="w-full">
            {[
                Role.ADMIN,
                Role.RECOUVREMENT,
            ].includes(user.role) && <NotificationClient user={user} />}
        </div>
    )
}
