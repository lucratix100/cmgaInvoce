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
import { BlProduct, Driver, Bl, InvoiceProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { getDeliveryTemplate } from "@/templates/delivery-template";
import dynamic from "next/dynamic";
import { toast } from "@/components/ui/use-toast";
import { Separator } from "@radix-ui/react-select";
import { getUsers } from "@/actions/user";
import { Role } from "@/types/roles";

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
  const [superviseurMagasin, setSuperviseurMagasin] = useState<{ firstname: string, lastname: string } | null>(null);

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

  useEffect(() => {
    const fetchSuperviseur = async () => {
      if (invoice?.depotId) {
        try {
          const users = await getUsers();
          const superviseur = users.find((u: any) => u.role === Role.SUPERVISEUR_MAGASIN && u.depotId === invoice.depotId);
          if (superviseur) {
            setSuperviseurMagasin({ firstname: superviseur.firstname, lastname: superviseur.lastname });
          } else {
            setSuperviseurMagasin(null);
          }
        } catch (e) {
          setSuperviseurMagasin(null);
        }
      }
    };
    fetchSuperviseur();
  }, [invoice?.depotId]);

  const sortedBls = useMemo(
    () =>
      [...bls].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [bls]
  );

  const progressPercentage = useMemo(
    () =>
      sortedBls.length > 0
        ? Math.round(
          (sortedBls.filter((bl) => bl.status === "validée").length /
            sortedBls.length) *
          100
        )
        : 0,
    [sortedBls]
  );

  const renderDriverInfo = (bl: Bl) => (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 space-y-4 border border-blue-100 shadow-sm">
      <div className="flex items-center gap-3 pb-3 border-b border-blue-200">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Truck className="h-5 w-5 text-blue-600" />
        </div>
        <h4 className="font-semibold text-gray-900 text-lg">Informations de livraison</h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Informations du chauffeur */}
        <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-green-100 rounded-md">
              <User className="h-4 w-4 text-green-600" />
            </div>
            <h5 className="font-medium text-gray-900 text-sm">Chauffeur</h5>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Nom:</span>
              <span className="text-sm font-medium text-gray-900">
                {bl.driver?.firstname || "Non assigné"} {bl.driver?.lastname || ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-gray-400" />
              <span className="text-sm text-gray-600">
                {bl.driver?.phone || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Informations du créateur */}
        <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-purple-100 rounded-md">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <h5 className="font-medium text-gray-900">Créé par</h5>
          </div>
          
          <div className="space-y-2">
            {superviseurMagasin && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-700 font-semibold">Superviseur magasin :</span>
                <span className="text-xs text-gray-900">{superviseurMagasin.firstname} {superviseurMagasin.lastname}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-xs text-gray-700 font-semibold">
                {bl.user?.role === 'SUPERVISEUR_MAGASIN' ? 'Superviseur' : 
                 bl.user?.role === 'MAGASINIER' ? 'Magasinier' : 'Utilisateur'}
              </span>
              <span className="text-xs text-gray-900">{bl.user?.firstname} {bl.user?.lastname}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProductsTable = (
    products: BlProduct[],
    blIndex: number,
    allBls: Bl[]
  ) => {
    // S'assurer que les produits sont bien parsés
    const parsedProducts = products.map((product) => {
      if (typeof product === "string") {
        return JSON.parse(product);
      }
      return product;
    });

    const hasPreviousBl = blIndex > 0;

    return (
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="w-1/4 font-medium">Référence</TableHead>
          <TableHead className="w-2/5 font-medium">Désignation</TableHead>
          {hasPreviousBl && (
            <TableHead className="w-1/6 font-medium text-right">
              Qté restant du BL précédent
            </TableHead>
          )}
          <TableHead className="w-1/6 font-medium text-right">
            Qté livrée
          </TableHead>
          <TableHead className="w-1/6 font-medium text-right">
            Qté restante
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          {parsedProducts.map((product, index) => {
            const quantiteRestante = Number(product.remainingQty || 0);
            let quantiteLivree = 0;
            let quantiteCommandee = 0;

            const previousBl = blIndex > 0 ? allBls[blIndex - 1] : null;

            if (previousBl) {
              const previousBlProducts =
                typeof previousBl.products === "string"
                  ? JSON.parse(previousBl.products)
                  : previousBl.products;
              const productInPreviousBl = previousBlProducts.find(
                (p: BlProduct) => p.reference === product.reference
              );
              const remainingInPreviousBl = productInPreviousBl
                ? Number(productInPreviousBl.remainingQty || 0)
                : quantiteRestante; // Fallback if product not in previous BL
              quantiteLivree = remainingInPreviousBl - quantiteRestante;
              quantiteCommandee = remainingInPreviousBl; // Pour les BL suivants, la quantité commandée est la quantité restante du BL précédent
            } else {
              // This is the first BL.
              const originalProduct = invoice.order.find(
                (p: InvoiceProduct) => p.reference === product.reference
              );
              quantiteCommandee = originalProduct
                ? Number(originalProduct.quantite)
                : 0;
              quantiteLivree = quantiteCommandee - quantiteRestante;
            }

            return (
          <TableRow key={index} className="hover:bg-gray-50">
            <TableCell className="font-medium">
              {product.reference || "N/A"}
            </TableCell>
            <TableCell>{product.designation || "N/A"}</TableCell>
            {hasPreviousBl && (
              <TableCell className="text-right font-medium text-green-600">
                {quantiteCommandee}
              </TableCell>
            )}
            <TableCell className="text-right font-medium text-green-600">
              {quantiteLivree}
            </TableCell>
                <TableCell className="text-right text-red-600 font-medium">
                  {quantiteRestante}
            </TableCell>
          </TableRow>
            );
          })}
      </TableBody>
    </Table>
  );
  };

  const prepareProductsForTemplate = (
    products: BlProduct[],
    blIndex: number,
    allBls: Bl[]
  ) => {
    const hasPreviousBl = blIndex > 0;
    
    return {
      hasPreviousBl,
      products: products.map((product) => {
        const quantiteRestante = Number(product.remainingQty || 0);
        let quantiteLivree = 0;
        let quantiteCommandee = 0;

        if (blIndex > 0) {
          const previousBl = allBls[blIndex - 1];
          const previousBlProducts =
            typeof previousBl.products === "string"
              ? JSON.parse(previousBl.products)
              : previousBl.products;
          const productInPreviousBl = previousBlProducts.find(
            (p: BlProduct) => p.reference === product.reference
          );
          const remainingInPreviousBl = productInPreviousBl
            ? Number(productInPreviousBl.remainingQty || 0)
            : quantiteRestante;
          quantiteLivree = remainingInPreviousBl - quantiteRestante;
          quantiteCommandee = remainingInPreviousBl;
        } else {
          const originalProduct = invoice.order.find(
            (p: InvoiceProduct) => p.reference === product.reference
          );
          quantiteCommandee = originalProduct
            ? Number(originalProduct.quantite)
            : 0;
          quantiteLivree = quantiteCommandee - quantiteRestante;
        }

        return {
          ...product,
          quantiteLivree,
          quantiteCommandee,
        };
      })
    };
  };

  const handlePrint = (bl: Bl) => {
    const blIndex = sortedBls.findIndex((b) => b.id === bl.id);
    const templateData = prepareProductsForTemplate(
      bl.products,
      blIndex,
      sortedBls
    );

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
      driverName: `${bl.driver?.firstname || "N/A"} ${
        bl.driver?.lastname || ""
        }`,
      driverPhone: bl.driver?.phone || "N/A",
      products: templateData.products,
      hasPreviousBl: templateData.hasPreviousBl,
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
    const blIndex = sortedBls.findIndex((b) => b.id === bl.id);
    const templateData = prepareProductsForTemplate(
      bl.products,
      blIndex,
      sortedBls
    );

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
      driverName: `${bl.driver?.firstname || "N/A"} ${
        bl.driver?.lastname || ""
        }`,
      driverPhone: bl.driver?.phone || "N/A",
      products: templateData.products,
      hasPreviousBl: templateData.hasPreviousBl,
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
      <div className="h-full max-h-[calc(100vh-300px)] overflow-y-auto">
        <div className="space-y-4">
          <Card className="border-none shadow-md bg-white delivery-content">
            <CardHeader className="bg-primary-50 pb-3 sticky top-0 z-10">
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
                  {sortedBls.map((bl, index) => (
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
                          {renderDriverInfo(bl)}
                        </div>
                        <div className="mt-4">
                          {renderProductsTable(bl.products, index, sortedBls)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50">
                    <div>
                      <h3 className="font-medium">Résumé des livraisons</h3>
                      <p className="text-sm text-muted-foreground">
                        {sortedBls.length} livraison
                        {sortedBls.length > 1 ? "s" : ""} effectuée
                        {sortedBls.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        Progression: {progressPercentage}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dernière livraison:{" "}
                        {sortedBls[sortedBls.length - 1]?.createdAt
                          ? new Date(
                            sortedBls[sortedBls.length - 1].createdAt
                          ).toLocaleDateString("fr-FR")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>
  );
}
