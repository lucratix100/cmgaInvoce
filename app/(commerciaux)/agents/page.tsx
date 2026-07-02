import AgentClientComponent from "./agentClient"
import { Suspense } from "react"

export default function AgentPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Chargement...</div>}>
      <AgentClientComponent />
    </Suspense>
  )
} 