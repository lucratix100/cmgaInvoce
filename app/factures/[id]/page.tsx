import { getInvoiceByNumber } from "@/actions/invoice";
import { getCurrentUser } from "@/actions/user";
import Navbar from "@/components/navbar/navbar";
import Header from "@/components/factureId/header";
import InvoiceClient from "./invoice-client";
import { InvoiceStatus } from "@/types/enums";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const [invoice, user] = await Promise.all([
    getInvoiceByNumber(params.id),
    getCurrentUser()
  ]);

  if (!invoice) {
    return <div>Facture non trouvée</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <Navbar />
      <Header invoice={invoice} />
      <InvoiceClient invoice={invoice} user={user} />
    </div>
  );
}
