import { getCurrentUser } from "@/actions/user";
import InvoiceClient from "./invoice-client"
import InvoiceHeader from "./invoice-header";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <InvoiceHeader invoiceNumber={id} />
      <InvoiceClient invoiceNumber={id} user={user} />
    </div>
  );
}
