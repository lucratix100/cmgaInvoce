import { getCurrentUser } from "@/actions/user";
import InvoiceClient from "./invoice-client"
import InvoiceHeader from "./invoice-header";
import { getInvoiceByNumber } from "@/actions/invoice";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser();
  const invoice = await getInvoiceByNumber(id)
  console.log(invoice, "invoice")

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <InvoiceHeader invoice={invoice.invoice} />
      <InvoiceClient invoice={invoice.invoice} user={user} />
    </div>
  );
}
