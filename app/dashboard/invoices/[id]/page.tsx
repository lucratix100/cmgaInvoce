import { getInvoiceByNumber } from "@/actions/invoice";
import { getCurrentUser } from "@/actions/user";
import Navbar from "@/components/navbar/navbar";
import Header from "@/components/factureId/header";
import InvoiceClient from "./invoice-client"


interface PageProps {
  params: {
    id: string;
  };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params

  const [invoice, user] = await Promise.all([
    getInvoiceByNumber(id),
    getCurrentUser()
  ]);


  if (!invoice) {
    return <div>Facture non trouvée</div>;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* <Navbar /> */}
      <Header invoice={invoice.invoice} />
      <InvoiceClient invoice={invoice.invoice} user={user} />
    </div>
  );
}
