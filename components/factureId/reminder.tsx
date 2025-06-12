"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Bell, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";

export default function Reminder() {
  return (
    <TabsContent value="rappels" className="space-y-6">
      <Card className="border-none shadow-md bg-white">
        <CardHeader className="bg-primary-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-primary-700">
            <Bell className="h-5 w-5" />
            Notifications et rappels
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Paramètres de notification</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="rappel-auto-settings"
                  // checked={rappelAutomatique}
                  // onCheckedChange={setRappelAutomatique}
                />
                <Label htmlFor="rappel-auto-settings">Rappels automatiques</Label>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary-50 p-4 flex justify-between items-center">
                <h3 className="font-medium text-primary-700">Notifications actives</h3>
                <Button variant="outline" size="sm" className="bg-white">
                  <Bell className="h-4 w-4 mr-2" />
                  Ajouter une notification
                </Button>
              </div>
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-medium">Date</TableHead>
                      <TableHead className="font-medium">Message</TableHead>
                      <TableHead className="font-medium">Statut</TableHead>
                      <TableHead className="font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* {invoiceData.invoice.notifications.map((notification, index) => ( */}
                      <TableRow>
                        <TableCell>05/02/2025</TableCell>
                        <TableCell>Rappel: échéance de paiement dans 5 jours...</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              // notification.lue ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-700"
                              "bg-gray-100 text-gray-700"
                            }
                          >
                            {/* {notification.lue ? "Lue" : "Non lue"} */}
                            Lue
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="sr-only">Marquer comme lue</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              <span className="sr-only">Supprimer</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    {/* ))} */    }
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-primary-50 p-4">
                <h3 className="font-medium text-primary-700">Notifications automatiques</h3>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">Rappel avant échéance (5 jours)</p>
                      <p className="text-sm text-muted-foreground">
                        Envoie une notification 5 jours avant l'échéance
                      </p>
                    </div>
                    <Switch defaultChecked id="rappel-5j" />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">Rappel avant échéance (1 jour)</p>
                      <p className="text-sm text-muted-foreground">
                        Envoie une notification 1 jour avant l'échéance
                      </p>
                    </div>
                    <Switch defaultChecked id="rappel-1j" />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">Alerte échéance dépassée</p>
                      <p className="text-sm text-muted-foreground">
                        Envoie une notification lorsque l'échéance est dépassée
                      </p>
                    </div>
                    <Switch defaultChecked id="rappel-depasse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-white">
        <CardHeader className="bg-primary-50 pb-3">
          <CardTitle className="flex items-center gap-2 text-primary-700">
            <Clock className="h-5 w-5" />
            Historique des statuts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* {invoiceData.history.map((event, index) => ( */}
              <div
                // key={index}
                className="relative pl-6 pb-6 border-l-2 border-primary-200 last:border-0 last:pb-0"
              >
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-primary"></div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-medium text-primary-700">En cours</p>
                    <p className="text-sm text-muted-foreground">Rappel: échéance de paiement dans 5 jours...</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>05/02/2025</span>
                    <span className="text-primary">•</span>
                    <span>Admin</span>
                  </div>
                </div>
              </div>
            {/* ))} */}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
