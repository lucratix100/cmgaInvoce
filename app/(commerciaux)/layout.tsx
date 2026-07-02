import { AgentNavbar } from "@/components/agent-component/agent-navbar"
import { getCurrentUser } from "@/actions/user"

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      <AgentNavbar user={user} />
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  )
} 