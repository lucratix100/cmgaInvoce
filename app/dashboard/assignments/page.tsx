import { InvoiceManagementTabs } from "@/components/invoice-management-tabs"

export default function Home() {
  return (
    <div className=" mx-auto  px-1 md:px-1 space-y-1">
      <div>
        {/* <h1 className="text-3xl font-bold">Gestion des Factures</h1>
        <p className="text-muted-foreground">Gérez les racines, suffixes et affectations des factures</p> */}
      </div>
      <InvoiceManagementTabs />
    </div >
  )
}
