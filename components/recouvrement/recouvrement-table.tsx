"use client"

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Bell, Check, Eye } from "lucide-react"
import Link from "next/link"
import Filtre from "../facture/filtre"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "../ui/dialog"
import Notification from "../notification-dialog"
import { useState } from "react"
import { Invoice } from "@/lib/types"
import { Checkbox } from "../ui/checkbox"



interface RecouvrementTableProps {
  factures: Invoice[];
}

export default function RecouvrementTable({ factures }: RecouvrementTableProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(montant);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      // Statuts de livraison
      "EN ATTENTE DE LIVRAISON": "bg-amber-100 text-amber-700 border-amber-200",
      "LIVRE": " bg-green-100 text-green-700 border-green-200 ",
      "EN COURS DE LIVRAISON": " bg-white text-blue-700 border-blue-200 ",
      "LIVRAISON PARTIELLE": "bg-blue-100 text-blue-700 border-blue-200 ",
      // Statuts de paiement
      "PAYÉ": " bg-green-100 w-[80px] items-center justify-center rounded-none text-green-700 border-green-200 ",
      "NON PAYÉ": " bg-red-100 rounded-none text-red-700 border-red-200 ",
      "PAIEMENT PARTIEL": "bg-white rounded-none text-blue-700 border-blue-200",
      // Statut par défaut
      default: "bg-gray-100 text-gray-700 border-gray-200"
    };
    const upperStatus = status.toUpperCase();
    return colors[upperStatus as keyof typeof colors] || colors.default;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(new Set(factures.map(f => f.id.toString())));
    } else {
      setSelectedInvoices(new Set());
    }
  };

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoices);
    if (checked) {
      newSelected.add(invoiceId);
    } else {
      newSelected.delete(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const handleMarkAsPaid = () => {
    // TODO: Implémenter la logique pour marquer comme payé
    console.log("Factures à marquer comme payées:", Array.from(selectedInvoices));
  };

  return (
    <>
      <div>
        <Filtre onStatusChange={() => {}} onSearch={() => {}} currentStatus={""} searchValue={""} onDateChange={() => {}} />
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <div className="space-y-5 flex justify-end p-4">
          {/* <div className="ml-1">
            <Button 
              className="bg-[#007bff] text-white hover:bg-primary-800" 
              variant="outline"
              onClick={handleMarkAsPaid}
              disabled={selectedInvoices.size === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Marquer comme payé
            </Button>
          </div> */}
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow className="bg-primary-50/50 ">
                <TableHead className="w-[50px]">
                  {/* <Checkbox 
                    checked={selectedInvoices.size === factures.length}
                    onCheckedChange={handleSelectAll} /> */}
                </TableHead>
                <TableHead className="font-semibold text-primary-900">Numéro facture</TableHead>
                <TableHead className="font-semibold text-primary-900">Numéro compte</TableHead>
                <TableHead className="font-semibold text-primary-900">Date facture</TableHead>
                <TableHead className="font-semibold text-primary-900">Client</TableHead>
                <TableHead className="font-semibold text-primary-900">Date échéance</TableHead>
                <TableHead className="font-semibold text-primary-900">État livraison</TableHead>
                <TableHead className="font-semibold text-primary-900">État paiement</TableHead>
                <TableHead className="font-semibold text-primary-900">Montant TTC</TableHead>
                <TableHead className="font-semibold text-primary-900">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factures.map((facture) => (
                <TableRow key={facture.id} className=" hover:bg-primary-50/30">
                  <TableCell>
                    {/* <Checkbox 
                      checked={selectedInvoices.has(facture.id.toString())}
                      onCheckedChange={(checked) => handleSelectInvoice(facture.id.toString(), checked as boolean)}
                    /> */}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/factures/${facture.id}`} className="hover:text-primary transition-colors">
                      {facture.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{facture.accountNumber}</TableCell>
                  <TableCell>{formatDate(facture.date)}</TableCell>
                  <TableCell>{facture.customer?.name}</TableCell>
                  <TableCell>{formatDate(facture.date)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(facture.status)}>
                      {facture.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(facture.statusPayment || "non_paye")}>
                      {(facture.statusPayment || "non_paye").replace("_", " ").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {formatMontant(facture.order?.reduce((acc, item) => acc + (item.total || 0), 0) || 0)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flexe gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <Dialog >
                            <DialogTrigger  asChild>
                              <Button variant="ghost" size="sm" className="hover:bg-amber-50">
                                <Bell className="h-4 w-4 text-amber-600" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white sm:max-w-[425px]">
                              <DialogTitle>Notification de suivi</DialogTitle>
                              <DialogDescription>
                                Créez un rappel pour la facture {facture.invoiceNumber}
                              </DialogDescription>
                              <Notification 
                                invoiceId={facture.invoiceNumber}
                              />
                            </DialogContent>
                          </Dialog>
                          <TooltipContent>
                            <p>Ajouter une notification</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/factures/${facture.invoiceNumber}`} className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Détails
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}