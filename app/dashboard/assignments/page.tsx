import { InvoiceManagementTabs } from "@/components/invoice-management-tabs"

export default function Home() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6 space-y-6">
      <div>
        {/* <h1 className="text-3xl font-bold">Gestion des Factures</h1>
        <p className="text-muted-foreground">Gérez les racines, suffixes et affectations des factures</p> */}
      </div>
      <InvoiceManagementTabs />
    </div>
  )
}
