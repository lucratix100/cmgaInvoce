"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Phone, Truck, User, Printer, Download } from "lucide-react";
import { TabsContent } from "@radix-ui/react-tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Invoice } from "@/types/invoice";
import { getBls } from "@/actions/bl";
import { Badge } from "../ui/badge";
import { BlProduct, Driver, Bl } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { getDeliveryTemplate } from "@/templates/delivery-template";
import dynamic from "next/dynamic";
import { toast } from "@/components/ui/use-toast";

interface DeliveryProps {
  invoice: Invoice;
  activeTab: string;
}

// Import dynamique de html2pdf
const html2pdf = dynamic(() => import("html2pdf.js"), {
  ssr: false, // Désactive le rendu côté serveur
});

export default function Delivery({ invoice, activeTab }: DeliveryProps) {
  console.log(invoice, "invoiceDelivery")
  const [bls, setBls] = useState<Bl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBls = async () => {
      try {
        const data = await getBls(invoice.invoiceNumber);
        console.log(data, "bls");
        setBls(data);
      } finally {
        setLoading(false);
      }
    };
    loadBls();
  }, [invoice.invoiceNumber]);

  const progressPercentage = useMemo(
    () =>
      bls.length > 0
        ? Math.round(
          (bls.filter((bl) => bl.status === "validée").length / bls.length) *
          100
        )
        : 0,
    [bls]
  );

  const renderDriverInfo = (driver: Driver | null) => (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Truck className="h-5 w-5 text-primary-600" />
        <h4 className="font-medium text-gray-900">Information chauffeur</h4>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-primary-600" />
          <span className="text-sm text-gray-700">
            {driver?.firstname || "Non assigné"} {driver?.lastname || ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-primary-600" />
          <span className="text-sm text-gray-700">
            {driver?.phone || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );

  const renderProductsTable = (products: BlProduct[]) => (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="w-1/4 font-medium">Référence</TableHead>
          <TableHead className="w-2/5 font-medium">Désignation</TableHead>
          <TableHead className="w-1/6 font-medium text-right">
            Qté livrée
          </TableHead>
          <TableHead className="w-1/6 font-medium text-right">
            Qté restante
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product, index) => (
          <TableRow key={index} className="hover:bg-gray-50">
            <TableCell className="font-medium">
              {product.reference || "N/A"}
            </TableCell>
            <TableCell>{product.designation || "N/A"}</TableCell>
            <TableCell className="text-right font-medium">
              {product.quantite}
            </TableCell>
            <TableCell className="text-right text-gray-700">
              {product.remainingQty}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const handlePrint = (bl: Bl) => {
    if (bl.status !== "validée") {
      toast({
        variant: "default",
        title: "Action impossible",
        description:
          "Le bon de livraison doit être validé avant de pouvoir l'imprimer.",
      });
      return;
    }

    const template = getDeliveryTemplate({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer?.name || "N/A",
      customerPhone: invoice.customer?.phone || "N/A",
      deliveryDate: new Date(bl.createdAt).toLocaleDateString("fr-FR"),
      driverName: `${bl.driver?.firstname || "N/A"} ${bl.driver?.lastname || ""
        }`,
      driverPhone: bl.driver?.phone || "N/A",
      products: bl.products,
    });

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    iframe.contentDocument?.write(template);
    iframe.contentDocument?.close();

    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  const handleDownload = async (bl: Bl) => {
    if (bl.status !== "validée") {
      toast({
        variant: "default",
        title: "Action impossible",
        description:
          "Le bon de livraison doit être validé avant de pouvoir le télécharger.",
      });
      return;
    }

    const template = getDeliveryTemplate({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer?.name || "N/A",
      customerPhone: invoice.customer?.phone || "N/A",
      deliveryDate: new Date(bl.createdAt).toLocaleDateString("fr-FR"),
      driverName: `${bl.driver?.firstname || "N/A"} ${bl.driver?.lastname || ""
        }`,
      driverPhone: bl.driver?.phone || "N/A",
      products: bl.products,
    });

    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default;

    const opt = {
      margin: 1,
      filename: `BL_${invoice.invoiceNumber}_${new Date(bl.createdAt)
        .toLocaleDateString("fr-FR")
        .replace(/\//g, "-")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "cm", format: "a4", orientation: "portrait" },
    };

    const element = document.createElement("div");
    element.innerHTML = template;

    html2pdf().set(opt).from(element).save();
  };

  if (loading)
    return <div className="p-8 text-center">Chargement des livraisons...</div>;

  return (
    <TabsContent value="livraisons">
      <div className="space-y-4">
        <Card className="border-none shadow-md bg-white delivery-content">
          <CardHeader className="bg-primary-50 pb-3">
            <CardTitle className="flex items-center gap-2 text-primary-700">
              <Truck className="h-5 w-5" />
              Suivi des livraisons - Facture #{invoice.invoiceNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Information client pour l'impression */}
              <div className="print-only mb-4">
                <h3 className="font-semibold">Informations client:</h3>
                <p>Nom: {invoice.customer?.name}</p>
                <p>Téléphone: {invoice.customer?.phone}</p>
                <p>
                  Date facture:{" "}
                  {new Date(invoice.date).toLocaleDateString("fr-FR")}
                </p>
              </div>

              <div className="space-y-4 mt-6">
                {bls.map((bl, index) => (
                  <Card key={bl.id} className="overflow-hidden">
                    <CardHeader className="bg-primary-50 pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2 text-primary-700">
                          <Truck className="h-5 w-5 font-bold" />
                          <span>Livraison #{index + 1}</span>
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(bl)}
                            className="hover:bg-primary-700 hover:text-white font-bold  bg-white text-primary-700 hover:text-sm transition-colors duration-300 transform hover:scale-105"
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(bl)}
                            className="hover:bg-primary-700 hover:text-white font-bold  bg-white text-primary-700 hover:text-sm transition-colors duration-300 transform hover:scale-105"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Livraison du{" "}
                              {new Date(bl.createdAt).toLocaleDateString(
                                "fr-FR"
                              )}
                            </h3>
                            <Badge
                              variant="outline"
                              className="bg-primary-50 text-primary-700"
                            >
                              {bl.status}
                            </Badge>
                          </div>
                        </div>
                        {renderDriverInfo(bl.driver)}
                      </div>
                      <div className="mt-4">
                        {renderProductsTable(bl.products)}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50">
                  <div>
                    <h3 className="font-medium">Résumé des livraisons</h3>
                    <p className="text-sm text-muted-foreground">
                      {bls.length} livraison{bls.length > 1 ? "s" : ""}{" "}
                      effectuée{bls.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      Progression: {progressPercentage}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Dernière livraison:{" "}
                      {bls[0]?.createdAt
                        ? new Date(bls[0].createdAt).toLocaleDateString("fr-FR")
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}
