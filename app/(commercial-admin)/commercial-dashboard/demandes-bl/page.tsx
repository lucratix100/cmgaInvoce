import { getCommercialBlEditRequestHistory, getCommercialBlEditRequests } from "@/actions/commercial-admin"
import CommercialBlRequestsClient from "./commercial-bl-requests-client"

export default async function CommercialBlRequestsPage() {
  const [requests, historyRequests] = await Promise.all([
    getCommercialBlEditRequests(),
    getCommercialBlEditRequestHistory(),
  ])

  return (
    <div className="p-2 md:p-3">
      <CommercialBlRequestsClient initialRequests={requests} initialHistoryRequests={historyRequests} />
    </div>
  )
}
