"use client"
import { Card } from "@/components/ui/card"
import RecouvrementTable from "@/components/recouvrement/recouvrement-table"

interface FactureClientProps {
  initialData: {
    user: any;
    invoices: any[];
    depots: any[];
    statistics?: {
      total: {
        count: number;
        amount: number;
      };
      byStatus: Record<string, { count: number; amount: number }>;
    };
  };
  isRecouvrement: boolean;
}

export default function FactureClient({ initialData }: FactureClientProps) {

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      <main className="px-4 md:px-6 py-8 space-y-6">
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <RecouvrementTable factures={initialData.invoices} user={initialData.user} depots={initialData.depots} statistics={initialData.statistics} />
          </div>
        </Card>
      </main>
    </div>
  )
}